import type { DataSource, QueryParams, QueryResult } from '../types';

export class ApiDataSource<T> implements DataSource<T> {
  constructor(private endpoint: string) {}

  async fetch({ pageIndex, pageSize, sortBy, sortDir, filters }: QueryParams): Promise<QueryResult<T>> {
    const params = new URLSearchParams({
      offset: String(pageIndex * pageSize),
      limit: String(pageSize),
      ...(sortBy ? { sortBy, sortDir: sortDir ?? 'asc' } : {}),
      ...filters,
    });

    const res = await fetch(`${this.endpoint}?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json(); 
  }
}