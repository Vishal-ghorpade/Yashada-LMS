import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, BookOpen, Clock, ClipboardCheck, Play, ArrowRight, 
  User, Sparkles, Flame, CheckCircle, ChevronRight, Download, Eye, Calendar, Building
} from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';

const StudentDashboard = ({ onShowToast }) => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingFeedback, setViewingFeedback] = useState(null); // FeedbackResponse details

  // CBP Profile Questionnaire states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [allDepartments, setAllDepartments] = useState([]);
  const [cbpDept, setCbpDept] = useState('');
  const [cbpDesig, setCbpDesig] = useState('');
  const [cbpExp, setCbpExp] = useState(0);
  const [cbpPref, setCbpPref] = useState('Mixed');
  const [cbpAvail, setCbpAvail] = useState('2-5 Hours');
  const [cbpCompetency, setCbpCompetency] = useState([]);

  // Calendar states
  const [calendarEvents, setCalendarEvents] = useState([]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/auth/profile');
      if (data.success) {
        setProfileData(data);
        localStorage.setItem('yashada_admin_info', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load learning profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async () => {
    try {
      const res = await fetchAPI('/calendar');
      if (res.success) {
        setCalendarEvents(res.events);
      }
    } catch (e) {
      console.error("Failed to load learning calendar events:", e);
    }
  };

  const loadDepts = async () => {
    try {
      const res = await fetchAPI('/departments');
      if (res.success) {
        setAllDepartments(res.departments);
      }
    } catch (e) {
      console.error("Failed to load departments list:", e);
    }
  };

  useEffect(() => {
    loadProfile();
    loadCalendar();
    loadDepts();
  }, []);

  useEffect(() => {
    if (profileData && profileData.user && !profileData.user.profileCollected) {
      setShowProfileModal(true);
    }
  }, [profileData]);

  const handleCbpSubmit = async (e) => {
    e.preventDefault();
    if (!cbpDept || !cbpDesig) {
      onShowToast("Please select your department and enter designation.", "error");
      return;
    }

    try {
      const res = await fetchAPI('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          department: cbpDept,
          designation: cbpDesig,
          yearsOfExperience: Number(cbpExp),
          learningPreference: cbpPref,
          monthlyLearningAvailability: cbpAvail,
          competencyAreas: cbpCompetency
        })
      });

      if (res.success) {
        onShowToast("Capacity Building Profile saved successfully!", "success");
        setShowProfileModal(false);
        loadProfile();
        loadCalendar();
      }
    } catch (err) {
      onShowToast("Failed to save profile specifications.", "error");
    }
  };

  const toggleCompetency = (area) => {
    setCbpCompetency(prev => 
      prev.includes(area) ? prev.filter(c => c !== area) : [...prev, area]
    );
  };

  const handleDownloadCertificate = (courseTitle, certId, compDate) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const user = profileData?.user;
      const userName = user?.name || 'Candidate Student';

      // 1. Draw elegant double gold/navy borders
      doc.setDrawColor(212, 175, 55); // Gold
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 277, 190);
      
      doc.setDrawColor(11, 6, 22); // Deep Navy
      doc.setLineWidth(0.5);
      doc.rect(13, 13, 271, 184);

      // Decorative gold corner ornaments
      const drawOrnament = (x, y) => {
        doc.setFillColor(212, 175, 55);
        doc.rect(x, y, 6, 6);
      };
      drawOrnament(15, 15);
      drawOrnament(276, 15);
      drawOrnament(15, 191);
      drawOrnament(276, 191);

      // 2. YASHADA Title
      doc.setTextColor(11, 6, 22); // Deep Navy
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('YASHWANTRAO CHAVAN ACADEMY OF', 148, 40, { align: 'center' });
      
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55); // Gold
      doc.text('DEVELOPMENT ADMINISTRATION (YASHADA)', 148, 50, { align: 'center' });

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(70, 56, 227, 56);

      // 3. Certificate Statement
      doc.setTextColor(60, 60, 60);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('This is to certify that the candidate', 148, 75, { align: 'center' });

      // Student Name (Bold Navy)
      doc.setTextColor(11, 6, 22);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(26);
      doc.text(userName.toUpperCase(), 148, 92, { align: 'center' });

      // Description
      doc.setTextColor(60, 60, 60);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('has successfully completed the interactive learning course', 148, 110, { align: 'center' });

      // Course Title (Gold Bold)
      doc.setTextColor(212, 175, 55);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(`"${courseTitle}"`, 148, 122, { align: 'center' });

      doc.setTextColor(60, 60, 60);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(13);
      doc.text('including all video interactions, timed assessments, and core reflections.', 148, 132, { align: 'center' });

      // 4. Verification IDs & Date
      doc.setDrawColor(220, 220, 220);
      doc.line(40, 160, 100, 160);
      doc.line(197, 160, 257, 160);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date of Issue: ${new Date(compDate).toLocaleDateString()}`, 70, 166, { align: 'center' });
      doc.text(`Certificate ID: ${certId}`, 227, 166, { align: 'center' });
      
      doc.setTextColor(120, 120, 120);
      doc.text('DIRECTOR GENERAL, YASHADA', 148, 176, { align: 'center' });

      doc.save(`${userName.replace(/\s+/g, '_')}_Certificate.pdf`);
      onShowToast('Certificate downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to export certificate PDF.', 'error');
    }
  };

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'first_quiz':
        return <Award className="h-7 w-7 text-blue-400" />;
      case 'course_finisher':
        return <Sparkles className="h-7 w-7 text-yashada-gold" />;
      case 'seven_day_streak':
        return <Flame className="h-7 w-7 text-orange-500" />;
      case 'top_performer':
        return <CheckCircle className="h-7 w-7 text-emerald-500 animate-pulse" />;
      default:
        return <Award className="h-7 w-7 text-slate-400" />;
    }
  };

  const getBadgeName = (badge) => {
    switch (badge) {
      case 'first_quiz': return 'First Quiz Completed';
      case 'course_finisher': return 'Course Finisher';
      case 'seven_day_streak': return '7-Day Streak Master';
      case 'top_performer': return 'Top Performer (500+ XP)';
      default: return badge;
    }
  };

  const getBadgeDesc = (badge) => {
    switch (badge) {
      case 'first_quiz': return 'Successfully answered all questions in a structured assessment.';
      case 'course_finisher': return 'Graduated 100% of modules inside a YASHADA LMS course.';
      case 'seven_day_streak': return 'Logged in and studied for 7 consecutive days.';
      case 'top_performer': return 'Acquired over 500 total Experience Points.';
      default: return 'Earned by academic participation.';
    }
  };

  if (loading) return <PageLoader />;
  if (!profileData) return null;

  const { user, enrollments = [], quizResponses = [], feedbackResponses = [] } = profileData;

  // Compute active completions
  const completedCourses = enrollments.filter(e => e.completed);

  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0) / enrollments.length)
    : 0;

  const getTimelineEvents = () => {
    const events = [];
    enrollments.forEach(e => {
      if (e.course) {
        events.push({
          date: new Date(e.updatedAt),
          type: 'course_enroll',
          title: `Enrolled in Course`,
          subtitle: e.course.title,
          details: `Progress: ${e.progress}%`,
          icon: <BookOpen className="h-3.5 w-3.5 text-blue-400" />
        });
        if (e.completed && e.completedAt) {
          events.push({
            date: new Date(e.completedAt),
            type: 'course_complete',
            title: `Graduated Course`,
            subtitle: e.course.title,
            details: `Certificate Generated: ${e.certificateId}`,
            icon: <Award className="h-3.5 w-3.5 text-yashada-gold" />
          });
        }
      }
    });

    quizResponses.forEach(q => {
      if (q.quizId) {
        events.push({
          date: new Date(q.createdAt),
          type: 'quiz_attempt',
          title: `Quiz Assessment`,
          subtitle: q.quizId.title,
          details: `Score: ${q.totalScore}/${q.maxScore} (${q.percentage}%)`,
          icon: <Award className="h-3.5 w-3.5 text-emerald-400" />
        });
      }
    });

    feedbackResponses.forEach(f => {
      if (f.rubricId) {
        events.push({
          date: new Date(f.createdAt),
          type: 'feedback_submit',
          title: `Feedback Submitted`,
          subtitle: f.rubricId.title,
          details: `Average rating given: ${f.averageScore}/4.0`,
          icon: <ClipboardCheck className="h-3.5 w-3.5 text-purple-400" />
        });
      }
    });

    // Sort by date descending
    return events.sort((a, b) => b.date - a.date);
  };

  const timelineEvents = getTimelineEvents();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yashada-navy via-slate-900 to-yashada-navy-light text-white font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Profile Welcome Banner */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
          <div className="flex-1 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-yashada-gold/15 border border-yashada-gold/30 text-yashada-gold rounded-2xl flex items-center justify-center text-2xl font-bold font-serif shrink-0">
                {user.name[0]}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-widest block font-sans">
                  Official Student Portal
                </span>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">{user.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-yashada-gold" /> 
                    {user.department?.name || user.branch || 'YASHADA Dept'}
                  </span>
                  {user.designation && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-slate-300">{user.designation}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>ID: {user.rollNumber || 'YSH-STUDENT'}</span>
                </div>
              </div>
            </div>

            {/* Learning Plan Completion rate in welcome banner */}
            <div className="pt-3 border-t border-white/10 max-w-sm">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-350 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-400" /> Learning Plan Progress
                </span>
                <span className="text-yashada-gold font-bold">{avgProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yashada-gold to-emerald-400 transition-all duration-500"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="flex items-center gap-4.5 bg-slate-950/40 border border-slate-800 rounded-2xl p-4 shrink-0 w-full md:w-auto">
            <div className="text-center flex-1 px-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total XP</span>
              <p className="text-xl font-extrabold text-yashada-gold mt-1 flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4" />
                <span>{user.xp}</span>
              </p>
            </div>
            
            <div className="h-8 w-px bg-slate-850" />

            <div className="text-center flex-1 px-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Learning Streak</span>
              <p className="text-xl font-extrabold text-orange-500 mt-1 flex items-center justify-center gap-1 animate-pulse">
                <Flame className="h-4.5 w-4.5 fill-orange-500" />
                <span>{user.streak} days</span>
              </p>
            </div>
            
            <div className="h-8 w-px bg-slate-850" />

            <div className="text-center flex-1 px-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Badges</span>
              <p className="text-xl font-extrabold text-white mt-1">{user.badges?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main learning catalog section */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Learning Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Enrolled Courses</span>
                <p className="text-xl font-extrabold text-white mt-1">{enrollments.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">In Progress</span>
                <p className="text-xl font-extrabold text-yashada-gold mt-1">
                  {enrollments.filter(e => !e.completed).length}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Completed</span>
                <p className="text-xl font-extrabold text-emerald-450 mt-1">{completedCourses.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Learning Hours</span>
                <p className="text-xl font-extrabold text-amber-450 mt-1 flex items-center justify-center gap-1">
                  <Clock className="h-4.5 w-4.5 text-amber-400" />
                  <span>{user.learningHours || 0} hrs</span>
                </p>
              </div>
            </div>

            {/* Continue Learning card */}
            {enrollments.length > 0 && (
              <div className="bg-gradient-to-r from-[#201535] to-[#140D24] border border-yashada-gold/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-48 h-48 bg-yashada-gold/5 rounded-full filter blur-2xl pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row gap-5 items-center justify-between relative z-10 w-full">
                  <div className="space-y-3 flex-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yashada-gold/10 border border-yashada-gold/20 text-yashada-gold text-[10px] font-bold uppercase rounded-md">
                      <Play className="h-3 w-3 fill-yashada-gold text-yashada-gold" /> Continue Learning
                    </span>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-white leading-snug">
                      {enrollments[0].course?.title}
                    </h3>
                    <p className="text-xs text-slate-350 line-clamp-2 leading-relaxed">
                      {enrollments[0].course?.description}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-yashada-gold" /> Course Progress</span>
                      <span>•</span>
                      <span className="text-yashada-gold font-bold">{enrollments[0].progress}%</span>
                    </div>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => navigate(`/courses/${enrollments[0].course?._id}`)}
                      className="w-full sm:w-auto px-5 py-3 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy font-bold rounded-xl text-xs shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <span>Resume Course</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* My enrolled Courses */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-yashada-gold uppercase tracking-widest">My Courses</h2>
              {enrollments.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center text-slate-400 space-y-4">
                  <BookOpen className="h-10 w-10 text-yashada-gold mx-auto" />
                  <p className="text-xs">You are not enrolled in any training courses yet.</p>
                  <button 
                    onClick={() => navigate('/')} 
                    className="px-5 py-2.5 bg-yashada-gold text-yashada-navy font-bold rounded-xl text-xs shadow-md hover:bg-yashada-gold-light cursor-pointer"
                  >
                    Browse Course Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {enrollments.map((enroll) => {
                    const c = enroll.course;
                    if (!c) return null;
                    return (
                      <div 
                        key={enroll._id} 
                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col group"
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
                          <img 
                            src={c.thumbnailUrl} 
                            alt={c.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <span className="absolute top-3 right-3 px-2 py-0.5 bg-yashada-navy/85 border border-white/10 text-[9px] uppercase font-bold rounded-full text-yashada-gold tracking-wider">
                            {c.category}
                          </span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <h3 className="font-serif font-bold text-sm text-white line-clamp-1 group-hover:text-yashada-gold transition-colors">
                              {c.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {c.description}
                            </p>
                          </div>

                          <div className="space-y-3 pt-2">
                            {/* Progress bar */}
                            <div className="space-y-1 text-[10px]">
                              <div className="flex justify-between font-semibold text-slate-350">
                                <span>Progress</span>
                                <span>{enroll.progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yashada-gold transition-all duration-350"
                                  style={{ width: `${enroll.progress}%` }}
                                />
                              </div>
                            </div>

                            {/* Resume button */}
                            <button
                              onClick={() => navigate(`/courses/${c._id}`)}
                              className="w-full py-2 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy font-bold rounded-xl text-[10px] tracking-wide uppercase flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
                            >
                              <span>{enroll.completed ? 'Review Course' : 'Resume Learning'}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Earned Badges */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-yashada-gold uppercase tracking-widest">Achievements &amp; Badges</h2>
              {(!user.badges || user.badges.length === 0) ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-slate-400 text-xs">
                  Begin completing quizzes and videos to unlock badges!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.badges.map((b, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start space-x-3.5 shadow-sm"
                    >
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl shrink-0">
                        {getBadgeIcon(b)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white">{getBadgeName(b)}</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-normal">{getBadgeDesc(b)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Learning Journey Timeline */}
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-yashada-gold uppercase tracking-widest">Learning Journey Timeline</h2>
              {timelineEvents.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-slate-400 text-xs">
                  Your learning journey history will be displayed here as you participate.
                </div>
              ) : (
                <div className="relative border-l border-white/10 pl-6 ml-3.5 space-y-6">
                  {timelineEvents.slice(0, 6).map((evt, idx) => (
                    <div key={idx} className="relative group text-left">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[37px] top-1 bg-slate-900 border-2 border-yashada-gold/70 w-7 h-7 rounded-full flex items-center justify-center shadow-lg group-hover:border-yashada-gold transition-colors">
                        {evt.icon}
                      </span>
                      <div className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-4.5 space-y-1 shadow-sm transition-all">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-yashada-gold uppercase tracking-wider">{evt.title}</span>
                          <span className="text-slate-400">{evt.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-snug">{evt.subtitle}</h4>
                        <p className="text-[10px] text-slate-350">{evt.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificates Manager */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-yashada-gold uppercase tracking-widest">Academic Certificates</h2>
              {completedCourses.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  Complete 100% of any course to download your completion certificate.
                </div>
              ) : (
                <div className="space-y-3">
                  {completedCourses.map((enroll) => (
                    <div 
                      key={enroll._id}
                      className="bg-gradient-to-r from-yashada-navy to-slate-900 border border-yashada-gold/30 hover:border-yashada-gold/70 rounded-xl p-4.5 flex justify-between items-center group shadow-md"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-yashada-gold uppercase tracking-wider block font-sans">
                          Verified Graduation
                        </span>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{enroll.course?.title}</h4>
                        <p className="text-[9px] text-slate-400">ID: {enroll.certificateId}</p>
                      </div>

                      <button
                        onClick={() => handleDownloadCertificate(enroll.course?.title, enroll.certificateId, enroll.completedAt)}
                        className="p-2.5 bg-yashada-gold/10 hover:bg-yashada-gold text-yashada-gold hover:text-yashada-navy rounded-xl border border-yashada-gold/25 transition-all shadow cursor-pointer"
                        title="Download official PDF Certificate"
                      >
                        <Download className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Quiz Attempts */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-yashada-gold uppercase tracking-widest">Recent Quizzes</h2>
              {quizResponses.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No quizzes completed yet.
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10 overflow-hidden shadow-sm">
                  {quizResponses.slice(0, 5).map((response) => (
                    <div 
                      key={response._id} 
                      onClick={() => navigate(`/leaderboard/${response.quizId?._id}`)}
                      className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-yashada-gold transition-colors">
                          {response.quizId?.title || 'Generative AI Quiz'}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-medium uppercase">{response.quizId?.category || 'General'}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-white font-mono">{response.totalScore} / {response.maxScore}</p>
                        <p className="text-[9px] text-yashada-gold font-bold">{response.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback History Log */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-yashada-gold uppercase tracking-widest">Feedback History</h2>
                <span className="text-xs font-semibold text-slate-400">Total: {feedbackResponses.length}</span>
              </div>
              {feedbackResponses.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No course feedback submissions found.
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10 overflow-hidden shadow-sm">
                  {feedbackResponses.slice(0, 5).map((feedback) => (
                    <div 
                      key={feedback._id} 
                      onClick={() => setViewingFeedback(feedback)}
                      className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-yashada-gold transition-colors">
                          {feedback.rubricId?.title || 'Course Rubric'}
                        </h4>
                        <p className="text-[9px] text-slate-400">{new Date(feedback.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                        <span className="text-[10px] font-bold font-mono">{feedback.averageScore}/4.0</span>
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* CAPACITY BUILDING PROFILE MODAL OVERLAY */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl bg-[#140D24] border border-yashada-gold/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-2 text-center">
                <div className="inline-flex p-3 bg-yashada-gold/15 rounded-2xl text-yashada-gold">
                  <User className="h-8 w-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                  Capacity Building Profile Setup
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  To tailor your training plan, please fill in your department, designation, experience, and learning preferences.
                </p>
              </div>

              <form onSubmit={handleCbpSubmit} className="space-y-5 text-left text-xs font-sans">
                {/* Designation & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Designation / Role
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deputy Collector, Section Officer"
                      value={cbpDesig}
                      onChange={(e) => setCbpDesig(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yashada-gold transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Department
                    </label>
                    <select
                      value={cbpDept}
                      onChange={(e) => setCbpDept(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yashada-gold transition-colors"
                      required
                    >
                      <option value="">Select Department</option>
                      {allDepartments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Years of Experience & Learning Preference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Years of Service / Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={cbpExp}
                      onChange={(e) => setCbpExp(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yashada-gold transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Monthly Learning Availability
                    </label>
                    <select
                      value={cbpAvail}
                      onChange={(e) => setCbpAvail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yashada-gold transition-colors"
                    >
                      <option value="2-5 Hours">2-5 Hours</option>
                      <option value="5-10 Hours">5-10 Hours</option>
                      <option value="10-15 Hours">10-15 Hours</option>
                      <option value="15+ Hours">15+ Hours</option>
                    </select>
                  </div>
                </div>

                {/* Preferred Learning Style */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Preferred Learning Style
                  </label>
                  <select
                    value={cbpPref}
                    onChange={(e) => setCbpPref(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yashada-gold transition-colors"
                  >
                    <option value="Video Learning">Video Learning</option>
                    <option value="Reading">Reading</option>
                    <option value="Interactive Learning">Interactive Learning / Timed Quizzes</option>
                    <option value="Mixed">Mixed / All Formats</option>
                  </select>
                </div>

                {/* Focus Competency Areas (Select all that apply) */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Focus Competency Areas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Data Analytics",
                      "Public Policy",
                      "e-Governance",
                      "Office Administration",
                      "Financial Management",
                      "Leadership & Management",
                      "Information Technology",
                      "AI & Emerging Technologies"
                    ].map((area) => {
                      const isSelected = cbpCompetency.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleCompetency(area)}
                          className={`p-3 text-left border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-yashada-gold/15 border-yashada-gold text-yashada-gold-light font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-305 hover:border-slate-705'
                          }`}
                        >
                          <span>{area}</span>
                          {isSelected && <CheckCircle className="h-4 w-4 shrink-0 text-yashada-gold" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <span>Save and Setup Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FEEDBACK VIEWER MODAL */}
      {viewingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar font-sans text-xs">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-yashada-gold uppercase tracking-widest block font-sans">
                  Submitted Feedback Details
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {viewingFeedback.rubricId?.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingFeedback(null)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Scorecard Summary */}
            <div className="grid grid-cols-3 gap-4 bg-slate-900/40 p-4 border border-slate-850 rounded-2xl text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Score</span>
                <p className="text-base font-extrabold text-white mt-0.5">{viewingFeedback.totalScore} / {viewingFeedback.maxScore}</p>
              </div>
              <div className="border-l border-slate-850">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Average Rating</span>
                <p className="text-base font-extrabold text-white mt-0.5">{viewingFeedback.averageScore} / 4.0</p>
              </div>
              <div className="border-l border-slate-850">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Date Submitted</span>
                <p className="text-base font-extrabold text-yashada-gold mt-0.5">
                  {new Date(viewingFeedback.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Parameter Ratings Grid */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Parameter Grades</h4>
              <div className="space-y-2.5">
                {viewingFeedback.parameterRatings.map((rating, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex justify-between items-center"
                  >
                    <div>
                      <h5 className="font-bold text-slate-200">{rating.parameterName}</h5>
                      {rating.comment && <p className="text-[10px] text-slate-400 mt-1">Comment: "{rating.comment}"</p>}
                    </div>
                    <div className="px-3 py-1 bg-yashada-navy border border-yashada-gold/30 rounded-lg text-yashada-gold font-bold">
                      Grade: {rating.rating} / 4.0
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Remarks */}
            {viewingFeedback.feedbackText && (
              <div className="bg-slate-900/60 p-4 border border-slate-850 rounded-2xl space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Candidate Remarks</span>
                <p className="text-slate-350 italic font-sans text-xs leading-relaxed font-normal">
                  "{viewingFeedback.feedbackText}"
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
