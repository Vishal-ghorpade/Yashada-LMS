import Quiz from '../models/Quiz.js';
import QuizResponse from '../models/QuizResponse.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Create a quiz
// @route   POST /api/quizzes
// @access  Private
export const createQuiz = async (req, res, next) => {
  try {
    const { title, description, category, timer, positiveMarks, negativeMarks, shuffleQuestions, questions } = req.body;

    if (!title || !category || !questions || questions.length === 0) {
      res.status(400);
      throw new Error('Title, category, and at least one question are required');
    }

    const quiz = await Quiz.create({
      title,
      description,
      category,
      timer: timer || 0,
      positiveMarks: positiveMarks !== undefined ? positiveMarks : 1,
      negativeMarks: negativeMarks !== undefined ? negativeMarks : 0,
      shuffleQuestions: !!shuffleQuestions,
      questions,
      createdBy: req.user.id
    });

    await logActivity(req.user.id, `Created Quiz: "${title}"`, req.ip);

    res.status(201).json({
      success: true,
      quiz
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Public
export const getQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find().populate('createdBy', 'name email').sort('-createdAt');
    res.status(200).json({
      success: true,
      quizzes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quiz (Public - Correct answers omitted to prevent cheating)
// @route   GET /api/quizzes/:id
// @access  Public
export const getQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    // Convert mongoose document to lean JS object to allow key removal
    const quizObj = quiz.toObject();

    // Mask/remove correctAnswerIndex and explanations for public retrieval
    if (quizObj.questions && quizObj.questions.length > 0) {
      quizObj.questions = quizObj.questions.map(q => {
        const { correctAnswerIndex, explanation, ...publicFields } = q;
        return publicFields;
      });

      // Optionally shuffle questions if the setting is true
      if (quiz.shuffleQuestions) {
        quizObj.questions.sort(() => Math.random() - 0.5);
      }
    }

    res.status(200).json({
      success: true,
      quiz: quizObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quiz for admin (With correct answers)
// @route   GET /api/quizzes/:id/admin
// @access  Private
export const getQuizAdmin = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    res.status(200).json({
      success: true,
      quiz
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a quiz
// @route   PUT /api/quizzes/:id
// @access  Private
export const updateQuiz = async (req, res, next) => {
  try {
    const { title, description, category, timer, positiveMarks, negativeMarks, shuffleQuestions, questions } = req.body;
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    quiz.title = title || quiz.title;
    quiz.description = description || quiz.description;
    quiz.category = category || quiz.category;
    quiz.timer = timer !== undefined ? timer : quiz.timer;
    quiz.positiveMarks = positiveMarks !== undefined ? positiveMarks : quiz.positiveMarks;
    quiz.negativeMarks = negativeMarks !== undefined ? negativeMarks : quiz.negativeMarks;
    quiz.shuffleQuestions = shuffleQuestions !== undefined ? !!shuffleQuestions : quiz.shuffleQuestions;
    quiz.questions = questions || quiz.questions;

    const updatedQuiz = await quiz.save();

    await logActivity(req.user.id, `Updated Quiz: "${quiz.title}"`, req.ip);

    res.status(200).json({
      success: true,
      quiz: updatedQuiz
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Private
export const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    await quiz.deleteOne();

    // Clean up attempts
    await QuizResponse.deleteMany({ quizId: req.params.id });

    await logActivity(req.user.id, `Deleted Quiz: "${quiz.title}" and its attempts`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Quiz and associated attempts removed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit quiz answers and evaluate
// @route   POST /api/quizzes/:id/submit
// @access  Public
export const submitQuizAttempt = async (req, res, next) => {
  try {
    const { participantName, participantBranch, rollNumber, answers, timeTaken } = req.body;
    const quizId = req.params.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    if (!participantName || !participantBranch || !rollNumber || !Array.isArray(answers)) {
      res.status(400);
      throw new Error('Participant info, roll number, and answers array are required');
    }

    let totalScore = 0;
    const maxScore = quiz.questions.length * quiz.positiveMarks;

    // Map quiz questions by their ID for evaluation
    const questionsMap = new Map(quiz.questions.map(q => [q._id.toString(), q]));

    const processedAnswers = quiz.questions.map(q => {
      const qId = q._id.toString();
      // Find candidate's answer for this question
      const candidateAns = answers.find(a => a.questionId === qId);
      const selectedOption = (candidateAns && candidateAns.selectedOption !== undefined)
        ? candidateAns.selectedOption
        : null;

      let isCorrect = false;
      let score = 0;

      if (selectedOption !== null) {
        if (selectedOption === q.correctAnswerIndex) {
          isCorrect = true;
          score = quiz.positiveMarks;
        } else {
          isCorrect = false;
          score = -Math.abs(quiz.negativeMarks); // Ensure deduction is negative
        }
      }

      totalScore += score;

      return {
        questionId: qId,
        selectedOption,
        isCorrect,
        score
      };
    });

    // Limit total score to 0 minimum if standard rules don't permit negative final score (optional)
    // Here we let it represent the actual score, but for percent calculations we bound it to >= 0
    const scoreForPercentage = Math.max(0, totalScore);
    const percentage = Number(((scoreForPercentage / maxScore) * 100).toFixed(2));

    const attempt = await QuizResponse.create({
      quizId,
      user: req.user ? req.user._id : null,
      participantName,
      participantBranch,
      rollNumber,
      answers: processedAnswers,
      totalScore,
      maxScore,
      percentage,
      timeTaken: timeTaken || 0
    });

    // Retrieve leaderboard details for the feedback screen
    const attempts = await QuizResponse.find({ quizId }).sort({ totalScore: -1, timeTaken: 1 });
    const rank = attempts.findIndex(att => att._id.toString() === attempt._id.toString()) + 1;

    res.status(201).json({
      success: true,
      message: 'Quiz attempt evaluated and saved',
      attempt: {
        id: attempt._id,
        participantName: attempt.participantName,
        participantBranch: attempt.participantBranch,
        rollNumber: attempt.rollNumber,
        answers: attempt.answers,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        timeTaken: attempt.timeTaken,
        submittedAt: attempt.createdAt,
        rank
      },
      // Include correct answers in response for evaluation
      questionsReview: quiz.questions.map(q => ({
        id: q._id,
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all attempts for a quiz
// @route   GET /api/quizzes/:id/attempts
// @access  Private
export const getQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await QuizResponse.find({ quizId: req.params.id }).sort('-createdAt');
    res.status(200).json({
      success: true,
      attempts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard for a quiz
// @route   GET /api/quizzes/:id/leaderboard
// @access  Public
export const getQuizLeaderboard = async (req, res, next) => {
  try {
    const attempts = await QuizResponse.find({ quizId: req.params.id })
      .sort({ totalScore: -1, timeTaken: 1, createdAt: 1 })
      .limit(15);

    // Format output
    const leaderboard = attempts.map((a, idx) => ({
      rank: idx + 1,
      name: a.participantName,
      branch: a.participantBranch,
      score: a.totalScore,
      maxScore: a.maxScore,
      percentage: a.percentage,
      timeTaken: a.timeTaken,
      submittedAt: a.createdAt
    }));

    res.status(200).json({
      success: true,
      leaderboard
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if participant already has a response
// @route   POST /api/quizzes/:id/check-attempt
// @access  Public
export const checkQuizAttempt = async (req, res, next) => {
  try {
    const { rollNumber } = req.body;
    if (!rollNumber) {
      res.status(400);
      throw new Error('Roll number is required');
    }
    const existing = await QuizResponse.findOne({ quizId: req.params.id, rollNumber });
    res.status(200).json({
      success: true,
      exists: !!existing
    });
  } catch (error) {
    next(error);
  }
};
