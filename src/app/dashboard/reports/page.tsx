'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, FileText, Table as TableIcon, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/utils/helpers';

interface ReportButton {
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => Promise<void>;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const content = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateAllStudentsReport = async () => {
    const { data } = await supabase
      .from('students')
      .select(`*, trainer_assignments(trainer:trainers(full_name)), assessments(status, assessment_date), attachments(industry_name, county, date_attached)`)
      .order('full_name');

    const headers = ['Admission No', 'Full Name', 'Gender', 'Course', 'Department', 'Email', 'Phone', 'Year', 'Class', 'Status', 'Industry', 'County', 'Date Attached', 'Assigned Trainer', 'Assessment Status', 'Assessment Date'];
    const rows = (data || []).map((s: {
      admission_number: string;
      full_name: string;
      gender: string;
      course: string;
      department: string;
      email: string;
      phone_number: string;
      academic_year: string;
      class_name: string;
      status: string;
      attachments: { industry_name: string; county: string; date_attached: string }[] | null;
      trainer_assignments: { trainer: { full_name: string } | null }[] | null;
      assessments: { status: string; assessment_date: string | null }[] | null;
    }) => [
      s.admission_number, s.full_name, s.gender, s.course, s.department,
      s.email, s.phone_number, s.academic_year, s.class_name, s.status,
      s.attachments?.[0]?.industry_name || '',
      s.attachments?.[0]?.county || '',
      formatDate(s.attachments?.[0]?.date_attached),
      s.trainer_assignments?.[0]?.trainer?.full_name || '',
      s.assessments?.[0]?.status || '',
      formatDate(s.assessments?.[0]?.assessment_date),
    ]);
    downloadCSV(headers, rows, 'all_students');
    toast.success('Report downloaded!');
  };

  const generateAttachedStudentsReport = async () => {
    const { data } = await supabase
      .from('attachments')
      .select(`*, student:students(full_name, admission_number, course, phone_number, trainer_assignments(trainer:trainers(full_name)), assessments(status))`)
      .order('created_at', { ascending: false });

    const headers = ['Admission No', 'Student Name', 'Course', 'Phone', 'Industry', 'Specific Area', 'County', 'Supervisor', 'Supervisor Phone', 'Date Attached', 'Trainer', 'Assessment Status'];
    const rows = (data || []).map((a: {
      student: { admission_number: string; full_name: string; course: string; phone_number: string; trainer_assignments: { trainer: { full_name: string } | null }[] | null; assessments: { status: string }[] | null } | null;
      industry_name: string;
      specific_area: string;
      county: string;
      supervisor_name: string;
      supervisor_phone: string;
      date_attached: string;
    }) => [
      a.student?.admission_number || '',
      a.student?.full_name || '',
      a.student?.course || '',
      a.student?.phone_number || '',
      a.industry_name,
      a.specific_area,
      a.county,
      a.supervisor_name,
      a.supervisor_phone,
      formatDate(a.date_attached),
      a.student?.trainer_assignments?.[0]?.trainer?.full_name || '',
      a.student?.assessments?.[0]?.status || 'PENDING',
    ]);
    downloadCSV(headers, rows, 'attached_students');
    toast.success('Report downloaded!');
  };

  const generatePendingReport = async () => {
    const { data: allStudents } = await supabase.from('students').select('id, admission_number, full_name, course, department, email, phone_number');
    const { data: attached } = await supabase.from('attachments').select('student_id');
    const attachedIds = new Set((attached || []).map((a: { student_id: string }) => a.student_id));
    const pending = (allStudents || []).filter((s: { id: string }) => !attachedIds.has(s.id));

    const headers = ['Admission No', 'Full Name', 'Course', 'Department', 'Email', 'Phone'];
    const rows = pending.map((s: { admission_number: string; full_name: string; course: string; department: string; email: string; phone_number: string }) => [
      s.admission_number, s.full_name, s.course, s.department, s.email, s.phone_number
    ]);
    downloadCSV(headers, rows, 'pending_attachment');
    toast.success(`${pending.length} students without attachment exported`);
  };

  const generateAssessedReport = async () => {
    const { data } = await supabase
      .from('assessments')
      .select(`*, student:students(full_name, admission_number, course), trainer:trainers(full_name)`)
      .eq('status', 'ASSESSED')
      .order('assessment_date', { ascending: false });

    const headers = ['Admission No', 'Student Name', 'Course', 'Assessment Date', 'Trainer', 'Remarks'];
    const rows = (data || []).map((a: {
      student: { admission_number: string; full_name: string; course: string } | null;
      assessment_date: string | null;
      trainer: { full_name: string } | null;
      trainer_remarks: string | null;
    }) => [
      a.student?.admission_number || '',
      a.student?.full_name || '',
      a.student?.course || '',
      formatDate(a.assessment_date),
      a.trainer?.full_name || '',
      a.trainer_remarks || '',
    ]);
    downloadCSV(headers, rows, 'assessed_students');
    toast.success('Assessed students report downloaded!');
  };

  const generateCountyReport = async () => {
    const { data } = await supabase.from('attachments').select('county');
    const counts: Record<string, number> = {};
    (data || []).forEach((a: { county: string }) => {
      counts[a.county] = (counts[a.county] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    downloadCSV(['County', 'Number of Students'], sorted.map(([c, n]) => [c, String(n)]), 'students_per_county');
    toast.success('County report downloaded!');
  };

  const generateTrainerReport = async () => {
    const { data } = await supabase
      .from('trainer_assignments')
      .select(`trainer:trainers(full_name, staff_number, department), student:students(full_name, admission_number, course, attachments(industry_name, county), assessments(status))`);

    const headers = ['Trainer', 'Staff No', 'Department', 'Student', 'Admission No', 'Course', 'Industry', 'County', 'Assessment'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []).map((a: any) => {
      const trainer = Array.isArray(a.trainer) ? a.trainer[0] : a.trainer;
      const student = Array.isArray(a.student) ? a.student[0] : a.student;
      return [
        trainer?.full_name || '',
        trainer?.staff_number || '',
        trainer?.department || '',
        student?.full_name || '',
        student?.admission_number || '',
        student?.course || '',
        student?.attachments?.[0]?.industry_name || '',
        student?.attachments?.[0]?.county || '',
        student?.assessments?.[0]?.status || '',
      ];
    });
    downloadCSV(headers, rows, 'trainer_assignments');
    toast.success('Trainer report downloaded!');
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    try { await fn(); }
    catch { toast.error('Failed to generate report'); }
    finally { setLoading(null); }
  };

  const reports: (ReportButton & { key: string })[] = [
    {
      key: 'all',
      label: 'All Students Report',
      description: 'Complete list of all registered students with attachment and assessment details.',
      icon: <FileSpreadsheet className="w-6 h-6 text-green-600" />,
      action: generateAllStudentsReport,
    },
    {
      key: 'attached',
      label: 'Attached Students',
      description: 'Students currently on industrial attachment with industry and supervisor details.',
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      action: generateAttachedStudentsReport,
    },
    {
      key: 'pending',
      label: 'Pending Attachment',
      description: 'Students who have not yet submitted their attachment details.',
      icon: <TableIcon className="w-6 h-6 text-amber-600" />,
      action: generatePendingReport,
    },
    {
      key: 'assessed',
      label: 'Assessed Students',
      description: 'Students who have been assessed by their assigned trainers.',
      icon: <FileText className="w-6 h-6 text-purple-600" />,
      action: generateAssessedReport,
    },
    {
      key: 'county',
      label: 'Students by County',
      description: 'Distribution of students across different Kenyan counties.',
      icon: <TableIcon className="w-6 h-6 text-red-600" />,
      action: generateCountyReport,
    },
    {
      key: 'trainer',
      label: 'Students per Trainer',
      description: 'All trainer assignments with student and industry details.',
      icon: <FileSpreadsheet className="w-6 h-6 text-indigo-600" />,
      action: generateTrainerReport,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Download reports in CSV format for further analysis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map(report => (
          <Card key={report.key}>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                {report.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{report.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{report.description}</p>
              </div>
            </div>
            <button
              onClick={() => run(report.key, report.action)}
              disabled={loading === report.key}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
            >
              {loading === report.key
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />
              }
              Download CSV
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
