import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight, Play, Award, ClipboardCheck, ArrowLeft
} from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';

const CalendarPage = ({ onShowToast }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('month'); // month, week
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI('/calendar');
      if (res.success) {
        setEvents(res.events);
      }
    } catch (e) {
      console.error(e);
      onShowToast('Failed to load calendar events.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const changeMonth = (val) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + val);
    setCurrentDate(d);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handleEventClick = (evt) => {
    if (evt.type === 'course' && evt.referenceId) {
      navigate(`/courses/${evt.referenceId}`);
    } else if (evt.type === 'quiz' && evt.referenceId) {
      navigate(`/quiz/${evt.referenceId}`);
    } else if (evt.type === 'feedback' && evt.referenceId) {
      navigate(`/feedback/${evt.referenceId}`);
    } else {
      onShowToast(`Selected event: ${evt.title}`, 'info');
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'course': return <Play className="h-3 w-3 fill-current" />;
      case 'quiz': return <Award className="h-3.5 w-3.5" />;
      case 'feedback': return <ClipboardCheck className="h-3.5 w-3.5" />;
      default: return <Calendar className="h-3.5 w-3.5" />;
    }
  };

  if (loading) return <PageLoader />;

  // Render Month View
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fill in blanks for calendar grid
  const calendarGrid = [];
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarGrid.push(i);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yashada-navy via-slate-900 to-yashada-navy-light text-white font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 text-left">
        
        {/* Navigation header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 bg-white/5 border border-white/10 rounded-2xl text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-yashada-gold uppercase tracking-widest block font-sans">
                Trainee Schedule
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-2">
                <Calendar className="h-6 w-6 text-yashada-gold" />
                <span>Learning Calendar</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="bg-slate-950/40 p-1 border border-slate-800 rounded-xl flex">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'month' ? 'bg-yashada-gold text-yashada-navy' : 'text-slate-400 hover:text-white'
                }`}
              >
                Month Grid
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'week' ? 'bg-yashada-gold text-yashada-navy' : 'text-slate-400 hover:text-white'
                }`}
              >
                Weekly Schedule
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'month' ? (
          <div className="bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Month selector */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4">
              <h3 className="font-serif font-bold text-lg text-white">{monthName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Grid header */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {dayNames.map((name) => (
                <div key={name} className="py-2">{name}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-2.5">
              {calendarGrid.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} className="aspect-square bg-slate-950/20 border border-transparent rounded-2xl opacity-30"></div>;
                }

                // Filter events matching this day
                const dayEvents = events.filter((evt) => {
                  const d = new Date(evt.dueDate);
                  return (
                    d.getDate() === day &&
                    d.getMonth() === currentDate.getMonth() &&
                    d.getFullYear() === currentDate.getFullYear()
                  );
                });

                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={idx}
                    className={`aspect-square p-2 border rounded-2xl flex flex-col justify-between items-start transition-all relative ${
                      isToday
                        ? 'bg-yashada-gold/5 border-yashada-gold shadow-md'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${isToday ? 'bg-yashada-gold text-yashada-navy' : 'text-slate-400'}`}>
                      {day}
                    </span>

                    <div className="w-full space-y-1 overflow-y-auto max-h-[80%] pr-0.5 custom-scrollbar">
                      {dayEvents.map((evt) => (
                        <button
                          key={evt._id}
                          onClick={() => handleEventClick(evt)}
                          className={`w-full text-left p-1 rounded-lg text-[9px] font-bold truncate flex items-center gap-1 border cursor-pointer hover:scale-[1.02] transition-transform ${
                            evt.type === 'course' ? 'bg-blue-950/30 border-blue-900/30 text-blue-300' :
                            evt.type === 'quiz' ? 'bg-amber-950/30 border-amber-900/30 text-amber-300' :
                            evt.type === 'feedback' ? 'bg-purple-950/30 border-purple-900/30 text-purple-300' :
                            'bg-slate-900 border-slate-800 text-slate-405'
                          }`}
                          title={`${evt.title} (${evt.status})`}
                        >
                          {getEventIcon(evt.type)}
                          <span className="truncate">{evt.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-[#140D24] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="font-serif font-bold text-lg text-white border-b border-slate-850 pb-4">
              Weekly Timeline
            </h3>

            {/* List schedule events */}
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="text-center py-12 text-slate-500 text-xs">No scheduled activities found in your calendar.</p>
              ) : (
                events.map((evt) => {
                  const d = new Date(evt.dueDate);
                  const isDueSoon = d - new Date() < 3 * 24 * 60 * 60 * 1000 && d - new Date() > 0;
                  return (
                    <div 
                      key={evt._id}
                      onClick={() => handleEventClick(evt)}
                      className="p-5 bg-white/5 border border-white/5 hover:border-yashada-gold/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl border shrink-0 ${
                          evt.type === 'course' ? 'bg-blue-950/30 border-blue-900/30 text-blue-400' :
                          evt.type === 'quiz' ? 'bg-amber-950/30 border-amber-900/30 text-amber-400' :
                          evt.type === 'feedback' ? 'bg-purple-950/30 border-purple-900/30 text-purple-400' :
                          'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          {getEventIcon(evt.type)}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-yashada-gold transition-colors">
                            {evt.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-yashada-gold" />
                              {d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span>&bull;</span>
                            <span className="uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                              Category: {evt.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] px-3 py-1 rounded-full font-extrabold uppercase ${
                        evt.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                        evt.status === 'In Progress' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                        evt.status === 'Missed' ? 'bg-red-950/40 text-red-400 border border-red-900/40' :
                        isDueSoon ? 'bg-orange-950/40 text-orange-400 border border-orange-900/40 animate-pulse' :
                        'bg-slate-950/40 text-slate-400 border border-slate-800'
                      }`}>
                        {evt.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CalendarPage;
