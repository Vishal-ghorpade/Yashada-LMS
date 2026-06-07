import Video from '../models/Video.js';
import VideoAttempt from '../models/VideoAttempt.js';
import VideoProgress from '../models/VideoProgress.js';
import { getUploadUrl, saveLocalFile } from '../utils/storage.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get upload URL
// @route   POST /api/videos/upload-url
// @access  Private (Admin/Teacher)
export const requestUploadUrl = async (req, res, next) => {
  try {
    const { filename, contentType } = req.body;
    if (!filename) {
      res.status(400);
      throw new Error('Filename is required');
    }

    const uploadData = await getUploadUrl(filename, contentType);
    res.status(200).json(uploadData);
  } catch (error) {
    next(error);
  }
};

// @desc    Local upload handler (Fallback)
// @route   PUT /api/videos/upload-local
// @access  Public
export const uploadLocalFile = async (req, res, next) => {
  try {
    const key = req.query.key;
    if (!key) {
      res.status(400);
      throw new Error('Storage key is required');
    }

    // Save the raw request stream to public upload folder
    const result = await saveLocalFile(req, key);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new video record
// @route   POST /api/videos
// @access  Private (Admin/Teacher)
export const createVideo = async (req, res, next) => {
  try {
    const { title, description, rawVideoUrl, hlsStreamUrl, thumbnailUrl, duration } = req.body;

    if (!title || !rawVideoUrl) {
      res.status(400);
      throw new Error('Title and raw video URL are required');
    }

    const video = await Video.create({
      title,
      description,
      rawVideoUrl,
      hlsStreamUrl: hlsStreamUrl || rawVideoUrl, // Fallback to raw URL if transcoding didn't run
      thumbnailUrl: thumbnailUrl || '/default-thumbnail.jpg',
      duration: duration || 0,
      createdBy: req.user.id
    });

    await logActivity(req.user.id, `Created Interactive Video: "${title}"`, req.ip);

    res.status(201).json({
      success: true,
      video
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
export const getVideos = async (req, res, next) => {
  try {
    const videos = await Video.find()
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      videos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single video details
// @route   GET /api/videos/:id
// @access  Public
export const getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      res.status(404);
      throw new Error('Video not found');
    }

    res.status(200).json({
      success: true,
      video
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update video settings / interactions
// @route   PUT /api/videos/:id
// @access  Private (Admin/Teacher)
export const updateVideo = async (req, res, next) => {
  try {
    const { title, description, hlsStreamUrl, thumbnailUrl, duration, interactions } = req.body;
    let video = await Video.findById(req.params.id);

    if (!video) {
      res.status(404);
      throw new Error('Video not found');
    }

    // Check ownership if teacher (admins can edit anything)
    if (req.user.role !== 'admin' && video.createdBy.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to update this video module');
    }

    video.title = title || video.title;
    video.description = description !== undefined ? description : video.description;
    video.hlsStreamUrl = hlsStreamUrl || video.hlsStreamUrl;
    video.thumbnailUrl = thumbnailUrl || video.thumbnailUrl;
    video.duration = duration !== undefined ? duration : video.duration;
    
    if (interactions !== undefined) {
      video.interactions = interactions;
    }

    const updatedVideo = await video.save();

    await logActivity(req.user.id, `Updated Video: "${video.title}"`, req.ip);

    res.status(200).json({
      success: true,
      video: updatedVideo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a video
// @route   DELETE /api/videos/:id
// @access  Private (Admin/Teacher)
export const deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      res.status(404);
      throw new Error('Video not found');
    }

    // Check ownership if teacher
    if (req.user.role !== 'admin' && video.createdBy.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to delete this video module');
    }

    await video.deleteOne();

    await logActivity(req.user.id, `Deleted Video: "${video.title}"`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Video module removed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start video attempt
// @route   POST /api/videos/:id/attempts
// @access  Public (Optional auth)
export const startVideoAttempt = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const { guestInfo } = req.body;

    const video = await Video.findById(videoId);
    if (!video) {
      res.status(404);
      throw new Error('Video not found');
    }

    const attempt = await VideoAttempt.create({
      videoId,
      user: req.user ? req.user._id : null,
      guestInfo: req.user ? null : guestInfo,
      completed: false
    });

    res.status(201).json({
      success: true,
      attemptId: attempt._id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track video progress & sync checkpoints / question replies
// @route   POST /api/videos/:id/progress
// @access  Public (Optional auth)
export const trackVideoProgress = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const { attemptId, currentTimestamp, answersSubmit } = req.body;

    const video = await Video.findById(videoId);
    if (!video) {
      res.status(404);
      throw new Error('Video not found');
    }

    // 1. Sync resume checkpoint in VideoProgress if user is logged in
    if (req.user) {
      await VideoProgress.findOneAndUpdate(
        { user: req.user._id, videoId },
        { 
          $set: { lastWatchedTimestamp: currentTimestamp },
          $setOnInsert: { maxWatchedTimestamp: currentTimestamp }
        },
        { upsert: true, new: true }
      );

      // Separately handle max watched timestamp expansion to ensure it only moves forward
      const progress = await VideoProgress.findOne({ user: req.user._id, videoId });
      if (progress && currentTimestamp > progress.maxWatchedTimestamp) {
        progress.maxWatchedTimestamp = currentTimestamp;
        await progress.save();
      }
    }

    // 2. Update VideoAttempt answers if an interaction answer is submitted
    let answerResponse = null;
    if (attemptId && answersSubmit) {
      const { interactionId, selectedOption } = answersSubmit;
      
      const interaction = video.interactions.id(interactionId);
      if (!interaction) {
        res.status(400);
        throw new Error('Timeline question interaction not found');
      }

      const isCorrect = selectedOption === interaction.correctAnswerIndex;
      const pointsEarned = isCorrect ? 1.0 : 0.0;

      // Update attempt in DB
      const attempt = await VideoAttempt.findById(attemptId);
      if (attempt) {
        // Prevent duplicate answers to same question
        const alreadyAnswered = attempt.answers.some(ans => ans.interactionId.toString() === interactionId);
        if (!alreadyAnswered) {
          attempt.answers.push({
            interactionId,
            selectedOption,
            isCorrect,
            pointsEarned
          });
          await attempt.save();
        }
      }

      answerResponse = {
        isCorrect,
        correctAnswerIndex: interaction.correctAnswerIndex,
        explanation: interaction.explanation
      };
    }

    res.status(200).json({
      success: true,
      answerResponse
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current student progress / resume position
// @route   GET /api/videos/:id/progress
// @access  Private
export const getVideoProgress = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const progress = await VideoProgress.findOne({ user: req.user.id, videoId });
    
    res.status(200).json({
      success: true,
      progress: progress || { lastWatchedTimestamp: 0, maxWatchedTimestamp: 0 }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Finalize video attempt & calculate score
// @route   POST /api/videos/attempts/:attemptId/submit
// @access  Public
export const submitVideoAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { timeTaken } = req.body;

    const attempt = await VideoAttempt.findById(attemptId).populate('videoId');
    if (!attempt) {
      res.status(404);
      throw new Error('Attempt not found');
    }

    const video = attempt.videoId;
    const maxScore = video.interactions.length;

    let totalScore = 0;
    attempt.answers.forEach(ans => {
      totalScore += ans.pointsEarned;
    });

    attempt.totalScore = totalScore;
    attempt.maxScore = maxScore;
    attempt.percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 100;
    attempt.timeTaken = timeTaken || 0;
    attempt.completed = true;

    await attempt.save();

    // If user is logged in, mark their progress object as completed too
    if (attempt.user) {
      await VideoProgress.findOneAndUpdate(
        { user: attempt.user, videoId: video._id },
        { $set: { completed: true } }
      );
    }

    res.status(200).json({
      success: true,
      attempt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate public share link and embed code
// @route   POST /api/videos/:id/share
// @access  Private (Admin/Teacher)
export const shareVideoModule = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      res.status(404);
      throw new Error('Video not found');
    }

    const host = req.headers.host || 'localhost:5000';
    const protocol = req.secure ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    // Share link points to play view, embed points to iframe play view
    const shareUrl = `${baseUrl}/play/${video._id}`;
    const embedCode = `<iframe src="${baseUrl}/embed/${video._id}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

    res.status(200).json({
      success: true,
      shareUrl,
      embedCode
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get interactive video analytics for teachers
// @route   GET /api/videos/:id/analytics
// @access  Private (Admin/Teacher)
export const getVideoAnalytics = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const video = await Video.findById(videoId);
    if (!video) {
      res.status(404);
      throw new Error('Video not found');
    }

    const attempts = await VideoAttempt.find({ videoId, completed: true });
    const totalAttempts = await VideoAttempt.countDocuments({ videoId });
    const completedAttempts = attempts.length;

    // 1. Completion Rate
    const completionRate = totalAttempts > 0 
      ? Number(((completedAttempts / totalAttempts) * 100).toFixed(2)) 
      : 0;

    // 2. Average Score
    let sumScore = 0;
    attempts.forEach(att => {
      sumScore += att.totalScore;
    });
    const avgScore = completedAttempts > 0 
      ? Number((sumScore / completedAttempts).toFixed(2)) 
      : 0;

    // 3. Question-wise performance
    const questionStats = video.interactions.map(q => {
      const qId = q._id.toString();
      let correctCount = 0;
      let totalAnswers = 0;

      // Scan all attempts to check correct answers count
      attempts.forEach(att => {
        const ans = att.answers.find(a => a.interactionId.toString() === qId);
        if (ans) {
          totalAnswers += 1;
          if (ans.isCorrect) {
            correctCount += 1;
          }
        }
      });

      return {
        questionId: qId,
        text: q.questionText,
        timestamp: q.timestamp,
        correctAnswers: correctCount,
        totalAnswers,
        successRate: totalAnswers > 0 
          ? Number(((correctCount / totalAnswers) * 100).toFixed(2)) 
          : 0
      };
    });

    // 4. Drop-off Analysis (Progress stats based on logged-in student checkpoints)
    const progresses = await VideoProgress.find({ videoId });
    const duration = video.duration || 1;
    const intervals = 10;
    const step = duration / intervals;
    const dropOffBins = Array.from({ length: intervals }, (_, i) => ({
      rangeStart: Math.floor(i * step),
      rangeEnd: Math.floor((i + 1) * step),
      label: `${Math.floor(i * step)}s-${Math.floor((i + 1) * step)}s`,
      count: 0
    }));

    progresses.forEach(prog => {
      const watched = prog.lastWatchedTimestamp;
      const binIdx = Math.min(
        Math.floor(watched / step),
        intervals - 1
      );
      if (binIdx >= 0 && binIdx < intervals) {
        dropOffBins[binIdx].count += 1;
      }
    });

    // 5. Recent attempts log
    const recentAttempts = await VideoAttempt.find({ videoId })
      .populate('user', 'name email')
      .sort('-createdAt')
      .limit(10);

    res.status(200).json({
      success: true,
      analytics: {
        totalViews: totalAttempts,
        completionRate,
        averageScore: avgScore,
        maxScore: video.interactions.length,
        questionStats,
        dropOffBins,
        recentAttempts
      }
    });
  } catch (error) {
    next(error);
  }
};
