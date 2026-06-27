'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Loader2, Search, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTrainerConversations,
  getOrCreateConversation,
  getUnreadCount,
} from '@/services/chat.service';
import { cn } from '@/utils/helpers';

interface StudentChatRow {
  conversationId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  course: string;
  updatedAt: string;
  unread: number;
}

export default function TrainerChatPage() {
  const { authUser } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<StudentChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [assignedCount, setAssignedCount] = useState(0);

  const load = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const { data: userRecord } = await supabase
        .from('users').select('id').eq('email', authUser.email).single();
      if (!userRecord) return;

      const { data: trainer } = await supabase
        .from('trainers').select('id').eq('user_id', userRecord.id).single();
      if (!trainer) return;

      setTrainerId(trainer.id);

      // All assigned students
      const { data: assignments } = await supabase
        .from('trainer_assignments')
        .select('student:students(id, full_name, admission_number, course)')
        .eq('trainer_id', trainer.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const students = (assignments || []).map((a: any) => {
        const s = Array.isArray(a.student) ? a.student[0] : a.student;
        return { id: s.id, full_name: s.full_name, admission_number: s.admission_number, course: s.course };
      });
      setAssignedCount(students.length);

      // Existing conversations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conversations: any[] = await getTrainerConversations(trainer.id);

      const built: StudentChatRow[] = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversations.map(async (conv: any) => {
          const student = Array.isArray(conv.student) ? conv.student[0] : conv.student;
          const unread = await getUnreadCount(conv.id, 'trainer');
          return {
            conversationId: conv.id,
            studentId: student?.id || '',
            studentName: student?.full_name || 'Unknown',
            admissionNumber: student?.admission_number || '',
            course: student?.course || '',
            updatedAt: conv.updated_at,
            unread,
          };
        })
      );

      // Add students without conversations yet
      const existingIds = new Set(built.map(r => r.studentId));
      students.forEach(s => {
        if (!existingIds.has(s.id)) {
          built.push({
            conversationId: '',
            studentId: s.id,
            studentName: s.full_name,
            admissionNumber: s.admission_number,
            course: s.course,
            updatedAt: '',
            unread: 0,
          });
        }
      });

      // Sort: latest activity first
      built.sort((a, b) => {
        if (a.updatedAt && !b.updatedAt) return -1;
        if (!a.updatedAt && b.updatedAt) return 1;
        if (a.updatedAt && b.updatedAt) return b.updatedAt.localeCompare(a.updatedAt);
        return a.studentName.localeCompare(b.studentName);
      });

      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  const openChat = async (row: StudentChatRow) => {
    if (!trainerId) return;
    setOpening(row.studentId);
    let convId = row.conversationId;
    if (!convId) {
      const conv = await getOrCreateConversation(row.studentId, trainerId);
      if (!conv) { setOpening(null); return; }
      convId = conv.id;
    }
    router.push(`/dashboard/chat/${convId}`);
  };

  const filtered = search
    ? rows.filter(r =>
        r.studentName.toLowerCase().includes(search.toLowerCase()) ||
        r.admissionNumber.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const totalUnread = rows.reduce((acc, r) => acc + r.unread, 0);

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#4a7c2f]/10 text-[#4a7c2f]">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Messages</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {assignedCount} assigned · {totalUnread > 0 ? `${totalUnread} unread` : 'all read'}
            </p>
          </div>
        </div>
        {totalUnread > 0 && (
          <span className="px-3 py-1 rounded-full bg-[#4a7c2f] text-white text-xs font-bold">
            {totalUnread} new
          </span>
        )}
      </div>

      <Input
        placeholder="Search student name or admission number..."
        leftIcon={<Search className="w-4 h-4" />}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-[#4a7c2f] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {assignedCount === 0 ? 'No Students Assigned' : 'No Results'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-xs">
              {assignedCount === 0
                ? 'Students will appear here once the administrator assigns them to you.'
                : 'No student matches your search.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-1">
          {filtered.map(row => (
            <button
              key={row.studentId}
              onClick={() => openChat(row)}
              disabled={opening === row.studentId}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                'hover:border-[#4a7c2f] hover:shadow-sm',
                row.unread > 0 && 'border-[#4a7c2f]/40 bg-[#4a7c2f]/[0.02] dark:bg-[#4a7c2f]/5'
              )}
            >
              <div className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-base flex-shrink-0',
                row.unread > 0 ? 'bg-[#4a7c2f]' : 'bg-gray-400 dark:bg-gray-600'
              )}>
                {row.studentName[0]?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    'text-sm truncate',
                    row.unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-900 dark:text-white'
                  )}>
                    {row.studentName}
                  </p>
                  {row.updatedAt && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(row.updatedAt)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {row.admissionNumber} · {row.course}
                  </p>
                  {row.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#4a7c2f] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {row.unread > 9 ? '9+' : row.unread}
                    </span>
                  )}
                </div>
                {!row.updatedAt && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">Tap to start chatting</p>
                )}
              </div>

              <div className="flex-shrink-0">
                {opening === row.studentId
                  ? <Loader2 className="w-4 h-4 text-[#4a7c2f] animate-spin" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
