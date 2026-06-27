'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Eye, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Card';
import { getTrainers, createTrainer, updateTrainer, deleteTrainer, createUserRecord, createAuditLog } from '@/services/supabase.service';
import { Trainer } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { DEPARTMENTS, generateTempPassword } from '@/utils/helpers';

const trainerSchema = z.object({
  full_name: z.string().min(2, 'Required'),
  staff_number: z.string().min(2, 'Required'),
  department: z.string().min(2, 'Required'),
  email: z.string().email('Valid email required'),
  phone_number: z.string().min(10, 'Valid phone required'),
  position: z.string().min(2, 'Required'),
  specialization: z.string().min(2, 'Required'),
  status: z.enum(['active', 'inactive']),
});

type TrainerForm = z.infer<typeof trainerSchema>;
const PER_PAGE = 15;

export default function TrainersPage() {
  const { authUser } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Trainer | null>(null);
  const [viewTrainer, setViewTrainer] = useState<Trainer | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const form = useForm<TrainerForm>({
    resolver: zodResolver(trainerSchema),
    defaultValues: { status: 'active' },
  });

  const loadTrainers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await getTrainers({ search, department: filterDept });
      setTrainers(data || []);
      setTotal(count || 0);
    } catch { toast.error('Failed to load trainers'); }
    finally { setLoading(false); }
  }, [search, filterDept]);

  useEffect(() => { loadTrainers(); }, [loadTrainers]);

  const openCreate = () => {
    setEditTrainer(null);
    form.reset({ status: 'active' });
    setTempPassword(generateTempPassword());
    setShowModal(true);
  };

  const openEdit = (t: Trainer) => {
    setEditTrainer(t);
    form.reset({
      full_name: t.full_name,
      staff_number: t.staff_number,
      department: t.department,
      email: t.email,
      phone_number: t.phone_number,
      position: t.position,
      specialization: t.specialization,
      status: t.status,
    });
    setShowModal(true);
  };

  const toggleStatus = async (t: Trainer) => {
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    await updateTrainer(t.id, { status: newStatus });
    toast.success(`Trainer ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    loadTrainers();
  };

  const handleSave = async (data: TrainerForm) => {
    setSaving(true);
    try {
      if (editTrainer) {
        const { error } = await updateTrainer(editTrainer.id, data);
        if (error) throw error;
        toast.success('Trainer updated');
      } else {
        const userId = crypto.randomUUID();
        await createUserRecord({ id: userId, email: data.email, role: 'trainer' });
        const { error } = await createTrainer({ ...data, user_id: userId });
        if (error) throw error;
        await createAuditLog({
          user_id: authUser!.profileId,
          action: `Created trainer: ${data.full_name} (${data.staff_number})`,
          table_name: 'trainers',
          record_id: userId,
          new_values: data,
        });
        toast.success(`Trainer created! Temp password: ${tempPassword}`, { duration: 8000 });
      }
      setShowModal(false);
      loadTrainers();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save trainer');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTrainer(deleteTarget.id);
      toast.success('Trainer deleted');
      setDeleteTarget(null);
      loadTrainers();
    } catch { toast.error('Failed to delete trainer'); }
    finally { setDeleting(false); }
  };

  const paged = trainers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const columns = [
    { key: 'staff_number', header: 'Staff No.', render: (t: Trainer) => (
      <span className="font-mono text-xs font-semibold text-[#4a7c2f]">{t.staff_number}</span>
    )},
    { key: 'full_name', header: 'Full Name', render: (t: Trainer) => (
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{t.full_name}</p>
        <p className="text-xs text-gray-500">{t.position}</p>
      </div>
    )},
    { key: 'department', header: 'Department', render: (t: Trainer) => (
      <div>
        <p className="text-xs">{t.department}</p>
        <p className="text-xs text-gray-500">{t.specialization}</p>
      </div>
    )},
    { key: 'phone_number', header: 'Phone' },
    { key: 'status', header: 'Status', render: (t: Trainer) => <StatusBadge status={t.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: (t: Trainer) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setViewTrainer(t)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-500" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => toggleStatus(t)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-purple-500" title="Toggle status">
            {t.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trainers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} registered trainers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadTrainers}>Refresh</Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Trainer</Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input placeholder="Search name, staff number, email..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <Select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}
            options={DEPARTMENTS.map(d => ({ value: d, label: d }))} placeholder="All Departments" />
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns as Parameters<typeof Table>[0]['columns']} data={paged as unknown[] as Record<string, unknown>[]} loading={loading} emptyMessage="No trainers found." />
        <div className="p-4">
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editTrainer ? `Edit Trainer — ${editTrainer.full_name}` : 'Add New Trainer'} size="lg">
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
          {!editTrainer && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-700">Temporary Password</p>
              <p className="font-mono text-sm font-bold text-amber-800 mt-1">{tempPassword}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" {...form.register('full_name')} error={form.formState.errors.full_name?.message} required />
            <Input label="Staff Number" {...form.register('staff_number')} error={form.formState.errors.staff_number?.message} required placeholder="e.g. TRC/2024/001" />
            <Select label="Department" {...form.register('department')} error={form.formState.errors.department?.message} required
              options={DEPARTMENTS.map(d => ({ value: d, label: d }))} placeholder="Select department" />
            <Input label="Position" {...form.register('position')} error={form.formState.errors.position?.message} required placeholder="e.g. Lecturer" />
            <Input label="Specialization" {...form.register('specialization')} error={form.formState.errors.specialization?.message} required />
            <Input label="Email Address" type="email" {...form.register('email')} error={form.formState.errors.email?.message} required />
            <Input label="Phone Number" {...form.register('phone_number')} error={form.formState.errors.phone_number?.message} required placeholder="+254..." />
            <Select label="Status" {...form.register('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editTrainer ? 'Save Changes' : 'Create Trainer'}</Button>
          </div>
        </form>
      </Modal>

      {viewTrainer && (
        <Modal isOpen={!!viewTrainer} onClose={() => setViewTrainer(null)} title="Trainer Details" size="md">
          <div className="space-y-3">
            {[
              ['Staff Number', viewTrainer.staff_number],
              ['Full Name', viewTrainer.full_name],
              ['Department', viewTrainer.department],
              ['Position', viewTrainer.position],
              ['Specialization', viewTrainer.specialization],
              ['Email', viewTrainer.email],
              ['Phone', viewTrainer.phone_number],
              ['Status', viewTrainer.status],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs font-semibold text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-900 dark:text-white">{value || '—'}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Trainer" message={`Delete ${deleteTarget?.full_name}? This cannot be undone.`}
        confirmLabel="Delete" danger loading={deleting} />
    </div>
  );
}
