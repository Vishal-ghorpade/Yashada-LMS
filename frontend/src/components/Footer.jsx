import React from 'react';
import { Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-6 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-yashada-gold" />
            </div>
            <div>
              <span className="font-serif text-white font-bold tracking-tight text-lg">YASHADA</span>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Yashwantrao Chavan Academy of Development Administration
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:items-end text-sm space-y-1">
            <p className="text-slate-300 font-medium">AI Assessment &amp; Quiz Platform</p>
            <p className="text-xs text-slate-500">Government of Maharashtra Training Institute Initiative</p>
          </div>
        </div>
        
        <hr className="border-slate-800 my-6" />
        
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-600 space-y-2 sm:space-y-0">
          <p>&copy; {new Date().getFullYear()} YASHADA. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="#about" className="hover:text-slate-400 transition-colors">About</a>
            <a href="#terms" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <a href="#privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
