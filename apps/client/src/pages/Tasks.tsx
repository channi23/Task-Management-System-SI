import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { DataTable, ApiDataSource, type DataTableColumnDef } from '@channi23/datatable'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiFetch, BASE_URL } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { MagicCard } from '@/components/ui/magic-card'
import { NumberTicker } from '@/components/ui/number-ticker'
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { Confetti, type ConfettiRef } from '@/components/ui/confetti'
import { Highlighter } from '@/components/ui/highlighter'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type TaskStatus = 'todo' | 'inprogress' | 'done'
type TaskPriority = 'low' | 'medium' | 'high'

interface Task {
  _id: string
  title: string
  description?: string
  status: TaskStatus
  priority?: TaskPriority
  dueDate?: string
  completedAt?: string
  user: string
  createdAt: string
  updatedAt: string
}

interface Analytics {
  total: number
  completed: number
  pending: number
  completionPercentage: number
  byStatus: { todo: number; inprogress: number; done: number }
  byPriority: { low: number; medium: number; high: number; none: number }
  onTimeCount: number
  lateCount: number
  averageDelayDays: number
}

interface PendingEdit {
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
}

const STATUS_CHART_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)']
const PRIORITY_CHART_COLOR = 'var(--color-chart-4)'

function TimingIndicator({ completedAt, dueDate }: { completedAt: string; dueDate: string }) {
  const delayDays = Math.round(
    (new Date(completedAt).getTime() - new Date(dueDate).getTime()) / 86400000
  )

  if (delayDays <= 0) {
    return <span className="text-xs text-emerald-500">On time</span>
  }

  return (
    <span className="text-destructive text-xs">
      {delayDays}d late
    </span>
  )
}

export default function Tasks() {
  const { logout } = useAuth()
  const confettiRef = useRef<ConfettiRef>(null)

  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({})

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [dueDate, setDueDate] = useState('')

  const source = useMemo(() => new ApiDataSource<Task>(`${BASE_URL}/tasks`), [])

  const refreshAnalytics = async () => {
    const data = await apiFetch<Analytics>('/tasks/analytics')
    setAnalytics(data)
  }

  useEffect(() => {
    refreshAnalytics()
  }, [])

  const refreshAll = () => {
    setRefetchTrigger((count) => count + 1)
    refreshAnalytics()
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStatus('todo')
    setPriority('')
    setDueDate('')
    setFormError(null)
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setCreating(true)

    try {
      await apiFetch<Task>('/tasks', 'POST', {
        title,
        description: description || undefined,
        status,
        priority: priority || undefined,
        dueDate: dueDate || undefined,
      })
      resetForm()
      setDialogOpen(false)
      refreshAll()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    await apiFetch(`/tasks/${id}`, 'DELETE')
    refreshAll()
  }

  const setPendingField = <K extends keyof PendingEdit>(id: string, field: K, value: PendingEdit[K]) => {
    setPendingEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const isDirty = (id: string) => {
    const edit = pendingEdits[id]
    return edit !== undefined && Object.keys(edit).length > 0
  }

  const handleUpdateRow = async (id: string) => {
    const edit = pendingEdits[id]
    if (!edit) return

    await apiFetch<Task>(`/tasks/${id}`, 'PUT', edit)

    setPendingEdits((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    refreshAll()

    if (edit.status === 'done') {
      confettiRef.current?.fire()
    }
  }

  const statusChartData = analytics
    ? [
        { name: 'Todo', value: analytics.byStatus.todo },
        { name: 'In Progress', value: analytics.byStatus.inprogress },
        { name: 'Done', value: analytics.byStatus.done },
      ]
    : []

  const priorityChartData = analytics
    ? [
        { name: 'Low', value: analytics.byPriority.low },
        { name: 'Medium', value: analytics.byPriority.medium },
        { name: 'High', value: analytics.byPriority.high },
        { name: 'None', value: analytics.byPriority.none },
      ]
    : []

  const columns: DataTableColumnDef<Task>[] = [
    { accessorKey: 'title', header: 'Title', sortable: true },
    {
      accessorKey: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      align: 'center',
      cell: ({ row }) => {
        const task = row.original
        const value = pendingEdits[task._id]?.status ?? task.status
        return (
          <Select
            value={value}
            onValueChange={(v) => setPendingField(task._id, 'status', v as TaskStatus)}
          >
            <SelectTrigger className="mx-auto h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="inprogress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      sortable: true,
      filterable: true,
      align: 'center',
      cell: ({ row }) => {
        const task = row.original
        const value = pendingEdits[task._id]?.priority ?? task.priority ?? ''
        return (
          <Select
            value={value}
            onValueChange={(v) => setPendingField(task._id, 'priority', v as TaskPriority)}
          >
            <SelectTrigger className="mx-auto h-8 w-28">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      sortable: true,
      align: 'right',
      cell: ({ row }) => {
        const task = row.original
        const editedDate = pendingEdits[task._id]?.dueDate
        const value = editedDate !== undefined ? editedDate : (task.dueDate?.slice(0, 10) ?? '')
        return (
          <div className="flex flex-col items-end gap-1">
            <input
              type="date"
              value={value}
              onChange={(e) => setPendingField(task._id, 'dueDate', e.target.value)}
              className="bg-background h-8 rounded-md border px-2 text-sm"
            />
            {task.status === 'done' && task.completedAt && task.dueDate && (
              <TimingIndicator completedAt={task.completedAt} dueDate={task.dueDate} />
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: ({ row }) => {
        const task = row.original
        const dirty = isDirty(task._id)
        return (
          <div className="flex justify-end gap-2">
            {dirty && (
              <InteractiveHoverButton
                className="px-4 py-1.5 text-sm"
                onClick={() => handleUpdateRow(task._id)}
              >
                Update
              </InteractiveHoverButton>
            )}
            <InteractiveHoverButton
              className="border-destructive text-destructive px-4 py-1.5 text-sm"
              dotClassName="bg-destructive"
              overlayClassName="bg-destructive text-destructive-foreground"
              onClick={() => handleDelete(task._id)}
            >
              Delete
            </InteractiveHoverButton>
          </div>
        )
      },
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <Confetti ref={confettiRef} manualstart className="pointer-events-none fixed inset-0 z-50 size-full" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Your <Highlighter action="highlight" color="#a16207">Tasks</Highlighter>
        </h1>
        <InteractiveHoverButton onClick={logout}>Log out</InteractiveHoverButton>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MagicCard className="p-6">
          <p className="text-sm text-muted-foreground">Total</p>
          <NumberTicker value={analytics?.total ?? 0} className="text-3xl font-semibold" />
        </MagicCard>
        <MagicCard className="p-6">
          <p className="text-sm text-muted-foreground">Completed</p>
          <NumberTicker value={analytics?.completed ?? 0} className="text-3xl font-semibold" />
        </MagicCard>
        <MagicCard className="p-6">
          <p className="text-sm text-muted-foreground">Pending</p>
          <NumberTicker value={analytics?.pending ?? 0} className="text-3xl font-semibold" />
        </MagicCard>
        <MagicCard className="flex flex-col items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Completion</p>
          <AnimatedCircularProgressBar
            value={analytics?.completionPercentage ?? 0}
            gaugePrimaryColor="var(--color-primary)"
            gaugeSecondaryColor="var(--color-muted)"
            className="size-20 text-base"
          />
        </MagicCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MagicCard className="p-6">
          <p className="text-sm text-muted-foreground mb-2">By Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={80} label>
                {statusChartData.map((_, index) => (
                  <Cell key={index} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </MagicCard>
        <MagicCard className="p-6">
          <p className="text-sm text-muted-foreground mb-2">By Priority</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityChartData}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill={PRIORITY_CHART_COLOR} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </MagicCard>
        <MagicCard className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">Completion Timing</p>
          <div className="flex items-baseline gap-6">
            <div>
              <NumberTicker
                value={analytics?.onTimeCount ?? 0}
                className="text-2xl font-semibold text-emerald-500"
              />
              <p className="text-xs text-muted-foreground">On time</p>
            </div>
            <div>
              <NumberTicker
                value={analytics?.lateCount ?? 0}
                className="text-destructive text-2xl font-semibold"
              />
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {analytics && (analytics.onTimeCount > 0 || analytics.lateCount > 0)
              ? analytics.averageDelayDays > 0
                ? `Averaging ${analytics.averageDelayDays}d late`
                : `Averaging ${Math.abs(analytics.averageDelayDays)}d early`
              : 'No completed tasks with due dates yet'}
          </p>
        </MagicCard>
      </div>

      <InteractiveHoverButton onClick={() => setDialogOpen(true)}>New Task</InteractiveHoverButton>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <InteractiveHoverButton type="submit" disabled={creating} className="w-full">
              {creating ? 'Creating...' : 'Create Task'}
            </InteractiveHoverButton>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable columns={columns} source={source} pageSize={10} refetchTrigger={refetchTrigger} />
    </div>
  )
}
