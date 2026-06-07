import React from 'react';

export const LoadingSpinner = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-3',
    large: 'h-12 w-12 border-4'
  };

  return (
    <div className="flex justify-center items-center py-4">
      <div className={`animate-spin rounded-full border-t-yashada-gold border-r-transparent border-b-slate-300 border-l-slate-300 dark:border-b-slate-700 dark:border-l-slate-700 ${sizeClasses[size]}`}></div>
    </div>
  );
};

export const SkeletonRow = ({ cols = 4 }) => {
  return (
    <tr className="animate-pulse border-b border-slate-100 dark:border-slate-800">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="px-6 py-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
        </td>
      ))}
    </tr>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="animate-pulse p-6 bg-white dark:bg-[#140D24] rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
    </div>
  );
};

export const PageLoader = () => {
  return (
    <div className="min-height-[60vh] flex flex-col justify-center items-center py-20 space-y-4">
      <LoadingSpinner size="large" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 font-sans">
        Securing connection to YASHADA platform...
      </p>
    </div>
  );
};
