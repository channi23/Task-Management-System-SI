import { useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import type { DataSource } from './types';

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  source: DataSource<T>;
  pageSize?: number;
}

export function DataTable<T extends object>({ columns, source, pageSize = 10 }: DataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    source
      .fetch({ pageIndex, pageSize, sortBy, sortDir, filters })
      .then((res) => {
        setData(res.rows);
        setTotalRows(res.totalRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [pageIndex, pageSize, sortBy, sortDir, filters]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(totalRows / pageSize),
  });

  if (error) return <div role="alert">Error loading data: {error}</div>;

  return (
    <div>
      {loading && <div>Loading…</div>}
      <table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={() => {
                    const key = header.column.id;
                    if (sortBy === key) {
                      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortBy(key);
                      setSortDir('asc');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {sortBy === header.column.id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button disabled={pageIndex === 0} onClick={() => setPageIndex((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {pageIndex + 1} of {Math.max(1, Math.ceil(totalRows / pageSize))}
        </span>
        <button
          disabled={(pageIndex + 1) * pageSize >= totalRows}
          onClick={() => setPageIndex((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}