import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, LogIn, ArrowLeft, UserPlus, BookOpen } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { LoadingSpinner } from '../components/Loader';

const Login = ({ onLoginSuccess, onShowToast }) => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      onShowToast('Please fill in all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister 
        ? { name, email, password, role } 
        : { email, password };

      const data = await fetchAPI(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.success) {
        // Retrieve the authenticated user info (checks user object first, falls back to admin)
        const userInfo = data.user || data.admin;
        onLoginSuccess(data.token, userInfo);
        onShowToast(
          isRegister 
            ? `Account registered successfully as ${userInfo.role}!` 
            : `Welcome back, ${userInfo.name}!`, 
          'success'
        );
        
        if (userInfo.role === 'admin' || userInfo.role === 'teacher') {
          navigate('/admin');
        } else {
          navigate('/dashboard'); // Redirect students to the student dashboard
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 font-sans py-8">
      <div className="w-full max-w-md bg-white dark:bg-[#140D24] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        
        {/* Navigation back */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </button>

        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="p-1 rounded-2xl w-fit mx-auto">
            <img src="/logo.png" alt="YASHADA Logo" className="h-14 w-14 mx-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h2 className="text-2xl font-bold font-serif text-yashada-navy dark:text-white">
            {isRegister ? 'Create Learning Account' : 'Credentials Gateway'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegister 
              ? 'Join the YASHADA training platform to begin courses and track progress.' 
              : 'Authorized portal. Sessions are logged for quality assurance.'}
          </p>
        </div>

        {/* Login / Register Toggle */}
        <div className="flex border border-slate-100 dark:border-slate-800/80 rounded-xl p-1 bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              !isRegister 
                ? 'bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              isRegister 
                ? 'bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            
            {/* Name Field (Register Mode Only) */}
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@yashada.org"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-yashada-gold transition-colors text-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Role Selection Field (Register Mode Only) */}
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select System Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center space-x-2 p-2.5 border rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                    role === 'student'
                      ? 'border-yashada-gold bg-yashada-gold/10 text-yashada-gold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === 'student'}
                      onChange={() => setRole('student')}
                      className="sr-only"
                    />
                    <BookOpen className="h-4 w-4" />
                    <span>Student</span>
                  </label>
                  <label className={`flex items-center justify-center space-x-2 p-2.5 border rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                    role === 'teacher'
                      ? 'border-yashada-gold bg-yashada-gold/10 text-yashada-gold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="teacher"
                      checked={role === 'teacher'}
                      onChange={() => setRole('teacher')}
                      className="sr-only"
                    />
                    <UserPlus className="h-4 w-4" />
                    <span>Teacher / Staff</span>
                  </label>
                </div>
              </div>
            )}

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy font-bold rounded-xl hover:opacity-95 shadow-md flex items-center justify-center space-x-2 transition-opacity cursor-pointer mt-2"
          >
            {loading ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                <span>{isRegister ? 'Register Account' : 'Sign In Now'}</span>
              </>
            )}
          </button>
        </form>

        
        

      </div>
    </div>
  );
};

export default Login;
