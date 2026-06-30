'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, Building2, UserCheck, MapPin, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/helpers';

interface TrainerInfo {
  full_name: string;
  staff_number: string;
  department: string;
  email: string;
  phone_number: string;
  position: string;
  specialization: string;
}

interface AttachmentInfo {
  industry_name: string;
  specific_area: string;
  county: string;
  supervisor_name: string;
  supervisor_phone: string;
  student_phone: string;
  date_attached: string;
  remarks?: string;
}

export default function MyTrainerPage() {
  const { authUser } = useAuth();
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null);
  const [attachment, setAttachment] = useState<AttachmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!authUser) return;
      setLoading(true);
      setError(null);

      try {
        // Step 1: Get Supabase user by email (NOT Firebase UID)
        const { data: userRecord, error: urErr } = await supabase
          .from('users')
          .select('id')
          .eq('email', authUser.email)
          .single();

        if (urErr || !userRecord) {
          setError('Your user account was not found. Contact the administrator.');
          return;
        }

        // Step 2: Get student using Supabase user ID
        const { data: student, error: stErr } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', userRecord.id)
          .single();

        if (stErr || !student) {
          setError('Your student profile was not found. Contact the administrator.');
          return;
        }

        // Step 3: Get trainer assignment (two separate queries for reliability)
        const { data: assignment } = await supabase
          .from('trainer_assignments')
          .select('trainer_id')
          .eq('student_id', student.id)
          .maybeSingle();

        if (assignment?.trainer_id) {
          // Step 4: Fetch trainer details directly
          const { data: trainerData } = await supabase
            .from('trainers')
            .select('full_name, staff_number, department, email, phone_number, position, specialization')
            .eq('id', assignment.trainer_id)
            .single();

          if (trainerData) setTrainer(trainerData);
        }

        // Step 5: Get attachment details
        const { data: att } = await supabase
          .from('attachments')
          .select('industry_name, specific_area, county, supervisor_name, supervisor_phone, student_phone, date_attached, remarks')
          .eq('student_id', student.id)
          .maybeSingle();

        if (att) setAttachment(att);

      } catch (err: unknown) {
        setError((err as Error).message || 'Unexpected error. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authUser]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#4a7c2f] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">My Assigned Trainer</h1>
      <Card>
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assigned Trainer</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your allocated industrial attachment supervisor</p>
      </div>

      {/* ── No Trainer Yet ── */}
      {!trainer ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Trainer Assigned Yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              A trainer has not yet been assigned to you. Please contact the ILO office or check back later.
            </p>
          </div>
        </Card>
      ) : (
        /* ── Trainer Card ── */
        <Card>
          {/* Avatar + Name */}
          <div className="flex items-center gap-4 pb-5 mb-5 border-b border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 rounded-2xl bg-[#4a7c2f] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {trainer.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{trainer.full_name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{trainer.position}</p>
              <span className="mt-1.5 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#4a7c2f]/10 text-[#4a7c2f] tracking-wide">
                {trainer.staff_number}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{trainer.department}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <UserCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Specialization</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{trainer.specialization}</p>
              </div>
            </div>

            <a href={`tel:${trainer.phone_number}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">Phone — tap to call</p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">{trainer.phone_number}</p>
              </div>
            </a>

            <a href={`mailto:${trainer.email}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Email — tap to email</p>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{trainer.email}</p>
              </div>
            </a>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your trainer will visit your workplace to conduct your assessment. Contact the ILO office if you need to change your trainer.
            </p>
          </div>
        </Card>
      )}

      {/* ── My Attachment Summary (so student can see it alongside trainer) ── */}
      {attachment && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-[#4a7c2f]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">My Attachment Details</h2>
          </div>
          <div className="space-y-0">
            {[
              { icon: <Briefcase className="w-4 h-4" />, label: 'Industry', value: attachment.industry_name },
              { icon: <MapPin className="w-4 h-4" />, label: 'Specific Area', value: attachment.specific_area },
              { icon: <MapPin className="w-4 h-4" />, label: 'County', value: attachment.county },
              { icon: <UserCheck className="w-4 h-4" />, label: 'Supervisor', value: attachment.supervisor_name },
              { icon: <Phone className="w-4 h-4" />, label: 'Supervisor Phone', value: attachment.supervisor_phone },
              { icon: <Phone className="w-4 h-4" />, label: 'My Phone', value: attachment.student_phone },
              { icon: <Building2 className="w-4 h-4" />, label: 'Date Attached', value: formatDate(attachment.date_attached) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
