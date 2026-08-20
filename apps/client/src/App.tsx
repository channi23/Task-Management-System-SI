import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, LocalDataSource } from '@channi23/datatable'

interface Task {
  title: string
  status: string
  priority: string
}

const tasks: Task[] = [
  { title: 'Set up CI pipeline', status: 'done', priority: 'high' },
  { title: 'Design login page', status: 'in-progress', priority: 'medium' },
  { title: 'Write API docs', status: 'todo', priority: 'low' },
  { title: 'Fix pagination bug', status: 'in-progress', priority: 'high' },
  { title: 'Add dark mode', status: 'todo', priority: 'low' },
  { title: 'Refactor auth service', status: 'todo', priority: 'medium' },
  { title: 'Upgrade dependencies', status: 'done', priority: 'low' },
  { title: 'Write unit tests', status: 'in-progress', priority: 'high' },
  { title: 'Set up monitoring', status: 'todo', priority: 'medium' },
  { title: 'Optimize DB queries', status: 'todo', priority: 'high' },
  { title: 'Draft release notes', status: 'todo', priority: 'low' },
  { title: 'Review PR backlog', status: 'in-progress', priority: 'medium' },
]

const columns: ColumnDef<Task, any>[] = [
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'priority', header: 'Priority' },
]

function App() {
  const source = useMemo(() => new LocalDataSource<Task>(tasks), [])

  return (
    <div>
      <h1>Tasks</h1>
      <DataTable columns={columns} source={source} pageSize={5} />
    </div>
  )
}

export default App
