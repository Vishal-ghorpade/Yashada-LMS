import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Send, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import InteractivePlayer from '../components/InteractivePlayer';
import { PageLoader } from '../components/Loader';

const VideoPlayerPage = ({ onShowToast }) => {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [savedProgress, setSavedProgress] = useState(0);

  // Guest input state (if not authenticated)
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestBranch, setGuestBranch] = useState('');
  const [guestRollNumber, setGuestRollNumber] = useState('');

  // Score completion state
  const [completionData, setCompletionData] = useState(null);
  const [timeStarted, setTimeStarted] = useState(null);

  // Authenticated state
  const userToken = localStorage.getItem('yashada_admin_token');
  const userInfo = JSON.parse(localStorage.getItem('yashada_admin_info')) || null;

  useEffect(() => {
    const loadVideoDetails = async () => {
      try {
        setLoading(true);
        const videoRes = await fetchAPI(`/videos/${videoId}`);
        if (videoRes.success) {
          setVideo(videoRes.video);
        }

        // If logged in, fetch resume progress state
        if (userToken && userInfo) {
          try {
            const progressRes = await fetchAPI(`/videos/${videoId}/progress`);
            if (progressRes.success && progressRes.progress) {
              setSavedProgress(progressRes.progress.lastWatchedTimestamp);
            }
          } catch (progressErr) {
            console.error("Failed to load progress checkpoint:", progressErr);
          }
          // Initialize attempt immediately
          await initializeAttempt(null);
        } else {
          // If not logged in, prompt for identity before starting
          setShowIdentityPrompt(true);
        }
      } catch (err) {
        console.error(err);
        onShowToast(err.message || 'Failed to load video module.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadVideoDetails();
  }, [videoId]);

  const initializeAttempt = async (guestDetails) => {
    try {
      const payload = guestDetails ? { guestInfo: guestDetails } : {};
      const attemptRes = await fetchAPI(`/videos/${videoId}/attempts`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (attemptRes.success) {
        setAttemptId(attemptRes.attemptId);
        setTimeStarted(Date.now());
        setShowIdentityPrompt(false);
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to start tracking session.', 'error');
    }
  };

  const handleIdentitySubmit = (e) => {
    e.preventDefault();
    if (!guestName || !guestBranch || !guestRollNumber) {
      onShowToast('Please fill in all identity fields to start.', 'error');
      return;
    }
    initializeAttempt({
      name: guestName,
      branch: guestBranch,
      rollNumber: guestRollNumber
    });
  };

  const handleQuestionAnswered = async (interactionId, selectedOption, isCorrect) => {
    if (!attemptId) return;

    try {
      // Send question choice to server for logging/scoring
      const progressRes = await fetchAPI(`/videos/${videoId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          currentTimestamp: videoRefCurrentTime(),
          answersSubmit: {
            interactionId,
            selectedOption
          }
        })
      });
      if (progressRes.success) {
        onShowToast(isCorrect ? 'Correct answer submitted!' : 'Incorrect answer submitted.', isCorrect ? 'success' : 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const videoRefCurrentTime = () => {
    // Helper to estimate current player time (called by handlers)
    return 0; // The child component manages its own time updates
  };

  const handleProgressUpdate = async (time) => {
    // Sync heartbeat every 10 seconds (handled inside child, throttled calls)
    // To make it simple, we sync checkpoints on major events, or on page exit.
    // For local dev, we sync every time a question is triggered or attempt is submitted.
    if (userToken && userInfo) {
      // Throttle checkpoint updates (only send every 8 seconds)
      const lastSync = window[`_last_sync_${videoId}`] || 0;
      const now = Date.now();
      if (now - lastSync > 8000) {
        window[`_last_sync_${videoId}`] = now;
        try {
          await fetchAPI(`/videos/${videoId}/progress`, {
            method: 'POST',
            body: JSON.stringify({
              currentTimestamp: time
            })
          });
        } catch (err) {
          console.error("Checkpoint sync fail:", err);
        }
      }
    }
  };

  const handleCompletion = async (earned, total) => {
    if (!attemptId) return;

    const timeTaken = timeStarted ? Math.floor((Date.now() - timeStarted) / 1000) : 0;

    try {
      setLoading(true);
      const submitRes = await fetchAPI(`/videos/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ timeTaken })
      });

      if (submitRes.success) {
        setCompletionData(submitRes.attempt);
        onShowToast('Congratulations! You completed the module.', 'success');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to compile scorecard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !video) {
    return <PageLoader />;
  }

  if (!video) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-slate-400">
        <ShieldAlert className="h-12 w-12 text-yashada-gold" />
        <p>Interactive Video Module not found.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-800 text-white rounded-lg cursor-pointer">
          Return to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yashada-navy via-slate-900 to-yashada-navy-light text-white font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Catalog</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-white/5 border border-white/10 rounded-full text-slate-400">
            Interactive Video Mode
          </span>
        </div>

        {/* Title Block */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">{video.title}</h1>
          <p className="text-xs text-slate-450 leading-relaxed max-w-2xl">{video.description}</p>
        </div>

        {/* MAIN ENGINE WINDOW */}
        {showIdentityPrompt ? (
          /* GUEST REGISTRATION OVERLAY */
          <div className="w-full aspect-video bg-[#140D24] border border-slate-800 rounded-3xl p-6 sm:p-12 flex items-center justify-center shadow-xl">
            <form onSubmit={handleIdentitySubmit} className="w-full max-w-sm space-y-5">
              <div className="text-center space-y-2">
                <UserCheck className="h-10 w-10 text-yashada-gold mx-auto" />
                <h3 className="text-lg font-serif font-bold text-white">Student Identification</h3>
                <p className="text-[10px] text-slate-400">
                  Please provide your training credentials to log your score for this module.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Sonu Kumar"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold transition-colors text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Department / Branch
                  </label>
                  <input
                    type="text"
                    value={guestBranch}
                    onChange={(e) => setGuestBranch(e.target.value)}
                    placeholder="e.g. IT Department"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold transition-colors text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Roll Number / Employee ID
                  </label>
                  <input
                    type="text"
                    value={guestRollNumber}
                    onChange={(e) => setGuestRollNumber(e.target.value)}
                    placeholder="e.g. YSH-904"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold transition-colors text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-yashada-gold text-yashada-navy font-bold rounded-xl text-xs shadow-lg hover:opacity-95 transition-opacity flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Begin Module Playback</span>
              </button>
            </form>
          </div>
        ) : completionData ? (
          /* SCORECARD COMPLETION OVERLAY */
          <div className="w-full aspect-video bg-[#140D24] border border-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center space-y-6 shadow-xl text-center">
            <div className="space-y-2">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto animate-bounce" />
              <h2 className="text-2xl font-serif font-bold text-white">Module Completed!</h2>
              <p className="text-xs text-slate-400 max-w-sm">
                Your attempts have been graded and logged successfully under Candidate ID:{' '}
                <span className="text-white font-mono font-semibold">
                  {completionData.user ? userInfo?.email : completionData.guestInfo?.rollNumber}
                </span>.
              </p>
            </div>

            {/* Score box */}
            <div className="grid grid-cols-3 gap-6 max-w-md w-full bg-slate-900/40 p-4 border border-slate-800 rounded-2xl">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Final Score</span>
                <p className="text-lg font-bold text-yashada-gold">
                  {completionData.totalScore} / {completionData.maxScore}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Accuracy</span>
                <p className="text-lg font-bold text-yashada-gold">{completionData.percentage}%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Time Played</span>
                <p className="text-lg font-bold text-yashada-gold">{completionData.timeTaken}s</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setCompletionData(null);
                  initializeAttempt(completionData.guestInfo);
                }}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
              >
                Replay Module
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-yashada-gold hover:opacity-95 text-yashada-navy font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Go to Catalog
              </button>
            </div>
          </div>
        ) : (
          /* CORE INTERACTIVE PLAYER */
          <InteractivePlayer
            videoUrl={video.hlsStreamUrl || video.rawVideoUrl}
            interactions={video.interactions}
            savedProgress={savedProgress}
            onQuestionAnswered={handleQuestionAnswered}
            onProgressUpdate={handleProgressUpdate}
            onCompletion={handleCompletion}
          />
        )}

        {/* Video metadata information box */}
        <div className="bg-[#140D24]/50 border border-slate-800/80 rounded-2xl p-5 font-sans text-xs space-y-3">
          <div className="flex items-center space-x-2 text-yashada-gold">
            <HelpCircle className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider">About Interactive Modules</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-400 leading-relaxed">
            <li>Timeline question points are marked by small dot bubbles on the timeline bar.</li>
            <li>When the playback reaches a marker, it will automatically pause the video.</li>
            <li>You must answer the question correctly or incorrectly before being allowed to resume.</li>
            <li>Scrubbing or seeking forward past unanswered questions is disabled.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default VideoPlayerPage;
