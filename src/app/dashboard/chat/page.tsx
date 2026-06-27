'use client';

import { useAuth } from '@/contexts/AuthContext';
import StudentChatPage from './_student';
import TrainerChatPage from './_trainer';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 text-[#4a7c2f] animate-spin" />
      </div>
    );
  }

  if (authUser?.role === 'student') return <StudentChatPage />;
  if (authUser?.role === 'trainer') return <TrainerChatPage />;

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500 dark:text-gray-400 text-sm">Chat is not available for administrators.</p>
    </div>
  );
}
