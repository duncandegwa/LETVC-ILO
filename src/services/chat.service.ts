import { supabase } from '@/lib/supabase';
import { ChatConversation, ChatMessage } from '@/types';

// ─── GET OR CREATE CONVERSATION ──────────────────────────────
// Called when a student opens chat or trainer opens a student chat
export async function getOrCreateConversation(
  studentId: string,
  trainerId: string
): Promise<ChatConversation | null> {
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('student_id', studentId)
    .eq('trainer_id', trainerId)
    .maybeSingle();

  if (existing) return existing;

  // Create new one
  const { data: created, error } = await supabase
    .from('chat_conversations')
    .insert({ student_id: studentId, trainer_id: trainerId })
    .select()
    .single();

  if (error) {
    console.error('Failed to create conversation:', error.message);
    return null;
  }

  return created;
}

// ─── GET MESSAGES FOR A CONVERSATION ─────────────────────────
export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load messages:', error.message);
    return [];
  }

  return data || [];
}

// ─── SEND A MESSAGE ──────────────────────────────────────────
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderRole: 'student' | 'trainer',
  message: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_role: senderRole,
      message: message.trim(),
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to send message:', error.message);
    return null;
  }

  return data;
}

// ─── MARK MESSAGES AS READ ───────────────────────────────────
export async function markMessagesRead(
  conversationId: string,
  readerRole: 'student' | 'trainer'
): Promise<void> {
  // Mark all messages NOT sent by this reader as read
  const senderRole = readerRole === 'student' ? 'trainer' : 'student';
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', senderRole)
    .eq('is_read', false);
}

// ─── GET UNREAD COUNT FOR A CONVERSATION ─────────────────────
export async function getUnreadCount(
  conversationId: string,
  readerRole: 'student' | 'trainer'
): Promise<number> {
  const senderRole = readerRole === 'student' ? 'trainer' : 'student';
  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', senderRole)
    .eq('is_read', false);

  return count || 0;
}

// ─── GET ALL CONVERSATIONS FOR A TRAINER ─────────────────────
export async function getTrainerConversations(trainerId: string) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select(`
      *,
      student:students(id, full_name, admission_number, course)
    `)
    .eq('trainer_id', trainerId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load conversations:', error.message);
    return [];
  }

  return data || [];
}

// ─── GET CONVERSATION FOR STUDENT ────────────────────────────
export async function getStudentConversation(studentId: string) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select(`
      *,
      trainer:trainers(id, full_name, staff_number, department, position)
    `)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load student conversation:', error.message);
    return null;
  }

  return data;
}

// ─── SUBSCRIBE TO NEW MESSAGES (REALTIME) ────────────────────
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: ChatMessage) => void
) {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return channel;
}
