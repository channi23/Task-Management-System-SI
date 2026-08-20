import { useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { DataSource } from './types';
import { cn } from './lib/cn';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';

export type DataTableColumnDef<T> = ColumnDef<T, any> & {
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
};

interface DataTableProps<T> {
  columns: DataTableColumnDef<T>[];
  source: DataSource<T>;
  pageSize?: number;
  refetchTrigger?: number;
}

const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<T extends object>({
  columns,
  source,
  pageSize = 10,
  refetchTrigger,
}: DataTableProps<T>) {
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
  }, [pageIndex, pageSize, sortBy, sortDir, filters, refetchTrigger]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(totalRows / pageSize),
  });

  const filterableColumns = table
    .getAllLeafColumns()
    .filter((column) => (column.columnDef as DataTableColumnDef<T>).filterable === true);

  const handleSort = (columnId: string) => {
    setPageIndex(0);
    if (sortBy === columnId) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnId);
      setSortDir('asc');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setPageIndex(0);
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const inputClass =
    'h-9 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
  const pageButtonClass =
    'h-9 rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50';

  if (error) return <div className="text-destructive text-sm" role="alert">Error loading data: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={cn(inputClass, 'w-full max-w-xs')}
          placeholder="Search..."
          value={filters.search ?? ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        {filterableColumns.map((column) => (
          <input
            key={column.id}
            className={cn(inputClass, 'w-36')}
            placeholder={`Filter ${column.id}...`}
            value={filters[column.id] ?? ''}
            onChange={(e) => handleFilterChange(column.id, e.target.value)}
          />
        ))}
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => {
                const columnDef = header.column.columnDef as DataTableColumnDef<T>;
                const sortable = columnDef.sortable === true;
                const alignClass = ALIGN_CLASS[columnDef.align ?? 'left'];
                const isActiveSort = sortable && sortBy === header.column.id;
                return (
                  <TableHead
                    key={header.id}
                    onClick={sortable ? () => handleSort(header.column.id) : undefined}
                    className={cn(
                      alignClass,
                      sortable &&
                        'cursor-pointer select-none transition-colors hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center gap-1',
                        columnDef.align === 'right' && 'flex-row-reverse',
                        columnDef.align === 'center' && 'justify-center'
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortable &&
                        (isActiveSort ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="text-foreground size-3.5" />
                          ) : (
                            <ArrowDown className="text-foreground size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="text-muted-foreground/50 size-3.5" />
                        ))}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          className={cn(
            'transition-opacity duration-150',
            loading && data.length > 0 && 'opacity-50'
          )}
        >
          {loading && data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground text-center">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!loading && table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
          {table.getRowModel().rows.length > 0 &&
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const columnDef = cell.column.columnDef as DataTableColumnDef<T>;
                  const alignClass = ALIGN_CLASS[columnDef.align ?? 'left'];
                  return (
                    <TableCell key={cell.id} className={alignClass}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          Page {pageIndex + 1} of {Math.max(1, Math.ceil(totalRows / pageSize))}
        </span>
        <div className="flex gap-2">
          <button
            className={pageButtonClass}
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => p - 1)}
          >
            Previous
          </button>
          <button
            className={pageButtonClass}
            disabled={(pageIndex + 1) * pageSize >= totalRows}
            onClick={() => setPageIndex((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
