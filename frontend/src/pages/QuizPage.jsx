import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Award, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, Download, Trophy, Info } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';

const QuizPage = ({ onShowToast }) => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  // Enrollment details
  const [enrolled, setEnrolled] = useState(false);
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [checkingAttempt, setCheckingAttempt] = useState(false);

  // Active testing details
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Map of questionIndex -> selectedOption
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [timeTaken, setTimeTaken] = useState(0);
  const [examActive, setExamActive] = useState(false);
  const timerRef = useRef(null);

  // Results State
  const [attemptResult, setAttemptResult] = useState(null);
  const [questionsReview, setQuestionsReview] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const data = await fetchAPI(`/quizzes/${quizId}`);
        if (data.success) {
          setQuiz(data.quiz);
          setTimeLeft(data.quiz.timer * 60);
        }
      } catch (err) {
        console.error(err);
        onShowToast('Failed to load quiz details.', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) loadQuiz();
  }, [quizId, navigate]);

  // Handle countdown timer tick
  useEffect(() => {
    if (examActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            onShowToast('Time expired! Auto-submitting responses...', 'info');
            triggerAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
        setTimeTaken(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examActive, timeLeft]);

  if (loading) return <PageLoader />;
  if (!quiz) return null;

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!name || !branch || !rollNumber) {
      onShowToast('Name, Branch, and Roll Number / Employee ID are required.', 'error');
      return;
    }

    setCheckingAttempt(true);
    try {
      const data = await fetchAPI(`/quizzes/${quizId}/check-attempt`, {
        method: 'POST',
        body: JSON.stringify({ rollNumber })
      });

      if (data.success) {
        if (data.exists) {
          onShowToast('You have already attempted this examination (One attempt restricted).', 'error');
        } else {
          setEnrolled(true);
          setExamActive(true);
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to verify exam restriction.', 'error');
    } finally {
      setCheckingAttempt(false);
    }
  };

  const selectOption = (optIndex) => {
    setAnswers(prev => ({
      ...prev,
      [currentQIndex]: optIndex
    }));
  };

  const clearSelection = () => {
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[currentQIndex];
      return copy;
    });
  };

  function triggerAutoSubmit() {
    submitExam();
  }

  async function submitExam() {
    if (timerRef.current) clearInterval(timerRef.current);
    setExamActive(false);

    // Map answers map to routing payload format: { questionId, selectedOption }
    const answersPayload = quiz.questions.map((q, idx) => ({
      questionId: q._id,
      selectedOption: answers[idx] !== undefined ? answers[idx] : null
    }));

    try {
      const payload = {
        participantName: name,
        participantBranch: branch,
        rollNumber,
        answers: answersPayload,
        timeTaken
      };

      const data = await fetchAPI(`/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.success) {
        setAttemptResult(data.attempt);
        setQuestionsReview(data.questionsReview);
        setSubmitted(true);
        onShowToast('Exam evaluated successfully!', 'success');
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error(err);
      onShowToast(err.message || 'Failed to submit exam.', 'error');
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // jsPDF Scorecard Exporter
  const downloadScorecard = () => {
    if (!attemptResult || !quiz) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Outer Border
    doc.setDrawColor(212, 175, 55); // Gold
    doc.setLineWidth(1.5);
    doc.rect(5, 5, 200, 287);

    // Decorative thin inner border
    doc.setDrawColor(10, 37, 64); // Navy
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    // Header Banner
    doc.setFillColor(10, 37, 64);
    doc.rect(8, 8, 194, 45, 'F');

    // Logo & Header text
    doc.setTextColor(212, 175, 55);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.text('YASHADA ACADEMY PLATFORM', 105, 24, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Yashwantrao Chavan Academy of Development Administration, Pune', 105, 30, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.text('Certificate of Performance Evaluation', 105, 42, { align: 'center' });

    // Certificate Body
    doc.setTextColor(10, 37, 64);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('This is to certify that the candidate named below has completed the designated', 105, 75, { align: 'center' });
    doc.text('objective examination conducted on the YASHADA AI learning management portal.', 105, 82, { align: 'center' });

    // Details Box
    doc.setFillColor(250, 246, 237); // Sand background
    doc.rect(20, 95, 170, 60, 'F');
    doc.setDrawColor(197, 168, 128); // Accent border
    doc.setLineWidth(0.3);
    doc.rect(20, 95, 170, 60);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CANDIDATE DETAILS', 25, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Candidate Name:   ${attemptResult.participantName}`, 25, 115);
    doc.text(`Department/Branch: ${attemptResult.participantBranch}`, 25, 123);
    doc.text(`Roll Number:       ${attemptResult.rollNumber || rollNumber}`, 25, 131);
    doc.text(`Assessment Title:  ${quiz.title}`, 25, 139);
    doc.text(`Submission Date:   ${new Date(attemptResult.submittedAt).toLocaleDateString()}`, 25, 147);

    // Results Box
    doc.setFillColor(255, 255, 255);
    doc.rect(20, 165, 170, 50, 'F');
    doc.rect(20, 165, 170, 50);

    doc.setFont('helvetica', 'bold');
    doc.text('EXAMINATION RESULTS SUMMARY', 25, 175);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Score Achieved:   ${attemptResult.totalScore} / ${attemptResult.maxScore} Marks`, 25, 185);
    doc.text(`Evaluation Percentage:  ${attemptResult.percentage}%`, 25, 193);

    const minutes = Math.floor(attemptResult.timeTaken / 60);
    const seconds = attemptResult.timeTaken % 60;
    doc.text(`Total Time Taken:        ${minutes} min ${seconds} sec`, 25, 201);
    doc.text(`Official Rank Gained:    Rank #${attemptResult.rank}`, 25, 209);

    // Disclaimer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('* This is an electronically generated scorecard from YASHADA learning portal database logs.', 105, 240, { align: 'center' });

    // Signature Area
    doc.setDrawColor(120, 120, 120);
    doc.line(130, 265, 180, 265);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(10, 37, 64);
    doc.text('Registrar / Controller', 155, 271, { align: 'center' });
    doc.text('YASHADA Evaluation Pune', 155, 276, { align: 'center' });

    doc.save(`YASHADA_${attemptResult.participantName}_Scorecard.pdf`);
  };

  // Render Section 1: Candidate Register/Enroll
  if (!enrolled) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 font-sans">
        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </button>

          <div className="text-center space-y-3">
            <div className="bg-yashada-navy dark:bg-yashada-gold p-3 rounded-2xl w-fit mx-auto shadow-md">
              <Award className="h-6 w-6 text-yashada-gold dark:text-yashada-navy" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-yashada-navy dark:text-white">Enroll in Assessment</h2>
            <p className="text-xs text-slate-400">
              Fill in details below to start. A signup or login is not required for participants.
            </p>
          </div>

          <form onSubmit={handleEnroll} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Participant Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Department / Branch *
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Water Resource Dept"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Roll Number / Employee ID *
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. EMP12345"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-500 dark:text-slate-300">EXAMINATION RULES:</p>
              <p>• Duration: {quiz.timer > 0 ? `${quiz.timer} Minutes` : 'Unlimited time'}</p>
              <p>• Weightage: {quiz.positiveMarks} Marks for Correct Answer</p>
              {quiz.negativeMarks > 0 && (
                <p className="text-red-500">• Negative Marking: -{quiz.negativeMarks} Marks for Wrong Answer</p>
              )}
              <p>• Closing window or refreshing cancels results.</p>
            </div>

            <button
              type="submit"
              disabled={checkingAttempt}
              className="w-full py-3 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl hover:opacity-95 shadow-md flex items-center justify-center space-x-2 transition-opacity"
            >
              <span>{checkingAttempt ? 'Verifying...' : 'Begin Examination'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Section 2: Timer Active Quiz Player
  if (examActive) {
    const currentQuestion = quiz.questions[currentQIndex];
    const isAnswered = (idx) => answers[idx] !== undefined;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 font-sans space-y-6">

        {/* Navigation & Timer Header */}
        <div className="flex justify-between items-center bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase text-slate-400">Exam Session</span>
            <span className="text-sm font-bold text-yashada-navy dark:text-white line-clamp-1">{quiz.title}</span>
          </div>

          <div className="flex items-center space-x-6">
            {quiz.timer > 0 && (
              <div className="flex items-center space-x-2 text-red-500 font-mono font-bold text-lg bg-red-500/10 px-4 py-1.5 rounded-xl border border-red-200/20">
                <Clock className="h-4.5 w-4.5 animate-pulse" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to finish and submit the exam?')) {
                  submitExam();
                }
              }}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              Finish Exam
            </button>
          </div>
        </div>

        {/* Workspace layout: Grid selector left, question main right */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">

          {/* Grid panel */}
          <div className="md:col-span-1 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Navigator</h4>

            <div className="grid grid-cols-4 gap-2">
              {quiz.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${idx === currentQIndex
                      ? 'bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy border-yashada-navy dark:border-yashada-gold scale-105'
                      : isAnswered(idx)
                        ? 'bg-yashada-gold/20 text-yashada-gold border-yashada-gold/50'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col space-y-1 text-[10px] text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-yashada-navy dark:bg-yashada-gold rounded"></div>
                <span>Current Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-yashada-gold/20 border border-yashada-gold/50 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"></div>
                <span>Not Visited</span>
              </div>
            </div>
          </div>

          {/* Question Main Panel */}
          <div className="md:col-span-3 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">

            {/* Question Card */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-yashada-gold uppercase tracking-wider">
                Question {currentQIndex + 1} of {quiz.questions.length}
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white leading-relaxed">
                {currentQuestion.text}
              </h3>
            </div>

            {/* Options list */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt, optIdx) => {
                const isSelected = answers[currentQIndex] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => selectOption(optIdx)}
                    className={`w-full text-left px-5 py-4 border rounded-xl text-sm transition-all flex items-start space-x-3 ${isSelected
                        ? 'bg-yashada-gold/10 border-yashada-gold text-slate-900 dark:text-white font-medium'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${isSelected
                        ? 'bg-yashada-gold text-yashada-navy border-yashada-gold'
                        : 'border-slate-300 dark:border-slate-700 text-slate-400'
                      }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="leading-normal">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer triggers */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                onClick={clearSelection}
                disabled={!isAnswered(currentQIndex)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45"
              >
                Clear Answer
              </button>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 flex items-center justify-center space-x-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                {currentQIndex === quiz.questions.length - 1 ? (
                  <button
                    onClick={() => {
                      if (window.confirm('All questions reviewed. Submit exam responses?')) {
                        submitExam();
                      }
                    }}
                    className="flex-1 sm:flex-none px-6 py-2 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-lg hover:opacity-95 text-xs"
                  >
                    Submit Exam
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-xs font-semibold hover:opacity-95 flex items-center justify-center space-x-1.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // Render Section 3: Submission Results & scorecard
  if (submitted && attemptResult) {
    const minutes = Math.floor(attemptResult.timeTaken / 60);
    const seconds = attemptResult.timeTaken % 60;

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 font-sans space-y-8">

        {/* Actions header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Homepage</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/leaderboard/${quizId}`)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-1.5"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={downloadScorecard}
              className="px-4 py-2 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl text-xs flex items-center space-x-1.5 hover:opacity-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Results Banner card */}
        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="w-14 h-14 bg-yashada-gold/10 text-yashada-gold rounded-2xl flex items-center justify-center mx-auto border border-yashada-gold/20">
            <Sparkles className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold font-serif text-yashada-navy dark:text-white">Exam Completed!</h2>
            <p className="text-xs text-slate-400">
              Congratulations, {attemptResult.participantName}. Your score has been computed.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 max-w-xl mx-auto divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="p-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Your Score</span>
              <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                {attemptResult.totalScore} <span className="text-xs text-slate-400 font-normal">/ {attemptResult.maxScore}</span>
              </p>
            </div>

            <div className="p-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Percentage</span>
              <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                {attemptResult.percentage}%
              </p>
            </div>

            <div className="p-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Time Spent</span>
              <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                {minutes}m {seconds}s
              </p>
            </div>

            <div className="p-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Board Rank</span>
              <p className="text-xl font-extrabold text-yashada-gold mt-1">
                Rank #{attemptResult.rank}
              </p>
            </div>
          </div>
        </div>

        {/* Question Review Section */}
        <div className="space-y-4">
          <h3 className="text-base font-bold font-serif text-yashada-navy dark:text-white">Questions Review Panel</h3>

          <div className="space-y-4">
            {questionsReview.map((q, qIdx) => {
              const candAnsIdx = attemptResult.answers && attemptResult.answers.find(a => a.questionId === q.id.toString())?.selectedOption;
              const isCorrect = attemptResult.answers && attemptResult.answers.find(a => a.questionId === q.id.toString())?.isCorrect;

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-[#140D24] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed">
                      {qIdx + 1}. {q.text}
                    </h4>

                    {candAnsIdx === null ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Skipped
                      </span>
                    ) : isCorrect ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                        <XCircle className="h-3 w-3" />
                        <span>Incorrect</span>
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, optIdx) => {
                      const isCorrectAnswer = optIdx === q.correctAnswerIndex;
                      const isSelectedAnswer = optIdx === candAnsIdx;

                      let optBg = 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
                      if (isCorrectAnswer) {
                        optBg = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900';
                      } else if (isSelectedAnswer) {
                        optBg = 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-900';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`px-4 py-3 rounded-lg border flex items-center space-x-2 ${optBg}`}
                        >
                          <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation card */}
                  {q.explanation && (
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start space-x-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      <Info className="h-4.5 w-4.5 text-yashada-gold shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Explanation: </span>
                        <span>{q.explanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }
};

export default QuizPage;
