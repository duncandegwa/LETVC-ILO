'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, ClipboardCheck, Eye, MapPin, Phone, Briefcase, RefreshCw } from 'lucide-react';
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
  department: string;
  phone_number: string;
  // attachment fields
  attachment_id: string | null;
  industry_name: string | null;
  specific_area: string | null;
  county: string | null;
  supervisor_name: string | null;
  supervisor_phone: string | null;
  student_phone: string | null;
  date_attached: string | null;
  remarks: string | null;
  // assessment fields
  assessment_id: string | null;
  assessment_status: string | null;
  trainer_remarks: string | null;
  assessment_date: string | null;
}

const PER_PAGE = 15;

export default function MyStudentsPage() {
  const { authUser } = useAuth();
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [trainerSupabaseUserId, setTrainerSupabaseUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [assessModal, setAssessModal] = useState<StudentRow | null>(null);
  const [viewModal, setViewModal] = useState<StudentRow | null>(null);
  const [assessStatus, setAssessStatus] = useState<'PENDING' | 'ASSESSED'>('ASSESSED');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Resolve trainer identity using email (not Firebase UID) ──
  const resolveTrainer = useCallback(async (): Promise<{ trainerId: string; userId: string } | null> => {
    if (!authUser) return null;
    try {
      // Use email to find Supabase user
      const { data: userRecord, error: uErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.email)
        .single();

      if (uErr || !userRecord) {
        setErrorMsg('Your user account was not found. Contact the administrator.');
        return null;
      }

      // Find trainer record using Supabase user ID
      const { data: trainer, error: tErr } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', userRecord.id)
        .single();

      if (tErr || !trainer) {
        setErrorMsg('Your trainer profile was not found. Contact the administrator.');
        return null;
      }

      return { trainerId: trainer.id, userId: userRecord.id };
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
      return null;
    }
  }, [authUser]);

  // ── Load all assigned students using three separate queries ──
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let tId = trainerId;
      let uId = trainerSupabaseUserId;

      if (!tId || !uId) {
        const resolved = await resolveTrainer();
        if (!resolved) { setLoading(false); return; }
        tId = resolved.trainerId;
        uId = resolved.userId;
        setTrainerId(tId);
        setTrainerSupabaseUserId(uId);
      }

      // 1. Get assigned student IDs
      const { data: assignments, error: aErr } = await supabase
        .from('trainer_assignments')
        .select('student_id')
        .eq('trainer_id', tId);

      if (aErr) throw aErr;

      if (!assignments || assignments.length === 0) {
        setAllStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a: { student_id: string }) => a.student_id);

      // 2. Get student details
      const { data: studentData, error: sErr } = await supabase
        .from('students')
        .select('id, admission_number, full_name, course, department, phone_number')
        .in('id', studentIds)
        .order('full_name');

      if (sErr) throw sErr;

      // 3. Get attachments for these students
      const { data: attachmentData } = await supabase
        .from('attachments')
        .select('id, student_id, industry_name, specific_area, county, supervisor_name, supervisor_phone, student_phone, date_attached, remarks')
        .in('student_id', studentIds);

      // 4. Get assessments for these students
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('id, student_id, status, trainer_remarks, assessment_date')
        .in('student_id', studentIds);

      // 5. Build maps for O(1) lookup
      const attMap: Record<string, typeof attachmentData extends (infer T)[] | null ? T : never> = {};
      (attachmentData || []).forEach((a) => { attMap[a.student_id] = a; });

      const assessMap: Record<string, typeof assessmentData extends (infer T)[] | null ? T : never> = {};
      (assessmentData || []).forEach((a) => { assessMap[a.student_id] = a; });

      // 6. Merge into rows
      const rows: StudentRow[] = (studentData || []).map((s: {
        id: string; admission_number: string; full_name: string;
        course: string; department: string; phone_number: string;
      }) => {
        const att = attMap[s.id] || null;
        const assess = assessMap[s.id] || null;
        return {
          student_id: s.id,
          admission_number: s.admission_number,
          full_name: s.full_name,
          course: s.course,
          department: s.department,
          phone_number: s.phone_number,
          attachment_id: att?.id || null,
          industry_name: att?.industry_name || null,
          specific_area: att?.specific_area || null,
          county: att?.county || null,
          supervisor_name: att?.supervisor_name || null,
          supervisor_phone: att?.supervisor_phone || null,
          student_phone: att?.student_phone || null,
          date_attached: att?.date_attached || null,
          remarks: att?.remarks || null,
          assessment_id: assess?.id || null,
          assessment_status: assess?.status || null,
          trainer_remarks: assess?.trainer_remarks || null,
          assessment_date: assess?.assessment_date || null,
        };
      });

      setAllStudents(rows);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [trainerId, trainerSupabaseUserId, resolveTrainer]);

  // ── Apply filters client-side ─────────────────────────────────
  useEffect(() => {
    let filtered = allStudents;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.full_name.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q) ||
        (r.industry_name || '').toLowerCase().includes(q)
      );
    }
    if (filterCounty) filtered = filtered.filter(r => r.county === filterCounty);
    if (filterStatus === 'PENDING') filtered = filtered.filter(r => r.assessment_status === 'PENDING');
    if (filterStatus === 'ASSESSED') filtered = filtered.filter(r => r.assessment_status === 'ASSESSED');
    if (filterStatus === 'no_attachment') filtered = filtered.filter(r => !r.attachment_id);
    setStudents(filtered);
    setPage(1);
  }, [allStudents, search, filterCounty, filterStatus]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const openAssess = (s: StudentRow) => {
    setAssessModal(s);
    setAssessStatus((s.assessment_status as 'PENDING' | 'ASSESSED') || 'ASSESSED');
    setRemarks(s.trainer_remarks || '');
  };

  const handleAssess = async () => {
    if (!assessModal || !trainerId) return;
    setSaving(true);
    try {
      if (assessModal.assessment_id) {
        // Update existing
        const { error } = await supabase
          .from('assessments')
          .update({
            status: assessStatus,
            trainer_remarks: remarks,
            trainer_id: trainerId,
            assessment_date: assessStatus === 'ASSESSED' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', assessModal.assessment_id);
        if (error) throw error;
      } else {
        // Create new assessment
        const { error } = await supabase
          .from('assessments')
          .insert({
            student_id: assessModal.student_id,
            trainer_id: trainerId,
            attachment_id: assessModal.attachment_id,
            status: assessStatus,
            trainer_remarks: remarks,
            assessment_date: assessStatus === 'ASSESSED' ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }

      await createAuditLog({
        user_id: trainerSupabaseUserId!,
        action: `Trainer updated assessment for ${assessModal.full_name} (${assessModal.admission_number}) → ${assessStatus}`,
        table_name: 'assessments',
        record_id: assessModal.student_id,
      });

      toast.success(`Assessment updated to ${assessStatus} for ${assessModal.full_name}`);
      setAssessModal(null);
      await loadStudents();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update assessment');
    } finally {
      setSaving(false);
    }
  };

  const paged = students.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const counties = [...new Set(allStudents.map(s => s.county).filter(Boolean))] as string[];
  const attachedCount = allStudents.filter(s => s.attachment_id).length;
  const assessedCount = allStudents.filter(s => s.assessment_status === 'ASSESSED').length;

  const columns = [
    {
      key: 'admission_number', header: 'Adm. No.',
      render: (s: StudentRow) => (
        <span className="font-mono text-xs font-semibold text-[#4a7c2f]">{s.admission_number}</span>
      ),
    },
    {
      key: 'full_name', header: 'Student',
      render: (s: StudentRow) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{s.full_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.course}</p>
        </div>
      ),
    },
    {
      key: 'industry_name', header: 'Attachment / Industry',
      render: (s: StudentRow) => s.industry_name ? (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.industry_name}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {s.specific_area}{s.county ? `, ${s.county}` : ''}
          </p>
        </div>
      ) : (
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Not submitted</span>
      ),
    },
    {
      key: 'phone_number', header: 'Phone',
      render: (s: StudentRow) => (
        <a href={`tel:${s.phone_number}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {s.phone_number}
        </a>
      ),
    },
    {
      key: 'date_attached', header: 'Date Attached',
      render: (s: StudentRow) => (
        <span className="text-xs">{formatDate(s.date_attached)}</span>
      ),
    },
    {
      key: 'assessment_status', header: 'Assessment',
      render: (s: StudentRow) => s.assessment_status ? (
        <StatusBadge status={s.assessment_status as 'PENDING' | 'ASSESSED'} />
      ) : (
        <span className="text-xs text-gray-400">—</span>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: (s: StudentRow) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewModal(s)}
            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {s.attachment_id && (
            <button
              onClick={() => openAssess(s)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4a7c2f]/10 hover:bg-[#4a7c2f]/20 text-[#4a7c2f] text-xs font-semibold transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Assess
            </button>
          )}
        </div>
      ),
    },
  ];

  if (errorMsg) return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">My Students</h1>
      <Card>
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Profile Error</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Students assigned to you for industrial attachment supervision
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadStudents} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {allStudents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Assigned', value: allStudents.length, color: 'text-gray-700 dark:text-gray-300' },
            { label: 'On Attachment', value: attachedCount, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Assessed', value: assessedCount, color: 'text-green-600 dark:text-green-400' },
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
            placeholder="Search name, admission, industry..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select
            value={filterCounty}
            onChange={e => setFilterCounty(e.target.value)}
            options={counties.map(c => ({ value: c, label: c }))}
            placeholder="All Counties"
          />
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            options={[
              { value: 'PENDING', label: 'Pending Assessment' },
              { value: 'ASSESSED', label: 'Assessed' },
              { value: 'no_attachment', label: 'No Attachment Yet' },
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
          emptyMessage={allStudents.length === 0 ? "No students have been assigned to you yet." : "No students match your filters."}
          keyField="student_id"
        />
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <Pagination page={page} total={students.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      {/* ── Assessment Modal ── */}
      <Modal
        isOpen={!!assessModal}
        onClose={() => setAssessModal(null)}
        title={`Assess — ${assessModal?.full_name}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Student summary */}
          {assessModal && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-1 text-sm">
              <p><span className="text-gray-500 dark:text-gray-400 text-xs">Student:</span> <strong>{assessModal.full_name}</strong> ({assessModal.admission_number})</p>
              <p><span className="text-gray-500 dark:text-gray-400 text-xs">Industry:</span> {assessModal.industry_name || 'Not submitted'}</p>
              <p><span className="text-gray-500 dark:text-gray-400 text-xs">Location:</span> {assessModal.specific_area}{assessModal.county ? `, ${assessModal.county}` : ''}</p>
            </div>
          )}

          <Select
            label="Assessment Status"
            value={assessStatus}
            onChange={e => setAssessStatus(e.target.value as 'PENDING' | 'ASSESSED')}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'ASSESSED', label: 'Assessed' },
            ]}
          />
          <Textarea
            label="Trainer Remarks"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Write your assessment remarks here..."
            rows={4}
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setAssessModal(null)}>Cancel</Button>
            <Button onClick={handleAssess} loading={saving}>Save Assessment</Button>
          </div>
        </div>
      </Modal>

      {/* ── View Student Details Modal ── */}
      {viewModal && (
        <Modal
          isOpen={!!viewModal}
          onClose={() => setViewModal(null)}
          title={`${viewModal.full_name} — Full Details`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Personal */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Student Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Admission No.', viewModal.admission_number],
                  ['Full Name', viewModal.full_name],
                  ['Course', viewModal.course],
                  ['Department', viewModal.department],
                  ['Phone', viewModal.phone_number],
                ].map(([label, value]) => (
                  <div key={label} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachment */}
            {viewModal.attachment_id ? (
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Attachment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ['Industry', viewModal.industry_name],
                    ['Specific Area', viewModal.specific_area],
                    ['County', viewModal.county],
                    ['Supervisor Name', viewModal.supervisor_name],
                    ['Supervisor Phone', viewModal.supervisor_phone],
                    ['Student Phone', viewModal.student_phone],
                    ['Date Attached', formatDate(viewModal.date_attached)],
                    ['Remarks', viewModal.remarks || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This student has not yet submitted their attachment details.
                </p>
              </div>
            )}

            {/* Assessment */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Assessment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <div className="mt-1">
                    {viewModal.assessment_status
                      ? <StatusBadge status={viewModal.assessment_status as 'PENDING' | 'ASSESSED'} />
                      : <span className="text-sm text-gray-400">Not started</span>
                    }
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assessment Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{formatDate(viewModal.assessment_date)}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl sm:col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Trainer Remarks</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-0.5">{viewModal.trainer_remarks || '—'}</p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            {viewModal.attachment_id && (
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button
                  onClick={() => { setViewModal(null); openAssess(viewModal); }}
                  icon={<ClipboardCheck className="w-4 h-4" />}
                >
                  {viewModal.assessment_status ? 'Update Assessment' : 'Start Assessment'}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
