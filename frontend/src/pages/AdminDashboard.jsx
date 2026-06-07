import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Edit3, Eye, Link2, Download, Search, Filter,
  Clock, ClipboardCheck, BookOpen, Users, Settings, Activity,
  Check, Copy, PlusCircle, QrCode, ArrowLeft, RefreshCw, LogOut, Award, ArrowUpRight,
  Play
} from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { LoadingSpinner, SkeletonRow, PageLoader } from '../components/Loader';
import ShareModal from '../components/ShareModal';
import VideosManager from '../components/VideosManager';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend
} from 'recharts';

const AdminDashboard = ({ admin, onShowToast }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // overview, rubrics, quizzes, logs
  const [loading, setLoading] = useState(true);

  // Dashboard Metrics
  const [stats, setStats] = useState({
    totalRubrics: 0,
    totalQuizzes: 0,
    totalFeedback: 0,
    totalParticipants: 0,
    recentActivity: []
  });

  // Data lists
  const [rubrics, setRubrics] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Builders state (null when not editing/creating, otherwise holds builder data)
  const [rubricBuilder, setRubricBuilder] = useState(null);
  const [quizBuilder, setQuizBuilder] = useState(null);

  // Response Viewer state (null if not viewing response details)
  const [viewingResponses, setViewingResponses] = useState(null); // { type: 'rubric' | 'quiz', item: Rubric/Quiz, data: [] }
  const [viewingAnalytics, setViewingAnalytics] = useState(null); // rubric analytics details

  // Sharing URL helpers
  const [shareData, setShareData] = useState(null); // { title, url }

  // Load baseline statistics
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [rubricRes, quizRes, logsRes] = await Promise.all([
        fetchAPI('/rubrics'),
        fetchAPI('/quizzes'),
        fetchAPI('/auth/logs')
      ]);

      if (rubricRes.success && quizRes.success) {
        setRubrics(rubricRes.rubrics);
        setQuizzes(quizRes.quizzes);
        setActivityLogs(logsRes.logs || []);

        // Compute metrics counts
        // Rubrics responses count is fetched dynamically, let's set mock baseline counts if 0 or count actuals
        const totalRub = rubricRes.rubrics.length;
        const totalQ = quizRes.quizzes.length;

        setStats({
          totalRubrics: totalRub,
          totalQuizzes: totalQ,
          totalFeedback: 0, // calculated below or populated dynamically
          totalParticipants: 0,
          recentActivity: logsRes.logs ? logsRes.logs.slice(0, 5) : []
        });
      }
    } catch (err) {
      console.error(err);
      onShowToast('Error refreshing panel statistics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  // CSV Exporter Helper
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

  // 1. DELETE ACTION
  const handleDeleteRubric = async (id) => {
    if (window.confirm('WARNING: Deleting this rubric will remove all participant feedback logs. Continue?')) {
      try {
        const res = await fetchAPI(`/rubrics/${id}`, { method: 'DELETE' });
        if (res.success) {
          onShowToast('Rubric removed successfully.', 'success');
          loadDashboardData();
        }
      } catch (err) {
        onShowToast(err.message || 'Failed to delete rubric.', 'error');
      }
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (window.confirm('WARNING: Deleting this quiz will remove all candidate score records. Continue?')) {
      try {
        const res = await fetchAPI(`/quizzes/${id}`, { method: 'DELETE' });
        if (res.success) {
          onShowToast('Quiz removed successfully.', 'success');
          loadDashboardData();
        }
      } catch (err) {
        onShowToast(err.message || 'Failed to delete quiz.', 'error');
      }
    }
  };

  // 2. VIEW RESPONSES & EXPORTS
  const handleViewRubricResponses = async (rubricItem) => {
    setLoading(true);
    try {
      const res = await fetchAPI(`/rubrics/${rubricItem._id}/responses`);
      const ana = await fetchAPI(`/rubrics/${rubricItem._id}/analytics`);
      if (res.success && ana.success) {
        setViewingResponses({ type: 'rubric', item: rubricItem, data: res.responses });
        setViewingAnalytics(ana.analytics);
      }
    } catch (err) {
      onShowToast('Failed to load feedback details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuizAttempts = async (quizItem) => {
    setLoading(true);
    try {
      const res = await fetchAPI(`/quizzes/${quizItem._id}/attempts`);
      if (res.success) {
        setViewingResponses({ type: 'quiz', item: quizItem, data: res.attempts });
      }
    } catch (err) {
      onShowToast('Failed to load candidate marks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportRubricResponses = (rubricTitle, responses) => {
    const headers = ['Respondent Name', 'Branch/Dept', 'Email', 'Total Score', 'Average Rating', 'Feedback Text', 'Date'];
    const data = responses.map(r => [
      r.respondentName,
      r.respondentBranch,
      r.respondentEmail || '',
      r.totalScore,
      r.averageScore,
      r.feedbackText || '',
      new Date(r.createdAt).toLocaleDateString()
    ]);
    downloadCSV(headers, data, `${rubricTitle.replace(/\s+/g, '_')}_Feedback.csv`);
  };

  const handleExportQuizAttempts = (quizTitle, attempts) => {
    const headers = ['Participant Name', 'Branch/Dept', 'Score', 'Max Score', 'Percentage', 'Time Taken (sec)', 'Date'];
    const data = attempts.map(a => [
      a.participantName,
      a.participantBranch,
      a.totalScore,
      a.maxScore,
      a.percentage,
      a.timeTaken,
      new Date(a.createdAt).toLocaleDateString()
    ]);
    downloadCSV(headers, data, `${quizTitle.replace(/\s+/g, '_')}_Candidates.csv`);
  };

  // 3. SHARING DIALOG
  const triggerShare = (type, id, title) => {
    const baseUrl = window.location.origin;
    const path = type === 'rubric-run' ? `/feedback/${id}` : `/quiz/${id}`;
    setShareData({
      title,
      url: `${baseUrl}${path}`
    });
  };

  // 4. SUB-SECTION: GRAPHICAL OVERVIEW PANEL
  const renderOverview = () => {
    // Generate clean mock trends if database is mostly empty
    const attendanceTrend = [
      { date: 'Mon', attempts: rubrics.length > 0 ? 5 : 0, feedback: 3 },
      { date: 'Tue', attempts: rubrics.length > 0 ? 8 : 0, feedback: 6 },
      { date: 'Wed', attempts: rubrics.length > 0 ? 12 : 0, feedback: 10 },
      { date: 'Thu', attempts: rubrics.length > 0 ? 14 : 0, feedback: 8 },
      { date: 'Fri', attempts: rubrics.length > 0 ? 19 : 0, feedback: 15 }
    ];

    return (
      <div className="space-y-8 font-sans">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-navy/10 text-yashada-navy dark:bg-yashada-gold/10 dark:text-yashada-gold rounded-xl shrink-0">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Evaluation Rubrics</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{rubrics.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-navy/10 text-yashada-navy dark:bg-yashada-gold/10 dark:text-yashada-gold rounded-xl shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Active Quizzes</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{quizzes.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-navy/10 text-yashada-navy dark:bg-yashada-gold/10 dark:text-yashada-gold rounded-xl shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Total Audited Events</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{activityLogs.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-navy/10 text-yashada-navy dark:bg-yashada-gold/10 dark:text-yashada-gold rounded-xl shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Auditor Status</span>
              <p className="text-sm font-bold text-emerald-500 mt-1 flex items-center space-x-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>SYSTEM ONLINE</span>
              </p>
            </div>
          </div>
        </div>

        {/* Charts Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main area graph */}
          <div className="lg:col-span-2 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Evaluation Traffic Flow</h3>
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFeedback" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A2540" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0A2540" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="attempts" stroke="#D4AF37" fillOpacity={1} fill="url(#colorAttempts)" name="Quiz Attempts" />
                  <Area type="monotone" dataKey="feedback" stroke="#0A2540" fillOpacity={1} fill="url(#colorFeedback)" name="Rubric Feedback" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Audit Logs list */}
          <div className="lg:col-span-1 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Auditor Audit Logs</h3>
                <Activity className="h-4.5 w-4.5 text-slate-400" />
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto">
                {activityLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No logs generated yet.</p>
                ) : (
                  activityLogs.slice(0, 4).map((log, idx) => (
                    <div key={idx} className="flex items-start space-x-3 text-xs leading-normal">
                      <div className="w-1.5 h-1.5 rounded-full bg-yashada-gold shrink-0 mt-1.5"></div>
                      <div className="flex-1">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{log.action}</p>
                        <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('logs')}
              className="w-full py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              See All Logs
            </button>
          </div>

        </div>
      </div>
    );
  };

  // 5. SUB-SECTION: RUBRICS ADMIN VIEWER
  const renderRubricsTab = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Rubrics Vault</h2>
          <button
            onClick={() => handleOpenRubricBuilder()}
            className="px-4 py-2 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Rubric</span>
          </button>
        </div>

        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Rubric Assessment Title</th>
                  <th className="px-6 py-4">Parameters Count</th>
                  <th className="px-6 py-4">Grading Scale</th>
                  <th className="px-6 py-4">Date Created</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {rubrics.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-slate-400 text-xs">
                      No rubrics found. Click "Create Rubric" to construct a new evaluation matrix.
                    </td>
                  </tr>
                ) : (
                  rubrics.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{r.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{r.description || 'No description.'}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{r.parameters.length} Parameters</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{r.scaleMin} - {r.scaleMax}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => handleViewRubricResponses(r)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 dark:text-slate-300 rounded-lg"
                            title="View Responses &amp; Analytics"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerShare('rubric-run', r._id, r.title)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 dark:text-slate-300 rounded-lg"
                            title="Share assessment link"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenRubricBuilder(r)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 dark:text-slate-300 rounded-lg"
                            title="Edit structure"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRubric(r._id)}
                            className="p-2 border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg"
                            title="Delete Rubric"
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
      </div>
    );
  };

  // 6. SUB-SECTION: QUIZZES ADMIN VIEWER
  const renderQuizzesTab = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Quizzes Vault</h2>
          <button
            onClick={() => handleOpenQuizBuilder()}
            className="px-4 py-2 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Quiz</span>
          </button>
        </div>

        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Quiz Examination Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Questions Count</th>
                  <th className="px-6 py-4">Timer (minutes)</th>
                  <th className="px-6 py-4">Marking Rules</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {quizzes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400 text-xs">
                      No quizzes found. Click "Create Quiz" to construct a new MCQ test.
                    </td>
                  </tr>
                ) : (
                  quizzes.map((q) => (
                    <tr key={q._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{q.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{q.description || 'No description.'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full text-xs border border-blue-200/30">
                          {q.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{q.questions.length} Questions</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{q.timer > 0 ? `${q.timer}m` : 'Unlimited'}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">
                        <span>+{q.positiveMarks} / {q.negativeMarks > 0 ? `-${q.negativeMarks}` : '0'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => handleViewQuizAttempts(q)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 dark:text-slate-300 rounded-lg"
                            title="View Candidate Submissions"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerShare('quiz-run', q._id, q.title)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 dark:text-slate-300 rounded-lg"
                            title="Share examination link"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              navigate(`/leaderboard/${q._id}`);
                            }}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 dark:text-slate-300 rounded-lg cursor-pointer"
                            title="Open Quiz Leaderboard"
                          >
                            <Award className="h-4 w-4 text-yashada-gold" />
                          </button>
                          <button
                            onClick={() => handleOpenQuizBuilder(q)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 dark:text-slate-300 rounded-lg"
                            title="Edit questions"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(q._id)}
                            className="p-2 border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg"
                            title="Delete Quiz"
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
      </div>
    );
  };

  // 7. SUB-SECTION: DYNAMIC RUBRIC BUILDER MODULE
  const handleOpenRubricBuilder = (editItem = null) => {
    if (editItem) {
      setRubricBuilder(editItem);
    } else {
      setRubricBuilder({
        title: '',
        description: '',
        scaleMin: 1,
        scaleMax: 4,
        parameters: [
          {
            name: '',
            description: '',
            levels: [
              { level: 1, label: 'Beginning', description: '' },
              { level: 2, label: 'Developing', description: '' },
              { level: 3, label: 'Proficient', description: '' },
              { level: 4, label: 'Exemplary', description: '' }
            ]
          }
        ]
      });
    }
  };

  const handleSaveRubric = async (e) => {
    e.preventDefault();
    if (!rubricBuilder.title || rubricBuilder.parameters.length === 0) {
      onShowToast('Rubric Title and at least one parameter row is required.', 'error');
      return;
    }

    // Verify parameter fields are filled
    const invalidParam = rubricBuilder.parameters.find(p => !p.name || p.levels.find(l => !l.description));
    if (invalidParam) {
      onShowToast('Please fill all parameter names and their level descriptions.', 'error');
      return;
    }

    try {
      let data;
      if (rubricBuilder._id) {
        // Update
        data = await fetchAPI(`/rubrics/${rubricBuilder._id}`, {
          method: 'PUT',
          body: JSON.stringify(rubricBuilder)
        });
      } else {
        // Create
        data = await fetchAPI('/rubrics', {
          method: 'POST',
          body: JSON.stringify(rubricBuilder)
        });
      }

      if (data.success) {
        onShowToast(rubricBuilder._id ? 'Rubric structure updated!' : 'New Rubric generated successfully!', 'success');
        setRubricBuilder(null);
        loadDashboardData();
      }
    } catch (err) {
      onShowToast(err.message || 'Failed to save rubric.', 'error');
    }
  };

  const addBuilderParameter = () => {
    setRubricBuilder(prev => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        {
          name: '',
          description: '',
          levels: [
            { level: 1, label: 'Beginning', description: '' },
            { level: 2, label: 'Developing', description: '' },
            { level: 3, label: 'Proficient', description: '' },
            { level: 4, label: 'Exemplary', description: '' }
          ]
        }
      ]
    }));
  };

  const removeBuilderParameter = (idxToRemove) => {
    setRubricBuilder(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const updateBuilderParamField = (paramIdx, field, val) => {
    setRubricBuilder(prev => {
      const updatedParams = [...prev.parameters];
      updatedParams[paramIdx] = {
        ...updatedParams[paramIdx],
        [field]: val
      };
      return { ...prev, parameters: updatedParams };
    });
  };

  const updateBuilderLevelDesc = (paramIdx, levelNum, descVal) => {
    setRubricBuilder(prev => {
      const updatedParams = [...prev.parameters];
      const updatedLevels = updatedParams[paramIdx].levels.map(l => {
        if (l.level === levelNum) {
          return { ...l, description: descVal };
        }
        return l;
      });
      updatedParams[paramIdx] = {
        ...updatedParams[paramIdx],
        levels: updatedLevels
      };
      return { ...prev, parameters: updatedParams };
    });
  };

  const renderRubricBuilder = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setRubricBuilder(null)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider">Evaluation Construction</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {rubricBuilder._id ? `Edit Structure: "${rubricBuilder.title}"` : 'Construct New Rubric'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSaveRubric} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Metadata */}
          <div className="lg:col-span-1 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Assessment Title *</label>
              <input
                type="text"
                value={rubricBuilder.title}
                onChange={(e) => setRubricBuilder({ ...rubricBuilder, title: e.target.value })}
                placeholder="e.g. Digital Assets Rubric"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Description / Goal</label>
              <textarea
                rows={4}
                value={rubricBuilder.description}
                onChange={(e) => setRubricBuilder({ ...rubricBuilder, description: e.target.value })}
                placeholder="Describe assessment criteria..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl text-xs shadow"
            >
              Save Evaluation Matrix
            </button>
          </div>

          {/* Matrix builder */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluation Parameters Rows</h3>
              <button
                type="button"
                onClick={addBuilderParameter}
                className="text-xs font-bold text-yashada-gold flex items-center space-x-1 hover:underline"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Row Parameter</span>
              </button>
            </div>

            <div className="space-y-6">
              {rubricBuilder.parameters.map((param, pIdx) => (
                <div
                  key={pIdx}
                  className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 relative"
                >
                  {rubricBuilder.parameters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBuilderParameter(pIdx)}
                      className="absolute top-4 right-4 p-1 text-slate-400 hover:text-red-500"
                      title="Remove Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Param name & desc */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Parameter Name *</label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateBuilderParamField(pIdx, 'name', e.target.value)}
                        placeholder="e.g. Relevance &amp; Purpose Fit"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Helper Tooltip / Prompt Description</label>
                      <input
                        type="text"
                        value={param.description}
                        onChange={(e) => updateBuilderParamField(pIdx, 'description', e.target.value)}
                        placeholder="Describe parameter objective..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Level text description builders */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                    {[1, 2, 3, 4].map((levelNum) => {
                      const levelObj = param.levels.find(l => l.level === levelNum);
                      const labels = { 1: '1 - Beginning', 2: '2 - Developing', 3: '3 - Proficient', 4: '4 - Exemplary' };

                      return (
                        <div key={levelNum} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{labels[levelNum]}</label>
                          <textarea
                            rows={3}
                            value={levelObj ? levelObj.description : ''}
                            onChange={(e) => updateBuilderLevelDesc(pIdx, levelNum, e.target.value)}
                            placeholder={`Description for level ${levelNum}...`}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none leading-relaxed"
                            required
                          ></textarea>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    );
  };

  // 8. SUB-SECTION: DYNAMIC MCQ QUIZ BUILDER MODULE
  const handleOpenQuizBuilder = (editItem = null) => {
    if (editItem) {
      setQuizBuilder(editItem);
    } else {
      setQuizBuilder({
        title: '',
        description: '',
        category: 'Artificial Intelligence',
        timer: 5,
        positiveMarks: 1,
        negativeMarks: 0,
        shuffleQuestions: false,
        questions: [
          { text: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' }
        ]
      });
    }
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (!quizBuilder.title || quizBuilder.questions.length === 0) {
      onShowToast('Quiz Title and at least one question is required.', 'error');
      return;
    }

    // Verify questions fields
    const invalidQ = quizBuilder.questions.find(q => !q.text || q.options.find(o => !o));
    if (invalidQ) {
      onShowToast('Please fill all question texts and option inputs.', 'error');
      return;
    }

    try {
      let data;
      if (quizBuilder._id) {
        // Update
        data = await fetchAPI(`/quizzes/${quizBuilder._id}`, {
          method: 'PUT',
          body: JSON.stringify(quizBuilder)
        });
      } else {
        // Create
        data = await fetchAPI('/quizzes', {
          method: 'POST',
          body: JSON.stringify(quizBuilder)
        });
      }

      if (data.success) {
        onShowToast(quizBuilder._id ? 'Quiz updated successfully!' : 'New Examination Quiz generated!', 'success');
        setQuizBuilder(null);
        loadDashboardData();
      }
    } catch (err) {
      onShowToast(err.message || 'Failed to save quiz.', 'error');
    }
  };

  const addBuilderQuestion = () => {
    setQuizBuilder(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { text: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' }
      ]
    }));
  };

  const removeBuilderQuestion = (idxToRemove) => {
    setQuizBuilder(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const updateBuilderQField = (qIdx, field, val) => {
    setQuizBuilder(prev => {
      const updatedQs = [...prev.questions];
      updatedQs[qIdx] = {
        ...updatedQs[qIdx],
        [field]: val
      };
      return { ...prev, questions: updatedQs };
    });
  };

  const updateBuilderQOption = (qIdx, optIdx, val) => {
    setQuizBuilder(prev => {
      const updatedQs = [...prev.questions];
      const updatedOpts = [...updatedQs[qIdx].options];
      updatedOpts[optIdx] = val;
      updatedQs[qIdx] = {
        ...updatedQs[qIdx],
        options: updatedOpts
      };
      return { ...prev, questions: updatedQs };
    });
  };

  const renderQuizBuilder = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setQuizBuilder(null)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider">Exam Construction</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {quizBuilder._id ? `Edit Questions: "${quizBuilder.title}"` : 'Construct New Quiz'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSaveQuiz} className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Metadata Panel */}
          <div className="lg:col-span-1 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Quiz title *</label>
              <input
                type="text"
                value={quizBuilder.title}
                onChange={(e) => setQuizBuilder({ ...quizBuilder, title: e.target.value })}
                placeholder="e.g. AI Prompting Exam"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Category Tag *</label>
              <input
                type="text"
                value={quizBuilder.category}
                onChange={(e) => setQuizBuilder({ ...quizBuilder, category: e.target.value })}
                placeholder="e.g. Technology"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Duration (Minutes, 0 = unlimited)</label>
              <input
                type="number"
                min="0"
                value={quizBuilder.timer}
                onChange={(e) => setQuizBuilder({ ...quizBuilder, timer: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Correct Mark</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={quizBuilder.positiveMarks}
                  onChange={(e) => setQuizBuilder({ ...quizBuilder, positiveMarks: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Wrong Penalty</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={quizBuilder.negativeMarks}
                  onChange={(e) => setQuizBuilder({ ...quizBuilder, negativeMarks: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="shuffle"
                checked={quizBuilder.shuffleQuestions}
                onChange={(e) => setQuizBuilder({ ...quizBuilder, shuffleQuestions: e.target.checked })}
                className="rounded border-slate-350 accent-yashada-gold"
              />
              <label htmlFor="shuffle" className="text-xs text-slate-500 font-semibold select-none cursor-pointer">
                Shuffle Questions order
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl text-xs shadow mt-2"
            >
              Save Examination Quiz
            </button>
          </div>

          {/* MCQ list builder */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Questions Inventory</h3>
              <button
                type="button"
                onClick={addBuilderQuestion}
                className="text-xs font-bold text-yashada-gold flex items-center space-x-1 hover:underline"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Question Card</span>
              </button>
            </div>

            <div className="space-y-6">
              {quizBuilder.questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 relative"
                >
                  {quizBuilder.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBuilderQuestion(qIdx)}
                      className="absolute top-4 right-4 p-1 text-slate-400 hover:text-red-500"
                      title="Remove Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Question Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Question {qIdx + 1} Prompt Text *</label>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateBuilderQField(qIdx, 'text', e.target.value)}
                      placeholder="e.g. Which LLM setting controls creativity?"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      required
                    />
                  </div>

                  {/* 4 Choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map((optIdx) => {
                      const labels = { 0: 'Option A *', 1: 'Option B *', 2: 'Option C *', 3: 'Option D *' };
                      return (
                        <div key={optIdx} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{labels[optIdx]}</label>
                          <input
                            type="text"
                            value={q.options[optIdx] || ''}
                            onChange={(e) => updateBuilderQOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Choice ${String.fromCharCode(65 + optIdx)} text...`}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                            required
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Correct Index & Explanation */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-xs font-semibold text-slate-450">Correct Index Option</label>
                      <select
                        value={q.correctAnswerIndex}
                        onChange={(e) => updateBuilderQField(qIdx, 'correctAnswerIndex', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      >
                        <option value="0">Option A</option>
                        <option value="1">Option B</option>
                        <option value="2">Option C</option>
                        <option value="3">Option D</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Written Explanation / Reference</label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => updateBuilderQField(qIdx, 'explanation', e.target.value)}
                        placeholder="Explain why this choice is correct..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    );
  };

  // 9. SUB-SECTION: RESPONSES / ATTEMPTS LIST & ANALYTICS VIEWER
  const renderResponsesViewer = () => {
    const isRubric = viewingResponses.type === 'rubric';
    return (
      <div className="space-y-6 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setViewingResponses(null);
                setViewingAnalytics(null);
              }}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider">
                {isRubric ? 'Feedback Matrix Archive' : 'Quiz Examination attempts'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Submissions: "{viewingResponses.item.title}"
              </h2>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (isRubric) {
                  handleExportRubricResponses(viewingResponses.item.title, viewingResponses.data);
                } else {
                  handleExportQuizAttempts(viewingResponses.item.title, viewingResponses.data);
                }
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Rubrics Aggregate Parameter Analytics Grid (Custom Visualizer) */}
        {isRubric && viewingAnalytics && viewingAnalytics.totalResponses > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            {/* Visualizer Chart */}
            <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameter Ratings Averages</h3>
              <div className="h-60 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewingAnalytics.parameterAnalytics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="parameterName" stroke="#94A3B8" />
                    <YAxis domain={[0, 4]} stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="averageRating" fill="#D4AF37" radius={[6, 6, 0, 0]} name="Avg Rating" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance breakdowns */}
            <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score Statistics</h3>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Participants</span>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{viewingAnalytics.totalResponses}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Avg Total Score</span>
                  <p className="text-2xl font-bold text-yashada-gold mt-1">
                    {viewingAnalytics.averageTotalScore} <span className="text-xs text-slate-400 font-normal">/ {viewingResponses.item.parameters.length * 4}</span>
                  </p>
                </div>
              </div>

              {/* Row parameters ratings listing */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase">Parameter Ratings Details</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {viewingAnalytics.parameterAnalytics.map((pa, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{pa.parameterName}</span>
                      <span className="font-bold text-yashada-navy dark:text-yashada-gold font-mono">{pa.averageRating} / 4.0</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Responses Table list */}
        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Participant Name</th>
                  <th className="px-6 py-4">Branch / Department</th>
                  {isRubric ? (
                    <>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4 text-center">Avg rating</th>
                      <th className="px-6 py-4">General Remarks</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-center">Marks</th>
                      <th className="px-6 py-4 text-center">Accuracy %</th>
                      <th className="px-6 py-4 text-center">Time taken</th>
                    </>
                  )}
                  <th className="px-6 py-4">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {viewingResponses.data.length === 0 ? (
                  <tr>
                    <td colSpan={isRubric ? 6 : 5} className="text-center py-10 text-slate-400 text-xs">
                      No submissions recorded yet for this assessment.
                    </td>
                  </tr>
                ) : (
                  viewingResponses.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {row.respondentName || row.participantName}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {row.respondentBranch || row.participantBranch}
                      </td>

                      {isRubric ? (
                        <>
                          <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200">
                            {row.totalScore}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-yashada-gold font-semibold">
                            {row.averageScore}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs italic max-w-xs truncate">
                            {row.feedbackText || 'None.'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200">
                            {row.totalScore} <span className="text-xs text-slate-400 font-normal">/ {row.maxScore}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-yashada-gold">
                            {row.percentage}%
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                            {Math.floor(row.timeTaken / 60)}m {row.timeTaken % 60}s
                          </td>
                        </>
                      )}

                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(row.createdAt || row.submittedAt).toLocaleString()}
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
  };

  // 10. AUDIT LOG TAB
  const renderAuditLogsTab = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Administrative Session Audits</h2>
          <button
            onClick={loadDashboardData}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 text-slate-500"
            title="Refresh logs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Audit Action</th>
                  <th className="px-6 py-4">Source IP</th>
                  <th className="px-6 py-4">Date Time Stamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-10 text-slate-400 text-xs">No audited logs.</td>
                  </tr>
                ) : (
                  activityLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold">{log.action}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{log.ip || '127.0.0.1'}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[85vh] font-sans">

      {/* Sidebar Layout */}
      <aside className="w-full md:w-64 bg-yashada-navy text-slate-300 border-r border-slate-800 flex flex-col justify-between p-6 space-y-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
            <Settings className="h-5 w-5 text-yashada-gold" />
            <div>
              <span className="text-[10px] text-yashada-gold uppercase font-bold tracking-widest font-mono">Control Panel</span>
              <p className="text-sm font-bold font-serif text-white line-clamp-1">{admin.name}</p>
            </div>
          </div>

          <nav className="flex flex-col space-y-1.5 text-sm font-medium">
            <button
              onClick={() => {
                setActiveTab('overview');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'overview' && !rubricBuilder && !quizBuilder && !viewingResponses
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Activity className="h-4.5 w-4.5" />
              <span>Overview Analytics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('rubrics');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'rubrics' || rubricBuilder?.parameters !== undefined || viewingResponses?.type === 'rubric'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <ClipboardCheck className="h-4.5 w-4.5" />
              <span>Rubrics Manager</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('quizzes');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'quizzes' || quizBuilder?.questions !== undefined || viewingResponses?.type === 'quiz'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              <span>Quizzes Manager</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('videos');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'videos'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Play className="h-4.5 w-4.5" />
              <span>Interactive Videos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('logs');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'logs'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Audit System Logs</span>
            </button>
          </nav>
        </div>

        {/* Console stats */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-[10px] space-y-1.5 font-mono text-slate-400">
          <p className="font-bold text-slate-300">ADMIN SESSION:</p>
          <p>User: {admin.email}</p>
          <p>IP: 127.0.0.1</p>
        </div>
      </aside>

      {/* Main Console Workspace */}
      <main className="flex-1 bg-slate-50 dark:bg-[#0B0616] p-6 sm:p-8 overflow-y-auto">
        {loading ? (
          <PageLoader />
        ) : rubricBuilder ? (
          renderRubricBuilder()
        ) : quizBuilder ? (
          renderQuizBuilder()
        ) : viewingResponses ? (
          renderResponsesViewer()
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'rubrics' && renderRubricsTab()}
            {activeTab === 'quizzes' && renderQuizzesTab()}
            {activeTab === 'videos' && <VideosManager admin={admin} onShowToast={onShowToast} />}
            {activeTab === 'logs' && renderAuditLogsTab()}
          </>
        )}
      </main>

      {/* QR Share Modal overlay */}
      {shareData && (
        <ShareModal
          title={shareData.title}
          url={shareData.url}
          onClose={() => setShareData(null)}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};

export default AdminDashboard;
