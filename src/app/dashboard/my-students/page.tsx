'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, ClipboardCheck, Eye, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Table, Pagination } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/helpers';
import { createAuditLog } from '@/services/supabase.service';

interface StudentRow {
  student_id: string;
  admission_number: string;
  full_name: string;
  course: string;
  phone_number: string;
  industry_name: string | null;
  specific_area: string | null;
  county: string | null;
  supervisor_phone: string | null;
  date_attached: string | null;
  assessment_id: string | null;
  assessment_status: string | null;
  trainer_remarks: string | null;
  assessment_date: string | null;
  attachment_id: string | null;
}

const PER_PAGE = 15;

export default function MyStudentsPage() {
  const { authUser } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [assessModal, setAssessModal] = useState<StudentRow | null>(null);
  const [viewModal, setViewModal] = useState<StudentRow | null>(null);
  const [assessStatus, setAssessStatus] = useState<'PENDING' | 'ASSESSED'>('ASSESSED');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const { data: trainer } = await supabase
        .from('trainers').select('id').eq('user_id', authUser.firebaseUser.uid).single();
      if (!trainer) { setStudents([]); return; }

      const { data } = await supabase
        .from('trainer_assignments')
        .select(`student:students(id, admission_number, full_name, course, phone_number,
            attachments(id, industry_name, specific_area, county, supervisor_phone, date_attached),
            assessments(id, status, trainer_remarks, assessment_date))`)
        .eq('trainer_id', trainer.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: StudentRow[] = (data || []).map((a: any) => {
        const s = Array.isArray(a.student) ? a.student[0] : a.student;
        const att = Array.isArray(s?.attachments) ? s.attachments[0] : null;
        const assess = Array.isArray(s?.assessments) ? s.assessments[0] : null;
        return {
          student_id: s?.id || '',
          admission_number: s?.admission_number || '',
          full_name: s?.full_name || '',
          course: s?.course || '',
          phone_number: s?.phone_number || '',
          industry_name: att?.industry_name || null,
          specific_area: att?.specific_area || null,
          county: att?.county || null,
          supervisor_phone: att?.supervisor_phone || null,
          date_attached: att?.date_attached || null,
          attachment_id: att?.id || null,
          assessment_id: assess?.id || null,
          assessment_status: assess?.status || null,
          trainer_remarks: assess?.trainer_remarks || null,
          assessment_date: assess?.assessment_date || null,
        };
      });

      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(r =>
          r.full_name.toLowerCase().includes(q) ||
          r.admission_number.toLowerCase().includes(q) ||
          r.course.toLowerCase().includes(q)
        );
      }
      if (filterCounty) rows = rows.filter(r => r.county === filterCounty);
      if (filterStatus) rows = rows.filter(r => r.assessment_status === filterStatus);

      setStudents(rows);
    } catch { toast.error('Failed to load your students'); }
    finally { setLoading(false); }
  }, [authUser, search, filterCounty, filterStatus]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const openAssess = (s: StudentRow) => {
    setAssessModal(s);
    setAssessStatus((s.assessment_status as 'PENDING' | 'ASSESSED') || 'ASSESSED');
    setRemarks(s.trainer_remarks || '');
  };

  const handleAssess = async () => {
    if (!assessModal) return;
    setSaving(true);
    try {
      if (assessModal.assessment_id) {
        await supabase.from('assessments').update({
          status: assessStatus,
          trainer_remarks: remarks,
          assessment_date: assessStatus === 'ASSESSED' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('id', assessModal.assessment_id);
      } else {
        await supabase.from('assessments').insert({
          student_id: assessModal.student_id,
          trainer_id: authUser!.profileId,
          attachment_id: assessModal.attachment_id,
          status: assessStatus,
          trainer_remarks: remarks,
          assessment_date: assessStatus === 'ASSESSED' ? new Date().toISOString() : null,
        });
      }
      await createAuditLog({
        user_id: authUser!.profileId,
        action: `Updated assessment for ${assessModal.full_name} to ${assessStatus}`,
        table_name: 'assessments',
        record_id: assessModal.student_id,
      });
      toast.success('Assessment updated!');
      setAssessModal(null);
      loadStudents();
    } catch { toast.error('Failed to update assessment'); }
    finally { setSaving(false); }
  };

  const paged = students.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const counties = [...new Set(students.map(s => s.county).filter(Boolean))] as string[];

  const columns = [
    { key: 'admission_number', header: 'Adm. No.', render: (s: StudentRow) => (
      <span className="font-mono text-xs font-semibold text-[#4a7c2f]">{s.admission_number}</span>
    )},
    { key: 'full_name', header: 'Student', render: (s: StudentRow) => (
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{s.full_name}</p>
        <p className="text-xs text-gray-500">{s.course}</p>
      </div>
    )},
    { key: 'industry_name', header: 'Industry', render: (s: StudentRow) =>
      s.industry_name ? (
        <div>
          <p className="text-sm">{s.industry_name}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.county}</p>
        </div>
      ) : <span className="text-xs text-gray-400">Not submitted</span>
    },
    { key: 'phone_number', header: 'Phone' },
    { key: 'date_attached', header: 'Date', render: (s: StudentRow) => formatDate(s.date_attached) },
    { key: 'assessment_status', header: 'Assessment', render: (s: StudentRow) =>
      s.assessment_status
        ? <StatusBadge status={s.assessment_status as 'PENDING' | 'ASSESSED'} />
        : <span className="text-xs text-gray-400">—</span>
    },
    { key: 'actions', header: 'Actions', render: (s: StudentRow) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setViewModal(s)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500">
          <Eye className="w-4 h-4" />
        </button>
        {s.attachment_id && (
          <button onClick={() => openAssess(s)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4a7c2f]/10 hover:bg-[#4a7c2f]/20 text-[#4a7c2f] text-xs font-medium">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Assess
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Students</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{students.length} students assigned to you</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input placeholder="Search name, admission, course..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <Select value={filterCounty} onChange={e => { setFilterCounty(e.target.value); setPage(1); }}
            options={counties.map(c => ({ value: c, label: c }))} placeholder="All Counties" />
          <Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            options={[{ value: 'PENDING', label: 'Pending' }, { value: 'ASSESSED', label: 'Assessed' }]}
            placeholder="All Statuses" />
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={paged} loading={loading} emptyMessage="No students assigned to you yet." keyField="student_id" />
        <div className="p-4">
          <Pagination page={page} total={students.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      <Modal isOpen={!!assessModal} onClose={() => setAssessModal(null)} title={`Assess — ${assessModal?.full_name}`} size="sm">
        <div className="space-y-4">
          <Select label="Assessment Status" value={assessStatus}
            onChange={e => setAssessStatus(e.target.value as 'PENDING' | 'ASSESSED')}
            options={[{ value: 'PENDING', label: 'Pending' }, { value: 'ASSESSED', label: 'Assessed' }]} />
          <Textarea label="Trainer Remarks" value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Add your assessment remarks..." rows={4} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAssessModal(null)}>Cancel</Button>
            <Button onClick={handleAssess} loading={saving}>Save Assessment</Button>
          </div>
        </div>
      </Modal>

      {viewModal && (
        <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Student Details" size="md">
          <div className="space-y-3">
            {[
              ['Admission No.', viewModal.admission_number],
              ['Full Name', viewModal.full_name],
              ['Course', viewModal.course],
              ['Phone', viewModal.phone_number],
              ['Industry', viewModal.industry_name || '—'],
              ['Specific Area', viewModal.specific_area || '—'],
              ['County', viewModal.county || '—'],
              ['Supervisor Phone', viewModal.supervisor_phone || '—'],
              ['Date Attached', formatDate(viewModal.date_attached)],
              ['Assessment', viewModal.assessment_status || '—'],
              ['Assessment Date', formatDate(viewModal.assessment_date)],
              ['Remarks', viewModal.trainer_remarks || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs font-semibold text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
