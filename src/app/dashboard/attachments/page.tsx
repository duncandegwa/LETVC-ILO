'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, Edit2, Eye, RefreshCw, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { formatDate, KENYA_COUNTIES } from '@/utils/helpers';

interface AttachmentRow {
  id: string;
  industry_name: string;
  specific_area: string;
  county: string;
  supervisor_name: string;
  supervisor_phone: string;
  student_phone: string;
  date_attached: string;
  remarks?: string;
  student_name: string;
  admission_number: string;
  course: string;
  trainer_name: string | null;
  assessment_status: string | null;
  assessment_date: string | null;
  student_id: string;
}

const PER_PAGE = 15;

export default function AttachmentsPage() {
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewItem, setViewItem] = useState<AttachmentRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('attachments')
        .select(`
          *,
          student:students(full_name, admission_number, course,
            trainer_assignments(trainer:trainers(full_name)),
            assessments(status, assessment_date)
          )
        `)
        .order('created_at', { ascending: false });

      let rows: AttachmentRow[] = (data || []).map((a: {
        id: string;
        industry_name: string;
        specific_area: string;
        county: string;
        supervisor_name: string;
        supervisor_phone: string;
        student_phone: string;
        date_attached: string;
        remarks?: string;
        student_id: string;
        student: {
          full_name: string;
          admission_number: string;
          course: string;
          trainer_assignments: { trainer: { full_name: string } | null }[] | null;
          assessments: { status: string; assessment_date: string | null }[] | null;
        } | null;
      }) => ({
        id: a.id,
        industry_name: a.industry_name,
        specific_area: a.specific_area,
        county: a.county,
        supervisor_name: a.supervisor_name,
        supervisor_phone: a.supervisor_phone,
        student_phone: a.student_phone,
        date_attached: a.date_attached,
        remarks: a.remarks,
        student_id: a.student_id,
        student_name: a.student?.full_name || '—',
        admission_number: a.student?.admission_number || '—',
        course: a.student?.course || '—',
        trainer_name: a.student?.trainer_assignments?.[0]?.trainer?.full_name || null,
        assessment_status: a.student?.assessments?.[0]?.status || null,
        assessment_date: a.student?.assessments?.[0]?.assessment_date || null,
      }));

      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(r =>
          r.student_name.toLowerCase().includes(q) ||
          r.admission_number.toLowerCase().includes(q) ||
          r.industry_name.toLowerCase().includes(q) ||
          r.county.toLowerCase().includes(q)
        );
      }
      if (filterCounty) rows = rows.filter(r => r.county === filterCounty);
      if (filterStatus) rows = rows.filter(r => r.assessment_status === filterStatus);

      setAttachments(rows);
      setTotal(rows.length);
    } catch { toast.error('Failed to load attachments'); }
    finally { setLoading(false); }
  }, [search, filterCounty, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const paged = attachments.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const columns = [
    { key: 'student_name', header: 'Student', render: (r: AttachmentRow) => (
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{r.student_name}</p>
        <p className="text-xs text-gray-500">{r.admission_number}</p>
      </div>
    )},
    { key: 'industry_name', header: 'Industry', render: (r: AttachmentRow) => (
      <div>
        <p className="text-sm">{r.industry_name}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{r.county}</p>
      </div>
    )},
    { key: 'supervisor_name', header: 'Supervisor', render: (r: AttachmentRow) => (
      <div>
        <p className="text-sm">{r.supervisor_name}</p>
        <p className="text-xs text-gray-500">{r.supervisor_phone}</p>
      </div>
    )},
    { key: 'date_attached', header: 'Date', render: (r: AttachmentRow) => formatDate(r.date_attached) },
    { key: 'trainer_name', header: 'Trainer', render: (r: AttachmentRow) =>
      r.trainer_name ? <span className="text-sm">{r.trainer_name}</span> : <span className="text-xs text-gray-400">Unassigned</span>
    },
    { key: 'assessment_status', header: 'Assessment', render: (r: AttachmentRow) =>
      r.assessment_status
        ? <StatusBadge status={r.assessment_status as 'PENDING' | 'ASSESSED'} />
        : <span className="text-xs text-gray-400">—</span>
    },
    { key: 'actions', header: '', render: (r: AttachmentRow) => (
      <button onClick={() => setViewItem(r)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500">
        <Eye className="w-4 h-4" />
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attachments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} students on attachment</p>
        </div>
        <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData}>Refresh</Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input placeholder="Search student, industry, county..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <Select value={filterCounty} onChange={e => { setFilterCounty(e.target.value); setPage(1); }}
            options={KENYA_COUNTIES.map(c => ({ value: c, label: c }))} placeholder="All Counties" />
          <Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            options={[{ value: 'PENDING', label: 'Pending' }, { value: 'ASSESSED', label: 'Assessed' }]}
            placeholder="All Statuses" />
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns as Parameters<typeof Table>[0]['columns']} data={paged as unknown[] as Record<string, unknown>[]} loading={loading} emptyMessage="No attachment records found." />
        <div className="p-4">
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      {viewItem && (
        <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Attachment Details" size="md">
          <div className="space-y-3">
            {[
              ['Student', viewItem.student_name],
              ['Admission No.', viewItem.admission_number],
              ['Course', viewItem.course],
              ['Industry', viewItem.industry_name],
              ['Specific Area', viewItem.specific_area],
              ['County', viewItem.county],
              ['Industry Supervisor', viewItem.supervisor_name],
              ['Supervisor Phone', viewItem.supervisor_phone],
              ['Student Phone', viewItem.student_phone],
              ['Date Attached', formatDate(viewItem.date_attached)],
              ['Assigned Trainer', viewItem.trainer_name || 'Unassigned'],
              ['Assessment Status', viewItem.assessment_status || '—'],
              ['Assessment Date', formatDate(viewItem.assessment_date)],
              ['Remarks', viewItem.remarks || '—'],
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
