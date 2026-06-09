import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BookOpen, Play, Award, ClipboardCheck, Sparkles, 
  CheckCircle, MessageSquare, Megaphone, Plus, Send, BookMarked, HelpCircle, Star, Trash2
} from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';

const CourseDetailsPage = ({ onShowToast }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('modules'); // modules, discussions, announcements
  
  // Discussions state
  const [discussions, setDiscussions] = useState([]);
  const [newDiscussion, setNewDiscussion] = useState('');
  const [postingDiscussion, setPostingDiscussion] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [postingAnn, setPostingAnn] = useState(false);

  // Rating state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Auth Info
  const userToken = localStorage.getItem('yashada_admin_token');
  const userInfo = JSON.parse(localStorage.getItem('yashada_admin_info')) || null;
  const isTeacherOrAdmin = userInfo && (userInfo.role === 'admin' || userInfo.role === 'teacher');

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI(`/courses/${courseId}`);
      if (res.success) {
        setCourse(res.course);
        setEnrollment(res.enrollment);
        if (res.enrollment?.rating) {
          setRating(res.enrollment.rating);
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load course details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscussions = async () => {
    try {
      const data = await fetchAPI(`/courses/${courseId}/discussions`);
      if (data.success) {
        setDiscussions(data.discussions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const data = await fetchAPI(`/courses/${courseId}/announcements`);
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'discussions') {
      loadDiscussions();
    } else if (activeTab === 'announcements') {
      loadAnnouncements();
    }
  }, [activeTab]);

  const handleEnroll = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI(`/courses/${courseId}/enroll`, { method: 'POST' });
      if (res.success) {
        onShowToast('Successfully enrolled in course!', 'success');
        loadCourseData();
      }
    } catch (err) {
      onShowToast(err.message || 'Failed to enroll in course.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDiscussion = async (e) => {
    e.preventDefault();
    if (!newDiscussion.trim()) return;

    setPostingDiscussion(true);
    try {
      const res = await fetchAPI(`/courses/${courseId}/discussions`, {
        method: 'POST',
        body: JSON.stringify({ text: newDiscussion })
      });
      if (res.success) {
        setNewDiscussion('');
        setDiscussions(prev => [res.discussion, ...prev]);
        onShowToast('Comment posted to forum.', 'success');
      }
    } catch (err) {
      onShowToast('Failed to post discussion.', 'error');
    } finally {
      setPostingDiscussion(false);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    setPostingAnn(true);
    try {
      const res = await fetchAPI(`/courses/${courseId}/announcements`, {
        method: 'POST',
        body: JSON.stringify({ title: newAnnTitle, content: newAnnContent })
      });
      if (res.success) {
        setNewAnnTitle('');
        setNewAnnContent('');
        setShowAnnForm(false);
        setAnnouncements(prev => [res.announcement, ...prev]);
        onShowToast('Announcement broadcasted successfully!', 'success');
      }
    } catch (err) {
      onShowToast('Failed to post announcement.', 'error');
    } finally {
      setPostingAnn(false);
    }
  };

  const handleRateCourse = async (rateVal) => {
    setSubmittingRating(true);
    try {
      const res = await fetchAPI(`/courses/${courseId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating: rateVal })
      });
      if (res.success) {
        setRating(rateVal);
        onShowToast('Thank you for rating this course!', 'success');
      }
    } catch (err) {
      onShowToast('Failed to submit rating.', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleItemClick = (moduleId, item) => {
    if (!enrollment) {
      onShowToast('Please enroll in the course to access modular contents.', 'info');
      return;
    }

    if (item.type === 'video') {
      // Direct play
      navigate(`/play/${item.itemId}?courseId=${courseId}&moduleId=${moduleId}`);
    } else if (item.type === 'quiz') {
      // Direct quiz
      navigate(`/quiz/${item.itemId}?courseId=${courseId}&moduleId=${moduleId}`);
    } else if (item.type === 'reflection') {
      // For reflection mock, let's auto mark complete
      handleMarkItemComplete(moduleId, item.itemId, 'reflection');
      onShowToast('Reflection read. Module progress updated!', 'success');
    }
  };

  const handleMarkItemComplete = async (moduleId, itemId, type) => {
    try {
      const res = await fetchAPI(`/courses/${courseId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ moduleId, itemId, type })
      });
      if (res.success) {
        setEnrollment(res.enrollment);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !course) return <PageLoader />;
  if (!course) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yashada-navy via-slate-900 to-yashada-navy-light text-white font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(isTeacherOrAdmin ? '/admin' : '/dashboard')}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Console</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-white/5 border border-white/10 rounded-full text-slate-400">
            LMS Syllabus view
          </span>
        </div>

        {/* Course Presentation Banner */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
          <div className="w-full md:w-2/5 aspect-video md:aspect-auto overflow-hidden bg-slate-800 shrink-0">
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          </div>

          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="px-2.5 py-0.5 bg-yashada-gold/15 border border-yashada-gold/30 text-[10px] font-bold uppercase rounded-full text-yashada-gold tracking-wider w-fit block">
                {course.category}
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white">{course.title}</h1>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{course.description}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Instructor</span>
                  <p className="text-xs font-semibold text-white">{course.createdBy?.name || 'Academic Faculty'}</p>
                </div>
                <div className="border-l border-white/10 pl-6">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Course Rating</span>
                  <div className="flex items-center space-x-1 text-yashada-gold text-xs font-bold mt-0.5">
                    <Star className="h-3.5 w-3.5 fill-yashada-gold text-yashada-gold" />
                    <span>
                      {course.ratingCount > 0 ? (course.ratingSum / course.ratingCount).toFixed(1) : '5.0'} 
                      <span className="text-slate-400 font-normal text-[10px] ml-0.5">({course.ratingCount || 0} reviews)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Enrollment Trigger */}
              {!enrollment ? (
                <button
                  onClick={handleEnroll}
                  className="px-6 py-3 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy font-bold rounded-xl text-xs shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <BookOpen className="h-4.5 w-4.5" />
                  <span>Enroll in Course</span>
                </button>
              ) : (
                <div className="flex items-center gap-4 bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                  <div className="space-y-1 text-[10px] w-28 sm:w-32">
                    <div className="flex justify-between font-semibold text-slate-350">
                      <span>My Progress</span>
                      <span>{enrollment.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yashada-gold transition-all duration-300"
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                  </div>
                  <CheckCircle className={`h-6 w-6 shrink-0 ${enrollment.completed ? 'text-emerald-500' : 'text-slate-650'}`} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-3.5 px-6 border-b-2 transition-all cursor-pointer ${
              activeTab === 'modules' ? 'border-yashada-gold text-yashada-gold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Syllabus Outline
          </button>
          
          <button
            onClick={() => setActiveTab('discussions')}
            className={`py-3.5 px-6 border-b-2 transition-all cursor-pointer ${
              activeTab === 'discussions' ? 'border-yashada-gold text-yashada-gold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Discussion Forum
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-3.5 px-6 border-b-2 transition-all cursor-pointer ${
              activeTab === 'announcements' ? 'border-yashada-gold text-yashada-gold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Announcements
          </button>
        </div>

        {/* Dynamic Workspace */}
        <div className="space-y-8">
          
          {/* TAB: MODULES SYLLABUS */}
          {activeTab === 'modules' && (
            <div className="space-y-6">
              {course.modules.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-12">This course does not contain any learning modules yet.</p>
              ) : (
                course.modules.map((mod, mIdx) => (
                  <div key={mod._id} className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-wider block font-sans">
                        Module {mIdx + 1}
                      </span>
                      <h3 className="font-serif font-bold text-base text-white">{mod.title}</h3>
                      <p className="text-xs text-slate-400 leading-normal mt-0.5">{mod.description}</p>
                    </div>

                    <div className="divide-y divide-white/5 border border-white/10 rounded-xl bg-slate-950/20 overflow-hidden text-xs">
                      {mod.items.map((item) => {
                        const itemKey = `${mod._id}_${item.itemId}`;
                        const isCompleted = enrollment && enrollment.completedItems.includes(itemKey);

                        return (
                          <div 
                            key={item._id}
                            className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
                            onClick={() => handleItemClick(mod._id, item)}
                          >
                            <div className="flex items-center space-x-3.5 flex-1 pr-6">
                              <div className="p-2 bg-white/5 border border-white/10 text-slate-400 group-hover:text-yashada-gold rounded-xl shrink-0 transition-colors">
                                {item.type === 'video' ? (
                                  <Play className="h-4.5 w-4.5" />
                                ) : item.type === 'quiz' ? (
                                  <Award className="h-4.5 w-4.5" />
                                ) : (
                                  <ClipboardCheck className="h-4.5 w-4.5" />
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="font-semibold text-white group-hover:text-yashada-gold transition-colors">{item.title}</h4>
                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                  {item.type} Module
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center space-x-3">
                              {isCompleted ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full font-bold text-[9px] uppercase tracking-wider">
                                  Completed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-800 border border-white/5 text-slate-400 rounded-full font-semibold text-[9px] uppercase tracking-wider">
                                  Incomplete
                                </span>
                              )}
                              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* Course Rating Section */}
              {enrollment && enrollment.completed && (
                <div className="bg-white/5 border border-yashada-gold/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg max-w-xl mx-auto text-center font-sans">
                  <div className="space-y-1">
                    <Sparkles className="h-8 w-8 text-yashada-gold mx-auto animate-spin" style={{ animationDuration: '4s' }} />
                    <h3 className="font-serif font-bold text-base text-white">Rate Your Learning Experience</h3>
                    <p className="text-[10px] text-slate-400">
                      Congratulations on completing the syllabus! Please leave a rating to help us improve course design.
                    </p>
                  </div>

                  <div className="flex justify-center items-center gap-2 text-yashada-gold">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={submittingRating}
                        onClick={() => handleRateCourse(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transform hover:scale-125 transition-transform"
                      >
                        <Star 
                          className={`h-7 w-7 transition-all ${
                            star <= (hoverRating || rating) ? 'fill-yashada-gold text-yashada-gold' : 'text-slate-650'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <p className="text-[10px] text-yashada-gold font-bold uppercase tracking-wider">
                      You rated this course: {rating} out of 5 stars
                    </p>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB: DISCUSSION FORUM */}
          {activeTab === 'discussions' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Submission Form */}
              <form onSubmit={handlePostDiscussion} className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
                <h3 className="text-xs font-bold text-yashada-gold uppercase tracking-wider border-b border-white/5 pb-2">
                  Post to Forum
                </h3>
                <textarea
                  rows={4}
                  value={newDiscussion}
                  onChange={(e) => setNewDiscussion(e.target.value)}
                  placeholder="Ask a question, start a debate, or share resources with your classmates..."
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={postingDiscussion || !enrollment}
                  className="w-full py-2 bg-yashada-gold hover:bg-yashada-gold-light text-yashada-navy font-bold rounded-xl text-xs shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{postingDiscussion ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </form>

              {/* Discussions feed */}
              <div className="lg:col-span-3 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Forum Discussions</h3>
                {discussions.length === 0 ? (
                  <p className="text-slate-450 text-xs py-10 bg-white/5 border border-white/10 rounded-2xl text-center">
                    No comments in this forum yet. Be the first to start the discussion!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {discussions.map((disc) => (
                      <div 
                        key={disc._id} 
                        className="bg-white/5 border border-white/10 rounded-2xl p-4.5 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 bg-slate-800 border border-white/10 text-slate-300 rounded-xl flex items-center justify-center font-bold text-xs">
                              {disc.user?.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{disc.user?.name}</span>
                                {disc.user?.role !== 'student' && (
                                  <span className="px-2 py-0.25 bg-yashada-gold/15 border border-yashada-gold/30 text-yashada-gold font-bold text-[8px] uppercase tracking-wider rounded-md">
                                    {disc.user?.role}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-450">{new Date(disc.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed font-sans font-normal">
                          {disc.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              
              {/* Creator dashboard (For Teachers/Admins only) */}
              {isTeacherOrAdmin && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-yashada-gold uppercase tracking-wider">
                      Teacher Broadcast Gateway
                    </h3>
                    <button
                      onClick={() => setShowAnnForm(!showAnnForm)}
                      className="px-3 py-1.5 bg-slate-800 border border-white/10 text-slate-300 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-700 cursor-pointer"
                    >
                      {showAnnForm ? 'Cancel' : 'Create Broadcast'}
                    </button>
                  </div>

                  {showAnnForm && (
                    <form onSubmit={handlePostAnnouncement} className="space-y-4 max-w-xl">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Broadcast Title</label>
                        <input
                          type="text"
                          value={newAnnTitle}
                          onChange={(e) => setNewAnnTitle(e.target.value)}
                          placeholder="e.g. Schedule for Final Exam"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-white"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Broadcast Content</label>
                        <textarea
                          rows={4}
                          value={newAnnContent}
                          onChange={(e) => setNewAnnContent(e.target.value)}
                          placeholder="Enter announcement text to broadcast to enrolled students..."
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-yashada-gold text-white"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={postingAnn}
                        className="px-5 py-2.5 bg-yashada-gold text-yashada-navy font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Megaphone className="h-4 w-4" />
                        <span>{postingAnn ? 'Broadcasting...' : 'Publish Announcement'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Announcements list */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Broadcast Announcements</h3>
                {announcements.length === 0 ? (
                  <p className="text-slate-450 text-xs py-10 bg-white/5 border border-white/10 rounded-2xl text-center">
                    No announcements published for this course yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((ann) => (
                      <div 
                        key={ann._id} 
                        className="bg-gradient-to-r from-yashada-navy/40 to-slate-900 border border-yashada-gold/20 rounded-2xl p-5 space-y-3 relative shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex items-center space-x-3">
                            <div className="p-2.5 bg-yashada-gold/10 border border-yashada-gold/20 text-yashada-gold rounded-xl shrink-0 animate-pulse">
                              <Megaphone className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white leading-normal">{ann.title}</h4>
                              <p className="text-[10px] text-slate-450">
                                Broadcast by {ann.createdBy?.name || 'Instructor'} • {new Date(ann.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="text-slate-350 text-xs leading-relaxed font-sans font-normal border-t border-white/5 pt-3">
                          {ann.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default CourseDetailsPage;
