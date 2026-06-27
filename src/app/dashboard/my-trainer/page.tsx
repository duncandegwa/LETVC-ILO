'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, Building2, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface TrainerInfo {
  full_name: string;
  staff_number: string;
  department: string;
  email: string;
  phone_number: string;
  position: string;
  specialization: string;
}

export default function MyTrainerPage() {
  const { authUser } = useAuth();
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!authUser) return;
      try {
        const { data: student } = await supabase
          .from('students').select('id').eq('user_id', authUser.firebaseUser.uid).single();

        if (!student) return;

        const { data: assignment } = await supabase
          .from('trainer_assignments')
          .select('trainer:trainers(*)')
          .eq('student_id', student.id)
          .single();

        if (assignment?.trainer) setTrainer(assignment.trainer as unknown as TrainerInfo);
      } catch { /* no assignment */ }
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assigned Trainer</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your allocated industrial attachment supervisor</p>
      </div>

      {!trainer ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Trainer Assigned</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              A trainer has not yet been assigned to you. Please contact the department office or check back later.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 rounded-2xl bg-[#4a7c2f] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {trainer.full_name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{trainer.full_name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{trainer.position}</p>
              <span className="mt-1 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#4a7c2f]/10 text-[#4a7c2f]">
                {trainer.staff_number}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{trainer.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <UserCheck className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Specialization</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{trainer.specialization}</p>
              </div>
            </div>
            <a
              href={`tel:${trainer.phone_number}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">Phone Number</p>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">{trainer.phone_number}</p>
              </div>
            </a>
            <a
              href={`mailto:${trainer.email}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Email Address</p>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{trainer.email}</p>
              </div>
            </a>
          </div>

          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your assigned trainer will visit you during the attachment period to conduct your assessment. You cannot change your assigned trainer. Contact the ILO office for any concerns.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
