'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader2 } from 'lucide-react';

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const { authUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authUser) {
      router.replace('/login');
    }
  }, [authUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#4a7c2f] animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading LETVC ILO...</p>
        </div>
      </div>
    );
  }

  if (!authUser) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
