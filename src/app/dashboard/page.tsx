'use client';

import { useEffect, useState } from 'react';
import {
  Users, UserCheck, Briefcase, Clock, CheckCircle, AlertCircle, TrendingUp, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { StatCard, Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats } from '@/services/supabase.service';
import { supabase } from '@/lib/supabase';
import { DashboardStats } from '@/types';
import { formatDate } from '@/utils/helpers';

const COLORS = ['#4a7c2f', '#d4a017', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { authUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [countyData, setCountyData] = useState<{ name: string; count: number }[]>([]);
  const [trainerData, setTrainerData] = useState<{ name: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ action: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const statsData = await getDashboardStats();
      setStats(statsData);

      const { data: attachments } = await supabase.from('attachments').select('county');
      if (attachments) {
        const counts: Record<string, number> = {};
        attachments.forEach((a: { county: string }) => {
          if (a.county) counts[a.county] = (counts[a.county] || 0) + 1;
        });
        setCountyData(
          Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([name, count]) => ({ name, count }))
        );
      }

      const { data: assignments } = await supabase
        .from('trainer_assignments')
        .select('trainer_id, trainer:trainers(full_name)');
      if (assignments) {
        const counts: Record<string, { name: string; count: number }> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignments.forEach((a: any) => {
          const trainerName = Array.isArray(a.trainer) ? a.trainer[0]?.full_name : a.trainer?.full_name;
          if (!counts[a.trainer_id]) {
            counts[a.trainer_id] = { name: trainerName || 'Unknown', count: 0 };
          }
          counts[a.trainer_id].count++;
        });
        setTrainerData(Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 6));
      }

      const { data: logs } = await supabase
        .from('audit_logs').select('action, created_at')
        .order('created_at', { ascending: false }).limit(5);
      if (logs) setRecentActivity(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const pieData = stats ? [
    { name: 'Attached', value: stats.students_attached },
    { name: 'Not Attached', value: stats.students_pending_attachment },
  ] : [];

  const assessmentPie = stats ? [
    { name: 'Assessed', value: stats.completed_assessments },
    { name: 'Pending', value: stats.pending_assessments },
  ] : [];

  const role = authUser?.role;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {role === 'admin' && 'System Overview'}
          {role === 'trainer' && `Welcome, ${authUser?.displayName}`}
          {role === 'student' && `Welcome, ${authUser?.displayName}`}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard title="Total Students" value={loading ? '—' : (stats?.total_students ?? 0)} icon={<Users className="w-6 h-6" />} color="green" subtitle="Registered in system" />
          <StatCard title="Total Trainers" value={loading ? '—' : (stats?.total_trainers ?? 0)} icon={<UserCheck className="w-6 h-6" />} color="blue" subtitle="Active supervisors" />
          <StatCard title="Students Attached" value={loading ? '—' : (stats?.students_attached ?? 0)} icon={<Briefcase className="w-6 h-6" />} color="amber" subtitle="Currently on attachment" />
          <StatCard title="Pending Attachment" value={loading ? '—' : (stats?.students_pending_attachment ?? 0)} icon={<AlertCircle className="w-6 h-6" />} color="red" subtitle="Yet to submit placement" />
          <StatCard title="Pending Assessments" value={loading ? '—' : (stats?.pending_assessments ?? 0)} icon={<Clock className="w-6 h-6" />} color="purple" subtitle="Awaiting trainer visit" />
          <StatCard title="Completed Assessments" value={loading ? '—' : (stats?.completed_assessments ?? 0)} icon={<CheckCircle className="w-6 h-6" />} color="green" subtitle="Assessed by trainer" />
        </div>
      )}

      {role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="w-5 h-5 text-[#4a7c2f]" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Students by County</h3>
            </div>
            {countyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={countyData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#4a7c2f" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No attachment data yet</div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-5">
              <UserCheck className="w-5 h-5 text-[#4a7c2f]" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Students per Trainer</h3>
            </div>
            {trainerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trainerData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#d4a017" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No assignment data yet</div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5 text-[#4a7c2f]" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Attachment Status</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle className="w-5 h-5 text-[#4a7c2f]" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Assessment Status</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={assessmentPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {assessmentPie.map((_, i) => <Cell key={i} fill={i === 0 ? '#4a7c2f' : '#f59e0b'} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {role === 'admin' && recentActivity.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((log, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="w-2 h-2 rounded-full bg-[#4a7c2f] flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{log.action}</p>
                <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(role === 'trainer' || role === 'student') && (
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#4a7c2f] flex items-center justify-center text-white text-2xl font-bold">
              {authUser?.displayName?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{authUser?.displayName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{authUser?.email}</p>
              <span className="mt-1 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#4a7c2f]/10 text-[#4a7c2f]">
                {role === 'trainer' ? 'Trainer / Supervisor' : 'Student'}
              </span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {role === 'student' && (
              <>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Attachment Status</p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Use the sidebar to view or submit your attachment details.</p>
                </div>
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Assessment</p>
                  <p className="mt-1 text-sm text-green-800 dark:text-green-300">Your assigned trainer will update your assessment status after visiting.</p>
                </div>
              </>
            )}
            {role === 'trainer' && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 sm:col-span-2">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Your Students</p>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">Navigate to "My Students" to view assigned students and manage assessments.</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
