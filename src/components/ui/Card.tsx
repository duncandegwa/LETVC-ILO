import React from 'react';
import { cn } from '@/utils/helpers';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm',
      padding && 'p-6',
      className
    )}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'indigo';
  subtitle?: string;
}

const colorMap = {
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
};

export function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-xl', colorMap[color])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

const badgeVariants = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      badgeVariants[variant]
    )}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: 'PENDING' | 'ASSESSED' | 'active' | 'inactive' }) {
  if (status === 'ASSESSED') return <Badge variant="green">Assessed</Badge>;
  if (status === 'PENDING') return <Badge variant="yellow">Pending</Badge>;
  if (status === 'active') return <Badge variant="green">Active</Badge>;
  if (status === 'inactive') return <Badge variant="red">Inactive</Badge>;
  return <Badge>{status}</Badge>;
}
