import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ClipboardCheck, Award, ArrowRight, X, Sparkles, BookOpen, Play } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';

const Landing = ({ onShowToast }) => {
  const adminToken = localStorage.getItem('yashada_admin_token');
  const adminUser = JSON.parse(localStorage.getItem('yashada_admin_info')) || null;

  if (adminToken && adminUser) {
    if (adminUser.role === 'admin') {
      return <AdminDashboard admin={adminUser} onShowToast={onShowToast} />;
    } else if (adminUser.role === 'teacher') {
      return <TeacherDashboard teacher={adminUser} onShowToast={onShowToast} />;
    } else {
      return <StudentDashboard onShowToast={onShowToast} />;
    }
  }
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal open states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        const [quizRes, rubricRes, videoRes] = await Promise.all([
          fetchAPI('/quizzes'),
          fetchAPI('/rubrics'),
          fetchAPI('/videos')
        ]);
        if (quizRes.success) setQuizzes(quizRes.quizzes);
        if (rubricRes.success) setRubrics(rubricRes.rubrics);
        if (videoRes.success) setVideos(videoRes.videos);
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAssessments();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center relative overflow-hidden bg-gradient-to-br from-yashada-navy via-slate-900 to-yashada-navy-light text-white py-16 px-4 sm:px-6 lg:px-8">
      {/* Decorative background glows */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-yashada-gold filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-[30rem] h-[30rem] rounded-full bg-purple-500 filter blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto text-center space-y-10">
        <div className="inline-flex items-center space-x-2 bg-yashada-gold/15 border border-yashada-gold/30 rounded-full px-4.5 py-2 text-yashada-gold text-xs font-bold uppercase tracking-wider font-sans">
          <Shield className="h-4.5 w-4.5" />
          <span>Official Training &amp; Assessment Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
          Yashwantrao Chavan Academy of <br />
          <span className="text-yashada-gold bg-clip-text">Development Administration</span>
        </h1>

        <p className="max-w-2xl mx-auto text-slate-350 font-sans text-base sm:text-lg leading-relaxed">
          Access course examinations, submit structured academic evaluations, watch interactive lessons, and review timed performance reports on the central YASHADA AI learning management portal.
        </p>

        {/* Home Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 font-sans max-w-xl mx-auto">
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="w-full sm:w-auto px-6 py-4 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span>Give Feedback</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setShowQuizModal(true)}
            className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Award className="h-5 w-5 text-yashada-gold" />
            <span>Attend Quiz</span>
          </button>

          <button
            onClick={() => setShowVideoModal(true)}
            className="w-full sm:w-auto px-6 py-4 bg-purple-650 hover:bg-purple-550 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Play className="h-5 w-5 fill-white text-white" />
            <span>Watch Video</span>
          </button>
        </div>

        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
        >
          <span>Go to Admin Console</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* FEEDBACK ASSESSMENT SELECTOR MODAL */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
                    <ClipboardCheck className="h-5 w-5 text-yashada-gold" />
                    <span>Select Feedback Rubric</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose one of the active evaluation matrices below to begin.
                  </p>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {loading ? (
                  <p className="text-center text-xs text-slate-500 py-6">Loading active rubrics...</p>
                ) : rubrics.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">No active feedback rubrics found.</p>
                ) : (
                  rubrics.map((r) => (
                    <button
                      key={r._id}
                      onClick={() => {
                        setShowFeedbackModal(false);
                        navigate(`/feedback/${r._id}`);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-yashada-gold/50 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-sm text-slate-200 group-hover:text-white block line-clamp-1">
                          {r.title}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {r.parameters?.length || 0} Parameters
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-yashada-gold group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUIZ ASSESSMENT SELECTOR MODAL */}
      <AnimatePresence>
        {showQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
                    <Award className="h-5 w-5 text-yashada-gold" />
                    <span>Select Active Examination</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose an active quiz session. One-attempt policy applies.
                  </p>
                </div>
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {loading ? (
                  <p className="text-center text-xs text-slate-500 py-6">Loading active examinations...</p>
                ) : quizzes.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">No active examinations found.</p>
                ) : (
                  quizzes.map((q) => (
                    <button
                      key={q._id}
                      onClick={() => {
                        setShowQuizModal(false);
                        navigate(`/quiz/${q._id}`);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-yashada-gold/50 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-sm text-slate-200 group-hover:text-white block line-clamp-1">
                          {q.title}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-2">
                          <span className="text-yashada-gold font-semibold uppercase">{q.category}</span>
                          <span>•</span>
                          <span>{q.questions?.length || 0} Questions</span>
                          {q.timer > 0 && (
                            <>
                              <span>•</span>
                              <span>{q.timer} min</span>
                            </>
                          )}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-yashada-gold group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIDEO SELECTOR MODAL */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
                    <Play className="h-5 w-5 text-yashada-gold fill-yashada-gold" />
                    <span>Select Interactive Video</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose an interactive lesson below. timeline questions will pause video playback.
                  </p>
                </div>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {loading ? (
                  <p className="text-center text-xs text-slate-500 py-6">Loading video modules...</p>
                ) : videos.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">No interactive video modules found.</p>
                ) : (
                  videos.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => {
                        setShowVideoModal(false);
                        navigate(`/play/${v._id}`);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-yashada-gold/50 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-sm text-slate-200 group-hover:text-white block line-clamp-1">
                          {v.title}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-2">
                          <span className="text-yashada-gold font-semibold uppercase">Interactive Video</span>
                          <span>•</span>
                          <span>{v.interactions?.length || 0} Questions</span>
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-yashada-gold group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;
