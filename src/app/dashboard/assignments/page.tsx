'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, UserPlus, UserMinus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { createAuditLog } from '@/services/supabase.service';

interface TrainerOption {
  id: string;
  full_name: string;
  staff_number: string;
  department: string;
}

interface StudentRow {
  id: string;
  admission_number: string;
  full_name: string;
  course: string;
  department: string;
  trainer_id: string | null;
  trainer_name: string | null;
  trainer_staff: string | null;
}

const PER_PAGE = 15;

export default function AssignmentsPage() {
  const { authUser } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [assignModal, setAssignModal] = useState<StudentRow | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<StudentRow | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Load all students + their current assignment in TWO separate queries ──
  // This avoids the complex Supabase join parsing that was causing silent failures
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load all students
      const { data: studentData, error: sErr } = await supabase
        .from('students')
        .select('id, admission_number, full_name, course, department')
        .order('full_name');

      if (sErr) throw sErr;

      // 2. Load all current assignments with trainer info
      const { data: assignData, error: aErr } = await supabase
        .from('trainer_assignments')
        .select('student_id, trainer_id, trainer:trainers(id, full_name, staff_number)');

      if (aErr) throw aErr;

      // 3. Build a map: student_id -> trainer info
      const assignMap: Record<string, { trainer_id: string; trainer_name: string; trainer_staff: string }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (assignData || []).forEach((a: any) => {
        const t = Array.isArray(a.trainer) ? a.trainer[0] : a.trainer;
        if (t) {
          assignMap[a.student_id] = {
            trainer_id: a.trainer_id,
            trainer_name: t.full_name,
            trainer_staff: t.staff_number,
          };
        }
      });

      // 4. Merge
      const rows: StudentRow[] = (studentData || []).map((s: {
        id: string;
        admission_number: string;
        full_name: string;
        course: string;
        department: string;
      }) => ({
        id: s.id,
        admission_number: s.admission_number,
        full_name: s.full_name,
        course: s.course,
        department: s.department,
        trainer_id: assignMap[s.id]?.trainer_id || null,
        trainer_name: assignMap[s.id]?.trainer_name || null,
        trainer_staff: assignMap[s.id]?.trainer_staff || null,
      }));

      setAllStudents(rows);

      // 5. Load active trainers
      const { data: trainerData, error: tErr } = await supabase
        .from('trainers')
        .select('id, full_name, staff_number, department')
        .eq('status', 'active')
        .order('full_name');

      if (tErr) throw tErr;
      setTrainers(trainerData || []);

    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Apply search + filter client-side ────────────────────────
  useEffect(() => {
    let filtered = allStudents;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.full_name.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        (r.trainer_name || '').toLowerCase().includes(q)
      );
    }
    if (filterAssigned === 'assigned') filtered = filtered.filter(r => r.trainer_id);
    if (filterAssigned === 'unassigned') filtered = filtered.filter(r => !r.trainer_id);
    setStudents(filtered);
    setPage(1);
  }, [allStudents, search, filterAssigned]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Assign trainer ────────────────────────────────────────────
  const handleAssign = async () => {
    if (!assignModal || !selectedTrainerId) return;
    setSaving(true);
    try {
      // Step 1: Delete any existing assignment for this student
      const { error: delErr } = await supabase
        .from('trainer_assignments')
        .delete()
        .eq('student_id', assignModal.id);

      if (delErr) throw delErr;

      // Step 2: Insert fresh assignment
      const { error: insErr } = await supabase
        .from('trainer_assignments')
        .insert({
          student_id: assignModal.id,
          trainer_id: selectedTrainerId,
          assigned_by: authUser!.profileId,
          assigned_at: new Date().toISOString(),
        });

      if (insErr) throw insErr;

      const trainer = trainers.find(t => t.id === selectedTrainerId);
      await createAuditLog({
        user_id: authUser!.profileId,
        action: `Assigned trainer ${trainer?.full_name} (${trainer?.staff_number}) to student ${assignModal.full_name} (${assignModal.admission_number})`,
        table_name: 'trainer_assignments',
        record_id: assignModal.id,
      });

      toast.success(`${trainer?.full_name} assigned to ${assignModal.full_name}`);
      setAssignModal(null);
      setSelectedTrainerId('');
      await loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Assignment failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Remove assignment ─────────────────────────────────────────
  const handleRemove = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trainer_assignments')
        .delete()
        .eq('student_id', removeTarget.id);

      if (error) throw error;

      await createAuditLog({
        user_id: authUser!.profileId,
        action: `Removed trainer assignment from student ${removeTarget.full_name} (${removeTarget.admission_number})`,
        table_name: 'trainer_assignments',
        record_id: removeTarget.id,
      });

      toast.success('Assignment removed successfully');
      setRemoveTarget(null);
      await loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to remove assignment');
    } finally {
      setSaving(false);
    }
  };

  const paged = students.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const assignedCount = allStudents.filter(s => s.trainer_id).length;
  const unassignedCount = allStudents.filter(s => !s.trainer_id).length;

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
    { key: 'department', header: 'Department' },
    {
      key: 'trainer_name', header: 'Assigned Trainer',
      render: (s: StudentRow) => s.trainer_name ? (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{s.trainer_name}</p>
            <p className="text-xs text-gray-500">{s.trainer_staff}</p>
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
      key: 'actions', header: 'Actions',
      render: (s: StudentRow) => (
        <div className="flex gap-2">
          <button
            onClick={() => { setAssignModal(s); setSelectedTrainerId(s.trainer_id || ''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4a7c2f]/10 hover:bg-[#4a7c2f]/20 text-[#4a7c2f] text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {s.trainer_id ? 'Change' : 'Assign'}
          </button>
          {s.trainer_id && (
            <button
              onClick={() => setRemoveTarget(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trainer Assignments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Assign trainers to students for industrial attachment supervision
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: allStudents.length, color: 'text-gray-700 dark:text-gray-300' },
          { label: 'Assigned', value: assignedCount, color: 'text-green-600 dark:text-green-400' },
          { label: 'Unassigned', value: unassignedCount, color: 'text-amber-600 dark:text-amber-400' },
        ].map(item => (
          <Card key={item.label}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            placeholder="Search student name, admission no, or trainer..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select
            value={filterAssigned}
            onChange={e => setFilterAssigned(e.target.value)}
            options={[
              { value: 'assigned', label: '✓ Assigned Only' },
              { value: 'unassigned', label: '✗ Unassigned Only' },
            ]}
            placeholder="All Students"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <Table
          columns={columns}
          data={paged}
          loading={loading}
          emptyMessage="No students found."
          keyField="id"
        />
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <Pagination page={page} total={students.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      {/* Assign Modal */}
      <Modal
        isOpen={!!assignModal}
        onClose={() => { setAssignModal(null); setSelectedTrainerId(''); }}
        title={assignModal?.trainer_id ? `Change Trainer — ${assignModal?.full_name}` : `Assign Trainer — ${assignModal?.full_name}`}
        size="sm"
      >
        <div className="space-y-4">
          {assignModal?.trainer_name && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
              Currently assigned to: <strong>{assignModal.trainer_name}</strong>
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a trainer from the list below. Each student can only have one trainer at a time.
          </p>
          <Select
            label="Select Trainer"
            value={selectedTrainerId}
            onChange={e => setSelectedTrainerId(e.target.value)}
            options={trainers.map(t => ({
              value: t.id,
              label: `${t.full_name} (${t.staff_number}) — ${t.department}`,
            }))}
            placeholder="— Choose a trainer —"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setAssignModal(null); setSelectedTrainerId(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAssign} loading={saving} disabled={!selectedTrainerId}>
              {assignModal?.trainer_id ? 'Change Trainer' : 'Assign Trainer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirm */}
      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Trainer Assignment"
        message={`Remove trainer ${removeTarget?.trainer_name} from ${removeTarget?.full_name}? The student will appear as Unassigned.`}
        confirmLabel="Remove Assignment"
        danger
        loading={saving}
      />
    </div>
  );
}
