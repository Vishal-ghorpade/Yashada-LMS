import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, LogOut, LayoutDashboard } from 'lucide-react';

const Navbar = ({ theme, setTheme, adminToken, adminUser, handleLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Sync HTML class list with theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-[#0F0A1E]/80 border-b border-slate-200/60 dark:border-slate-800/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Branding */}
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="p-0.5 transition-transform duration-300 group-hover:scale-105">
              <img src="/logo.png" alt="YASHADA Logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-yashada-navy dark:text-white transition-colors">
                YASHADA
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-yashada-gold/10 text-yashada-gold border border-yashada-gold/30">
                AI Assessment Platform
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className={`text-sm font-medium transition-colors cursor-pointer ${
                currentPath === '/' 
                  ? 'text-yashada-gold font-semibold' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Home
            </button>

            {adminToken ? (
              <>
                {(adminUser?.role === 'admin' || adminUser?.role === 'teacher') && (
                  <button
                    onClick={() => navigate('/admin')}
                    className={`flex items-center space-x-1 text-sm font-medium transition-colors cursor-pointer ${
                      currentPath === '/admin' 
                        ? 'text-yashada-gold font-semibold' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden md:inline">Dashboard</span>
                  </button>
                )}
                {adminUser?.role === 'student' && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
                    Welcome, <span className="text-slate-900 dark:text-white font-bold">{adminUser.name}</span>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-sm font-medium text-red-600 hover:text-red-750 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  currentPath === '/login'
                    ? 'text-yashada-gold font-semibold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In / Register
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-slate-600" />
              ) : (
                <Sun className="h-5 w-5 text-yashada-gold" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
