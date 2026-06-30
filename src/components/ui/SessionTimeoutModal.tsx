'use client';

import { useEffect, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const WARNING_DURATION_SECONDS = 120; // matches WARNING_BEFORE_MS in AuthContext (2 min)

export function SessionTimeoutModal() {
  const { showTimeoutWarning, resetTimer, logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(WARNING_DURATION_SECONDS);

  // Countdown while the warning is visible
  useEffect(() => {
    if (!showTimeoutWarning) {
      setSecondsLeft(WARNING_DURATION_SECONDS);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimeoutWarning]);

  if (!showTimeoutWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const handleStayLoggedIn = () => {
    resetTimer();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Session Expiring Soon
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            You have been inactive for a while. For your security, you will be signed out automatically in:
          </p>

          <div className="my-4 text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>

          <div className="flex w-full gap-3 mt-2">
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out Now
            </button>
            <button
              onClick={handleStayLoggedIn}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#4a7c2f] hover:bg-[#3d6827] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              Stay Signed In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
