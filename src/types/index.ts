export type UserRole = 'admin' | 'trainer' | 'student';
export type AssessmentStatus = 'PENDING' | 'ASSESSED';
export type AccountStatus = 'active' | 'inactive';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  admission_number: string;
  full_name: string;
  national_id: string;
  gender: 'Male' | 'Female' | 'Other';
  course: string;
  department: string;
  email: string;
  phone_number: string;
  academic_year: string;
  class_name: string;
  status: AccountStatus;
  profile_photo?: string;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  id: string;
  user_id: string;
  full_name: string;
  staff_number: string;
  department: string;
  email: string;
  phone_number: string;
  position: string;
  specialization: string;
  status: AccountStatus;
  profile_photo?: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  student_id: string;
  industry_name: string;
  specific_area: string;
  county: string;
  supervisor_name: string;
  supervisor_phone: string;
  student_phone: string;
  date_attached: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export interface TrainerAssignment {
  id: string;
  student_id: string;
  trainer_id: string;
  assigned_by: string;
  assigned_at: string;
  created_at: string;
  student?: Student;
  trainer?: Trainer;
}

export interface Assessment {
  id: string;
  student_id: string;
  trainer_id: string;
  attachment_id: string;
  status: AssessmentStatus;
  assessment_date?: string;
  trainer_remarks?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  trainer?: Trainer;
  attachment?: Attachment;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Course {
  id: string;
  department_id: string;
  name: string;
  code: string;
  duration_years: number;
  created_at: string;
  department?: Department;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  total_students: number;
  total_trainers: number;
  students_attached: number;
  students_pending_attachment: number;
  pending_assessments: number;
  completed_assessments: number;
}

export interface StudentWithDetails extends Student {
  attachment?: Attachment;
  assignment?: TrainerAssignment & { trainer: Trainer };
  assessment?: Assessment;
}

// ─── CHAT ────────────────────────────────────────────────────

export interface ChatConversation {
  id: string;
  student_id: string;
  trainer_id: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  trainer?: Trainer;
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;       // Supabase user id
  sender_role: 'student' | 'trainer';
  message: string;
  is_read: boolean;
  created_at: string;
}
