'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, Eye, RefreshCw, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';
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
  student_id: string;
  industry_name: string;
  specific_area: string;
  county: string;
  supervisor_name: string;
  supervisor_phone: string;
  student_phone: string;
  date_attached: string;
  attachment_remarks: string | null;
  // student info
  student_name: string;
  admission_number: string;
  course: string;
  // trainer (fetched separately)
  trainer_name: string | null;
  trainer_staff: string | null;
  // assessment (fetched separately)
  assessment_status: string | null;
  assessment_date: string | null;
  assessment_remarks: string | null;
}

const PER_PAGE = 15;

export default function AttachmentsPage() {
  const [allRows, setAllRows] = useState<AttachmentRow[]>([]);
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewItem, setViewItem] = useState<AttachmentRow | null>(null);

  // ── Load using FOUR separate queries — no complex joins ──────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. All attachments
      const { data: attachments, error: attErr } = await supabase
        .from('attachments')
        .select('id, student_id, industry_name, specific_area, county, supervisor_name, supervisor_phone, student_phone, date_attached, remarks')
        .order('created_at', { ascending: false });

      if (attErr) throw attErr;
      if (!attachments || attachments.length === 0) {
        setAllRows([]);
        setLoading(false);
        return;
      }

      const studentIds = attachments.map((a: { student_id: string }) => a.student_id);

      // 2. Student info for those IDs
      const { data: students, error: stErr } = await supabase
        .from('students')
        .select('id, full_name, admission_number, course')
        .in('id', studentIds);

      if (stErr) throw stErr;

      // 3. Trainer assignments for those students
      const { data: assignments, error: asErr } = await supabase
        .from('trainer_assignments')
        .select('student_id, trainer_id, trainer:trainers(full_name, staff_number)')
        .in('student_id', studentIds);

      if (asErr) throw asErr;

      // 4. Assessments for those students
      const { data: assessments, error: aeErr } = await supabase
        .from('assessments')
        .select('student_id, status, assessment_date, trainer_remarks')
        .in('student_id', studentIds);

      if (aeErr) throw aeErr;

      // ── Build lookup maps ────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const studentMap: Record<string, any> = {};
      (students || []).forEach((s: { id: string }) => { studentMap[s.id] = s; });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trainerMap: Record<string, { name: string; staff: string }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (assignments || []).forEach((a: any) => {
        const t = Array.isArray(a.trainer) ? a.trainer[0] : a.trainer;
        if (t) {
          trainerMap[a.student_id] = {
            name: t.full_name || '',
            staff: t.staff_number || '',
          };
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assessMap: Record<string, any> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (assessments || []).forEach((a: any) => { assessMap[a.student_id] = a; });

      // ── Merge into rows ──────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged: AttachmentRow[] = (attachments || []).map((a: any) => {
        const student = studentMap[a.student_id] || {};
        const trainer = trainerMap[a.student_id] || null;
        const assess = assessMap[a.student_id] || null;
        return {
          id: a.id,
          student_id: a.student_id,
          industry_name: a.industry_name || '',
          specific_area: a.specific_area || '',
          county: a.county || '',
          supervisor_name: a.supervisor_name || '',
          supervisor_phone: a.supervisor_phone || '',
          student_phone: a.student_phone || '',
          date_attached: a.date_attached || '',
          attachment_remarks: a.remarks || null,
          student_name: student.full_name || '—',
          admission_number: student.admission_number || '—',
          course: student.course || '—',
          trainer_name: trainer?.name || null,
          trainer_staff: trainer?.staff || null,
          assessment_status: assess?.status || null,
          assessment_date: assess?.assessment_date || null,
          assessment_remarks: assess?.trainer_remarks || null,
        };
      });

      setAllRows(merged);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Apply filters client-side ─────────────────────────────────
  useEffect(() => {
    let filtered = allRows;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.student_name.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        r.industry_name.toLowerCase().includes(q) ||
        r.county.toLowerCase().includes(q) ||
        (r.trainer_name || '').toLowerCase().includes(q)
      );
    }
    if (filterCounty) filtered = filtered.filter(r => r.county === filterCounty);
    if (filterStatus === 'PENDING') filtered = filtered.filter(r => r.assessment_status === 'PENDING');
    if (filterStatus === 'ASSESSED') filtered = filtered.filter(r => r.assessment_status === 'ASSESSED');
    if (filterStatus === 'unassigned') filtered = filtered.filter(r => !r.trainer_name);
    setRows(filtered);
    setPage(1);
  }, [allRows, search, filterCounty, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const paged = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Summary counts ───────────────────────────────────────────
  const assignedCount  = allRows.filter(r => r.trainer_name).length;
  const assessedCount  = allRows.filter(r => r.assessment_status === 'ASSESSED').length;
  const pendingCount   = allRows.filter(r => r.assessment_status === 'PENDING').length;

  const columns = [
    {
      key: 'student_name', header: 'Student',
      render: (r: AttachmentRow) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{r.student_name}</p>
          <p className="text-xs text-gray-500">{r.admission_number}</p>
        </div>
      ),
    },
    {
      key: 'industry_name', header: 'Industry',
      render: (r: AttachmentRow) => (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.industry_name}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />{r.county}
          </p>
        </div>
      ),
    },
    {
      key: 'supervisor_name', header: 'Supervisor',
      render: (r: AttachmentRow) => (
        <div>
          <p className="text-sm">{r.supervisor_name}</p>
          <p className="text-xs text-gray-500">{r.supervisor_phone}</p>
        </div>
      ),
    },
    {
      key: 'date_attached', header: 'Date Attached',
      render: (r: AttachmentRow) => (
        <span className="text-xs text-gray-700 dark:text-gray-300">{formatDate(r.date_attached)}</span>
      ),
    },
    {
      key: 'trainer_name', header: 'Assigned Trainer',
      render: (r: AttachmentRow) => r.trainer_name ? (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{r.trainer_name}</p>
            <p className="text-xs text-gray-500">{r.trainer_staff}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Unassigned</span>
        </div>
      ),
    },
    {
      key: 'assessment_status', header: 'Assessment',
      render: (r: AttachmentRow) => r.assessment_status ? (
        <StatusBadge status={r.assessment_status as 'PENDING' | 'ASSESSED'} />
      ) : (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">Not started</span>
        </div>
      ),
    },
    {
      key: 'actions', header: '',
      render: (r: AttachmentRow) => (
        <button
          onClick={() => setViewItem(r)}
          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attachments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {allRows.length} students on attachment
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {allRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Attached', value: allRows.length,  color: 'text-gray-800 dark:text-gray-200' },
            { label: 'Trainer Assigned', value: assignedCount, color: 'text-green-600 dark:text-green-400' },
            { label: 'Pending Assessment', value: pendingCount, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Assessed', value: assessedCount,         color: 'text-blue-600 dark:text-blue-400' },
          ].map(item => (
            <Card key={item.label}>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            placeholder="Search student, industry, county, trainer..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select
            value={filterCounty}
            onChange={e => setFilterCounty(e.target.value)}
            options={KENYA_COUNTIES.map(c => ({ value: c, label: c }))}
            placeholder="All Counties"
          />
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            options={[
              { value: 'PENDING',    label: 'Pending Assessment' },
              { value: 'ASSESSED',   label: 'Assessed' },
              { value: 'unassigned', label: 'Trainer Unassigned' },
            ]}
            placeholder="All Statuses"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <Table
          columns={columns}
          data={paged}
          loading={loading}
          emptyMessage="No attachment records found."
          keyField="id"
        />
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <Pagination page={page} total={rows.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      {/* Detail Modal */}
      {viewItem && (
        <Modal
          isOpen={!!viewItem}
          onClose={() => setViewItem(null)}
          title={`${viewItem.student_name} — Attachment Details`}
          size="md"
        >
          <div className="space-y-5">

            {/* Student info */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Student</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Admission No.',  viewItem.admission_number],
                  ['Course',         viewItem.course],
                ].map(([label, value]) => (
                  <div key={label} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachment info */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Attachment</p>
              <div className="space-y-2">
                {[
                  ['Industry',          viewItem.industry_name],
                  ['Specific Area',     viewItem.specific_area],
                  ['County',            viewItem.county],
                  ['Supervisor Name',   viewItem.supervisor_name],
                  ['Supervisor Phone',  viewItem.supervisor_phone],
                  ['Student Phone',     viewItem.student_phone],
                  ['Date Attached',     formatDate(viewItem.date_attached)],
                  ['Remarks',           viewItem.attachment_remarks || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-gray-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trainer */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Assigned Trainer</p>
              {viewItem.trainer_name ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">{viewItem.trainer_name}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{viewItem.trainer_staff}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    No trainer assigned. Go to <strong>Assignments</strong> to assign one.
                  </p>
                </div>
              )}
            </div>

            {/* Assessment */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Assessment</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">Status</span>
                  <span>
                    {viewItem.assessment_status
                      ? <StatusBadge status={viewItem.assessment_status as 'PENDING' | 'ASSESSED'} />
                      : <span className="text-sm text-gray-400 italic">Not started yet</span>
                    }
                  </span>
                </div>
                <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">Assessment Date</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {viewItem.assessment_date ? formatDate(viewItem.assessment_date) : '—'}
                  </span>
                </div>
                <div className="flex items-start gap-3 py-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">Trainer Remarks</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {viewItem.assessment_remarks || <span className="italic text-gray-400">No remarks yet</span>}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}
