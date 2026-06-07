import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HelpCircle, Send, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import InteractivePlayer from '../components/InteractivePlayer';
import { PageLoader } from '../components/Loader';

const VideoEmbedPage = () => {
  const { videoId } = useParams();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [savedProgress, setSavedProgress] = useState(0);

  // Guest input state (for external embeds, guest identity is crucial)
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestBranch, setGuestBranch] = useState('');
  const [guestRollNumber, setGuestRollNumber] = useState('');

  // Score completion state
  const [completionData, setCompletionData] = useState(null);
  const [timeStarted, setTimeStarted] = useState(null);

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

        // Check for logged-in user resume progress
        if (userToken && userInfo) {
          try {
            const progressRes = await fetchAPI(`/videos/${videoId}/progress`);
            if (progressRes.success && progressRes.progress) {
              setSavedProgress(progressRes.progress.lastWatchedTimestamp);
            }
          } catch (progressErr) {
            console.error(progressErr);
          }
          await initializeAttempt(null);
        } else {
          setShowIdentityPrompt(true);
        }
      } catch (err) {
        console.error(err);
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
    }
  };

  const handleIdentitySubmit = (e) => {
    e.preventDefault();
    if (!guestName || !guestBranch || !guestRollNumber) return;
    initializeAttempt({
      name: guestName,
      branch: guestBranch,
      rollNumber: guestRollNumber
    });
  };

  const handleQuestionAnswered = async (interactionId, selectedOption, isCorrect) => {
    if (!attemptId) return;

    try {
      await fetchAPI(`/videos/${videoId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          currentTimestamp: 0,
          answersSubmit: {
            interactionId,
            selectedOption
          }
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleProgressUpdate = async (time) => {
    if (userToken && userInfo) {
      const lastSync = window[`_last_sync_embed_${videoId}`] || 0;
      const now = Date.now();
      if (now - lastSync > 10000) {
        window[`_last_sync_embed_${videoId}`] = now;
        try {
          await fetchAPI(`/videos/${videoId}/progress`, {
            method: 'POST',
            body: JSON.stringify({
              currentTimestamp: time
            })
          });
        } catch (err) {
          console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !video) {
    return <PageLoader />;
  }

  if (!video) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <ShieldAlert className="h-8 w-8 text-yashada-gold mb-2" />
        <p>Interactive Video Module not found.</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden font-sans">
      {showIdentityPrompt ? (
        /* GUEST REGISTRATION OVERLAY */
        <div className="w-full h-full bg-[#140D24] p-4 flex items-center justify-center">
          <form onSubmit={handleIdentitySubmit} className="w-full max-w-xs space-y-4">
            <div className="text-center space-y-1.5">
              <UserCheck className="h-7 w-7 text-yashada-gold mx-auto" />
              <h4 className="text-sm font-bold text-white">Student Identification</h4>
              <p className="text-[10px] text-slate-450 leading-none">
                Provide credentials to log score records for this session.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Candidate Name"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-yashada-gold text-white"
                required
              />
              <input
                type="text"
                value={guestBranch}
                onChange={(e) => setGuestBranch(e.target.value)}
                placeholder="Department / Branch"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-yashada-gold text-white"
                required
              />
              <input
                type="text"
                value={guestRollNumber}
                onChange={(e) => setGuestRollNumber(e.target.value)}
                placeholder="Roll Number / ID"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-yashada-gold text-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-yashada-gold text-yashada-navy font-bold rounded-lg text-xs shadow-md hover:opacity-95 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Send className="h-3 w-3" />
              <span>Begin Playback</span>
            </button>
          </form>
        </div>
      ) : completionData ? (
        /* SCORECARD COMPLETION OVERLAY */
        <div className="w-full h-full bg-[#140D24] p-4 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-1">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Module Completed!</h3>
            <p className="text-[10px] text-slate-400">Your score has been registered.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full max-w-xs bg-slate-900/50 p-2.5 border border-slate-800 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Score</span>
              <p className="text-sm font-bold text-yashada-gold">
                {completionData.totalScore} / {completionData.maxScore}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Accuracy</span>
              <p className="text-sm font-bold text-yashada-gold">{completionData.percentage}%</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Time</span>
              <p className="text-sm font-bold text-yashada-gold">{completionData.timeTaken}s</p>
            </div>
          </div>

          <button
            onClick={() => {
              setCompletionData(null);
              initializeAttempt(completionData.guestInfo);
            }}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-lg text-[10px] border border-white/10 transition-all cursor-pointer"
          >
            Replay Module
          </button>
        </div>
      ) : (
        /* CORE INTERACTIVE PLAYER */
        <div className="w-full h-full flex items-center justify-center">
          <InteractivePlayer
            videoUrl={video.hlsStreamUrl || video.rawVideoUrl}
            interactions={video.interactions}
            savedProgress={savedProgress}
            onQuestionAnswered={handleQuestionAnswered}
            onProgressUpdate={handleProgressUpdate}
            onCompletion={handleCompletion}
          />
        </div>
      )}
    </div>
  );
};

export default VideoEmbedPage;
