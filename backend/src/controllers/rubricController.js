import Rubric from '../models/Rubric.js';
import FeedbackResponse from '../models/FeedbackResponse.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Create a rubric
// @route   POST /api/rubrics
// @access  Private
export const createRubric = async (req, res, next) => {
  try {
    const { title, description, parameters, scaleMin, scaleMax } = req.body;

    if (!title || !parameters || parameters.length === 0) {
      res.status(400);
      throw new Error('Title and at least one evaluation parameter are required');
    }

    const rubric = await Rubric.create({
      title,
      description,
      parameters,
      scaleMin: scaleMin || 1,
      scaleMax: scaleMax || 4,
      createdBy: req.user.id
    });

    await logActivity(req.user.id, `Created Rubric: "${title}"`, req.ip);

    res.status(201).json({
      success: true,
      rubric
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all rubrics
// @route   GET /api/rubrics
// @access  Public (lightweight version, or full if admin)
export const getRubrics = async (req, res, next) => {
  try {
    const rubrics = await Rubric.find().populate('createdBy', 'name email').sort('-createdAt');
    
    res.status(200).json({
      success: true,
      rubrics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single rubric details
// @route   GET /api/rubrics/:id
// @access  Public
export const getRubric = async (req, res, next) => {
  try {
    const rubric = await Rubric.findById(req.params.id);

    if (!rubric) {
      res.status(404);
      throw new Error('Rubric not found');
    }

    res.status(200).json({
      success: true,
      rubric
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a rubric
// @route   PUT /api/rubrics/:id
// @access  Private
export const updateRubric = async (req, res, next) => {
  try {
    const { title, description, parameters, scaleMin, scaleMax } = req.body;
    let rubric = await Rubric.findById(req.params.id);

    if (!rubric) {
      res.status(404);
      throw new Error('Rubric not found');
    }

    rubric.title = title || rubric.title;
    rubric.description = description || rubric.description;
    rubric.parameters = parameters || rubric.parameters;
    rubric.scaleMin = scaleMin || rubric.scaleMin;
    rubric.scaleMax = scaleMax || rubric.scaleMax;

    const updatedRubric = await rubric.save();
    
    await logActivity(req.user.id, `Updated Rubric: "${rubric.title}"`, req.ip);

    res.status(200).json({
      success: true,
      rubric: updatedRubric
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a rubric
// @route   DELETE /api/rubrics/:id
// @access  Private
export const deleteRubric = async (req, res, next) => {
  try {
    const rubric = await Rubric.findById(req.params.id);

    if (!rubric) {
      res.status(404);
      throw new Error('Rubric not found');
    }

    await rubric.deleteOne();
    
    // Also clean up associated responses
    await FeedbackResponse.deleteMany({ rubricId: req.params.id });

    await logActivity(req.user.id, `Deleted Rubric: "${rubric.title}" and its responses`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Rubric and associated responses removed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a feedback/rubric evaluation
// @route   POST /api/rubrics/:id/submit
// @access  Public
export const submitRubricResponse = async (req, res, next) => {
  try {
    const { respondentName, respondentBranch, rollNumber, respondentEmail, parameterRatings, feedbackText } = req.body;
    const rubricId = req.params.id;

    const rubric = await Rubric.findById(rubricId);
    if (!rubric) {
      res.status(404);
      throw new Error('Rubric not found');
    }

    let name = respondentName;
    let branch = respondentBranch;
    let roll = rollNumber;
    let email = respondentEmail;

    if (req.user) {
      name = req.user.name;
      branch = req.user.branch || respondentBranch;
      roll = req.user.rollNumber || rollNumber;
      email = req.user.email;
    }

    if (!name || !branch || !roll || !parameterRatings || parameterRatings.length === 0) {
      res.status(400);
      throw new Error('Please fill all required candidate fields, roll number, and ratings');
    }

    // Verify rating matches parameters and calculate scores
    let totalScore = 0;
    const maxScore = rubric.parameters.length * rubric.scaleMax;
    
    // Create map of rubric parameters for quick verification
    const rubricParamsMap = new Map(rubric.parameters.map(p => [p.name, p]));

    const processedRatings = parameterRatings.map(pr => {
      const rubricParam = rubricParamsMap.get(pr.parameterName);
      if (!rubricParam) {
        throw new Error(`Invalid parameter rating: ${pr.parameterName}`);
      }
      
      const rating = Number(pr.rating);
      if (rating < rubric.scaleMin || rating > rubric.scaleMax) {
        throw new Error(`Rating for ${pr.parameterName} must be between ${rubric.scaleMin} and ${rubric.scaleMax}`);
      }
      
      totalScore += rating;
      return {
        parameterName: pr.parameterName,
        rating,
        comment: pr.comment || ''
      };
    });

    const averageScore = Number((totalScore / rubric.parameters.length).toFixed(2));

    const response = await FeedbackResponse.create({
      rubricId,
      user: req.user ? req.user._id : null,
      respondentName: name,
      respondentBranch: branch,
      rollNumber: roll,
      respondentEmail: email,
      parameterRatings: processedRatings,
      feedbackText,
      totalScore,
      averageScore,
      maxScore
    });

    res.status(201).json({
      success: true,
      message: 'Evaluation submitted successfully',
      response
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all response submissions for a rubric
// @route   GET /api/rubrics/:id/responses
// @access  Private
export const getRubricResponses = async (req, res, next) => {
  try {
    const responses = await FeedbackResponse.find({ rubricId: req.params.id }).sort('-createdAt');
    res.status(200).json({
      success: true,
      responses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated analytics for a rubric
// @route   GET /api/rubrics/:id/analytics
// @access  Private
export const getRubricAnalytics = async (req, res, next) => {
  try {
    const rubricId = req.params.id;
    const rubric = await Rubric.findById(rubricId);
    
    if (!rubric) {
      res.status(404);
      throw new Error('Rubric not found');
    }

    const responses = await FeedbackResponse.find({ rubricId });
    const totalResponses = responses.length;

    if (totalResponses === 0) {
      return res.status(200).json({
        success: true,
        analytics: {
          totalResponses: 0,
          averageTotalScore: 0,
          averageScoreOverall: 0,
          parameterAnalytics: rubric.parameters.map(p => ({
            parameterName: p.name,
            averageRating: 0,
            ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0 }
          })),
          recentSubmissions: []
        }
      });
    }

    let sumTotalScore = 0;
    let sumAverageScore = 0;

    // Initialize map to hold counts per parameter name
    const paramStats = new Map(rubric.parameters.map(p => [
      p.name, 
      { sumRating: 0, count: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0 } }
    ]));

    responses.forEach(resp => {
      sumTotalScore += resp.totalScore;
      sumAverageScore += resp.averageScore;

      resp.parameterRatings.forEach(pr => {
        const stats = paramStats.get(pr.parameterName);
        if (stats) {
          stats.sumRating += pr.rating;
          stats.count += 1;
          const currentRating = Math.round(pr.rating);
          if (stats.ratingCounts[currentRating] !== undefined) {
            stats.ratingCounts[currentRating] += 1;
          }
        }
      });
    });

    const averageTotalScore = Number((sumTotalScore / totalResponses).toFixed(2));
    const averageScoreOverall = Number((sumAverageScore / totalResponses).toFixed(2));

    const parameterAnalytics = rubric.parameters.map(p => {
      const stats = paramStats.get(p.name);
      return {
        parameterName: p.name,
        averageRating: stats && stats.count > 0 ? Number((stats.sumRating / stats.count).toFixed(2)) : 0,
        ratingCounts: stats ? stats.ratingCounts : { 1: 0, 2: 0, 3: 0, 4: 0 }
      };
    });

    // Get last 5 responses
    const recentSubmissions = responses.slice(0, 5);

    res.status(200).json({
      success: true,
      analytics: {
        totalResponses,
        averageTotalScore,
        averageScoreOverall,
        parameterAnalytics,
        recentSubmissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if respondent already has a response
// @route   POST /api/rubrics/:id/check-attempt
// @access  Public
export const checkFeedbackAttempt = async (req, res, next) => {
  try {
    const { rollNumber } = req.body;
    let existing = null;

    if (req.user) {
      existing = await FeedbackResponse.findOne({ rubricId: req.params.id, user: req.user._id });
    } else if (rollNumber) {
      existing = await FeedbackResponse.findOne({ rubricId: req.params.id, rollNumber });
    } else {
      res.status(400);
      throw new Error('Roll number or authenticated session is required');
    }

    res.status(200).json({
      success: true,
      exists: !!existing,
      response: existing
    });
  } catch (error) {
    next(error);
  }
};
