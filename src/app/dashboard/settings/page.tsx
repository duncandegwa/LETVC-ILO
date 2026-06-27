'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Lock, User, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { changePassword } from '@/lib/firebase';
import { createAuditLog } from '@/services/supabase.service';

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Enter current password'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { authUser } = useAuth();
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const handlePasswordChange = async (data: PasswordForm) => {
    if (!authUser) return;
    setSavingPassword(true);
    try {
      await changePassword(authUser.firebaseUser, data.currentPassword, data.newPassword);
      await createAuditLog({
        user_id: authUser.profileId,
        action: `Password changed by user ${authUser.email}`,
        table_name: 'users',
        record_id: authUser.profileId,
      });
      toast.success('Password changed successfully!');
      passwordForm.reset();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect.');
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = {
    admin: 'System Administrator',
    trainer: 'Trainer / Supervisor',
    student: 'Student',
  }[authUser?.role || 'student'];

  const roleBg = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    trainer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    student: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }[authUser?.role || 'student'];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-[#4a7c2f]/10 text-[#4a7c2f]">
            <User className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Account Information</h2>
        </div>

        <div className="flex items-center gap-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="w-14 h-14 rounded-xl bg-[#4a7c2f] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {authUser?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{authUser?.displayName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{authUser?.email}</p>
            <span className={`mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBg}`}>
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 truncate">{authUser?.email}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Change Password</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Update your account password</p>
          </div>
        </div>

        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            {...passwordForm.register('currentPassword')}
            error={passwordForm.formState.errors.currentPassword?.message}
            required
            placeholder="Enter your current password"
          />
          <Input
            label="New Password"
            type="password"
            {...passwordForm.register('newPassword')}
            error={passwordForm.formState.errors.newPassword?.message}
            required
            placeholder="Minimum 8 characters"
            hint="Use a mix of uppercase, lowercase, numbers, and symbols"
          />
          <Input
            label="Confirm New Password"
            type="password"
            {...passwordForm.register('confirmPassword')}
            error={passwordForm.formState.errors.confirmPassword?.message}
            required
            placeholder="Re-enter new password"
          />
          <div className="flex justify-end pt-1">
            <Button type="submit" loading={savingPassword} icon={<Lock className="w-4 h-4" />}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Security info */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Security</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>• Your account is secured with Firebase Authentication.</p>
          <p>• All data access is governed by Role-Based Access Control (RBAC).</p>
          <p>• Session tokens are refreshed automatically on each visit.</p>
          <p>• You can reset your password at any time via the login page.</p>
        </div>
      </Card>
    </div>
  );
}
