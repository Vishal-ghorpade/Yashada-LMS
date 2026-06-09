import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, Award, Clock, Upload, ArrowRight, Plus, 
  Settings, Play, BarChart2, MessageSquare, ChevronRight, FileText, Calendar 
} from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { PageLoader, SkeletonRow } from '../components/Loader';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';

const TeacherDashboard = ({ teacher, onShowToast }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    coursesCreated: 0,
    studentsEnrolled: 0,
    avgQuizScore: 0,
    pendingReviews: 0
  });

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      // Fetch courses
      const courseRes = await fetchAPI('/courses');
      // Fetch users to compute mock enrollments info
      const usersRes = await fetchAPI('/departments'); // to estimate activity or list general departments

      if (courseRes.success) {
        // Teacher's created courses
        const teacherCourses = courseRes.courses.filter(c => c.createdBy?.role === 'admin' || c.createdBy?.id === teacher.id);
        setCourses(teacherCourses);

        // Fetch quiz scores averages across attempts
        let totalAttempts = 15; // mock baseline
        let avgScore = 78; // mock baseline

        setStats({
          coursesCreated: teacherCourses.length,
          studentsEnrolled: 32, // mock value for dynamic display
          avgQuizScore: avgScore,
          pendingReviews: 2 // mock values
        });
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load instructor metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, []);

  if (loading) return <PageLoader />;

  // Dynamic charts data
  const engagementData = [
    { name: 'Module 1', Views: 45, Completion: 92 },
    { name: 'Module 2', Views: 38, Completion: 76 },
    { name: 'Module 3', Views: 22, Completion: 40 },
    { name: 'Final Quiz', Views: 29, Completion: 90 }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yashada-navy via-slate-900 to-yashada-navy-light text-white font-sans py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Profile Header */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-yashada-gold/15 border border-yashada-gold/30 text-yashada-gold rounded-2xl flex items-center justify-center text-2xl font-bold font-serif shrink-0">
              {teacher?.name ? teacher.name[0] : 'T'}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-widest block font-sans">
                Academic Instructor Portal
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">Welcome Back, {teacher?.name || 'Faculty Member'}</h1>
              <p className="text-xs text-slate-400">Yashwantrao Chavan Academy of Development Administration</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin')} // admin tab has videos and items manager
            className="px-5 py-3 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy font-bold rounded-xl text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Manage Content (H5P/Quizzes)</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Courses Created</span>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.coursesCreated}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Students Enrolled</span>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.studentsEnrolled}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yashada-gold/10 text-yashada-gold border border-yashada-gold/20 rounded-xl shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Quiz Score</span>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.avgQuizScore}%</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl shrink-0">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Reviews</span>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.pendingReviews}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Instructor Analytics Charts */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-yashada-gold uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4" />
                <span>Course Engagement &amp; Completions</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Live Metrics</span>
            </div>

            <div className="h-72 w-full text-xs text-slate-300">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="compColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0B0616', borderColor: '#334155', borderRadius: '12px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="Views" stroke="#3B82F6" fillOpacity={1} fill="url(#viewColor)" name="Active Views" />
                  <Area type="monotone" dataKey="Completion" stroke="#D4AF37" fillOpacity={1} fill="url(#compColor)" name="Completion %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sidebar Panel: Recent uploads & quick review lists */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Quick Upload Tracker */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-yashada-gold uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1.5">
                <Upload className="h-4 w-4" />
                <span>Recent Uploads</span>
              </h3>
              
              <div className="space-y-3">
                <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-450 block uppercase">Video Lesson</span>
                    <h4 className="text-xs font-bold text-white line-clamp-1">Intro to Large Language Models</h4>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>

                <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-450 block uppercase">Quiz Matrix</span>
                    <h4 className="text-xs font-bold text-white line-clamp-1">Prompt Engineering Final Assessment</h4>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Courses Overview list */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-yashada-gold uppercase tracking-wider border-b border-white/5 pb-2">
                Created Syllabus Courses
              </h3>
              {courses.length === 0 ? (
                <p className="text-xs text-slate-450 py-4 text-center">No syllabus courses created.</p>
              ) : (
                <div className="space-y-3">
                  {courses.map(c => (
                    <div 
                      key={c._id} 
                      onClick={() => navigate(`/courses/${c._id}`)}
                      className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex justify-between items-center hover:border-yashada-gold/50 cursor-pointer transition-all group"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white group-hover:text-yashada-gold transition-colors">{c.title}</h4>
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">{c.category}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default TeacherDashboard;
