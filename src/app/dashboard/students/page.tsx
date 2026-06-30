'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Eye, RefreshCw, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Card';
import { getStudents, createStudent, updateStudent, deleteStudent, createUserRecord, createAuditLog } from '@/services/supabase.service';
import { Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { DEPARTMENTS, ALL_COURSES, generateTempPassword } from '@/utils/helpers';

const studentSchema = z.object({
  admission_number: z.string().min(3, 'Required'),
  full_name: z.string().min(2, 'Required'),
  national_id: z.string().min(6, 'Required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  course: z.string().min(2, 'Required'),
  department: z.string().min(2, 'Required'),
  email: z.string().email('Valid email required'),
  phone_number: z.string().min(10, 'Valid phone required'),
  academic_year: z.string().min(1, 'Required'),
  class_name: z.string().min(1, 'Required'),
  status: z.enum(['active', 'inactive']),
});

type StudentFormData = z.infer<typeof studentSchema>;

const PER_PAGE = 15;

export default function StudentsPage() {
  const { authUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { status: 'active', gender: 'Male' },
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await getStudents({ search, department: filterDept, status: filterStatus });
      setStudents(data || []);
      setTotal(count || 0);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [search, filterDept, filterStatus]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const openCreate = () => {
    setEditStudent(null);
    form.reset({ status: 'active', gender: 'Male' });
    const pwd = generateTempPassword();
    setTempPassword(pwd);
    setShowModal(true);
  };

  const openEdit = (s: Student) => {
    setEditStudent(s);
    form.reset({
      admission_number: s.admission_number,
      full_name: s.full_name,
      national_id: s.national_id,
      gender: s.gender,
      course: s.course,
      department: s.department,
      email: s.email,
      phone_number: s.phone_number,
      academic_year: s.academic_year,
      class_name: s.class_name,
      status: s.status,
    });
    setShowModal(true);
  };

  const handleSave = async (data: StudentFormData) => {
    setSaving(true);
    try {
      if (editStudent) {
        const { error } = await updateStudent(editStudent.id, data);
        if (error) throw error;
        await createAuditLog({
          user_id: authUser!.profileId,
          action: `Updated student: ${data.full_name}`,
          table_name: 'students',
          record_id: editStudent.id,
          new_values: data,
        });
        toast.success('Student updated successfully');
      } else {
        // Create user record first
        const userId = crypto.randomUUID();
        await createUserRecord({ id: userId, email: data.email, role: 'student' });
        const { error } = await createStudent({ ...data, user_id: userId });
        if (error) throw error;
        await createAuditLog({
          user_id: authUser!.profileId,
          action: `Created student: ${data.full_name} (${data.admission_number})`,
          table_name: 'students',
          record_id: userId,
          new_values: data,
        });
        toast.success(
          `Student created! Temp password: ${tempPassword}`,
          { duration: 8000 }
        );
      }
      setShowModal(false);
      loadStudents();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save student');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      await createAuditLog({
        user_id: authUser!.profileId,
        action: `Deleted student: ${deleteTarget.full_name}`,
        table_name: 'students',
        record_id: deleteTarget.id,
      });
      toast.success('Student deleted');
      setDeleteTarget(null);
      loadStudents();
    } catch { toast.error('Failed to delete student'); }
    finally { setDeleting(false); }
  };

  const paged = students.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const columns = [
    { key: 'admission_number', header: 'Adm. No.', render: (s: Student) => (
      <span className="font-mono text-xs font-semibold text-[#4a7c2f]">{s.admission_number}</span>
    )},
    { key: 'full_name', header: 'Full Name', render: (s: Student) => (
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{s.full_name}</p>
        <p className="text-xs text-gray-500">{s.email}</p>
      </div>
    )},
    { key: 'course', header: 'Course', render: (s: Student) => (
      <div>
        <p className="text-xs">{s.course}</p>
        <p className="text-xs text-gray-500">{s.department}</p>
      </div>
    )},
    { key: 'phone_number', header: 'Phone' },
    { key: 'academic_year', header: 'Year' },
    { key: 'status', header: 'Status', render: (s: Student) => <StatusBadge status={s.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: (s: Student) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setViewStudent(s)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-500" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500" title="Delete">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} registered students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadStudents}>Refresh</Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Student</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            placeholder="Search name, admission, email..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <Select
            value={filterDept}
            onChange={e => { setFilterDept(e.target.value); setPage(1); }}
            options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
            placeholder="All Departments"
          />
          <Select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            placeholder="All Status"
          />
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns as Parameters<typeof Table>[0]['columns']} data={paged as unknown[] as Record<string, unknown>[]} loading={loading} emptyMessage="No students found. Add your first student." />
        <div className="p-4">
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editStudent ? `Edit Student — ${editStudent.full_name}` : 'Add New Student'}
        size="xl"
      >
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
          {!editStudent && tempPassword && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Temporary Password</p>
              <p className="font-mono text-sm font-bold text-amber-800 dark:text-amber-300 mt-1">{tempPassword}</p>
              <p className="text-xs text-amber-600 mt-1">Share this with the student securely. They must change it on first login.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Admission Number" {...form.register('admission_number')} error={form.formState.errors.admission_number?.message} required placeholder="e.g. CFB/S23/001" />
            <Input label="Full Name" {...form.register('full_name')} error={form.formState.errors.full_name?.message} required />
            <Input label="National ID" {...form.register('national_id')} error={form.formState.errors.national_id?.message} required />
            <Select label="Gender" {...form.register('gender')} error={form.formState.errors.gender?.message} required
              options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
            <Select label="Department" {...form.register('department')} error={form.formState.errors.department?.message} required
              options={DEPARTMENTS.map(d => ({ value: d, label: d }))} placeholder="Select department" />
            <Select label="Course" {...form.register('course')} error={form.formState.errors.course?.message} required
              options={ALL_COURSES.map(c => ({ value: c, label: c }))} placeholder="Select course" />
            <Input label="Email Address" type="email" {...form.register('email')} error={form.formState.errors.email?.message} required />
            <Input label="Phone Number" {...form.register('phone_number')} error={form.formState.errors.phone_number?.message} required placeholder="+254700000000" />
            <Input label="Academic Year" {...form.register('academic_year')} error={form.formState.errors.academic_year?.message} required placeholder="e.g. Year 2" />
            <Input label="Class" {...form.register('class_name')} error={form.formState.errors.class_name?.message} required placeholder="e.g. CFB/S25" />
            <Select label="Status" {...form.register('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editStudent ? 'Save Changes' : 'Create Student'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewStudent && (
        <Modal isOpen={!!viewStudent} onClose={() => setViewStudent(null)} title="Student Details" size="md">
          <div className="space-y-3">
            {[
              ['Admission Number', viewStudent.admission_number],
              ['Full Name', viewStudent.full_name],
              ['National ID', viewStudent.national_id],
              ['Gender', viewStudent.gender],
              ['Course', viewStudent.course],
              ['Department', viewStudent.department],
              ['Email', viewStudent.email],
              ['Phone', viewStudent.phone_number],
              ['Academic Year', viewStudent.academic_year],
              ['Class', viewStudent.class_name],
              ['Status', viewStudent.status],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-900 dark:text-white">{value || '—'}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteTarget?.full_name}? This action cannot be undone and will remove all associated data.`}
        confirmLabel="Delete Student"
        danger
        loading={deleting}
      />
    </div>
  );
}
