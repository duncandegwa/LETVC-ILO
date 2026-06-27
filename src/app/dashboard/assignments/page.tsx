'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, UserPlus, UserMinus, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { assignTrainer, removeTrainerAssignment, getTrainers, createAuditLog } from '@/services/supabase.service';
import { useAuth } from '@/contexts/AuthContext';

interface StudentRow {
  id: string;
  admission_number: string;
  full_name: string;
  course: string;
  department: string;
  email: string;
  trainer?: { id: string; full_name: string; staff_number: string } | null;
}

const PER_PAGE = 15;

export default function AssignmentsPage() {
  const { authUser } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [trainers, setTrainers] = useState<{ id: string; full_name: string; staff_number: string; department: string }[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [assignModal, setAssignModal] = useState<StudentRow | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<StudentRow | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('students')
        .select(`id, admission_number, full_name, course, department, email,
          trainer_assignments(trainer_id, trainer:trainers(id, full_name, staff_number))`)
        .order('full_name');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: StudentRow[] = (data || []).map((s: any) => {
        const assignment = Array.isArray(s.trainer_assignments) ? s.trainer_assignments[0] : null;
        const trainerRaw = assignment?.trainer;
        const trainer = Array.isArray(trainerRaw) ? trainerRaw[0] : trainerRaw;
        return {
          id: s.id,
          admission_number: s.admission_number,
          full_name: s.full_name,
          course: s.course,
          department: s.department,
          email: s.email,
          trainer: trainer || null,
        };
      });

      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(r =>
          r.full_name.toLowerCase().includes(q) ||
          r.admission_number.toLowerCase().includes(q)
        );
      }
      if (filterAssigned === 'assigned') rows = rows.filter(r => r.trainer);
      if (filterAssigned === 'unassigned') rows = rows.filter(r => !r.trainer);

      setStudents(rows);
      const { data: trainerData } = await getTrainers({ status: 'active' });
      setTrainers(trainerData || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [search, filterAssigned]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssign = async () => {
    if (!assignModal || !selectedTrainerId) return;
    setSaving(true);
    try {
      const { error } = await assignTrainer(assignModal.id, selectedTrainerId, authUser!.profileId);
      if (error) throw error;
      const trainer = trainers.find(t => t.id === selectedTrainerId);
      await createAuditLog({
        user_id: authUser!.profileId,
        action: `Assigned trainer ${trainer?.full_name} to student ${assignModal.full_name}`,
        table_name: 'trainer_assignments',
        record_id: assignModal.id,
      });
      toast.success('Trainer assigned successfully');
      setAssignModal(null);
      setSelectedTrainerId('');
      loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Assignment failed');
    } finally { setSaving(false); }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      await removeTrainerAssignment(removeTarget.id);
      await createAuditLog({
        user_id: authUser!.profileId,
        action: `Removed trainer assignment from ${removeTarget.full_name}`,
        table_name: 'trainer_assignments',
        record_id: removeTarget.id,
      });
      toast.success('Assignment removed');
      setRemoveTarget(null);
      loadData();
    } catch { toast.error('Failed to remove assignment'); }
    finally { setSaving(false); }
  };

  const paged = students.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
    { key: 'department', header: 'Department' },
    { key: 'trainer', header: 'Assigned Trainer', render: (s: StudentRow) =>
      s.trainer ? (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.trainer.full_name}</p>
          <p className="text-xs text-gray-500">{s.trainer.staff_number}</p>
        </div>
      ) : <Badge variant="yellow">Unassigned</Badge>
    },
    { key: 'actions', header: 'Actions', render: (s: StudentRow) => (
      <div className="flex gap-1">
        <button
          onClick={() => { setAssignModal(s); setSelectedTrainerId(s.trainer?.id || ''); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4a7c2f]/10 hover:bg-[#4a7c2f]/20 text-[#4a7c2f] text-xs font-medium transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {s.trainer ? 'Change' : 'Assign'}
        </button>
        {s.trainer && (
          <button
            onClick={() => setRemoveTarget(s)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
          >
            <UserMinus className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trainer Assignments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {students.filter(s => s.trainer).length} assigned · {students.filter(s => !s.trainer).length} unassigned
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData}>Refresh</Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input placeholder="Search student name or admission no..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <Select value={filterAssigned} onChange={e => { setFilterAssigned(e.target.value); setPage(1); }}
            options={[{ value: 'assigned', label: 'Assigned Only' }, { value: 'unassigned', label: 'Unassigned Only' }]}
            placeholder="All Students" />
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={paged} loading={loading} emptyMessage="No students found." />
        <div className="p-4">
          <Pagination page={page} total={students.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      <Modal isOpen={!!assignModal} onClose={() => setAssignModal(null)}
        title={`Assign Trainer — ${assignModal?.full_name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a trainer to assign to this student. Each student can only have one trainer at a time.
          </p>
          <Select
            label="Select Trainer"
            value={selectedTrainerId}
            onChange={e => setSelectedTrainerId(e.target.value)}
            options={trainers.map(t => ({ value: t.id, label: `${t.full_name} (${t.staff_number}) — ${t.department}` }))}
            placeholder="Choose a trainer..."
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button onClick={handleAssign} loading={saving} disabled={!selectedTrainerId}>Assign Trainer</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={handleRemove}
        title="Remove Assignment" message={`Remove trainer assignment from ${removeTarget?.full_name}?`}
        confirmLabel="Remove" danger loading={saving} />
    </div>
  );
}
