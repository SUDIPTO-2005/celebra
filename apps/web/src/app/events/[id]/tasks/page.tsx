'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PlusCircle, CheckCircle2, Circle, Clock, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/components/ui/use-toast';
import { tasksApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate, STATUS_COLORS, capitalize } from '@/lib/utils';
import type { Task, TaskPriority, TaskStatus } from '@/lib/api/types';

export default function EventTasksPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { success, error: toastError } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed' | 'overdue'>('all');

  // Dialog
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskDue, setTaskDue] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list(eventId, 'ordering=due_date');
      const list = Array.isArray(res) ? res : (res?.results ?? []);
      setTasks(list);
    } catch (err) {
      toastError('Tasks load failed', getErrorMessage(err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, toastError]);

  useEffect(() => {
    if (eventId) loadTasks();
  }, [eventId, loadTasks]);

  const openAddTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    setTaskStatus('todo');
    setTaskDue('');
    setIsTaskOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskDue(task.due_date || '');
    setIsTaskOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setSubmitting(true);
    try {
      const payload: Partial<Task> = {
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        status: taskStatus,
        due_date: taskDue || null,
      };

      if (editingTask) {
        await tasksApi.update(eventId, editingTask.id, payload);
        success('Task updated', `${taskTitle} saved.`);
      } else {
        await tasksApi.create(eventId, payload);
        success('Task created', `${taskTitle} added.`);
      }

      setIsTaskOpen(false);
      loadTasks();
    } catch (err) {
      toastError('Save failed', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      if (task.status === 'completed') {
        await tasksApi.update(eventId, task.id, { status: 'todo' });
      } else {
        await tasksApi.complete(eventId, task.id);
      }
      loadTasks();
    } catch (err) {
      toastError('Status update failed', getErrorMessage(err));
    }
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (!confirm(`Delete task "${title}"?`)) return;
    try {
      await tasksApi.delete(eventId, id);
      success('Task deleted', `${title} removed.`);
      loadTasks();
    } catch (err) {
      toastError('Delete failed', getErrorMessage(err));
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'overdue') return t.is_overdue && t.status !== 'completed';
    return t.status === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'todo', 'in_progress', 'completed', 'overdue'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                activeFilter === filter
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>

        <Button variant="brand" size="sm" onClick={openAddTask}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Add Task
        </Button>
      </div>

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="mt-2 text-sm font-semibold">No tasks found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {activeFilter === 'all'
                  ? 'Get started by breaking down your event into actionable tasks.'
                  : `No tasks in status "${activeFilter}".`}
              </p>
              {activeFilter === 'all' && (
                <Button variant="brand" size="sm" className="mt-4" onClick={openAddTask}>
                  Add Task
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y" aria-label="Event tasks list">
              {filteredTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      className="mt-0.5 text-muted-foreground hover:text-brand-600 transition-colors"
                      onClick={() => handleToggleComplete(t)}
                      aria-label={t.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {t.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${
                            t.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {t.title}
                        </span>
                        <Badge className={STATUS_COLORS[t.priority] || 'bg-gray-100'}>
                          {capitalize(t.priority)}
                        </Badge>
                        {t.is_overdue && t.status !== 'completed' && (
                          <span className="flex items-center text-xs text-destructive font-semibold gap-0.5">
                            <AlertCircle className="h-3 w-3" /> Overdue
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {t.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {t.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {formatDate(t.due_date)}
                          </span>
                        )}
                        {t.assigned_to_email && (
                          <span>Assignee: {t.assigned_to_email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => openEditTask(t)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteTask(t.id, t.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
            <DialogDescription>Assign checklist items, priorities, and deadlines</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTask} className="space-y-4">
            <FormField label="Task Title" htmlFor="task_title" required>
              <Input
                id="task_title"
                placeholder="e.g., Finalize flower arrangements"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Description" htmlFor="task_desc">
              <Textarea
                id="task_desc"
                placeholder="Specific instructions or notes..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Priority" htmlFor="task_prio">
                <select
                  id="task_prio"
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </FormField>

              <FormField label="Status" htmlFor="task_stat">
                <select
                  id="task_stat"
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </FormField>
            </div>

            <FormField label="Due Date" htmlFor="task_due">
              <Input
                id="task_due"
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
              />
            </FormField>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsTaskOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={submitting}>
                {editingTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
