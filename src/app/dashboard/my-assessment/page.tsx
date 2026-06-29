'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/helpers';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AssessmentInfo {
  id: string;
  status: 'PENDING' | 'ASSESSED';
  assessment_date: string | null;
  trainer_remarks: string | null;
  trainer_name: string | null;
  trainer_phone: string | null;
}

export default function MyAssessmentPage() {
  const { authUser } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Core fetch: always use email → Supabase user → student ──
  const load = useCallback(async (silent = false) => {
    if (!authUser) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // Step 1: find Supabase user by EMAIL (never by Firebase UID)
      const { data: userRecord, error: uErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.email)
        .single();

      if (uErr || !userRecord) {
        setError('Your user account was not found. Please contact the administrator.');
        return;
      }

      // Step 2: find student record using Supabase user ID
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userRecord.id)
        .single();

      if (sErr || !student) {
        setError('Your student profile was not found. Please contact the administrator.');
        return;
      }

      setStudentId(student.id);

      // Step 3: fetch assessment record
      const { data: assess, error: aErr } = await supabase
        .from('assessments')
        .select('id, status, assessment_date, trainer_remarks, trainer_id')
        .eq('student_id', student.id)
        .maybeSingle();

      if (aErr) throw aErr;

      if (!assess) {
        // No assessment record yet — student hasn't submitted attachment or
        // trainer hasn't created one
        setAssessment(null);
        return;
      }

      // Step 4: fetch trainer details separately (avoids join parse issues)
      let trainerName: string | null = null;
      let trainerPhone: string | null = null;

      if (assess.trainer_id) {
        const { data: trainer } = await supabase
          .from('trainers')
          .select('full_name, phone_number')
          .eq('id', assess.trainer_id)
          .single();

        if (trainer) {
          trainerName  = trainer.full_name;
          trainerPhone = trainer.phone_number;
        }
      }

      setAssessment({
        id: assess.id,
        status: assess.status as 'PENDING' | 'ASSESSED',
        assessment_date: assess.assessment_date,
        trainer_remarks: assess.trainer_remarks,
        trainer_name: trainerName,
        trainer_phone: trainerPhone,
      });

    } catch (err: unknown) {
      setError((err as Error).message || 'Unexpected error. Please try refreshing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authUser]);

  // ── Initial load ─────────────────────────────────────────────
  useEffect(() => {
    load();
  }, [load]);

  // ── Supabase Realtime subscription — update instantly when
  //    trainer marks as assessed without student refreshing ─────
  useEffect(() => {
    if (!studentId) return;

    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`assessment:student:${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',           // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'assessments',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          // Re-fetch silently whenever the assessment row changes
          load(true);
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [studentId, load]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4a7c2f] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assessment</h1>
        <Card>
          <div className="flex items-start gap-4 p-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">Could not load assessment</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => load()}
                className="mt-3 text-sm text-[#4a7c2f] hover:underline font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── No assessment record yet ─────────────────────────────────
  if (!assessment) {
    return (
      <div className="max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assessment</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your industrial attachment assessment status</p>
          </div>
          <Button variant="outline" size="sm" icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />} onClick={() => load(true)}>
            Refresh
          </Button>
        </div>
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Assessment Record Yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Your assessment record will appear here once you have submitted your attachment details. The status will start as <strong>PENDING</strong> and change to <strong>ASSESSED</strong> after your trainer visits you.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const isAssessed = assessment.status === 'ASSESSED';

  // ── Main view ────────────────────────────────────────────────
  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assessment</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your industrial attachment assessment status
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          onClick={() => load(true)}
          loading={refreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Big status badge */}
      <Card>
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isAssessed
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            {isAssessed
              ? <CheckCircle className="w-8 h-8 text-green-600" />
              : <Clock className="w-8 h-8 text-amber-600" />
            }
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Assessment Status
            </p>
            <h2 className={`text-3xl font-bold mt-1 ${
              isAssessed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {assessment.status}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Updates automatically when your trainer assesses you
            </p>
          </div>
        </div>
      </Card>

      {/* Details card */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Assessment Details</h3>
        <div className="space-y-0">
          {[
            {
              label: 'Assessed By',
              value: assessment.trainer_name || '—',
              sub: assessment.trainer_phone || null,
            },
            {
              label: 'Assessment Date',
              value: assessment.assessment_date
                ? formatDate(assessment.assessment_date)
                : '—',
              sub: null,
            },
            {
              label: 'Trainer Remarks',
              value: assessment.trainer_remarks || null,
              sub: null,
            },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">
                {label}
              </span>
              <div>
                <span className={`text-sm ${
                  !value && label === 'Trainer Remarks'
                    ? 'text-gray-400 dark:text-gray-500 italic'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {value || 'No remarks added yet'}
                </span>
                {sub && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Status message */}
      {!isAssessed ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your assessment is <strong>pending</strong>. Your assigned trainer will visit your workplace and update your status. This page will update automatically — you do not need to refresh.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-400">
              <strong>Congratulations!</strong> Your industrial attachment has been assessed successfully. Keep this record for your academic file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
