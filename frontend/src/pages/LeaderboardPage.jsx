import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Clock, ShieldAlert } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';

const LeaderboardPage = ({ onShowToast }) => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [quizRes, lbRes] = await Promise.all([
          fetchAPI(`/quizzes/${quizId}`),
          fetchAPI(`/quizzes/${quizId}/leaderboard`)
        ]);
        
        if (quizRes.success) setQuiz(quizRes.quiz);
        if (lbRes.success) setLeaderboard(lbRes.leaderboard);
      } catch (err) {
        console.error(err);
        onShowToast('Failed to load leaderboard data.', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) loadData();
  }, [quizId, navigate]);

  if (loading) return <PageLoader />;
  if (!quiz) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-7 h-7 bg-yellow-100 text-yellow-600 rounded-full border border-yellow-300">
            <Trophy className="h-4 w-4" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-500 rounded-full border border-slate-300">
            <Medal className="h-4 w-4" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-7 h-7 bg-amber-100 text-amber-700 rounded-full border border-amber-300">
            <Medal className="h-4 w-4" />
          </div>
        );
      default:
        return <span className="font-semibold text-slate-500 font-sans">{rank}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans space-y-8">
      {/* Top Bar */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Homepage</span>
      </button>

      {/* Header Banner */}
      <header className="bg-gradient-to-r from-yashada-navy to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-4 text-white relative overflow-hidden">
        {/* Glowing background */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full bg-yashada-gold/10 filter blur-2xl"></div>
        
        <div className="relative space-y-2">
          <div className="inline-flex items-center space-x-1.5 bg-yashada-gold/15 border border-yashada-gold/30 rounded-full px-4.5 py-1 text-yashada-gold text-xs font-bold uppercase tracking-wider">
            <Trophy className="h-4 w-4 text-yashada-gold animate-bounce" />
            <span>Leaderboard Arena</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">{quiz.title}</h1>
          <p className="text-slate-400 text-xs font-sans">
            Rankings sorted by highest score, then by fastest completion times.
          </p>
        </div>
      </header>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {leaderboard.length === 0 ? (
          <div className="text-center py-16 font-sans">
            <ShieldAlert className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No attempts recorded</h3>
            <p className="text-xs text-slate-400 mt-1">Be the first to complete the exam and secure rank #1!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 text-center w-16">Rank</th>
                  <th className="px-6 py-4">Participant Name</th>
                  <th className="px-6 py-4">Branch / Department</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Percentage</th>
                  <th className="px-6 py-4 text-center">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {leaderboard.map((row) => (
                  <tr 
                    key={row.rank}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${
                      row.rank <= 3 ? 'font-medium' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex justify-center">{getRankBadge(row.rank)}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-semibold">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {row.branch}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-800 dark:text-slate-200">
                      {row.score} <span className="text-xs text-slate-400">/ {row.maxScore}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        row.percentage >= 75
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-150'
                          : row.percentage >= 40
                          ? 'bg-blue-50 text-blue-600 border border-blue-150'
                          : 'bg-red-50 text-red-600 border border-red-150'
                      }`}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5 opacity-60" />
                      <span>{formatDuration(row.timeTaken)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
