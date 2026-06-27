'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { ChatMessage } from '@/types';
import {
  getMessages,
  sendMessage,
  markMessagesRead,
  subscribeToMessages,
} from '@/services/chat.service';
import { cn } from '@/utils/helpers';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;           // Supabase users.id
  currentUserRole: 'student' | 'trainer';
  otherPersonName: string;
  otherPersonRole: 'student' | 'trainer';
}

export function ChatWindow({
  conversationId,
  currentUserId,
  currentUserRole,
  otherPersonName,
  otherPersonRole,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load messages on mount ──────────────────────────────────
  const loadMessages = useCallback(async () => {
    setLoading(true);
    const msgs = await getMessages(conversationId);
    setMessages(msgs);
    setLoading(false);
    // Mark messages from other person as read
    await markMessagesRead(conversationId, currentUserRole);
  }, [conversationId, currentUserRole]);

  // ── Subscribe to realtime new messages ─────────────────────
  useEffect(() => {
    loadMessages();

    channelRef.current = subscribeToMessages(conversationId, (newMsg) => {
      setMessages(prev => {
        // Avoid duplicate if we already have it (optimistic insert)
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Mark as read if the new message is from the other person
      if (newMsg.sender_role !== currentUserRole) {
        markMessagesRead(conversationId, currentUserRole);
      }
    });

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [conversationId, currentUserRole, loadMessages]);

  // ── Auto scroll to bottom when messages change ─────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Optimistic UI — show message immediately
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      sender_role: currentUserRole,
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setInput('');
    inputRef.current?.focus();
    setSending(true);

    const saved = await sendMessage(conversationId, currentUserId, currentUserRole, text);

    if (saved) {
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } else {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text); // restore input
    }

    setSending(false);
  };

  // ── Handle Enter key (Shift+Enter = new line) ──────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Auto-resize textarea ────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ── Format time ─────────────────────────────────────────────
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // ── Group messages with date separators ────────────────────
  const groupedMessages = () => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toDateString();
      const last = groups[groups.length - 1];
      if (!last || last.date !== date) {
        groups.push({ date, messages: [msg] });
      } else {
        last.messages.push(msg);
      }
    });
    return groups;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* ── Chat Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#4a7c2f] text-white flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm flex-shrink-0">
          {otherPersonName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">{otherPersonName}</p>
          <p className="text-xs text-green-200 capitalize">{otherPersonRole}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
          <span className="text-xs text-green-200">Live</span>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50 dark:bg-gray-950">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-[#4a7c2f] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#4a7c2f]/10 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-[#4a7c2f]" />
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">Start the conversation</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Send a message to {otherPersonName}
              </p>
            </div>
          </div>
        ) : (
          groupedMessages().map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500 px-2 flex-shrink-0">
                  {formatDateSeparator(group.messages[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Messages in this group */}
              <div className="space-y-1">
                {group.messages.map((msg, i) => {
                  const isMine = msg.sender_id === currentUserId ||
                    msg.sender_role === currentUserRole;
                  const prevMsg = group.messages[i - 1];
                  const isConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        isMine ? 'justify-end' : 'justify-start',
                        isConsecutive ? 'mt-0.5' : 'mt-3'
                      )}
                    >
                      {/* Avatar for other person (only first in a group) */}
                      {!isMine && (
                        <div className={cn(
                          'w-7 h-7 rounded-full bg-[#4a7c2f] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mr-2 self-end',
                          isConsecutive && 'invisible'
                        )}>
                          {otherPersonName[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className={cn('max-w-[75%] flex flex-col', isMine && 'items-end')}>
                        <div className={cn(
                          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap',
                          isMine
                            ? 'bg-[#4a7c2f] text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm shadow-sm'
                        )}>
                          {msg.message}
                        </div>
                        {/* Timestamp */}
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 px-1">
                          {formatTime(msg.created_at)}
                          {isMine && (
                            <span className="ml-1">
                              {msg.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherPersonName}…`}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm',
              'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white',
              'border-gray-300 dark:border-gray-600',
              'focus:outline-none focus:ring-2 focus:ring-[#4a7c2f] focus:border-transparent',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'transition-all duration-150 max-h-[120px]'
            )}
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
              input.trim() && !sending
                ? 'bg-[#4a7c2f] hover:bg-[#3d6827] text-white shadow-sm hover:shadow'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 px-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
