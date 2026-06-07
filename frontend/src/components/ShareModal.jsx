import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';

const ShareModal = ({ title, url, onClose, onShowToast }) => {
  const [copied, setCopied] = useState(false);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(url)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (onShowToast) {
        onShowToast('Link copied to clipboard!', 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (onShowToast) {
        onShowToast('Failed to copy link.', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-white dark:bg-[#140D24] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold font-serif text-yashada-navy dark:text-white">Share Assessment Portal</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200/50">
            <img 
              src={qrCodeUrl} 
              alt="Scan QR Code to open link on mobile" 
              className="w-44 h-44"
              loading="lazy"
            />
          </div>
          <div className="flex items-center space-x-1.5 mt-3 text-xs text-slate-500 font-medium font-sans">
            <QrCode className="h-3.5 w-3.5" />
            <span>Scan QR code with your mobile camera</span>
          </div>
        </div>

        {/* URL Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
            Assessment URL
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-sans text-slate-600 dark:text-slate-300 focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                copied
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
              title="Copy link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-yashada-navy dark:bg-yashada-gold text-yashada-gold dark:text-yashada-navy rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
              title="Open link"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* WhatsApp Share Option */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Join the YASHADA Assessment:\nTitle: " + title + "\nLink: " + url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 text-sm cursor-pointer"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.459h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.825 0 00-3.48-8.413"/>
          </svg>
          <span>Share on WhatsApp</span>
        </a>

        {/* Close Action */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Close Panel
        </button>
      </motion.div>
    </div>
  );
};

export default ShareModal;
