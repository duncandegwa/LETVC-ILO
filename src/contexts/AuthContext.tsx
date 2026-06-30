'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, onAuthStateChanged, logOut, auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

// ── Session timeout: 30 minutes of inactivity ─────────────────
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS     =  2 * 60 * 1000; // warn 2 minutes before
const ACTIVITY_EVENTS       = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

interface AuthUser {
  firebaseUser: User;
  role: UserRole;
  profileId: string;
  displayName: string;
  email: string;
}

interface AuthContextType {
  authUser: AuthUser | null;
  loading: boolean;
  showTimeoutWarning: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser]                 = useState<AuthUser | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch Supabase profile for a Firebase user ────────────────
  const fetchUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', firebaseUser.email)
        .single();

      if (error || !data) { setAuthUser(null); return; }

      let displayName = firebaseUser.displayName || firebaseUser.email || '';
      let profileId   = data.id;

      if (data.role === 'student') {
        const { data: student } = await supabase
          .from('students').select('id, full_name').eq('user_id', data.id).single();
        if (student) { displayName = student.full_name; profileId = student.id; }
      } else if (data.role === 'trainer') {
        const { data: trainer } = await supabase
          .from('trainers').select('id, full_name').eq('user_id', data.id).single();
        if (trainer) { displayName = trainer.full_name; profileId = trainer.id; }
      } else if (data.role === 'admin') {
        displayName = 'Administrator';
      }

      setAuthUser({
        firebaseUser,
        role: data.role as UserRole,
        profileId,
        displayName,
        email: firebaseUser.email || '',
      });
    } catch {
      setAuthUser(null);
    }
  }, []);

  // ── Sign out the user ─────────────────────────────────────────
  const logout = useCallback(async () => {
    clearTimers();
    setShowTimeoutWarning(false);
    await logOut();
    setAuthUser(null);
  }, []);

  // ── Clear both timers ─────────────────────────────────────────
  const clearTimers = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current)    clearTimeout(warningTimerRef.current);
    inactivityTimerRef.current = null;
    warningTimerRef.current    = null;
  };

  // ── Reset the inactivity timer on any user activity ──────────
  const resetTimer = useCallback(() => {
    clearTimers();
    setShowTimeoutWarning(false);

    // Show warning 2 minutes before timeout
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Auto sign-out after 30 minutes
    inactivityTimerRef.current = setTimeout(async () => {
      setShowTimeoutWarning(false);
      await logOut();
      setAuthUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=1';
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  // ── Start timers when user logs in; stop when logged out ─────
  useEffect(() => {
    if (authUser) {
      resetTimer();
      // Attach activity listeners
      ACTIVITY_EVENTS.forEach(evt =>
        window.addEventListener(evt, resetTimer, { passive: true })
      );
    } else {
      clearTimers();
      setShowTimeoutWarning(false);
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimer)
      );
    }

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimer)
      );
    };
  }, [authUser, resetTimer]);

  // ── Firebase auth state listener ─────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserProfile(user).finally(() => setLoading(false));
      } else {
        setAuthUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const refreshUser = async () => {
    if (authUser?.firebaseUser) {
      await fetchUserProfile(authUser.firebaseUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      authUser,
      loading,
      showTimeoutWarning,
      logout,
      refreshUser,
      resetTimer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
