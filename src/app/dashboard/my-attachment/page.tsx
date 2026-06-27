'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Briefcase, Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, KENYA_COUNTIES } from '@/utils/helpers';
import { createAuditLog } from '@/services/supabase.service';

const schema = z.object({
  industry_name: z.string().min(2, 'Industry name is required'),
  specific_area: z.string().min(2, 'Specific area is required'),
  county: z.string().min(2, 'Please select a county'),
  supervisor_name: z.string().min(2, 'Supervisor name is required'),
  supervisor_phone: z.string().min(10, 'Enter a valid phone number'),
  student_phone: z.string().min(10, 'Enter a valid phone number'),
  date_attached: z.string().min(1, 'Date is required'),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Attachment {
  id: string;
  industry_name: string;
  specific_area: string;
  county: string;
  supervisor_name: string;
  supervisor_phone: string;
  student_phone: string;
  date_attached: string;
  remarks?: string;
}

export default function MyAttachmentPage() {
  const { authUser } = useAuth();
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessed, setAssessed] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      industry_name: '',
      specific_area: '',
      county: '',
      supervisor_name: '',
      supervisor_phone: '',
      student_phone: '',
      date_attached: '',
      remarks: '',
    },
  });

  const loadData = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    setDebugError(null);

    try {
      // Step 1: Find the user record in Supabase by email
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.email)
        .single();

      if (userError || !userRecord) {
        setDebugError(`User record not found in database for email: ${authUser.email}`);
        setLoading(false);
        return;
      }

      // Step 2: Find the student record using the Supabase user ID
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userRecord.id)
        .single();

      if (studentError || !student) {
        setDebugError(`Student profile not found. Please contact the administrator.`);
        setLoading(false);
        return;
      }

      setStudentId(student.id);

      // Step 3: Check if attachment already exists
      const { data: att } = await supabase
        .from('attachments')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle(); // use maybeSingle so no error if not found

      if (att) {
        setAttachment(att);
        // Populate form with existing data
        form.reset({
          industry_name: att.industry_name || '',
          specific_area: att.specific_area || '',
          county: att.county || '',
          supervisor_name: att.supervisor_name || '',
          supervisor_phone: att.supervisor_phone || '',
          student_phone: att.student_phone || '',
          date_attached: att.date_attached || '',
          remarks: att.remarks || '',
        });

        // Check assessment status
        const { data: assessment } = await supabase
          .from('assessments')
          .select('status')
          .eq('student_id', student.id)
          .maybeSingle();

        setAssessed(assessment?.status === 'ASSESSED');
        setEditing(false);
      } else {
        // No attachment yet — show the form immediately
        setAttachment(null);
        setEditing(true);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Unexpected error loading your data';
      setDebugError(msg);
    } finally {
      setLoading(false);
    }
  }, [authUser, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (data: FormData) => {
    // Safety check - studentId must exist
    if (!studentId) {
      toast.error('Your student profile was not found. Please refresh the page or contact the administrator.');
      return;
    }

    setSaving(true);
    try {
      if (attachment) {
        // --- UPDATE existing attachment ---
        const { error: updateError } = await supabase
          .from('attachments')
          .update({
            industry_name: data.industry_name,
            specific_area: data.specific_area,
            county: data.county,
            supervisor_name: data.supervisor_name,
            supervisor_phone: data.supervisor_phone,
            student_phone: data.student_phone,
            date_attached: data.date_attached,
            remarks: data.remarks || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', attachment.id);

        if (updateError) throw updateError;

        await createAuditLog({
          user_id: studentId,
          action: `Student updated attachment details at ${data.industry_name}, ${data.county}`,
          table_name: 'attachments',
          record_id: attachment.id,
          new_values: data,
        });

        toast.success('Attachment details updated successfully!');

      } else {
        // --- INSERT new attachment ---
        const { data: newAtt, error: insertError } = await supabase
          .from('attachments')
          .insert({
            student_id: studentId,
            industry_name: data.industry_name,
            specific_area: data.specific_area,
            county: data.county,
            supervisor_name: data.supervisor_name,
            supervisor_phone: data.supervisor_phone,
            student_phone: data.student_phone,
            date_attached: data.date_attached,
            remarks: data.remarks || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Auto-create a PENDING assessment record
        const { error: assessError } = await supabase
          .from('assessments')
          .insert({
            student_id: studentId,
            attachment_id: newAtt.id,
            status: 'PENDING',
          });

        if (assessError) {
          // Non-fatal — attachment was saved, assessment creation failed
          console.warn('Could not create assessment record:', assessError.message);
        }

        await createAuditLog({
          user_id: studentId,
          action: `Student submitted attachment at ${data.industry_name}, ${data.county}`,
          table_name: 'attachments',
          record_id: newAtt.id,
          new_values: data,
        });

        toast.success('Attachment submitted successfully! Your status is now PENDING.');
      }

      // Reload data to show the saved details
      await loadData();

    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to save attachment. Please try again.';
      toast.error(msg);
      console.error('Attachment save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Show form validation errors as a toast when submit is clicked but form is invalid
  const onInvalidSubmit = () => {
    toast.error('Please fill in all required fields correctly.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4a7c2f] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading your attachment details...</p>
        </div>
      </div>
    );
  }

  // Show error if student profile not found
  if (debugError) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attachment</h1>
        </div>
        <Card>
          <div className="flex items-start gap-4 p-2">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">Unable to Load Profile</h3>
              <p className="text-sm text-red-600 dark:text-red-400">{debugError}</p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-[#4a7c2f] text-white text-sm rounded-lg hover:bg-[#3d6827]"
              >
                Try Again
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attachment</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {attachment ? 'Your industrial attachment details' : 'Submit your attachment placement details'}
          </p>
        </div>
        {attachment && !editing && !assessed && (
          <Button variant="outline" icon={<Edit2 className="w-4 h-4" />} onClick={() => setEditing(true)}>
            Edit Details
          </Button>
        )}
      </div>

      {/* Assessed notice */}
      {assessed && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">
            Your attachment has been assessed. Details can no longer be edited.
          </p>
        </div>
      )}

      {/* Form — shown when editing (new or edit mode) */}
      {editing && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">
            {attachment ? 'Edit Attachment Details' : 'Attachment Registration Form'}
          </h2>

          <form onSubmit={form.handleSubmit(handleSave, onInvalidSubmit)} className="space-y-4" noValidate>
            {/* Industry Name */}
            <Input
              label="Industry / Organisation Name"
              {...form.register('industry_name')}
              error={form.formState.errors.industry_name?.message}
              required
              placeholder="e.g. Kenya Power and Lighting Company"
            />

            {/* Specific Area */}
            <Input
              label="Specific Area / Location within Industry"
              {...form.register('specific_area')}
              error={form.formState.errors.specific_area?.message}
              required
              placeholder="e.g. Electrical Department, Nakuru Branch"
            />

            {/* County — using native select with manual onChange to ensure value is captured */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                County <span className="text-red-500">*</span>
              </label>
              <select
                {...form.register('county')}
                className="block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4a7c2f] focus:border-transparent border-gray-300 dark:border-gray-600"
              >
                <option value="">Select county...</option>
                {KENYA_COUNTIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {form.formState.errors.county && (
                <p className="text-xs text-red-500">{form.formState.errors.county.message}</p>
              )}
            </div>

            {/* Supervisor Name */}
            <Input
              label="Industry Supervisor Name"
              {...form.register('supervisor_name')}
              error={form.formState.errors.supervisor_name?.message}
              required
              placeholder="Full name of your workplace supervisor"
            />

            {/* Supervisor Phone */}
            <Input
              label="Industry Supervisor Phone Number"
              {...form.register('supervisor_phone')}
              error={form.formState.errors.supervisor_phone?.message}
              required
              placeholder="e.g. 0712345678"
              type="tel"
            />

            {/* Student Phone */}
            <Input
              label="Your Phone Number (at attachment site)"
              {...form.register('student_phone')}
              error={form.formState.errors.student_phone?.message}
              required
              placeholder="e.g. 0712345678"
              type="tel"
            />

            {/* Date Attached */}
            <Input
              label="Date You Reported for Attachment"
              type="date"
              {...form.register('date_attached')}
              error={form.formState.errors.date_attached?.message}
              required
            />

            {/* Remarks */}
            <Textarea
              label="Additional Remarks (Optional)"
              {...form.register('remarks')}
              placeholder="Any additional information about your attachment..."
              rows={3}
            />

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              {attachment && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    // Reset form back to saved values
                    form.reset({
                      industry_name: attachment.industry_name,
                      specific_area: attachment.specific_area,
                      county: attachment.county,
                      supervisor_name: attachment.supervisor_name,
                      supervisor_phone: attachment.supervisor_phone,
                      student_phone: attachment.student_phone,
                      date_attached: attachment.date_attached,
                      remarks: attachment.remarks || '',
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" loading={saving}>
                {saving
                  ? 'Saving...'
                  : attachment
                    ? 'Save Changes'
                    : 'Submit Attachment'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* View mode — show saved details */}
      {attachment && !editing && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Attachment Details</h2>
          <div className="space-y-0">
            {[
              ['Industry / Organisation', attachment.industry_name],
              ['Specific Area', attachment.specific_area],
              ['County', attachment.county],
              ['Industry Supervisor', attachment.supervisor_name],
              ['Supervisor Phone', attachment.supervisor_phone],
              ['Your Phone', attachment.student_phone],
              ['Date Attached', formatDate(attachment.date_attached)],
              ['Remarks', attachment.remarks || '—'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-40 flex-shrink-0 pt-0.5">
                  {label}
                </span>
                <span className="text-sm text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
