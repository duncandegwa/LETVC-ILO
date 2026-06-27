'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { ChatWindow } from '@/components/ui/ChatWindow';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ConvInfo {
  conversationId: string;
  supabaseUserId: string;
  role: 'student' | 'trainer';
  otherName: string;
  otherRole: 'student' | 'trainer';
  subtitle: string;
}

export default function ConversationPage() {
  const { authUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [info, setInfo] = useState<ConvInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      if (!authUser || !conversationId) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Get Supabase user record
        const { data: userRecord } = await supabase
          .from('users').select('id, role').eq('email', authUser.email).single();

        if (!userRecord) {
          setError('Your account was not found.');
          return;
        }

        // 2. Load the conversation + both parties
        const { data: conv, error: convErr } = await supabase
          .from('chat_conversations')
          .select(`
            id, student_id, trainer_id,
            student:students(id, full_name, admission_number),
            trainer:trainers(id, full_name, staff_number, position)
          `)
          .eq('id', conversationId)
          .single();

        if (convErr || !conv) {
          setError('Conversation not found or you do not have access.');
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const student = Array.isArray(conv.student) ? (conv.student as any[])[0] : conv.student as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const trainer = Array.isArray(conv.trainer) ? (conv.trainer as any[])[0] : conv.trainer as any;

        // 3. Verify access — only the student or trainer of THIS conversation can view it
        const role = userRecord.role as 'student' | 'trainer' | 'admin';

        if (role === 'student') {
          // Must be the student in this conversation
          const { data: myStudent } = await supabase
            .from('students').select('id').eq('user_id', userRecord.id).single();

          if (!myStudent || myStudent.id !== conv.student_id) {
            setError('You do not have permission to view this conversation.');
            return;
          }

          setInfo({
            conversationId,
            supabaseUserId: userRecord.id,
            role: 'student',
            otherName: trainer?.full_name || 'Trainer',
            otherRole: 'trainer',
            subtitle: trainer?.position || 'Trainer',
          });

        } else if (role === 'trainer') {
          // Must be the trainer in this conversation
          const { data: myTrainer } = await supabase
            .from('trainers').select('id').eq('user_id', userRecord.id).single();

          if (!myTrainer || myTrainer.id !== conv.trainer_id) {
            setError('You do not have permission to view this conversation.');
            return;
          }

          setInfo({
            conversationId,
            supabaseUserId: userRecord.id,
            role: 'trainer',
            otherName: student?.full_name || 'Student',
            otherRole: 'student',
            subtitle: student?.admission_number || '',
          });

        } else {
          setError('Administrators cannot access student conversations.');
          return;
        }

      } catch (err: unknown) {
        setError((err as Error).message || 'Unexpected error.');
      } finally {
        setLoading(false);
      }
    }

    setup();
  }, [authUser, conversationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-7 h-7 text-[#4a7c2f] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-start gap-4 p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Access Denied</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/chat')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#4a7c2f] dark:hover:text-[#4a7c2f] transition-colors w-fit flex-shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to messages
      </button>

      {/* Chat Window */}
      <div className="flex-1 min-h-0">
        {info && (
          <ChatWindow
            conversationId={info.conversationId}
            currentUserId={info.supabaseUserId}
            currentUserRole={info.role}
            otherPersonName={info.otherName}
            otherPersonRole={info.otherRole}
          />
        )}
      </div>
    </div>
  );
}
