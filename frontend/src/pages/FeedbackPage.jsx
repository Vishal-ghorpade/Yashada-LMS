import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ClipboardCheck, Sparkles, Send, ShieldAlert } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';
import confetti from 'canvas-confetti';

const FeedbackPage = ({ onShowToast }) => {
  const { rubricId } = useParams();
  const navigate = useNavigate();

  const [rubric, setRubric] = useState(null);
  const [loading, setLoading] = useState(true);

  // Respondent Info (Details Form)
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');

  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const [checkingAttempt, setCheckingAttempt] = useState(false);

  // Ratings: Map of parameterName -> level (1-4)
  const [ratings, setRatings] = useState({});
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    const loadRubric = async () => {
      try {
        const data = await fetchAPI(`/rubrics/${rubricId}`);
        if (data.success) {
          setRubric(data.rubric);
          // Initialize ratings structure
          const initialRatings = {};
          data.rubric.parameters.forEach(p => {
            initialRatings[p.name] = null;
          });
          setRatings(initialRatings);
        }
      } catch (err) {
        console.error(err);
        onShowToast('Failed to load rubric details.', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (rubricId) loadRubric();
  }, [rubricId, navigate]);

  if (loading) return <PageLoader />;
  if (!rubric) return null;

  const totalParams = rubric.parameters.length;
  const paramsRated = Object.values(ratings).filter(r => r !== null).length;
  const progressPercent = Math.round((paramsRated / totalParams) * 100);

  // Compute live scores
  const currentTotalScore = Object.values(ratings).reduce((acc, curr) => acc + (curr || 0), 0);
  const currentAverageScore = paramsRated > 0 ? (currentTotalScore / paramsRated).toFixed(2) : '0.00';
  const maxPossibleScore = totalParams * rubric.scaleMax;

  const selectRating = (paramName, level) => {
    setRatings(prev => ({
      ...prev,
      [paramName]: level
    }));
  };

  const getLevelStyle = (level, selected) => {
    switch (level) {
      case 1:
        return selected ? 'rubric-lvl-1 selected' : 'rubric-lvl-1';
      case 2:
        return selected ? 'rubric-lvl-2 selected' : 'rubric-lvl-2';
      case 3:
        return selected ? 'rubric-lvl-3 selected' : 'rubric-lvl-3';
      case 4:
        return selected ? 'rubric-lvl-4 selected' : 'rubric-lvl-4';
      default:
        return '';
    }
  };

  const getRatingHeaderBg = (level) => {
    switch (level) {
      case 1: return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200/50';
      case 2: return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50';
      case 3: return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/50';
      case 4: return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getRatingLabelText = (level) => {
    switch (level) {
      case 1: return '1 - Beginning';
      case 2: return '2 - Developing';
      case 3: return '3 - Proficient';
      case 4: return '4 - Exemplary';
      default: return '';
    }
  };

  const handleProceed = async (e) => {
    e.preventDefault();
    if (!name || !branch || !rollNumber) {
      onShowToast('Please fill out Name, Branch, and Roll Number / Employee ID.', 'error');
      return;
    }

    setCheckingAttempt(true);
    try {
      const data = await fetchAPI(`/rubrics/${rubricId}/check-attempt`, {
        method: 'POST',
        body: JSON.stringify({ rollNumber })
      });

      if (data.success) {
        if (data.exists) {
          onShowToast('You have already submitted feedback for this assessment (One attempt restricted).', 'error');
        } else {
          setDetailsSubmitted(true);
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to verify assessment restriction.', 'error');
    } finally {
      setCheckingAttempt(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (paramsRated < totalParams) {
      onShowToast('Please rate all evaluation parameters.', 'error');
      return;
    }

    try {
      const payload = {
        respondentName: name,
        respondentBranch: branch,
        rollNumber,
        respondentEmail: email,
        feedbackText: feedback,
        parameterRatings: Object.entries(ratings).map(([paramName, rating]) => ({
          parameterName: paramName,
          rating
        }))
      };

      const data = await fetchAPI(`/rubrics/${rubricId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.success) {
        setSubmissionResult(data.response);
        setSubmitted(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        onShowToast('Rubric assessment submitted successfully!', 'success');
      }
    } catch (err) {
      console.error(err);
      onShowToast(err.message || 'Failed to submit response.', 'error');
    }
  };

  // Render Section: Submission Successful
  if (submitted && submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 font-sans text-center space-y-8">
        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto scale-110 border border-emerald-500/20">
            <Sparkles className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-serif text-yashada-navy dark:text-white">Submission Successful!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Thank you, {submissionResult.respondentName}. Your evaluation has been saved under YASHADA Academic archives.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 max-w-sm mx-auto grid grid-cols-2 gap-4">
            <div className="text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Total Score</span>
              <p className="text-2xl font-extrabold text-yashada-navy dark:text-white mt-1">
                {submissionResult.totalScore} <span className="text-xs text-slate-400 font-normal">/ {submissionResult.maxScore}</span>
              </p>
            </div>
            <div className="text-center border-l border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Avg Rating</span>
              <p className="text-2xl font-extrabold text-yashada-navy dark:text-white mt-1">
                {submissionResult.averageScore} <span className="text-xs text-slate-400 font-normal">/ 4.0</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl hover:opacity-95 transition-all text-sm"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Render Section: Respondent Details Form First
  if (!detailsSubmitted) {
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
              <ClipboardCheck className="h-6 w-6 text-yashada-gold dark:text-yashada-navy" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-yashada-navy dark:text-white">Respondent details</h2>
            <p className="text-xs text-slate-400">
              Please enter your details before filling the feedback assessment.
            </p>
          </div>

          <form onSubmit={handleProceed} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Full Name *
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
                  Branch / Department *
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={checkingAttempt}
              className="w-full py-3 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl hover:opacity-95 shadow-md flex items-center justify-center space-x-2 transition-opacity"
            >
              <span>{checkingAttempt ? 'Verifying...' : 'Proceed to Feedback'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Section: Rubric Rating Form
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans space-y-8 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setDetailsSubmitted(false)}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Edit Details</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <span className="text-slate-400">Progress</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{paramsRated} / {totalParams} parameters rated</span>
          </div>
          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yashada-gold transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Header Banner */}
      <header className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-yashada-gold uppercase tracking-wider">
          <ClipboardCheck className="h-4 w-4" />
          <span>Academic Rubric Form</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-yashada-navy dark:text-white">{rubric.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-4xl">
          {rubric.description || 'Fill in the respondent parameters below and select the appropriate performance grade.'}
        </p>
      </header>

      {/* Main Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left column: Participant details summary */}
        <section className="lg:col-span-1 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-yashada-navy dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Respondent Info
          </h3>
          
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Full Name</span>
              <span className="font-medium text-slate-800 dark:text-white">{name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Branch / Dept</span>
              <span className="font-medium text-slate-800 dark:text-white">{branch}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Roll Number</span>
              <span className="font-medium text-slate-800 dark:text-white">{rollNumber}</span>
            </div>
            {email && (
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Email</span>
                <span className="font-medium text-slate-800 dark:text-white truncate block">{email}</span>
              </div>
            )}
          </div>

          {/* Live Score Preview in Sidebar */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 space-y-3 pt-3">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Metrics Calculator</h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-500">Live Score</span>
                <p className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">
                  {currentTotalScore} <span className="text-xs text-slate-400 font-normal">/{maxPossibleScore}</span>
                </p>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500">Avg Rating</span>
                <p className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">{currentAverageScore}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right columns: Rubric Matrix Grid */}
        <section className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[800px]">
                
                {/* Headers */}
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-1/4">
                      Evaluation Parameter
                    </th>
                    {[1, 2, 3, 4].map((level) => (
                      <th 
                        key={level}
                        className="px-4 py-4 text-center border-l border-slate-100 dark:border-slate-800 w-3/16"
                      >
                        <div className={`py-1.5 px-3 rounded-lg text-xs font-bold border inline-block ${getRatingHeaderBg(level)}`}>
                          {getRatingLabelText(level)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Rows */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rubric.parameters.map((param) => (
                    <tr key={param._id} className="hover:bg-slate-50/30 transition-colors">
                      
                      {/* Parameter Details */}
                      <td className="px-6 py-5 align-top">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{param.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{param.description}</p>
                      </td>

                      {/* Level Cells */}
                      {[1, 2, 3, 4].map((levelNum) => {
                        const levelData = param.levels.find(l => l.level === levelNum);
                        const isSelected = ratings[param.name] === levelNum;
                        
                        return (
                          <td 
                            key={levelNum}
                            onClick={() => selectRating(param.name, levelNum)}
                            className={`p-3 align-top text-xs border-l border-slate-100 dark:border-slate-800 ${getLevelStyle(levelNum, isSelected)}`}
                          >
                            <div className="flex flex-col h-full justify-between space-y-3">
                              <p className="leading-relaxed opacity-90">{levelData?.description}</p>
                              {isSelected && (
                                <div className="self-end p-0.5 bg-current text-white rounded-full flex items-center justify-center shrink-0">
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>

          {/* Feedback Textbox */}
          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <label className="text-sm font-bold text-slate-900 dark:text-white">Additional Comments / Remarks</label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback, suggestions for development, or observations..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
            ></textarea>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
            {paramsRated < totalParams && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium font-sans">
                Please score all parameters ({paramsRated}/{totalParams} done) to enable submission.
              </span>
            )}
            <button
              type="submit"
              disabled={paramsRated < totalParams}
              className="w-full sm:w-auto px-8 py-3 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl shadow-md hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center space-x-2"
            >
              <Send className="h-4.5 w-4.5" />
              <span>Submit Evaluation</span>
            </button>
          </div>

        </section>

      </form>
    </div>
  );
};

export default FeedbackPage;
