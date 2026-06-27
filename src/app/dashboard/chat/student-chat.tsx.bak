'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ChatWindow } from '@/components/ui/ChatWindow';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateConversation } from '@/services/chat.service';

interface ConversationInfo {
  conversationId: string;
  trainerId: string;
  trainerName: string;
  trainerPosition: string;
  studentId: string;
  supabaseUserId: string;
}

export default function StudentChatPage() {
  const { authUser } = useAuth();
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      if (!authUser) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Get Supabase user record
        const { data: userRecord } = await supabase
          .from('users')
          .select('id')
          .eq('email', authUser.email)
          .single();

        if (!userRecord) {
          setError('Your user account was not found. Please contact the administrator.');
          return;
        }

        // 2. Get student record
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', userRecord.id)
          .single();

        if (!student) {
          setError('Your student profile was not found. Please contact the administrator.');
          return;
        }

        // 3. Get assigned trainer
        const { data: assignment } = await supabase
          .from('trainer_assignments')
          .select('trainer:trainers(id, full_name, position)')
          .eq('student_id', student.id)
          .maybeSingle();

        if (!assignment || !assignment.trainer) {
          setError('You have not been assigned a trainer yet. Please contact the ILO office.');
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const trainer = Array.isArray(assignment.trainer)
          ? (assignment.trainer as any[])[0]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (assignment.trainer as any);

        // 4. Get or create the private conversation
        const conversation = await getOrCreateConversation(student.id, trainer.id);

        if (!conversation) {
          setError('Could not open chat. Please try again.');
          return;
        }

        setInfo({
          conversationId: conversation.id,
          trainerId: trainer.id,
          trainerName: trainer.full_name,
          trainerPosition: trainer.position || 'Trainer',
          studentId: student.id,
          supabaseUserId: userRecord.id,
        });

      } catch (err: unknown) {
        setError((err as Error).message || 'Unexpected error. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    setup();
  }, [authUser]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#4a7c2f] animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Opening chat...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chat with Trainer</h1>
        </div>
        <Card>
          <div className="flex items-start gap-4 p-2">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Chat Unavailable</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── Chat ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col space-y-4" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="p-2 rounded-xl bg-[#4a7c2f]/10 text-[#4a7c2f]">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Chat with {info?.trainerName}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {info?.trainerPosition} · Private conversation
          </p>
        </div>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            End-to-end private
          </span>
        </div>
      </div>

      {/* Chat Window — fills remaining height */}
      <div className="flex-1 min-h-0">
        {info && (
          <ChatWindow
            conversationId={info.conversationId}
            currentUserId={info.supabaseUserId}
            currentUserRole="student"
            otherPersonName={info.trainerName}
            otherPersonRole="trainer"
          />
        )}
      </div>
    </div>
  );
}
