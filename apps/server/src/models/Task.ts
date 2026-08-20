import { Schema, model, Document, Types } from 'mongoose';

export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'] },
    dueDate: { type: Date },
    completedAt: { type: Date },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, status: 1, priority: 1 });
taskSchema.index({ title: 'text' });

export const Task = model<ITask>('Task', taskSchema);
