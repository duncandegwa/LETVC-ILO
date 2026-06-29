'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { signIn, resetPassword } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/utils/helpers';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const resetSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type LoginForm = z.infer<typeof loginSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function LoginPage() {
  const { authUser, loading } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && authUser) router.replace('/dashboard');
  }, [authUser, loading, router]);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back!');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
      };
      toast.error(messages[code || ''] || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (data: ResetForm) => {
    setIsLoading(true);
    try {
      await resetPassword(data.email);
      setResetSent(true);
      toast.success('Password reset email sent!');
    } catch {
      toast.error('Failed to send reset email. Check the address and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 text-[#4a7c2f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-[#4a7c2f] p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
            <circle cx="350" cy="100" r="180" fill="white" />
            <circle cx="50" cy="500" r="150" fill="white" />
            <circle cx="200" cy="300" r="80" fill="white" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-16 relative bg-white rounded-2xl p-2 shadow-lg">
              <Image src="/letvc-logo.png" alt="LETVC Logo" fill className="object-contain p-1" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">LETVC ILO</h1>
              <p className="text-green-200 text-sm">Industrial Liaison Office</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Industrial Attachment<br />Management System
          </h2>
          <p className="text-green-100 text-lg leading-relaxed mb-10">
            Streamlining industrial placement, trainer assignment, monitoring, and assessment for Laikipia East Technical and Vocational College.
          </p>

          <div className="space-y-4">
            {[
              { label: 'Student Placement Tracking', desc: 'Monitor every attached student in real-time' },
              { label: 'Trainer Assignment', desc: 'Match students with the right supervisors' },
              { label: 'Assessment Management', desc: 'Track assessment status and reports' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-amber-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{item.label}</p>
                  <p className="text-green-200 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-green-200 text-sm italic font-medium">"Enhancing Competence"</p>
          <p className="text-green-300 text-xs mt-1">Laikipia East Technical and Vocational College</p>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="relative w-12 h-12">
            <Image src="/letvc-logo.png" alt="LETVC" fill className="object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">LETVC ILO</h1>
            <p className="text-xs text-gray-500">Industrial Liaison Office</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          {mode === 'login' ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Sign in to your LETVC ILO account to continue.
                </p>
              </div>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...loginForm.register('email')}
                      type="email"
                      placeholder="youremail@gmail.com"
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors',
                        'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-[#4a7c2f] focus:border-transparent',
                        loginForm.formState.errors.email
                          ? 'border-red-400'
                          : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...loginForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className={cn(
                        'w-full pl-10 pr-12 py-3 rounded-xl border text-sm transition-colors',
                        'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-[#4a7c2f] focus:border-transparent',
                        loginForm.formState.errors.password
                          ? 'border-red-400'
                          : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-sm text-[#4a7c2f] hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#4a7c2f] hover:bg-[#3d6827] text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-2">First-time login?</p>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  Use the temporary credentials provided by your administrator. You will be prompted to change your password after signing in.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {resetSent ? 'Check your email' : 'Reset password'}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {resetSent
                    ? "We've sent a password reset link to your email address."
                    : 'Enter your email and we\'ll send you a reset link.'}
                </p>
              </div>

              {!resetSent ? (
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-5">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...resetForm.register('email')}
                        type="email"
                        placeholder="you@letvc.ac.ke"
                        className={cn(
                          'w-full pl-10 pr-4 py-3 rounded-xl border text-sm',
                          'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                          'focus:outline-none focus:ring-2 focus:ring-[#4a7c2f] focus:border-transparent',
                          'border-gray-300 dark:border-gray-600'
                        )}
                      />
                    </div>
                    {resetForm.formState.errors.email && (
                      <p className="text-xs text-red-500">{resetForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-6 bg-[#4a7c2f] hover:bg-[#3d6827] text-white font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Check your inbox for the password reset link. The link expires in 1 hour.
                  </p>
                </div>
              )}

              <button
                onClick={() => { setMode('login'); setResetSent(false); }}
                className="mt-6 text-sm text-[#4a7c2f] hover:underline font-medium flex items-center gap-1"
              >
                ← Back to sign in
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} Laikipia East Technical and Vocational College
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
            Industrial Liaison Office — Attachment Management System
          </p>
        </div>
      </div>
    </div>
  );
}
