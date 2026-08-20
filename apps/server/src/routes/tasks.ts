import { Router, Request } from 'express';
import { Types } from 'mongoose';
import { Task, TaskStatus, TaskPriority } from '../models/Task';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const SORTABLE_FIELDS = ['title', 'dueDate', 'priority', 'status'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

const isSortableField = (value: unknown): value is SortableField =>
  typeof value === 'string' && (SORTABLE_FIELDS as readonly string[]).includes(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const getUserId = (req: Request): string => (req as AuthenticatedRequest).user!.id;

const findOwnedTask = async (req: Request) => {
  const id = String(req.params.id);

  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Task not found', 404);
  }

  const task = await Task.findOne({ _id: id, user: getUserId(req) });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  return task;
};

router.get(
  '/all-users',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const users = await User.find().select('email role');

    const usersWithTaskCounts = await Promise.all(
      users.map(async (user) => ({
        id: user._id,
        email: user.email,
        role: user.role,
        taskCount: await Task.countDocuments({ user: user._id }),
      }))
    );

    res.status(200).json({ users: usersWithTaskCounts });
  })
);

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);

    const [total, todo, inprogress, done, low, medium, high, noPriority] = await Promise.all([
      Task.countDocuments({ user: userId }),
      Task.countDocuments({ user: userId, status: 'todo' }),
      Task.countDocuments({ user: userId, status: 'inprogress' }),
      Task.countDocuments({ user: userId, status: 'done' }),
      Task.countDocuments({ user: userId, priority: 'low' }),
      Task.countDocuments({ user: userId, priority: 'medium' }),
      Task.countDocuments({ user: userId, priority: 'high' }),
      Task.countDocuments({ user: userId, priority: { $exists: false } }),
    ]);

    const completed = done;
    const pending = total - completed;
    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    const timedTasks = await Task.find({
      user: userId,
      status: 'done',
      completedAt: { $ne: null },
      dueDate: { $ne: null },
    }).select('completedAt dueDate');

    let onTimeCount = 0;
    let lateCount = 0;
    let totalDelayDays = 0;

    for (const task of timedTasks) {
      if (!task.completedAt || !task.dueDate) continue;
      const delayDays = (task.completedAt.getTime() - task.dueDate.getTime()) / 86400000;
      totalDelayDays += delayDays;
      if (delayDays <= 0) onTimeCount++;
      else lateCount++;
    }

    const averageDelayDays =
      timedTasks.length === 0 ? 0 : Math.round((totalDelayDays / timedTasks.length) * 10) / 10;

    res.status(200).json({
      total,
      completed,
      pending,
      completionPercentage,
      byStatus: { todo, inprogress, done },
      byPriority: { low, medium, high, none: noPriority },
      onTimeCount,
      lateCount,
      averageDelayDays,
    });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);

    const offset = Number(req.query.offset) || 0;
    const limit = Number(req.query.limit) || 10;
    const sortDir = req.query.sortDir === 'desc' ? -1 : 1;
    const sortBy = isSortableField(req.query.sortBy) ? req.query.sortBy : 'createdAt';

    const status = asString(req.query.status);
    const priority = asString(req.query.priority);
    const search = asString(req.query.search);

    const filter: Record<string, unknown> = { user: userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.$text = { $search: search };

    const [rows, totalRows] = await Promise.all([
      Task.find(filter)
        .sort({ [sortBy]: sortDir })
        .skip(offset)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({ rows, totalRows });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, description, status, priority, dueDate } = req.body ?? {};

    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new AppError('Title is required', 400);
    }

    const task = await Task.create({
      title,
      description,
      status: status as TaskStatus | undefined,
      priority: priority as TaskPriority | undefined,
      dueDate,
      user: getUserId(req),
    });

    res.status(201).json(task);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await findOwnedTask(req);
    res.status(200).json(task);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await findOwnedTask(req);

    const { title, description, status, priority, dueDate } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'done' && existing.status !== 'done') {
        updates.completedAt = new Date();
      } else if (status !== 'done' && existing.status === 'done') {
        updates.completedAt = null;
      }
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await findOwnedTask(req);
    await task.deleteOne();
    res.status(200).json({ success: true });
  })
);

router.patch(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const existing = await findOwnedTask(req);

    const updates: Record<string, unknown> = { status: 'done' };
    if (existing.status !== 'done') {
      updates.completedAt = new Date();
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    res.status(200).json(updated);
  })
);

export default router;
