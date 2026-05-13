/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckSquare,
  Clock,
  Flame,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { format, isPast, isValid } from 'date-fns';
import { useAuth } from '../App';
import { filterCampaignsByRole, filterOwnerOptionsByRole, filterTasksByRole } from '../lib/workspace';
import { cn } from '../utils';
import { dataService, TEAM_MEMBERS } from '../services/dataService';
import { notify } from '../services/notificationService';
import { Task } from '../types';

const PRIORITIES: Task['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
const ONE_DAY = 86400000;

const fallbackDueDate = () => Date.now() + ONE_DAY;

const toValidDate = (value: unknown, fallback = fallbackDueDate()) => {
  const ts = typeof value === 'number' ? value : Number(value);
  const d = new Date(ts);
  return isValid(d) ? d : new Date(fallback);
};

const toValidTimestamp = (value: unknown, fallback = fallbackDueDate()) =>
  toValidDate(value, fallback).getTime();

const fmt = (value: unknown, f: string) => format(toValidDate(value), f);

const parseDateInput = (value: string, fallback: unknown) => {
  if (!value) return toValidTimestamp(fallback);
  const ts = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(ts) ? ts : toValidTimestamp(fallback);
};

const isOverdue = (task: Task) => !task.completed && isPast(toValidDate(task.dueDate));

const emptyDraft = (): Partial<Task> => ({
  title: '',
  description: '',
  ownerId: '',
  campaignId: '',
  priority: 'Medium',
  dueDate: fallbackDueDate(),
  completed: false,
});

// Priority visual config
const PRIORITY_CONFIG: Record<string, { dot: string; badge: string }> = {
  Critical: { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  High:     { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  Medium:   { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  Low:      { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
};

export default function TasksCenter() {
  const { role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(filterTasksByRole(role, dataService.getTasks()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Task> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<Partial<Task>>(emptyDraft());
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [supabaseUsers, setSupabaseUsers] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    import('../services/adminApi').then(({ adminApi }) => {
      adminApi.listUsers().then(users => {
        if (alive) setSupabaseUsers(users.filter(u => u.status === 'active').map(u => u.displayName));
      }).catch(() => {});
    });
    return () => { alive = false; };
  }, []);

  const campaigns = filterCampaignsByRole(role, dataService.getCampaigns());
  const campaignOptions = campaigns.map(c => c.name);
  const owners = filterOwnerOptionsByRole(role, Array.from(new Set([
    ...TEAM_MEMBERS,
    ...supabaseUsers,
    ...tasks.map(t => t.ownerId?.trim()).filter(Boolean) as string[],
  ])));

  const filtered = useMemo(() => {
    const pw: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return tasks
      .filter(t => {
        const owner = t.ownerId?.trim() || 'Unassigned';
        const hay = `${t.title} ${t.description} ${owner} ${t.campaignId}`.toLowerCase();
        return (
          (!query || hay.includes(query.toLowerCase())) &&
          (ownerFilter === 'all' || owner === ownerFilter) &&
          (statusFilter === 'all' || (statusFilter === 'completed' ? t.completed : !t.completed)) &&
          (priorityFilter === 'all' || t.priority === priorityFilter)
        );
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (pw[b.priority] !== pw[a.priority]) return pw[b.priority] - pw[a.priority];
        return toValidTimestamp(a.dueDate) - toValidTimestamp(b.dueDate);
      });
  }, [tasks, query, ownerFilter, statusFilter, priorityFilter]);

  // ── Inline save ──────────────────────────────────────────────────────────────
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditDraft({ ...task, dueDate: toValidTimestamp(task.dueDate) });
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = () => {
    if (!editingId || !editDraft?.title?.trim()) return;
    const next = filterTasksByRole(role, dataService.updateTask(editingId, {
      title: editDraft.title!.trim(),
      description: editDraft.description || '',
      ownerId: editDraft.ownerId?.trim() || '',
      campaignId: editDraft.campaignId?.trim() || '',
      priority: editDraft.priority || 'Medium',
      dueDate: toValidTimestamp(editDraft.dueDate),
      completed: Boolean(editDraft.completed),
      updatedAt: Date.now(),
    }));
    setTasks(next);
    const saved = next.find(t => t.id === editingId);
    if (saved) notify('Task Updated', `"${saved.title}" saved`, 'orange', '/tasks');
    setEditingId(null);
    setEditDraft(null);
  };

  const toggleComplete = (task: Task) => {
    const next = filterTasksByRole(role, dataService.updateTask(task.id, { completed: !task.completed, updatedAt: Date.now() }));
    setTasks(next);
    notify(
      task.completed ? 'Task Reopened' : 'Task Completed',
      `"${task.title}" ${task.completed ? 'returned to active' : 'marked complete'}`,
      task.completed ? 'orange' : 'green',
      '/tasks',
    );
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    setTasks(filterTasksByRole(role, dataService.deleteTask(id)));
    if (task) notify('Task Deleted', `"${task.title}" removed`, 'red', '/tasks');
    if (editingId === id) cancelEdit();
    setConfirmDeleteId(null);
  };

  const saveCreate = () => {
    if (!createDraft.title?.trim()) return;
    const task: Task = {
      id: `TSK-${Date.now()}`,
      title: createDraft.title.trim(),
      description: createDraft.description || '',
      ownerId: createDraft.ownerId?.trim() || '',
      campaignId: createDraft.campaignId?.trim() || '',
      priority: createDraft.priority || 'Medium',
      dueDate: toValidTimestamp(createDraft.dueDate),
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin',
    };
    setTasks(dataService.addTask(task));
    notify('Task Created', `"${task.title}" added`, 'green', '/tasks');
    setShowCreate(false);
    setCreateDraft(emptyDraft());
  };

  const activeCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="max-w-[1360px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-gc-orange">Core Operations</div>
          <h2 className="font-extrabold text-2xl tracking-tight text-foreground">Task Management</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare size={15} className="text-gc-orange" />
            Click a row to edit it inline — all fields are editable directly in the table.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateDraft(emptyDraft()); cancelEdit(); }}
          className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90 shrink-0"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active" value={activeCount} color="text-gc-orange" />
        <StatCard label="Overdue" value={overdueCount} color="text-red-600" />
        <StatCard label="Completed" value={completedCount} color="text-green-600" />
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateForm
          draft={createDraft}
          setDraft={setCreateDraft}
          owners={owners}
          campaignOptions={campaignOptions}
          onSave={saveCreate}
          onCancel={() => { setShowCreate(false); setCreateDraft(emptyDraft()); }}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="settings-input pl-9 w-full"
            placeholder="Search tasks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <select className="settings-input min-w-40" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
          <option value="all">All assignees</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="settings-input min-w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <PrioritySelect value={priorityFilter} onChange={v => setPriorityFilter(v as any)} />
      </div>

      {/* Task table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[2rem_1fr_11rem_10rem_9rem_9rem_7rem] gap-x-4 items-center border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span />
          <span>Task</span>
          <span>Assignee</span>
          <span>Campaign</span>
          <span>Priority</span>
          <span>Due Date</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {tasks.length === 0 ? 'No tasks yet — create your first task above.' : 'No tasks match these filters.'}
            </div>
          ) : (
            filtered.map(task => {
              const editing = editingId === task.id;
              const overdue = isOverdue(task);
              const deleting = confirmDeleteId === task.id;

              if (editing && editDraft) {
                return (
                  <EditRow
                    key={task.id}
                    draft={editDraft}
                    setDraft={setEditDraft}
                    owners={owners}
                    campaignOptions={campaignOptions}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => setConfirmDeleteId(task.id)}
                    confirmDelete={deleting}
                    onConfirmDelete={() => deleteTask(task.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                  />
                );
              }

              return (
                <div
                  key={task.id}
                  onClick={() => startEdit(task)}
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-[2rem_1fr_11rem_10rem_9rem_9rem_7rem] gap-x-4 gap-y-2 items-center px-4 py-3.5 cursor-pointer transition-colors',
                    'hover:bg-muted/40',
                    task.completed && 'opacity-60',
                    overdue && !task.completed && 'bg-red-50/50 dark:bg-red-950/20',
                  )}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleComplete(task); }}
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors',
                      task.completed
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-border hover:border-gc-orange text-transparent',
                    )}
                    aria-label={task.completed ? 'Reopen' : 'Complete'}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>

                  {/* Title + description */}
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold text-foreground truncate', task.completed && 'line-through text-muted-foreground')}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{task.description}</p>
                    )}
                  </div>

                  {/* Assignee */}
                  <div className="text-sm text-foreground truncate md:block">
                    <span className="md:hidden text-[10px] font-bold uppercase text-muted-foreground mr-1">Assignee: </span>
                    {task.ownerId || <span className="text-muted-foreground">—</span>}
                  </div>

                  {/* Campaign */}
                  <div className="text-sm text-foreground truncate">
                    <span className="md:hidden text-[10px] font-bold uppercase text-muted-foreground mr-1">Campaign: </span>
                    {task.campaignId || <span className="text-muted-foreground">—</span>}
                  </div>

                  {/* Priority */}
                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                      PRIORITY_CONFIG[task.priority]?.badge,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_CONFIG[task.priority]?.dot)} />
                      {task.priority}
                    </span>
                  </div>

                  {/* Due date */}
                  <div className={cn('text-sm', overdue && !task.completed ? 'text-red-600 font-semibold' : 'text-foreground')}>
                    <span className="md:hidden text-[10px] font-bold uppercase text-muted-foreground mr-1">Due: </span>
                    <span className="inline-flex items-center gap-1">
                      {overdue && !task.completed && <Clock size={12} />}
                      {fmt(task.dueDate, 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                      task.completed
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                        : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
                    )}>
                      {task.completed ? 'Done' : 'Open'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit row ─────────────────────────────────────────────────────────────────
function EditRow({
  draft, setDraft, owners, campaignOptions,
  onSave, onCancel, onDelete,
  confirmDelete, onConfirmDelete, onCancelDelete,
}: {
  draft: Partial<Task>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Task> | null>>;
  owners: string[];
  campaignOptions: string[];
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const rowId = draft.id || 'edit';
  return (
    <div className="border-l-4 border-gc-orange bg-orange-50/40 dark:bg-orange-950/10">
      {/* Top: editable fields grid */}
      <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1fr_11rem_10rem_9rem_9rem_7rem]">
        {/* Title */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</span>
          <input
            autoFocus
            className="settings-input"
            value={draft.title || ''}
            onChange={e => setDraft(d => ({ ...d!, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
          />
        </label>

        {/* Assignee */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</span>
          <input
            className="settings-input"
            list={`ow-${rowId}`}
            placeholder="Type or pick…"
            value={draft.ownerId || ''}
            onChange={e => setDraft(d => ({ ...d!, ownerId: e.target.value }))}
          />
          <datalist id={`ow-${rowId}`}>
            {owners.map(o => <option key={o} value={o} />)}
          </datalist>
        </label>

        {/* Campaign */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Campaign</span>
          <input
            className="settings-input"
            list={`cp-${rowId}`}
            placeholder="Campaign name…"
            value={draft.campaignId || ''}
            onChange={e => setDraft(d => ({ ...d!, campaignId: e.target.value }))}
          />
          <datalist id={`cp-${rowId}`}>
            {campaignOptions.map(c => <option key={c} value={c} />)}
          </datalist>
        </label>

        {/* Priority */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</span>
          <select
            className="settings-input"
            value={draft.priority || 'Medium'}
            onChange={e => setDraft(d => ({ ...d!, priority: e.target.value as Task['priority'] }))}
          >
            {(['Low', 'Medium', 'High', 'Critical'] as Task['priority'][]).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        {/* Due date */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</span>
          <input
            className="settings-input"
            type="date"
            value={fmt(draft.dueDate, 'yyyy-MM-dd')}
            onChange={e => setDraft(d => ({ ...d!, dueDate: parseDateInput(e.target.value, d?.dueDate) }))}
          />
        </label>

        {/* Status */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
          <select
            className="settings-input"
            value={draft.completed ? 'completed' : 'active'}
            onChange={e => setDraft(d => ({ ...d!, completed: e.target.value === 'completed' }))}
          >
            <option value="active">Open</option>
            <option value="completed">Done</option>
          </select>
        </label>
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
          <textarea
            className="settings-input min-h-16 resize-none"
            value={draft.description || ''}
            onChange={e => setDraft(d => ({ ...d!, description: e.target.value }))}
            rows={2}
          />
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-100 dark:border-orange-900/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs font-bold text-destructive">Delete this task?</span>
              <button onClick={onConfirmDelete} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-white hover:bg-destructive/90">
                Yes, delete
              </button>
              <button onClick={onCancelDelete} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-accent">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-accent">
            <X size={13} className="inline mr-1" />Cancel
          </button>
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gc-orange px-4 py-1.5 text-xs font-bold text-white hover:bg-gc-orange/90"
          >
            <Save size={13} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────
function CreateForm({ draft, setDraft, owners, campaignOptions, onSave, onCancel }: {
  draft: Partial<Task>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Task>>>;
  owners: string[];
  campaignOptions: string[];
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/10 shadow-sm">
      <div className="flex items-center justify-between border-b border-orange-100 dark:border-orange-900/30 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-gc-orange">New Task</p>
          <p className="text-sm font-bold text-foreground">Fill in the details below</p>
        </div>
        <button onClick={onCancel} className="icon-btn"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title *</span>
          <input
            autoFocus
            className="settings-input"
            placeholder="What needs to be done?"
            value={draft.title || ''}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</span>
          <input
            className="settings-input"
            list="create-owners"
            placeholder="Type or pick…"
            value={draft.ownerId || ''}
            onChange={e => setDraft(d => ({ ...d, ownerId: e.target.value }))}
          />
          <datalist id="create-owners">
            {owners.map(o => <option key={o} value={o} />)}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Campaign</span>
          <input
            className="settings-input"
            list="create-campaigns"
            placeholder="Campaign name…"
            value={draft.campaignId || ''}
            onChange={e => setDraft(d => ({ ...d, campaignId: e.target.value }))}
          />
          <datalist id="create-campaigns">
            {campaignOptions.map(c => <option key={c} value={c} />)}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</span>
          <select className="settings-input" value={draft.priority || 'Medium'} onChange={e => setDraft(d => ({ ...d, priority: e.target.value as Task['priority'] }))}>
            {(['Low', 'Medium', 'High', 'Critical'] as Task['priority'][]).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</span>
          <input
            className="settings-input"
            type="date"
            value={fmt(draft.dueDate, 'yyyy-MM-dd')}
            onChange={e => setDraft(d => ({ ...d, dueDate: parseDateInput(e.target.value, d.dueDate) }))}
          />
        </label>

        <label className="flex flex-col gap-1 lg:col-span-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
          <textarea
            className="settings-input min-h-16 resize-none"
            placeholder="Optional details…"
            value={draft.description || ''}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            rows={2}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-orange-100 dark:border-orange-900/30 px-4 py-3">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent">Cancel</button>
        <button onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90">
          <Save size={15} /> Create Task
        </button>
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', color)}>{value}</p>
    </div>
  );
}

const PRIORITY_DOT: Record<string, string> = {
  Critical: '#dc2626', High: '#f97316', Medium: '#d97706', Low: '#16a34a',
};

function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative min-w-36">
      {value !== 'all' && (
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
          style={{ background: PRIORITY_DOT[value] }}
        />
      )}
      <select
        className={cn('settings-input', value !== 'all' && 'pl-8')}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="all">All priorities</option>
        {(['Low', 'Medium', 'High', 'Critical'] as Task['priority'][]).map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
