'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/helpers';

interface AssessmentInfo {
  status: 'PENDING' | 'ASSESSED';
  assessment_date: string | null;
  trainer_remarks: string | null;
  trainer_name: string | null;
}

export default function MyAssessmentPage() {
  const { authUser } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!authUser) return;
      try {
        const { data: student } = await supabase
          .from('students').select('id').eq('user_id', authUser.firebaseUser.uid).single();
        if (!student) return;

        const { data } = await supabase
          .from('assessments')
          .select('status, assessment_date, trainer_remarks, trainer:trainers(full_name)')
          .eq('student_id', student.id)
          .single();

        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const trainerData = data.trainer as any;
          const trainerName = Array.isArray(trainerData)
            ? trainerData[0]?.full_name ?? null
            : trainerData?.full_name ?? null;

          setAssessment({
            status: data.status,
            assessment_date: data.assessment_date,
            trainer_remarks: data.trainer_remarks,
            trainer_name: trainerName,
          });
        }
      } catch { /* no assessment yet */ }
      finally { setLoading(false); }
    }
    load();
  }, [authUser]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#4a7c2f] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assessment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your industrial attachment assessment status</p>
      </div>

      {!assessment ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Assessment Record</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Submit your attachment details first. Your assessment record will be created automatically with a PENDING status.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                assessment.status === 'ASSESSED'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {assessment.status === 'ASSESSED'
                  ? <CheckCircle className="w-8 h-8 text-green-600" />
                  : <Clock className="w-8 h-8 text-amber-600" />
                }
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Assessment Status</p>
                <h2 className={`text-2xl font-bold mt-1 ${
                  assessment.status === 'ASSESSED' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {assessment.status}
                </h2>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              {[
                ['Assessed By', assessment.trainer_name || '—'],
                ['Assessment Date', formatDate(assessment.assessment_date)],
                ['Trainer Remarks', assessment.trainer_remarks || 'No remarks added yet'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                  <span className="text-xs font-semibold text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
                  <span className={`text-sm ${
                    label === 'Trainer Remarks' && !assessment.trainer_remarks
                      ? 'text-gray-400 italic'
                      : 'text-gray-900 dark:text-white'
                  }`}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {assessment.status === 'PENDING' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Your assessment is pending. Your assigned trainer will visit your workplace and update your status after the visit.
              </p>
            </div>
          )}
          {assessment.status === 'ASSESSED' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
              <p className="text-sm text-green-700 dark:text-green-400">
                Congratulations! Your industrial attachment has been assessed successfully. Keep the assessment report for your academic records.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
