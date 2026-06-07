import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, ChevronRight, HelpCircle, Check, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InteractivePlayer = ({ 
  videoUrl, 
  interactions = [], 
  savedProgress = 0, 
  onQuestionAnswered, 
  onProgressUpdate, 
  onCompletion 
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Interactive system state
  const [maxWatchedTime, setMaxWatchedTime] = useState(savedProgress);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [answeredIds, setAnsweredIds] = useState(new Set());
  const [scoreInfo, setScoreInfo] = useState({ earned: 0, total: 0 });
  const [showExplanation, setShowExplanation] = useState(false);

  // Sync saved progress on load
  useEffect(() => {
    if (videoRef.current && savedProgress > 0) {
      videoRef.current.currentTime = savedProgress;
      setCurrentTime(savedProgress);
      setMaxWatchedTime(savedProgress);
    }
  }, [savedProgress]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Sync volume state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Listen to time updates and handle question triggers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Sync maximum watched time
    if (time > maxWatchedTime) {
      setMaxWatchedTime(time);
    }

    // Call progress callback
    if (onProgressUpdate) {
      onProgressUpdate(time);
    }

    // Check if we hit a question timestamp
    const activeQuestionFound = interactions.find(q => {
      // Trigger if currentTime is within 0.5s of timestamp, and hasn't been answered yet
      const diff = Math.abs(time - q.timestamp);
      return diff < 0.4 && !answeredIds.has(q._id || q.id);
    });

    if (activeQuestionFound && !activeQuestion) {
      // Pause video and trigger question
      videoRef.current.pause();
      setIsPlaying(false);
      setActiveQuestion(activeQuestionFound);
      setSelectedOption(null);
      setHasSubmitted(false);
      setShowExplanation(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (activeQuestion) {
      // Block playing if a question is currently overlayed
      return;
    }

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error("Error playing video:", err));
    }
  };

  // Prevent seeking forward beyond maxWatchedTime
  const handleSeeking = () => {
    if (!videoRef.current) return;

    const time = videoRef.current.currentTime;
    if (time > maxWatchedTime) {
      // Lock scrub position to the highest progress or the next question
      videoRef.current.currentTime = maxWatchedTime;
      onProgressUpdate(maxWatchedTime);
    }
  };

  const handleTimelineScrub = (e) => {
    if (!videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    let targetTime = percentage * duration;

    // Check scrubbing limit
    if (targetTime > maxWatchedTime) {
      targetTime = maxWatchedTime;
    }

    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleOptionSelect = (idx) => {
    if (hasSubmitted) return;
    setSelectedOption(idx);
  };

  const handleQuestionSubmit = () => {
    if (selectedOption === null || hasSubmitted) return;

    const isCorrect = selectedOption === activeQuestion.correctAnswerIndex;
    
    // Add to answered checklist
    const qId = activeQuestion._id || activeQuestion.id;
    setAnsweredIds(prev => new Set([...prev, qId]));

    // Update cumulative scores
    setScoreInfo(prev => ({
      earned: prev.earned + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    setHasSubmitted(true);
    setShowExplanation(true);

    if (onQuestionAnswered) {
      onQuestionAnswered(qId, selectedOption, isCorrect);
    }
  };

  const handleQuestionContinue = () => {
    setActiveQuestion(null);
    setSelectedOption(null);
    setHasSubmitted(false);
    setShowExplanation(false);

    // Briefly skip ahead of the timestamp boundary to avoid infinite trigger loop
    if (videoRef.current) {
      videoRef.current.currentTime = videoRef.current.currentTime + 0.5;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (onCompletion) {
      onCompletion(scoreInfo.earned, scoreInfo.total);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group select-none shadow-2xl border border-slate-800"
    >
      {/* Actual HTML5 video tag */}
      <video
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeking={handleSeeking}
        onSeeked={handleSeeking}
        onEnded={handleVideoEnded}
        onClick={handlePlayPause}
        className="w-full h-full object-cover cursor-pointer"
        playsInline
      />

      {/* Center Big Play overlay (when paused) */}
      {!isPlaying && !activeQuestion && (
        <div 
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] transition-all cursor-pointer"
        >
          <div className="p-5 bg-yashada-gold/90 text-yashada-navy rounded-full transform transition hover:scale-110 shadow-lg">
            <Play className="h-8 w-8 fill-yashada-navy" />
          </div>
        </div>
      )}

      {/* H5P Timeline interactive marker indicators */}
      <div className="absolute bottom-12 left-0 right-0 px-4 z-20 pointer-events-none">
        <div className="relative h-1.5 w-full">
          {interactions.map((q, idx) => {
            const pct = (q.timestamp / duration) * 100;
            const isAnswered = answeredIds.has(q._id || q.id);
            if (isNaN(pct) || pct > 100) return null;
            return (
              <div 
                key={idx}
                style={{ left: `${pct}%` }}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transform transition hover:scale-125 z-30 ${
                  isAnswered ? 'bg-emerald-500' : 'bg-yashada-gold'
                }`}
                title={`Question at ${formatTime(q.timestamp)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Control Bar Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        
        {/* Progress Bar scrubber wrapper */}
        <div 
          onClick={handleTimelineScrub}
          className="h-1.5 bg-white/20 rounded-full w-full mb-4 cursor-pointer relative"
        >
          {/* Watched progress */}
          <div 
            style={{ width: `${(currentTime / duration) * 100}%` }}
            className="absolute top-0 left-0 h-full bg-yashada-gold rounded-full"
          />
          {/* Maximum allowed seek limit */}
          <div 
            style={{ width: `${(maxWatchedTime / duration) * 100}%` }}
            className="absolute top-0 left-0 h-full bg-white/10 rounded-full border-r border-white/50 pointer-events-none"
          />
        </div>

        {/* Custom Buttons */}
        <div className="flex items-center justify-between text-white font-sans text-sm">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handlePlayPause}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
            </button>

            {/* Time tracking display */}
            <div className="text-xs font-mono text-slate-300">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Volume controls */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={toggleMute}
                className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-yashada-gold"
              />
            </div>

            {/* Score tracker box */}
            {scoreInfo.total > 0 && (
              <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white/10 border border-white/15 rounded-lg text-yashada-gold">
                Score: {scoreInfo.earned} / {scoreInfo.total}
              </div>
            )}

            <button 
              onClick={toggleFullscreen}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE QUESTION OVERLAY WINDOW */}
      <AnimatePresence>
        {activeQuestion && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0F0A1E]/95 backdrop-blur-md z-30 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg space-y-5"
            >
              {/* Question Header */}
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-yashada-gold/10 border border-yashada-gold/20 rounded-xl text-yashada-gold">
                  <HelpCircle className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-widest font-sans">
                    Interactive Question Point
                  </span>
                  <h3 className="text-base font-serif font-bold text-white leading-relaxed">
                    {activeQuestion.questionText}
                  </h3>
                </div>
              </div>

              {/* Options Grid */}
              <div className="space-y-2.5 font-sans">
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectAnswer = idx === activeQuestion.correctAnswerIndex;
                  
                  let optionStyles = 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 text-slate-300';
                  let statusIcon = null;

                  if (isSelected && !hasSubmitted) {
                    optionStyles = 'border-yashada-gold bg-yashada-gold/10 text-white';
                  } else if (hasSubmitted) {
                    if (isCorrectAnswer) {
                      optionStyles = 'border-emerald-500 bg-emerald-500/10 text-white';
                      statusIcon = <Check className="h-4 w-4 text-emerald-500" />;
                    } else if (isSelected) {
                      optionStyles = 'border-rose-500 bg-rose-500/10 text-white';
                      statusIcon = <X className="h-4 w-4 text-rose-500" />;
                    } else {
                      optionStyles = 'border-slate-800 bg-slate-900/20 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={hasSubmitted}
                      className={`w-full text-left p-3.5 border rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${optionStyles} ${
                        !hasSubmitted ? 'cursor-pointer hover:border-slate-700' : 'cursor-default'
                      }`}
                    >
                      <span className="flex-1 pr-4">{opt}</span>
                      {statusIcon}
                    </button>
                  );
                })}
              </div>

              {/* Explanations & Verification Info */}
              <AnimatePresence>
                {showExplanation && activeQuestion.explanation && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1 font-sans text-xs"
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Explanation
                    </span>
                    <p className="text-slate-300 leading-relaxed font-normal">
                      {activeQuestion.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex justify-end pt-2">
                {!hasSubmitted ? (
                  <button
                    onClick={handleQuestionSubmit}
                    disabled={selectedOption === null}
                    className="px-6 py-2.5 bg-yashada-gold text-yashada-navy font-bold rounded-xl text-xs hover:opacity-90 transition-opacity flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-sans"
                  >
                    <span>Submit Answer</span>
                  </button>
                ) : (
                  <button
                    onClick={handleQuestionContinue}
                    className="px-6 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-xs hover:opacity-95 transition-opacity flex items-center space-x-1.5 cursor-pointer font-sans"
                  >
                    <span>Continue Video</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InteractivePlayer;
