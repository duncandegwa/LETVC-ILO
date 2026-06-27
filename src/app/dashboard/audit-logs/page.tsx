'use client';

import { useEffect, useState } from 'react';
import { Shield, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/utils/helpers';

interface LogRow {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  created_at: string;
}

const PER_PAGE = 20;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      setLogs(data || []);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, []);

  const filtered = search
    ? logs.filter(l => l.action.toLowerCase().includes(search.toLowerCase()) || l.table_name.includes(search))
    : logs;

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const columns = [
    { key: 'created_at', header: 'Time', render: (l: LogRow) => (
      <span className="text-xs font-mono text-gray-500">{formatDateTime(l.created_at)}</span>
    )},
    { key: 'action', header: 'Action', render: (l: LogRow) => (
      <p className="text-sm text-gray-900 dark:text-white">{l.action}</p>
    )},
    { key: 'table_name', header: 'Table', render: (l: LogRow) => (
      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-600 dark:text-gray-400">{l.table_name}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} recorded actions</p>
          </div>
        </div>
        <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadLogs}>Refresh</Button>
      </div>

      <Card>
        <Input placeholder="Search by action or table..." leftIcon={<Search className="w-4 h-4" />}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </Card>

      <Card padding={false}>
        <Table columns={columns as Parameters<typeof Table>[0]['columns']} data={paged as unknown[] as Record<string, unknown>[]} loading={loading} emptyMessage="No audit logs found." keyField="id" />
        <div className="p-4">
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
