export const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiErrorBody {
  success: boolean
  message: string
}

export async function apiFetch<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : undefined

  if (!res.ok) {
    const message = (data as ApiErrorBody | undefined)?.message ?? `Request failed with status ${res.status}`
    throw new Error(message)
  }

  return data as T
}
