'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const { authUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (authUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [authUser, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#4a7c2f] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
