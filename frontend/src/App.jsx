import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import FeedbackPage from './pages/FeedbackPage';
import QuizPage from './pages/QuizPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminDashboard from './pages/AdminDashboard';
import VideoPlayerPage from './pages/VideoPlayerPage';
import VideoEmbedPage from './pages/VideoEmbedPage';
import { AnimatePresence } from 'framer-motion';

function AppContent({ 
  theme, 
  setTheme, 
  adminToken, 
  adminUser, 
  handleLoginSuccess, 
  handleLogout, 
  toast, 
  setToast, 
  showToast 
}) {
  const location = useLocation();
  const isEmbed = location.pathname.startsWith('/embed/');

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 dark:bg-[#0B0616]">
      {/* Header Sticky Navbar - Hidden in Embeds */}
      {!isEmbed && (
        <Navbar
          theme={theme}
          setTheme={setTheme}
          adminToken={adminToken}
          adminUser={adminUser}
          handleLogout={handleLogout}
        />
      )}

      {/* Pages Container */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing onShowToast={showToast} />} />
          
          <Route path="/feedback/:rubricId" element={<FeedbackPage onShowToast={showToast} />} />
          
          <Route path="/quiz/:quizId" element={<QuizPage onShowToast={showToast} />} />
          
          <Route path="/leaderboard/:quizId" element={<LeaderboardPage onShowToast={showToast} />} />
          
          <Route path="/play/:videoId" element={<VideoPlayerPage onShowToast={showToast} />} />
          
          <Route path="/embed/:videoId" element={<VideoEmbedPage />} />
          
          <Route path="/admin" element={
            adminToken && adminUser && (adminUser.role === 'admin' || adminUser.role === 'teacher') ? (
              <AdminDashboard admin={adminUser} onShowToast={showToast} />
            ) : (
              <Navigate to={adminUser?.role === 'student' ? '/' : '/login'} replace />
            )
          } />
          
          <Route path="/login" element={
            adminToken && adminUser ? (
              <Navigate to="/admin" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} onShowToast={showToast} />
            )
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom Footer - Hidden in Embeds */}
      {!isEmbed && <Footer />}

      {/* Toasts portal */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('yashada_theme') || 'light');

  // Auth state
  const [adminToken, setAdminToken] = useState(localStorage.getItem('yashada_admin_token') || null);
  const [adminUser, setAdminUser] = useState(JSON.parse(localStorage.getItem('yashada_admin_info')) || null);

  // Toast state
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  // Sync theme selection to localStorage
  useEffect(() => {
    localStorage.setItem('yashada_theme', theme);
  }, [theme]);

  const handleLoginSuccess = (token, adminInfo) => {
    localStorage.setItem('yashada_admin_token', token);
    localStorage.setItem('yashada_admin_info', JSON.stringify(adminInfo));
    setAdminToken(token);
    setAdminUser(adminInfo);
  };

  const handleLogout = () => {
    localStorage.removeItem('yashada_admin_token');
    localStorage.removeItem('yashada_admin_info');
    setAdminToken(null);
    setAdminUser(null);
    showToast('Logged out of admin console successfully.', 'info');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <Router>
      <AppContent
        theme={theme}
        setTheme={setTheme}
        adminToken={adminToken}
        adminUser={adminUser}
        handleLoginSuccess={handleLoginSuccess}
        handleLogout={handleLogout}
        toast={toast}
        setToast={setToast}
        showToast={showToast}
      />
    </Router>
  );
}

export default App;
