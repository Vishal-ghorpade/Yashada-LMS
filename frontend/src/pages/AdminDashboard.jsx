import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Edit3, Eye, Link2, Download, Search, Filter,
  Clock, ClipboardCheck, BookOpen, Users, Settings, Activity,
  Check, Copy, PlusCircle, QrCode, ArrowLeft, RefreshCw, LogOut, Award, ArrowUpRight,
  Play, Building, CheckCircle
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
  const [activeTab, setActiveTab] = useState('overview'); // overview, rubrics, quizzes, logs, departments, drilldown
  const [loading, setLoading] = useState(true);

  // Dashboard Metrics
  const [stats, setStats] = useState({
    totalRubrics: 0,
    totalQuizzes: 0,
    totalFeedback: 0,
    totalParticipants: 0,
    recentActivity: [],
    completionRate: 0,
    totalLearningHours: 0,
    activeLearners: 0
  });

  // Data lists
  const [rubrics, setRubrics] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [videos, setVideos] = useState([]);

  // Department CRUD / Assignment states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignDeptId, setAssignDeptId] = useState(null);
  const [assignUserIds, setAssignUserIds] = useState([]);

  // Drilldown states
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDeptDetails, setSelectedDeptDetails] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  // Builders state (null when not editing/creating, otherwise holds builder data)
  const [rubricBuilder, setRubricBuilder] = useState(null);
  const [quizBuilder, setQuizBuilder] = useState(null);
  const [courseBuilder, setCourseBuilder] = useState(null);

  // Response Viewer state (null if not viewing response details)
  const [viewingResponses, setViewingResponses] = useState(null); // { type: 'rubric' | 'quiz', item: Rubric/Quiz, data: [] }
  const [viewingAnalytics, setViewingAnalytics] = useState(null); // rubric analytics details

  // Sharing URL helpers
  const [shareData, setShareData] = useState(null); // { title, url }

  // Load baseline statistics
  const [firstLoad, setFirstLoad] = useState(true);
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [rubricRes, quizRes, logsRes, deptRes, userRes, courseRes, videoRes] = await Promise.all([
        fetchAPI('/rubrics'),
        fetchAPI('/quizzes'),
        fetchAPI('/auth/logs'),
        fetchAPI('/departments'),
        fetchAPI('/auth/users'),
        fetchAPI('/courses'),
        fetchAPI('/videos')
      ]);

      if (rubricRes.success && quizRes.success && courseRes.success) {
        setRubrics(rubricRes.rubrics);
        setQuizzes(quizRes.quizzes);
        setCourses(courseRes.courses);
        setActivityLogs(logsRes.logs || []);
        if (videoRes && videoRes.success) setVideos(videoRes.videos);

        if (deptRes.success) setDepartments(deptRes.departments);
        if (userRes.success) setAllUsers(userRes.users);

        // Compute metrics counts
        const totalRub = rubricRes.rubrics.length;
        const totalQ = quizRes.quizzes.length;

        // Calculate advanced metrics
        let totalHrs = 0;
        let activeLearnerCount = 0;
        if (userRes.success && userRes.users) {
          userRes.users.forEach(u => {
            totalHrs += (u.learningHours || 0);
            if (u.xp > 0) activeLearnerCount++;
          });
        }

        setStats({
          totalRubrics: totalRub,
          totalQuizzes: totalQ,
          totalFeedback: 0,
          totalParticipants: userRes.users ? userRes.users.length : 0,
          recentActivity: logsRes.logs ? logsRes.logs.slice(0, 5) : [],
          completionRate: deptRes.departments && deptRes.departments.length > 0 
            ? Math.round(deptRes.departments.reduce((acc, curr) => acc + (curr.avgProgress || 0), 0) / deptRes.departments.length)
            : 0,
          totalLearningHours: Math.round(totalHrs * 10) / 10,
          activeLearners: activeLearnerCount
        });
      }
    } catch (err) {
      console.error(err);
      onShowToast('Error refreshing panel statistics.', 'error');
    } finally {
      setLoading(false);
      setFirstLoad(false);
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

  // DEPARTMENT & DRILLDOWN METHODS
  const handleCreateOrUpdateDept = async (e) => {
    e.preventDefault();
    if (!deptName) return;
    try {
      let res;
      if (editingDeptId) {
        res = await fetchAPI(`/departments/${editingDeptId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: deptName, description: deptDesc })
        });
      } else {
        res = await fetchAPI('/departments', {
          method: 'POST',
          body: JSON.stringify({ name: deptName, description: deptDesc })
        });
      }
      if (res.success) {
        onShowToast(editingDeptId ? 'Department updated.' : 'Department created.', 'success');
        setShowDeptModal(false);
        setEditingDeptId(null);
        setDeptName('');
        setDeptDesc('');
        loadDashboardData();
      }
    } catch (err) {
      onShowToast(err.message || 'Failed to save department.', 'error');
    }
  };

  const handleDeleteDept = async (id) => {
    if (window.confirm('Are you sure you want to delete this department? All member user department assignments will be cleared.')) {
      try {
        const res = await fetchAPI(`/departments/${id}`, { method: 'DELETE' });
        if (res.success) {
          onShowToast('Department deleted.', 'success');
          loadDashboardData();
        }
      } catch (err) {
        onShowToast(err.message || 'Failed to delete department.', 'error');
      }
    }
  };

  const handleOpenAssignModal = (dept) => {
    setAssignDeptId(dept._id);
    const assignedIds = allUsers.filter(u => u.department?._id === dept._id).map(u => u._id || u.id);
    setAssignUserIds(assignedIds);
    setShowAssignModal(true);
  };

  const handleSaveAssignments = async () => {
    try {
      const res = await fetchAPI(`/departments/${assignDeptId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ userIds: assignUserIds })
      });
      if (res.success) {
        onShowToast('Users assigned successfully.', 'success');
        setShowAssignModal(false);
        loadDashboardData();
      }
    } catch (err) {
      onShowToast(err.message || 'Failed to assign users.', 'error');
    }
  };

  const toggleAssignUser = (userId) => {
    setAssignUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectDept = async (deptId) => {
    setSelectedDeptId(deptId);
    setSelectedUserId('');
    setSelectedUserDetails(null);
    if (!deptId) {
      setSelectedDeptDetails(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchAPI(`/departments/${deptId}`);
      if (res.success) {
        setSelectedDeptDetails(res);
      }
    } catch (err) {
      onShowToast('Failed to load department details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectUser = async (userId) => {
    setSelectedUserId(userId);
    setLoading(true);
    try {
      const res = await fetchAPI(`/departments/users/${userId}/progress`);
      if (res.success) {
        setSelectedUserDetails(res);
      }
    } catch (err) {
      onShowToast('Failed to inspect user progress.', 'error');
    } finally {
      setLoading(false);
    }
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
              <span className="text-xs text-slate-400 font-medium font-sans">Evaluation Rubrics</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{rubrics.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-navy/10 text-yashada-navy dark:bg-yashada-gold/10 dark:text-yashada-gold rounded-xl shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium font-sans">Active Quizzes</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{quizzes.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-navy/10 text-yashada-navy dark:bg-yashada-gold/10 dark:text-yashada-gold rounded-xl shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium font-sans">Total Study Hours</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{stats.totalLearningHours} hrs</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-navy/10 text-yashada-navy dark:bg-yashada-gold/10 dark:text-yashada-gold rounded-xl shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium font-sans">Avg Completion Rate</span>
              <p className="text-2xl font-bold text-emerald-500 mt-0.5">{stats.completionRate}%</p>
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

  // 8. SUB-SECTION: COURSES ADMIN VIEWER & BUILDER
  const handleDeleteCourse = async (id) => {
    if (window.confirm('WARNING: Deleting this course will remove all associated enrollment progress records. Continue?')) {
      try {
        const res = await fetchAPI(`/courses/${id}`, { method: 'DELETE' });
        if (res.success) {
          onShowToast('Course deleted successfully.', 'success');
          loadDashboardData();
        }
      } catch (err) {
        onShowToast(err.message || 'Failed to delete course.', 'error');
      }
    }
  };

  const handleOpenCourseBuilder = (editItem = null) => {
    if (editItem) {
      setCourseBuilder({
        _id: editItem._id,
        title: editItem.title,
        description: editItem.description || '',
        category: editItem.category,
        thumbnailUrl: editItem.thumbnailUrl || '',
        finalAssessment: editItem.finalAssessment?._id || editItem.finalAssessment || '',
        modules: editItem.modules || []
      });
    } else {
      setCourseBuilder({
        title: '',
        description: '',
        category: '',
        thumbnailUrl: '',
        finalAssessment: '',
        modules: [
          {
            title: 'Module 1: Getting Started',
            description: 'Introduction and setup.',
            items: []
          }
        ]
      });
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseBuilder.title || !courseBuilder.category) {
      onShowToast('Course Title and Category are required.', 'error');
      return;
    }

    try {
      let data;
      const payload = {
        title: courseBuilder.title,
        description: courseBuilder.description,
        category: courseBuilder.category,
        thumbnailUrl: courseBuilder.thumbnailUrl || undefined,
        modules: courseBuilder.modules,
        finalAssessment: courseBuilder.finalAssessment || undefined
      };

      if (courseBuilder._id) {
        data = await fetchAPI(`/courses/${courseBuilder._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        data = await fetchAPI('/courses', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (data.success) {
        onShowToast(courseBuilder._id ? 'Course updated successfully!' : 'New Course created successfully!', 'success');
        setCourseBuilder(null);
        loadDashboardData();
      }
    } catch (err) {
      onShowToast(err.message || 'Failed to save course.', 'error');
    }
  };

  const addBuilderModule = () => {
    setCourseBuilder(prev => ({
      ...prev,
      modules: [
        ...prev.modules,
        {
          title: `Module ${prev.modules.length + 1}: New Module`,
          description: '',
          items: []
        }
      ]
    }));
  };

  const removeBuilderModule = (modIdx) => {
    setCourseBuilder(prev => ({
      ...prev,
      modules: prev.modules.filter((_, idx) => idx !== modIdx)
    }));
  };

  const updateBuilderModField = (modIdx, field, val) => {
    setCourseBuilder(prev => {
      const updated = [...prev.modules];
      updated[modIdx] = {
        ...updated[modIdx],
        [field]: val
      };
      return { ...prev, modules: updated };
    });
  };

  const addBuilderModItem = (modIdx, type, itemId, title) => {
    if (!title || !itemId) return;
    setCourseBuilder(prev => {
      const updated = [...prev.modules];
      updated[modIdx] = {
        ...updated[modIdx],
        items: [
          ...updated[modIdx].items,
          { type, itemId, title }
        ]
      };
      return { ...prev, modules: updated };
    });
  };

  const removeBuilderModItem = (modIdx, itemIdx) => {
    setCourseBuilder(prev => {
      const updated = [...prev.modules];
      updated[modIdx] = {
        ...updated[modIdx],
        items: updated[modIdx].items.filter((_, idx) => idx !== itemIdx)
      };
      return { ...prev, modules: updated };
    });
  };

  const generateTempObjectId = () => {
    const chars = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 24; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  };

  const renderCoursesTab = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Courses Repository</h2>
          <button
            onClick={() => handleOpenCourseBuilder()}
            className="px-4 py-2 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 hover:opacity-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Course</span>
          </button>
        </div>

        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Course Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Modules Count</th>
                  <th className="px-6 py-4">Final Assessment</th>
                  <th className="px-6 py-4">Created By</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400 text-xs">
                      No courses found. Click "Create Course" to compile a new syllabus.
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center space-x-3">
                          {c.thumbnailUrl && (
                            <img src={c.thumbnailUrl} alt="" className="w-10 h-7 object-cover rounded-md" />
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{c.title}</div>
                            <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{c.description || 'No description.'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full text-xs border border-blue-200/30">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-left">{c.modules?.length || 0} Modules</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-left">
                        {c.finalAssessment?.title || (c.finalAssessment ? 'Quiz Assigned' : 'None')}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-left">
                        {c.createdBy?.name || 'Academic System'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => navigate(`/courses/${c._id}`)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-300 rounded-lg cursor-pointer"
                            title="Preview Student View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenCourseBuilder(c)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-300 rounded-lg cursor-pointer"
                            title="Edit curriculum syllabus"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c._id)}
                            className="p-2 border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg cursor-pointer"
                            title="Delete Course"
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

  const ModuleItemAdder = ({ onAddItem }) => {
    const [itemType, setItemType] = useState('video');
    const [selectedId, setSelectedId] = useState('');
    const [customTitle, setCustomTitle] = useState('');

    useEffect(() => {
      if (itemType === 'video' && videos.length > 0) {
        setSelectedId(videos[0]._id);
      } else if (itemType === 'quiz' && quizzes.length > 0) {
        setSelectedId(quizzes[0]._id);
      } else {
        setSelectedId('');
      }
    }, [itemType, videos, quizzes]);

    const handleSubmitItem = (e) => {
      e.preventDefault();
      if (itemType === 'reflection') {
        if (!customTitle.trim()) return;
        onAddItem(itemType, generateTempObjectId(), customTitle);
        setCustomTitle('');
      } else {
        if (!selectedId) return;
        let matchedTitle = '';
        if (itemType === 'video') {
          matchedTitle = videos.find(v => v._id === selectedId)?.title || 'Video Lesson';
        } else if (itemType === 'quiz') {
          matchedTitle = quizzes.find(q => q._id === selectedId)?.title || 'Quiz Evaluation';
        }
        onAddItem(itemType, selectedId, matchedTitle);
      }
    };

    return (
      <div className="bg-slate-905/30 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block text-left">Add Item to Module</span>
        <div className="flex flex-wrap gap-2.5 items-end">
          <div className="space-y-1 text-left">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Type</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="video">Video Lesson</option>
              <option value="quiz">Timed Quiz</option>
              <option value="reflection">Custom Reflection</option>
            </select>
          </div>

          {itemType === 'reflection' ? (
            <div className="flex-1 space-y-1 min-w-[150px] text-left">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Reflection Prompt Title</label>
              <input
                type="text"
                placeholder="e.g. Reflection: Generative AI in administration"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none text-slate-800 dark:text-white"
              />
            </div>
          ) : (
            <div className="flex-1 space-y-1 min-w-[150px] text-left">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Select Resource</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="">Choose item...</option>
                {itemType === 'video' ? (
                  videos.map(v => <option key={v._id} value={v._id}>{v.title}</option>)
                ) : (
                  quizzes.map(q => <option key={q._id} value={q._id}>{q.title}</option>)
                )}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmitItem}
            className="px-3.5 py-1.5 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold text-xs rounded-lg hover:opacity-90 cursor-pointer"
          >
            Add Item
          </button>
        </div>
      </div>
    );
  };

  const renderCourseBuilder = () => {
    return (
      <div className="space-y-6 font-sans text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCourseBuilder(null)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="text-left">
            <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider">Course Syllabus Editor</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {courseBuilder._id ? `Edit Course: "${courseBuilder.title}"` : 'Construct New Course'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSaveCourse} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Metadata Panel */}
          <div className="lg:col-span-1 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Course Title *</label>
              <input
                type="text"
                value={courseBuilder.title}
                onChange={(e) => setCourseBuilder({ ...courseBuilder, title: e.target.value })}
                placeholder="e.g. Generative AI Masterclass"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Category Tag *</label>
              <input
                type="text"
                value={courseBuilder.category}
                onChange={(e) => setCourseBuilder({ ...courseBuilder, category: e.target.value })}
                placeholder="e.g. Artificial Intelligence"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Description</label>
              <textarea
                rows={3}
                value={courseBuilder.description}
                onChange={(e) => setCourseBuilder({ ...courseBuilder, description: e.target.value })}
                placeholder="Brief summary of course content..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Thumbnail URL</label>
              <input
                type="text"
                value={courseBuilder.thumbnailUrl}
                onChange={(e) => setCourseBuilder({ ...courseBuilder, thumbnailUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Final Assessment Quiz</label>
              <select
                value={courseBuilder.finalAssessment}
                onChange={(e) => setCourseBuilder({ ...courseBuilder, finalAssessment: e.target.value })}
                className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="">No Final Assessment</option>
                {quizzes.map(q => <option key={q._id} value={q._id}>{q.title}</option>)}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl shadow cursor-pointer mt-2 hover:opacity-90 transition-opacity"
            >
              Save Course Syllabus
            </button>
          </div>

          {/* Syllabus Modules builder */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syllabus Modules ({courseBuilder.modules.length})</h3>
              <button
                type="button"
                onClick={addBuilderModule}
                className="text-xs font-bold text-yashada-gold flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Syllabus Module</span>
              </button>
            </div>

            {courseBuilder.modules.length === 0 ? (
              <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-400">
                No modules defined. Click "Add Syllabus Module" to start structuring the course.
              </div>
            ) : (
              <div className="space-y-6">
                {courseBuilder.modules.map((mod, modIdx) => (
                  <div
                    key={modIdx}
                    className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 relative text-left"
                  >
                    <button
                      type="button"
                      onClick={() => removeBuilderModule(modIdx)}
                      className="absolute top-6 right-6 p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      title="Remove Module"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Module Title *</label>
                        <input
                          type="text"
                          value={mod.title}
                          onChange={(e) => updateBuilderModField(modIdx, 'title', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none font-bold text-slate-850 dark:text-white"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Module Description</label>
                        <input
                          type="text"
                          value={mod.description || ''}
                          onChange={(e) => updateBuilderModField(modIdx, 'description', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Items Checklist / List */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="font-bold text-slate-450 uppercase tracking-wide block text-left">Module Syllabus Items</span>
                      
                      {mod.items.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic text-left">No syllabus items added to this module yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {mod.items.map((item, itemIdx) => (
                            <div 
                              key={itemIdx} 
                              className="px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/25 flex justify-between items-center"
                            >
                              <div className="space-y-0.5 truncate pr-2 text-left">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{item.title}</span>
                                <span className="text-[9px] uppercase font-bold text-yashada-gold font-mono">{item.type}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeBuilderModItem(modIdx, itemIdx)}
                                className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Item form */}
                      <ModuleItemAdder
                        onAddItem={(type, itemId, title) => addBuilderModItem(modIdx, type, itemId, title)}
                      />
                    </div>

                  </div>
                ))}
              </div>
            )}
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

  // 11. DEPARTMENTS CRUD PANEL
  const renderDepartmentsTab = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider font-serif">Department Matrix</h2>
          <button
            onClick={() => {
              setEditingDeptId(null);
              setDeptName('');
              setDeptDesc('');
              setShowDeptModal(true);
            }}
            className="px-4 py-2.5 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 hover:opacity-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Department</span>
          </button>
        </div>

        <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Department Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">User Count</th>
                  <th className="px-6 py-4 text-center">Avg Course Progress</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-slate-400 text-xs">
                      No departments configured yet. Click "Create Department" to start.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 text-slate-550 dark:text-slate-400 text-xs max-w-xs truncate">
                        {dept.description || 'No description.'}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-450 font-bold">
                        {dept.userCount}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-yashada-gold">
                        {dept.avgProgress}%
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => handleOpenAssignModal(dept)}
                            className="px-2.5 py-1.5 bg-yashada-navy/10 dark:bg-white/5 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-lg text-[10px] font-bold hover:bg-yashada-navy/15 cursor-pointer"
                            title="Assign users to department"
                          >
                            Assign Users
                          </button>
                          <button
                            onClick={() => {
                              setEditingDeptId(dept._id);
                              setDeptName(dept.name);
                              setDeptDesc(dept.description || '');
                              setShowDeptModal(true);
                            }}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 rounded-lg cursor-pointer"
                            title="Edit details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept._id)}
                            className="p-2 border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg cursor-pointer"
                            title="Delete Department"
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

        {/* DEPARTMENT CREATE/EDIT MODAL */}
        {showDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-serif font-bold text-white">
                {editingDeptId ? 'Update Department Details' : 'Configure New Department'}
              </h3>
              <form onSubmit={handleCreateOrUpdateDept} className="space-y-4 text-xs">
                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-400">Department Name *</label>
                  <input
                    type="text"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Finance, Public Health"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-400">Description</label>
                  <textarea
                    rows={3}
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Describe department responsibilities..."
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeptModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-yashada-gold text-yashada-navy rounded-xl font-bold hover:bg-yashada-gold-light cursor-pointer"
                  >
                    {editingDeptId ? 'Save Changes' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ASSIGN USERS MODAL */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between">
              <div className="space-y-1 border-b border-slate-800 pb-3">
                <h3 className="text-base font-serif font-bold text-white">
                  Assign Users to Department
                </h3>
                <p className="text-[10px] text-slate-400">
                  Select the users to bind to this department. Unchecked users will remain in their existing configs.
                </p>
              </div>

              <div className="overflow-y-auto my-3 space-y-2 flex-1 pr-1 custom-scrollbar text-xs">
                {allUsers.length === 0 ? (
                  <p className="text-center py-6 text-slate-500">No users found in database.</p>
                ) : (
                  allUsers.map((u) => {
                    const isChecked = assignUserIds.includes(u._id || u.id);
                    return (
                      <button
                        key={u._id || u.id}
                        type="button"
                        onClick={() => toggleAssignUser(u._id || u.id)}
                        className={`w-full p-3 text-left border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-yashada-gold/10 border-yashada-gold text-yashada-gold-light'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-750'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold block">{u.name}</span>
                          <span className="text-[10px] text-slate-450 block">
                            {u.designation || 'No Designation'} &bull; {u.email}
                          </span>
                        </div>
                        <div className={`w-4.5 h-4.5 border rounded-md flex items-center justify-center ${
                          isChecked ? 'bg-yashada-gold border-yashada-gold text-yashada-navy' : 'border-slate-600'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end gap-3.5 border-t border-slate-800 pt-3.5">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  className="px-4 py-2 bg-yashada-gold text-yashada-navy rounded-xl font-bold hover:bg-yashada-gold-light cursor-pointer"
                >
                  Save Assignments
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 12. DEPARTMENT DRILLDOWN ANALYTICS
  const renderDrilldownTab = () => {
    const activeMembers = selectedDeptDetails?.members || [];
    const inspectedEnrollments = selectedUserDetails?.enrollments || [];

    return (
      <div className="space-y-6 font-sans">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-150 dark:border-slate-800 pb-4">
          <div className="space-y-1 text-left">
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider font-serif">
              Department Drilldown Analytics
            </h2>
            <p className="text-xs text-slate-400">
              Drill down by Department &rarr; User &rarr; Course to inspect itemized training progress.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedDeptId}
              onChange={(e) => handleSelectDept(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-sans text-xs focus:outline-none focus:border-yashada-gold cursor-pointer"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedDeptDetails ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Department stats summary & member list */}
            <div className="lg:col-span-1 space-y-6">
              {/* Stats card */}
              <div className="bg-[#140D24] border border-yashada-gold/30 rounded-3xl p-5 shadow space-y-4">
                <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider block font-sans text-left">
                  {selectedDeptDetails.department?.name} Overview
                </span>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-sans text-left">
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-slate-450 block text-[9px] uppercase font-bold">Completion</span>
                    <span className="text-base font-extrabold text-white">{selectedDeptDetails.stats?.completionRate}%</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-slate-450 block text-[9px] uppercase font-bold">Study Hours</span>
                    <span className="text-base font-extrabold text-white">{selectedDeptDetails.stats?.totalLearningHours} hrs</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-slate-450 block text-[9px] uppercase font-bold">Active Users</span>
                    <span className="text-base font-extrabold text-emerald-400">{selectedDeptDetails.stats?.activeLearners}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-slate-450 block text-[9px] uppercase font-bold">Quiz Average</span>
                    <span className="text-base font-extrabold text-yashada-gold">{selectedDeptDetails.stats?.avgQuizScore}%</span>
                  </div>
                </div>
              </div>

              {/* Members table */}
              <div className="bg-white dark:bg-[#140D24] border border-slate-205 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-serif font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-white text-left">
                  Member Profiles ({activeMembers.length})
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto custom-scrollbar">
                  {activeMembers.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-450">No members assigned to this department.</p>
                  ) : (
                    activeMembers.map((m) => (
                      <div 
                        key={m._id} 
                        className={`p-4 flex justify-between items-center transition-colors ${
                          selectedUserId === m._id ? 'bg-yashada-gold/15' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                        }`}
                      >
                        <div className="space-y-0.5 text-left text-xs">
                          <h4 className="font-bold text-slate-800 dark:text-white">{m.name}</h4>
                          <p className="text-[10px] text-slate-450">{m.designation || 'Officer Trainee'}</p>
                          <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-slate-350 font-mono">
                            {m.xp} XP &bull; {m.learningHours || 0} hrs
                          </span>
                        </div>
                        <button
                          onClick={() => handleInspectUser(m._id)}
                          className="px-2.5 py-1.5 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Inspect User Course details */}
            <div className="lg:col-span-2 space-y-6">
              {selectedUserDetails ? (
                <div className="bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 text-left">
                  <div className="border-b border-slate-800 pb-4 space-y-1">
                    <span className="text-[9px] font-bold text-yashada-gold uppercase tracking-wider block">
                      Inspecting Learner Progress
                    </span>
                    <h3 className="text-lg font-serif font-bold text-white">
                      {selectedUserDetails.user?.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Designation: {selectedUserDetails.user?.designation || 'Learner Officer'} &bull; Email: {selectedUserDetails.user?.email}
                    </p>
                  </div>

                  {inspectedEnrollments.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      This user is not enrolled in any training courses.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h4 className="text-xs font-bold text-yashada-gold uppercase tracking-widest text-left">Enrolled Courses &amp; Modules</h4>
                      
                      <div className="space-y-4">
                        {inspectedEnrollments.map((enroll) => {
                          const c = enroll.course;
                          if (!c) return null;
                          return (
                            <div key={enroll._id} className="bg-white/5 border border-slate-800 rounded-2xl p-5 space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1 text-left">
                                  <h5 className="text-xs font-bold text-white font-serif">{c.title}</h5>
                                  <p className="text-[10px] text-slate-400">Completed items: {enroll.completedItems?.length || 0}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    enroll.completed 
                                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' 
                                      : 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                                  }`}>
                                    {enroll.completed ? 'Graduated' : 'In Progress'}
                                  </span>
                                  <p className="text-xs font-extrabold text-white font-mono mt-1">{enroll.progress}%</p>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yashada-gold"
                                  style={{ width: `${enroll.progress}%` }}
                                />
                              </div>

                              {/* Completed Items Checklist */}
                              <div className="pt-2.5 border-t border-slate-800 space-y-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block text-left">Course Items Checklist</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                  {c.modules?.flatMap(m => m.items || []).map((item, idx) => {
                                    const isItemCompleted = enroll.completedItems?.includes(`${item._id}` || `${item.itemId}`);
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                          isItemCompleted 
                                            ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-350 font-bold' 
                                            : 'bg-slate-900 border-slate-850 text-slate-400'
                                        }`}
                                      >
                                        <div className="space-y-0.5 text-left truncate pr-2">
                                          <span className="font-bold block truncate">{item.title}</span>
                                          <span className="text-[9px] uppercase text-slate-500 font-mono">{item.type}</span>
                                        </div>
                                        {isItemCompleted ? (
                                          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                                        ) : (
                                          <div className="w-4 h-4 border border-slate-650 rounded-full shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400 text-xs">
                  Select a member trainee from the left side panel to inspect itemized progress.
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400 text-xs">
            Please select a department above to retrieve trainee learning metrics.
          </div>
        )}
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
                setCourseBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'overview' && !rubricBuilder && !quizBuilder && !courseBuilder && !viewingResponses
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Activity className="h-4.5 w-4.5" />
              <span>Overview Analytics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('courses');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setCourseBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'courses' || courseBuilder !== null
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              <span>Courses Syllabus</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('rubrics');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setCourseBuilder(null);
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
                setCourseBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'quizzes' || quizBuilder?.questions !== undefined || viewingResponses?.type === 'quiz'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Award className="h-4.5 w-4.5" />
              <span>Quizzes Manager</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('videos');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setCourseBuilder(null);
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
                setActiveTab('departments');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setCourseBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'departments'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Building className="h-4.5 w-4.5" />
              <span>Departments Matrix</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('drilldown');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setCourseBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'drilldown'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Department Drilldown</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('logs');
                setRubricBuilder(null);
                setQuizBuilder(null);
                setCourseBuilder(null);
                setViewingResponses(null);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2.5 ${activeTab === 'logs'
                  ? 'bg-yashada-gold text-yashada-navy font-bold'
                  : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Activity className="h-4.5 w-4.5" />
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
        {loading && firstLoad ? (
          <PageLoader />
        ) : rubricBuilder ? (
          renderRubricBuilder()
        ) : quizBuilder ? (
          renderQuizBuilder()
        ) : courseBuilder ? (
          renderCourseBuilder()
        ) : viewingResponses ? (
          renderResponsesViewer()
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'courses' && renderCoursesTab()}
            {activeTab === 'rubrics' && renderRubricsTab()}
            {activeTab === 'quizzes' && renderQuizzesTab()}
            {activeTab === 'videos' && <VideosManager admin={admin} onShowToast={onShowToast} />}
            {activeTab === 'departments' && renderDepartmentsTab()}
            {activeTab === 'drilldown' && renderDrilldownTab()}
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
