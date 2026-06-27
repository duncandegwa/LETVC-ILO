import { supabase } from '@/lib/supabase';
import { Student, Trainer, Attachment, Assessment, TrainerAssignment, DashboardStats } from '@/types';

// ─── STUDENTS ────────────────────────────────────────────────────────────────

export async function getStudents(filters?: {
  search?: string;
  course?: string;
  department?: string;
  status?: string;
}) {
  let query = supabase.from('students').select('*').order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,admission_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }
  if (filters?.course) query = query.eq('course', filters.course);
  if (filters?.department) query = query.eq('department', filters.department);
  if (filters?.status) query = query.eq('status', filters.status);

  return query;
}

export async function getStudentByUserId(userId: string) {
  return supabase.from('students').select('*').eq('user_id', userId).single();
}

export async function getStudentWithDetails(studentId: string) {
  const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
  const { data: attachment } = await supabase.from('attachments').select('*').eq('student_id', studentId).single();
  const { data: assignment } = await supabase
    .from('trainer_assignments')
    .select('*, trainer:trainers(*)')
    .eq('student_id', studentId)
    .single();
  const { data: assessment } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId)
    .single();

  return { student, attachment, assignment, assessment };
}

export async function createStudent(data: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('students').insert(data).select().single();
}

export async function updateStudent(id: string, data: Partial<Student>) {
  return supabase.from('students').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
}

export async function deleteStudent(id: string) {
  return supabase.from('students').delete().eq('id', id);
}

// ─── TRAINERS ────────────────────────────────────────────────────────────────

export async function getTrainers(filters?: { search?: string; department?: string; status?: string }) {
  let query = supabase.from('trainers').select('*').order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,staff_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }
  if (filters?.department) query = query.eq('department', filters.department);
  if (filters?.status) query = query.eq('status', filters.status);

  return query;
}

export async function getTrainerByUserId(userId: string) {
  return supabase.from('trainers').select('*').eq('user_id', userId).single();
}

export async function createTrainer(data: Omit<Trainer, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('trainers').insert(data).select().single();
}

export async function updateTrainer(id: string, data: Partial<Trainer>) {
  return supabase.from('trainers').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
}

export async function deleteTrainer(id: string) {
  return supabase.from('trainers').delete().eq('id', id);
}

// ─── ATTACHMENTS ─────────────────────────────────────────────────────────────

export async function getAttachments(filters?: {
  search?: string;
  county?: string;
  course?: string;
  trainer_id?: string;
}) {
  let query = supabase
    .from('attachments')
    .select(`
      *,
      student:students(*, trainer_assignments(*, trainer:trainers(*)), assessments(*))
    `)
    .order('created_at', { ascending: false });

  if (filters?.county) query = query.eq('county', filters.county);

  return query;
}

export async function getAttachmentByStudentId(studentId: string) {
  return supabase.from('attachments').select('*').eq('student_id', studentId).single();
}

export async function createAttachment(data: Omit<Attachment, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('attachments').insert(data).select().single();
}

export async function updateAttachment(id: string, data: Partial<Attachment>) {
  return supabase.from('attachments').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
}

// ─── TRAINER ASSIGNMENTS ─────────────────────────────────────────────────────

export async function assignTrainer(studentId: string, trainerId: string, assignedBy: string) {
  // Remove existing assignment
  await supabase.from('trainer_assignments').delete().eq('student_id', studentId);

  return supabase
    .from('trainer_assignments')
    .insert({ student_id: studentId, trainer_id: trainerId, assigned_by: assignedBy, assigned_at: new Date().toISOString() })
    .select()
    .single();
}

export async function removeTrainerAssignment(studentId: string) {
  return supabase.from('trainer_assignments').delete().eq('student_id', studentId);
}

export async function getStudentsByTrainer(trainerId: string, filters?: {
  search?: string;
  course?: string;
  county?: string;
  status?: string;
}) {
  let query = supabase
    .from('trainer_assignments')
    .select(`
      *,
      student:students(*),
      attachment:students(attachments(*)),
      assessment:students(assessments(*))
    `)
    .eq('trainer_id', trainerId);

  return query;
}

// ─── ASSESSMENTS ─────────────────────────────────────────────────────────────

export async function getAssessmentByStudentId(studentId: string) {
  return supabase.from('assessments').select('*').eq('student_id', studentId).single();
}

export async function createAssessment(data: {
  student_id: string;
  trainer_id: string;
  attachment_id: string;
  status: 'PENDING' | 'ASSESSED';
}) {
  return supabase.from('assessments').insert(data).select().single();
}

export async function updateAssessment(id: string, data: {
  status: 'PENDING' | 'ASSESSED';
  trainer_remarks?: string;
  assessment_date?: string;
}) {
  return supabase
    .from('assessments')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

// ─── USERS TABLE ─────────────────────────────────────────────────────────────

export async function createUserRecord(data: { id: string; email: string; role: string }) {
  return supabase.from('users').insert(data).select().single();
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const [students, trainers, attachments, assessments] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact' }),
    supabase.from('trainers').select('id', { count: 'exact' }),
    supabase.from('attachments').select('id', { count: 'exact' }),
    supabase.from('assessments').select('id, status', { count: 'exact' }),
  ]);

  const totalStudents = students.count || 0;
  const totalTrainers = trainers.count || 0;
  const studentsAttached = attachments.count || 0;
  const assessed = assessments.data?.filter(a => a.status === 'ASSESSED').length || 0;
  const pending = assessments.data?.filter(a => a.status === 'PENDING').length || 0;

  return {
    total_students: totalStudents,
    total_trainers: totalTrainers,
    students_attached: studentsAttached,
    students_pending_attachment: totalStudents - studentsAttached,
    pending_assessments: pending,
    completed_assessments: assessed,
  };
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}) {
  return supabase.from('audit_logs').insert(data);
}

export async function getAuditLogs() {
  return supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
}

// ─── REPORTS DATA ─────────────────────────────────────────────────────────────

export async function getStudentsReport() {
  return supabase
    .from('students')
    .select(`
      *,
      attachments(*),
      trainer_assignments(*, trainer:trainers(full_name, staff_number)),
      assessments(status, assessment_date)
    `)
    .order('full_name');
}

export async function getCounties() {
  const { data } = await supabase.from('attachments').select('county');
  const counties = [...new Set(data?.map(d => d.county).filter(Boolean))].sort();
  return counties;
}
