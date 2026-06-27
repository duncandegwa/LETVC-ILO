'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, logOut, auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', firebaseUser.email)
        .single();

      if (error || !data) {
        setAuthUser(null);
        return;
      }

      let displayName = firebaseUser.displayName || firebaseUser.email || '';
      let profileId = data.id;

      if (data.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('id, full_name')
          .eq('user_id', data.id)
          .single();
        if (student) {
          displayName = student.full_name;
          profileId = student.id;
        }
      } else if (data.role === 'trainer') {
        const { data: trainer } = await supabase
          .from('trainers')
          .select('id, full_name')
          .eq('user_id', data.id)
          .single();
        if (trainer) {
          displayName = trainer.full_name;
          profileId = trainer.id;
        }
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

  const logout = async () => {
    await logOut();
    setAuthUser(null);
  };

  const refreshUser = async () => {
    if (authUser?.firebaseUser) {
      await fetchUserProfile(authUser.firebaseUser);
    }
  };

  return (
    <AuthContext.Provider value={{ authUser, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
