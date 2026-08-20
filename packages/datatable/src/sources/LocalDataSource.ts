import type { DataSource, QueryParams, QueryResult } from '../types';

export class LocalDataSource<T> implements DataSource<T> {
  constructor(private data: T[]) {}

  async fetch({ pageIndex, pageSize, sortBy, sortDir, filters }: QueryParams): Promise<QueryResult<T>> {
    let rows = [...this.data];

    if (filters) {
      rows = rows.filter((row) =>
        Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          const cell = String((row as any)[key] ?? '').toLowerCase();
          return cell.includes(value.toLowerCase());
        })
      );
    }

    if (sortBy) {
      rows.sort((a, b) => {
        const av = (a as any)[sortBy];
        const bv = (b as any)[sortBy];
        const cmp = av > bv ? 1 : av < bv ? -1 : 0;
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    const totalRows = rows.length;
    const start = pageIndex * pageSize;
    rows = rows.slice(start, start + pageSize);

    return { rows, totalRows };
  }
}