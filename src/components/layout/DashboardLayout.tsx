'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, Briefcase, FileText,
  Settings, LogOut, Menu, X, Moon, Sun, Bell, ChevronDown,
  ClipboardList, BarChart3, BookOpen, Shield
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'trainer', 'student'] },
  { label: 'Students', href: '/dashboard/students', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Trainers', href: '/dashboard/trainers', icon: <UserCheck className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Assignments', href: '/dashboard/assignments', icon: <Briefcase className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Attachments', href: '/dashboard/attachments', icon: <ClipboardList className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: <Shield className="w-5 h-5" />, roles: ['admin'] },
  { label: 'My Students', href: '/dashboard/my-students', icon: <BookOpen className="w-5 h-5" />, roles: ['trainer'] },
  { label: 'My Attachment', href: '/dashboard/my-attachment', icon: <ClipboardList className="w-5 h-5" />, roles: ['student'] },
  { label: 'My Trainer', href: '/dashboard/my-trainer', icon: <UserCheck className="w-5 h-5" />, roles: ['student'] },
  { label: 'My Assessment', href: '/dashboard/my-assessment', icon: <FileText className="w-5 h-5" />, roles: ['student'] },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" />, roles: ['admin', 'trainer', 'student'] },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { authUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = authUser?.role || 'student';
  const filteredNav = navItems.filter(item => item.roles.includes(role));

  const roleLabel = { admin: 'Administrator', trainer: 'Trainer', student: 'Student' }[role];
  const roleColor = { admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', trainer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', student: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }[role];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out',
        'lg:translate-x-0 lg:static lg:flex',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image src="/letvc-logo.png" alt="LETVC Logo" fill className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">LETVC ILO</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Attachment System</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3">
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', roleColor)}>
            {roleLabel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {filteredNav.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-[#4a7c2f] text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 relative">
            <Bell className="w-5 h-5" />
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#4a7c2f] flex items-center justify-center text-white text-sm font-semibold">
                {authUser?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">
                  {authUser?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{authUser?.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{authUser?.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{authUser?.email}</p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
