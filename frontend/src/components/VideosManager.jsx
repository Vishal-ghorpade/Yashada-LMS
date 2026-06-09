import React, { useState, useEffect } from 'react';
import { 
  Plus, Eye, Link2, Trash2, Edit3, Award, Play, BarChart2, 
  Settings, Clock, HelpCircle, Save, Trash, X, ArrowLeft, 
  Upload, CheckCircle, RefreshCw, Download, Sparkles
} from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { LoadingSpinner, SkeletonRow } from './Loader';
import ShareModal from './ShareModal';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend
} from 'recharts';

const VideosManager = ({ admin, onShowToast }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & overlay toggles
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [interactionEditorVideo, setInteractionEditorVideo] = useState(null);
  const [analyticsVideo, setAnalyticsVideo] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [shareData, setShareData] = useState(null);

  // New video form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // AI Quiz Mock State
  const [transcriptInput, setTranscriptInput] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  // Time conversion helpers
  const secondsToMMSS = (sec) => {
    if (isNaN(sec)) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const MMSSToSeconds = (mmss) => {
    if (!mmss || !mmss.includes(':')) return 0;
    const parts = mmss.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseFloat(parts[1]) || 0);
  };

  // Load video catalog
  const loadVideos = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI('/videos');
      if (res.success) {
        setVideos(res.videos);
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load video modules.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateVideo = async (e) => {
    e.preventDefault();
    if (!title || !videoFile) {
      onShowToast('Please fill in title and select a video file.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      // 1. Request upload URL
      const uploadNegotiation = await fetchAPI('/videos/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          filename: videoFile.name,
          contentType: videoFile.type
        })
      });

      if (!uploadNegotiation.uploadUrl) {
        throw new Error('Failed to negotiate upload permissions.');
      }

      setUploadProgress(30);

      let rawVideoUrl = '';
      let duration = 300;
      let thumbnailUrl = '';

      if (uploadNegotiation.provider === 'cloudinary') {
        const formData = new FormData();
        formData.append('file', videoFile);
        formData.append('api_key', uploadNegotiation.apiKey);
        formData.append('timestamp', uploadNegotiation.timestamp);
        formData.append('signature', uploadNegotiation.signature);
        formData.append('folder', uploadNegotiation.folder);

        // Perform Cloudinary upload
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadNegotiation.uploadUrl, true);

        // Track progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 60) + 30; // Scale from 30% to 90%
            setUploadProgress(percent);
          }
        };

        const uploadResult = await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
              resolve(JSON.parse(xhr.responseText || '{}'));
            } else {
              reject(new Error(`Failed to upload to Cloudinary. Status: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Cloudinary upload process encountered a network error.'));
          xhr.send(formData);
        });

        rawVideoUrl = uploadResult.secure_url;
        duration = uploadResult.duration ? Math.round(uploadResult.duration) : 300;
        // Generate a standard Cloudinary thumbnail by replacing video extension with .jpg
        thumbnailUrl = rawVideoUrl ? rawVideoUrl.replace(/\.[^/.]+$/, '.jpg') : '';
      } else {
        // Perform local raw binary PUT upload
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadNegotiation.uploadUrl, true);
        xhr.setRequestHeader('Content-Type', videoFile.type);

        // Track progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 60) + 30; // Scale from 30% to 90%
            setUploadProgress(percent);
          }
        };

        const uploadResult = await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
              resolve(JSON.parse(xhr.responseText || '{}'));
            } else {
              reject(new Error('Failed to upload file to storage.'));
            }
          };
          xhr.onerror = () => reject(new Error('Upload process encountered a network error.'));
          xhr.send(videoFile);
        });

        rawVideoUrl = uploadNegotiation.videoUrl;
        duration = 300; // default duration estimate
        thumbnailUrl = '';
      }

      setUploadProgress(90);

      // 3. Create video document in database
      const saveRes = await fetchAPI('/videos', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          rawVideoUrl,
          hlsStreamUrl: rawVideoUrl,
          thumbnailUrl: thumbnailUrl || undefined,
          duration
        })
      });

      if (saveRes.success) {
        onShowToast('Interactive video uploaded and registered!', 'success');
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        setVideoFile(null);
        loadVideos();
      }
    } catch (err) {
      console.error(err);
      onShowToast(err.message || 'Error processing media upload.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (window.confirm('Are you sure you want to delete this interactive video module? All student scores will be removed.')) {
      try {
        const res = await fetchAPI(`/videos/${id}`, { method: 'DELETE' });
        if (res.success) {
          onShowToast('Video module removed successfully.', 'success');
          loadVideos();
        }
      } catch (err) {
        onShowToast('Failed to delete video module.', 'error');
      }
    }
  };

  // Open sharing links modal
  const handleShareVideo = async (videoItem) => {
    try {
      const shareRes = await fetchAPI(`/videos/${videoItem._id}/share`, { method: 'POST' });
      if (shareRes.success) {
        setShareData({
          title: videoItem.title,
          url: shareRes.shareUrl
        });
      }
    } catch (err) {
      onShowToast('Failed to generate sharing URL.', 'error');
    }
  };

  // Open analytics overlay
  const handleViewAnalytics = async (videoItem) => {
    try {
      setLoading(true);
      const res = await fetchAPI(`/videos/${videoItem._id}/analytics`);
      if (res.success) {
        setAnalyticsVideo(videoItem);
        setAnalyticsData(res.analytics);
      }
    } catch (err) {
      onShowToast('Failed to compile engagement analytics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (headers, data, filename) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportAttempts = () => {
    if (!analyticsData || !analyticsVideo) return;
    const headers = ['Student Name', 'Branch/Dept', 'Score', 'Max Score', 'Percentage', 'Time Taken (sec)', 'Date'];
    const data = analyticsData.recentAttempts.map(a => [
      a.user ? a.user.name : a.guestInfo?.name || 'Guest',
      a.guestInfo?.branch || 'IT Dept',
      a.totalScore,
      a.maxScore,
      a.percentage,
      a.timeTaken,
      new Date(a.createdAt).toLocaleDateString()
    ]);
    downloadCSV(headers, data, `${analyticsVideo.title.replace(/\s+/g, '_')}_VideoAttempts.csv`);
  };

  // -------------------------------------------------------------
  // INTERACTION BUILDER FUNCTIONS
  // -------------------------------------------------------------
  const [editorInteractions, setEditorInteractions] = useState([]);
  
  const handleOpenInteractionEditor = (videoItem) => {
    setInteractionEditorVideo(videoItem);
    setEditorInteractions(videoItem.interactions || []);
  };

  const handleAddInteraction = () => {
    setEditorInteractions(prev => [
      ...prev,
      {
        timestamp: 0,
        questionType: 'MCQ',
        questionText: '',
        options: ['', ''],
        correctAnswerIndex: 0,
        explanation: '',
        pauseVideo: true,
        preventSkip: true
      }
    ]);
  };

  const handleRemoveInteraction = (idx) => {
    setEditorInteractions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleInteractionFieldChange = (idx, field, val) => {
    setEditorInteractions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleOptionChange = (qIdx, optIdx, val) => {
    setEditorInteractions(prev => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      opts[optIdx] = val;
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  const handleAddOption = (qIdx) => {
    setEditorInteractions(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], options: [...copy[qIdx].options, ''] };
      return copy;
    });
  };

  const handleRemoveOption = (qIdx, optIdx) => {
    setEditorInteractions(prev => {
      const copy = [...prev];
      if (copy[qIdx].options.length > 2) {
        copy[qIdx] = { 
          ...copy[qIdx], 
          options: copy[qIdx].options.filter((_, i) => i !== optIdx),
          // Reset correct answer if it was the one deleted or now out of bounds
          correctAnswerIndex: 0
        };
      }
      return copy;
    });
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        const imported = [];

        // Headers: Question,Option A,Option B,Option C,Option D,Correct Answer,Timestamp
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].map(col => col.trim().replace(/^"|"$/g, ''));
          if (cols.length < 2 || !cols[0]) continue;

          const questionText = cols[0];
          const opts = [cols[1], cols[2], cols[3], cols[4]].filter(Boolean);
          const correctAnsChar = cols[5] || 'A';
          const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctAnsChar.toUpperCase());
          const tsVal = cols[6] || '00:00';
          const timestamp = tsVal.includes(':') ? MMSSToSeconds(tsVal) : Number(tsVal) || 0;

          imported.push({
            timestamp,
            questionType: opts.length === 2 && (opts[0] === 'True' || opts[0] === 'False') ? 'TrueFalse' : 'MCQ',
            questionText,
            options: opts,
            correctAnswerIndex: correctIdx >= 0 ? correctIdx : 0,
            explanation: 'Imported from syllabus spreadsheet.',
            pauseVideo: true,
            preventSkip: true
          });
        }

        if (imported.length > 0) {
          setEditorInteractions(prev => [...prev, ...imported]);
          onShowToast(`Successfully imported ${imported.length} questions from CSV!`, 'success');
        } else {
          onShowToast('No valid question rows found in CSV.', 'error');
        }
      } catch (err) {
        console.error(err);
        onShowToast('Error parsing CSV file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const handleAIGenerate = (e) => {
    e.preventDefault();
    if (!transcriptInput.trim()) return;

    const generated = [];
    const textLower = transcriptInput.toLowerCase();

    if (textLower.includes('temperature') || textLower.includes('randomness')) {
      generated.push({
        timestamp: 45,
        questionType: 'MCQ',
        questionText: 'What LLM setting controls output creativity and randomness?',
        options: ['Presence Penalty', 'Temperature', 'Frequency Penalty', 'Top-P Settings'],
        correctAnswerIndex: 1,
        explanation: 'AI-generated based on transcript match for "temperature".',
        pauseVideo: true,
        preventSkip: true
      });
    }

    if (textLower.includes('rag') || textLower.includes('retrieval')) {
      generated.push({
        timestamp: 180,
        questionType: 'MCQ',
        questionText: 'What architecture lets models query external document content directly?',
        options: ['Fine-Tuning', 'Retrieval-Augmented Generation (RAG)', 'Few-Shot engineering', 'Reinforcement learning'],
        correctAnswerIndex: 1,
        explanation: 'AI-generated based on transcript match for "RAG".',
        pauseVideo: true,
        preventSkip: true
      });
    }

    if (generated.length === 0) {
      generated.push({
        timestamp: 60,
        questionType: 'Reflection',
        questionText: 'Reflect on how LLM configurations affect academic workflows.',
        options: [],
        pauseVideo: true,
        preventSkip: false
      });
      generated.push({
        timestamp: 120,
        questionType: 'Poll',
        questionText: 'How confident do you feel with prompt configurations?',
        options: ['Excellent', 'Good', 'Need practice', 'Confused'],
        pauseVideo: true,
        preventSkip: false
      });
    }

    setEditorInteractions(prev => [...prev, ...generated]);
    setShowAIModal(false);
    setTranscriptInput('');
    onShowToast(`AI generated ${generated.length} question overlays from transcript!`, 'success');
  };

  const handleSaveInteractions = async () => {
    // Basic verification
    const invalid = editorInteractions.find(q => !q.questionText || q.options.some(o => !o));
    if (invalid) {
      onShowToast('Please fill all question fields and answer option text.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetchAPI(`/videos/${interactionEditorVideo._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          interactions: editorInteractions
        })
      });

      if (res.success) {
        onShowToast('Timeline interactions updated successfully!', 'success');
        setInteractionEditorVideo(null);
        loadVideos();
      }
    } catch (err) {
      onShowToast('Failed to save timeline questions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // RENDERING WRAPPERS
  // -------------------------------------------------------------

  if (interactionEditorVideo) {
    /* TIMELINE QUESTIONS CONFIGURE SCREEN */
    return (
      <div className="space-y-6 font-sans">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setInteractionEditorVideo(null)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider">H5P Editor</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Timeline Configurator: "{interactionEditorVideo.title}"
            </h2>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <p className="text-xs text-slate-400">
            Define MCQ, True/False, or Fill-in-the-Blank triggers at specific timestamps.
          </p>
          <div className="flex space-x-3 items-center">
            <input 
              type="file" 
              id="csv-import-input" 
              accept=".csv" 
              onChange={handleCSVImport} 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => document.getElementById('csv-import-input').click()}
              className="px-4 py-2 bg-purple-650 text-white font-bold text-xs rounded-xl hover:opacity-90 flex items-center space-x-1 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              className="px-4 py-2 bg-indigo-650 text-white font-bold text-xs rounded-xl hover:opacity-90 flex items-center space-x-1 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-yashada-gold fill-yashada-gold" />
              <span>AI Generate</span>
            </button>
            <button
              onClick={handleAddInteraction}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:opacity-90 flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Trigger</span>
            </button>
            <button
              onClick={handleSaveInteractions}
              className="px-4 py-2 bg-yashada-gold text-yashada-navy font-bold text-xs rounded-xl shadow-md hover:opacity-90 flex items-center space-x-1 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Configs</span>
            </button>
          </div>
        </div>

        <div className="space-y-6 max-w-4xl">
          {editorInteractions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-450 text-xs space-y-3">
              <HelpCircle className="h-10 w-10 text-yashada-gold mx-auto" />
              <p>No interactive questions placed yet. Click "Add Trigger" to start.</p>
            </div>
          ) : (
            editorInteractions.map((q, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative shadow-sm space-y-4"
              >
                {/* Delete button */}
                <button
                  onClick={() => handleRemoveInteraction(idx)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Remove Interaction"
                >
                  <Trash className="h-4.5 w-4.5" />
                </button>

                {/* Configuration header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Timestamp (MM:SS) *</label>
                    <input
                      type="text"
                      value={secondsToMMSS(q.timestamp)}
                      onChange={(e) => handleInteractionFieldChange(idx, 'timestamp', MMSSToSeconds(e.target.value))}
                      placeholder="02:30"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-slate-800 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Question Layout Type</label>
                    <select
                      value={q.questionType}
                      onChange={(e) => {
                        const val = e.target.value;
                        let defaultOpts = ['', ''];
                        if (val === 'TrueFalse') {
                          defaultOpts = ['True', 'False'];
                        } else if (val === 'Reflection') {
                          defaultOpts = [];
                        } else if (val === 'Poll') {
                          defaultOpts = ['', '', '', ''];
                        }
                        handleInteractionFieldChange(idx, 'questionType', val);
                        handleInteractionFieldChange(idx, 'options', defaultOpts);
                        handleInteractionFieldChange(idx, 'correctAnswerIndex', 0);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-slate-800 dark:text-white"
                    >
                      <option value="MCQ">Multiple Choice (MCQ)</option>
                      <option value="TrueFalse">True / False</option>
                      <option value="Reflection">Reflection Prompt</option>
                      <option value="Poll">Feedback Poll</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-6 pt-5">
                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.pauseVideo}
                        onChange={(e) => handleInteractionFieldChange(idx, 'pauseVideo', e.target.checked)}
                        className="rounded border-slate-350 text-yashada-gold focus:ring-yashada-gold"
                      />
                      <span>Auto-Pause Video</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.preventSkip}
                        onChange={(e) => handleInteractionFieldChange(idx, 'preventSkip', e.target.checked)}
                        className="rounded border-slate-350 text-yashada-gold focus:ring-yashada-gold"
                      />
                      <span>Timeline Lock (Skip Blk)</span>
                    </label>
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Question Content Text *</label>
                  <input
                    type="text"
                    value={q.questionText}
                    onChange={(e) => handleInteractionFieldChange(idx, 'questionText', e.target.value)}
                    placeholder="Enter the quiz question..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-slate-800 dark:text-white"
                    required
                  />
                </div>

                {/* Options and choices builder */}
                {q.questionType !== 'Reflection' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Answer Choices</label>
                        {(q.questionType === 'MCQ' || q.questionType === 'Poll') && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="text-[10px] font-bold text-yashada-gold hover:underline"
                          >
                            + Add Choice
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center space-x-2">
                            {q.questionType !== 'Poll' && (
                              <input
                                type="radio"
                                name={`correct_${idx}`}
                                checked={q.correctAnswerIndex === oIdx}
                                onChange={() => handleInteractionFieldChange(idx, 'correctAnswerIndex', oIdx)}
                                className="text-yashada-gold focus:ring-yashada-gold h-4 w-4"
                                title="Set as correct answer"
                              />
                            )}
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                              disabled={q.questionType === 'TrueFalse'}
                              placeholder={`Choice ${oIdx + 1}`}
                              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none text-slate-800 dark:text-white"
                              required
                            />
                            {(q.questionType === 'MCQ' || q.questionType === 'Poll') && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx, oIdx)}
                                className="text-slate-450 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation feedback */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Solution Explanation</label>
                      <textarea
                        rows={4}
                        value={q.explanation}
                        onChange={(e) => handleInteractionFieldChange(idx, 'explanation', e.target.value)}
                        placeholder="Explain the solution detail to students after they submit their answer..."
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-white leading-relaxed"
                      ></textarea>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl text-slate-450 text-xs">
                    Reflection Prompt: The video will automatically pause at this timestamp and prompt the user to write their thoughts or simply continue. No option selection is required.
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (analyticsVideo && analyticsData) {
    /* ENGAGEMENT ANALYTICS VIEWER SCREEN */
    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center border-b border-slate-250 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setAnalyticsVideo(null);
                setAnalyticsData(null);
              }}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider">Engagement Analytics</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Dashboard: "{analyticsVideo.title}"
              </h2>
            </div>
          </div>

          <button
            onClick={handleExportAttempts}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:opacity-90 flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Overview boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Play Sessions</span>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{analyticsData.totalViews}</p>
          </div>
          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion Rate</span>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{analyticsData.completionRate}%</p>
          </div>
          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Score</span>
            <p className="text-2xl font-bold text-yashada-gold mt-1">
              {analyticsData.averageScore} / {analyticsData.maxScore}
            </p>
          </div>
          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quiz Points Placed</span>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{analyticsData.maxScore}</p>
          </div>
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drop-off chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Viewer Drop-off Trend (deciles)</h3>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.dropOffBins} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dropoffColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#D4AF37" fillOpacity={1} fill="url(#dropoffColor)" name="Viewers Active" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Question-wise stats */}
          <div className="lg:col-span-1 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Accuracy Ratios</h3>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.questionStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="timestamp" tickFormatter={(t) => `${Math.round(t)}s`} stroke="#94A3B8" />
                  <YAxis max={100} stroke="#94A3B8" />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="successRate" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Attempts Log Table */}
        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Player Session Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Department / Branch</th>
                  <th className="px-6 py-4">Grade Score</th>
                  <th className="px-6 py-4">Accuracy</th>
                  <th className="px-6 py-4">Time Played</th>
                  <th className="px-6 py-4">Date Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {analyticsData.recentAttempts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400 text-xs">
                      No attempts registered for this video module yet.
                    </td>
                  </tr>
                ) : (
                  analyticsData.recentAttempts.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {a.user ? a.user.name : a.guestInfo?.name || 'Guest Student'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {a.guestInfo?.branch || 'IT Dept'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">
                        {a.totalScore} / {a.maxScore}
                      </td>
                      <td className="px-6 py-4 font-semibold text-yashada-gold">
                        {a.percentage}%
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {a.timeTaken}s
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Interactive Video Modules
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 hover:opacity-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Interactive Video</span>
        </button>
      </div>

      {/* Video catalog table list */}
      <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Video Module Title</th>
                <th className="px-6 py-4">Timeline Questions</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4">Date Uploaded</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <SkeletonRow columns={5} rows={3} />
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-450 text-xs">
                    No interactive video modules found. Click "Upload Interactive Video" to start.
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Play className="h-3.5 w-3.5 fill-yashada-gold text-yashada-gold" />
                        <span>{v.title}</span>
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5 ml-5.5">{v.description || 'No description.'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-250/20 rounded-full text-xs font-semibold">
                        {v.interactions?.length || 0} Questions
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-550 dark:text-slate-400">
                      {v.createdBy?.name || 'Instructor'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center space-x-2">
                        <button
                          onClick={() => handleViewAnalytics(v)}
                          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-300 rounded-lg cursor-pointer"
                          title="View Engagement Analytics"
                        >
                          <BarChart2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleShareVideo(v)}
                          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-300 rounded-lg cursor-pointer"
                          title="Get Shareable Links &amp; Embeds"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenInteractionEditor(v)}
                          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-300 rounded-lg cursor-pointer"
                          title="Configure H5P questions"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(v._id)}
                          className="p-2 border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg cursor-pointer"
                          title="Delete Video module"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / UPLOAD MODAL POPUP */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-serif font-bold text-white">Upload Training Video</h3>
                <p className="text-[10px] text-slate-400">Direct binary storage file negotiation.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVideo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Video Module Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Generative AI"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-white"
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description / Objectives</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter module description..."
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-white"
                  disabled={isUploading}
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Video File (.mp4) *</label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/30 rounded-xl p-6 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-slate-500 mx-auto" />
                    <span className="text-xs font-semibold text-slate-400 block">
                      {videoFile ? videoFile.name : 'Click to select mp4 file'}
                    </span>
                    <span className="text-[9px] text-slate-550 block">Max size: 50MB</span>
                  </div>
                </div>
              </div>

              {/* Client-side Video Preview Card */}
              {videoFile && previewUrl && (
                <div className="space-y-2 bg-slate-900/50 p-3 border border-slate-800 rounded-2xl">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-450">
                    <span>Selected Video Preview</span>
                    <span>{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <video 
                    src={previewUrl} 
                    controls 
                    className="w-full aspect-video rounded-xl bg-black border border-slate-800" 
                  />
                </div>
              )}

              {isUploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[10px] text-yashada-gold font-bold">
                    <span>UPLOADING TO SECURE STORAGE...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${uploadProgress}%` }}
                      className="h-full bg-yashada-gold rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3 bg-yashada-gold text-yashada-navy font-bold rounded-xl text-xs shadow-lg hover:opacity-95 flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isUploading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload &amp; Register</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share / QR popup */}
      {shareData && (
        <ShareModal
          title={shareData.title}
          url={shareData.url}
          onClose={() => setShareData(null)}
          onShowToast={onShowToast}
        />
      )}

      {/* AI TRANSCRIPT MODAL */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-serif font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-yashada-gold fill-yashada-gold" />
                  <span>AI Interactive Quiz Builder</span>
                </h3>
                <p className="text-[10px] text-slate-400">Generate question triggers from lesson transcript.</p>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAIGenerate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Video Lesson Transcript</label>
                <textarea
                  rows={6}
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  placeholder="Paste video transcript here (e.g. mention 'temperature settings control randomness' or 'RAG retrieval architecture')..."
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-white leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-yashada-gold text-yashada-navy font-bold rounded-xl text-xs shadow-lg hover:opacity-95 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 fill-yashada-navy" />
                <span>Generate Question Overlays</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideosManager;
