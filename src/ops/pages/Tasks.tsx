/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
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
import { dataService } from '../services/dataService';
import { notify } from '../services/notificationService';
import { Task } from '../types';

// Owners are fetched from Supabase at runtime — no hardcoded list
const PRIORITIES: Task['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
const ONE_DAY = 86400000;

const fallbackDueDate = () => Date.now() + ONE_DAY;

const toValidDate = (value: unknown, fallback = fallbackDueDate()) => {
  const timestamp = typeof value === 'number' ? value : Number(value);
  const date = new Date(timestamp);
  return isValid(date) ? date : new Date(fallback);
};

const toValidTimestamp = (value: unknown, fallback = fallbackDueDate()) => toValidDate(value, fallback).getTime();

const formatDueDate = (value: unknown, dateFormat: string) => format(toValidDate(value), dateFormat);

const parseDateInput = (value: string, fallback: unknown) => {
  if (!value) return toValidTimestamp(fallback);
  const timestamp = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : toValidTimestamp(fallback);
};

const isTaskOverdue = (task: Task) => !task.completed && isPast(toValidDate(task.dueDate));

const emptyDraft = (): Partial<Task> => ({
  title: '',
  description: '',
  ownerId: 'Sarah A.',
  campaignId: 'Generic Ops',
  priority: 'Medium',
  dueDate: fallbackDueDate(),
  completed: false,
});

const normalizeTaskDraft = (task: Task): Partial<Task> => ({
  ...task,
  ownerId: task.ownerId?.trim() || 'Sarah A.',
  campaignId: task.campaignId?.trim() || 'Generic Ops',
  dueDate: toValidTimestamp(task.dueDate),
});

export default function TasksCenter() {
  const { role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(filterTasksByRole(role, dataService.getTasks()));
  const [draft, setDraft] = useState<Partial<Task>>(emptyDraft());
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<Partial<Task> | null>(null);
  const [supabaseUsers, setSupabaseUsers] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    import('../services/adminApi').then(({ adminApi }) => {
      adminApi.listUsers().then(users => {
        if (mounted) setSupabaseUsers(users.filter(u => u.status === 'active').map(u => u.displayName));
      }).catch(() => {});
    });
    return () => { mounted = false; };
  }, []);

  const campaigns = filterCampaignsByRole(role, dataService.getCampaigns());
  const owners = filterOwnerOptionsByRole(role, Array.from(new Set([
    ...supabaseUsers,
    ...tasks.map((task) => task.ownerId?.trim()).filter(Boolean) as string[],
  ])));

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const ownerId = task.ownerId?.trim() || 'Unassigned';
        const haystack = `${task.title || ''} ${task.description || ''} ${ownerId} ${task.campaignId || ''}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query.toLowerCase());
        const matchesOwner = ownerFilter === 'all' || ownerId === ownerFilter;
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'completed' ? task.completed : !task.completed);
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        return matchesQuery && matchesOwner && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityWeight[b.priority] !== priorityWeight[a.priority]) return priorityWeight[b.priority] - priorityWeight[a.priority];
        return toValidTimestamp(a.dueDate) - toValidTimestamp(b.dueDate);
      });
  }, [tasks, query, ownerFilter, statusFilter, priorityFilter]);

  const saveTask = () => {
    if (!draft.title?.trim()) return;

    const task: Task = {
      id: `TSK-${Date.now()}`,
      title: draft.title || '',
      description: draft.description || '',
      ownerId: draft.ownerId?.trim() || 'Ops',
      campaignId: draft.campaignId?.trim() || 'Generic Ops',
      priority: draft.priority || 'Medium',
      dueDate: toValidTimestamp(draft.dueDate),
      completed: Boolean(draft.completed),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin',
    };

    setTasks(dataService.addTask(task));
    notify('Task Created', `"${task.title}" assigned to ${task.ownerId}`, 'green', '/tasks');
    setShowCreate(false);
    setDraft(emptyDraft());
  };

  const cancelCreate = () => {
    setShowCreate(false);
    setDraft(emptyDraft());
  };

  const openTask = (task: Task) => {
    if (expandedId === task.id) {
      setExpandedId(null);
      setExpandedDraft(null);
      return;
    }

    setExpandedId(task.id);
    setExpandedDraft(normalizeTaskDraft(task));
    setConfirmDeleteId(null);
    setShowCreate(false);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const current = tasks.find(task => task.id === id);
    if (!current) return;

    const nextTasks = filterTasksByRole(role, dataService.updateTask(id, { ...updates, updatedAt: Date.now() }));
    setTasks(nextTasks);

    if (expandedId === id) {
      const latest = nextTasks.find(task => task.id === id);
      if (latest) setExpandedDraft(normalizeTaskDraft(latest));
    }

    if (typeof updates.completed === 'boolean') {
      notify(
        updates.completed ? 'Task Checked Off' : 'Task Reopened',
        `"${current.title}" ${updates.completed ? 'marked complete' : 'returned to active work'}`,
        updates.completed ? 'green' : 'orange',
        '/tasks',
      );
    }
  };

  const saveExpandedTask = () => {
    if (!expandedId || !expandedDraft?.title?.trim()) return;

    const nextTasks = filterTasksByRole(role, dataService.updateTask(expandedId, {
      title: expandedDraft.title?.trim(),
      description: expandedDraft.description || '',
      ownerId: expandedDraft.ownerId?.trim() || 'Ops',
      campaignId: expandedDraft.campaignId?.trim() || 'Generic Ops',
      priority: expandedDraft.priority || 'Medium',
      dueDate: toValidTimestamp(expandedDraft.dueDate),
      completed: Boolean(expandedDraft.completed),
      updatedAt: Date.now(),
    }));

    setTasks(nextTasks);
    const savedTask = nextTasks.find(task => task.id === expandedId);
    if (savedTask) {
      setExpandedDraft(normalizeTaskDraft(savedTask));
      notify('Task Updated', `"${savedTask.title}" was updated`, 'orange', '/tasks');
    }
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    setTasks(filterTasksByRole(role, dataService.deleteTask(id)));
    if (task) notify('Task Deleted', `"${task.title}" removed from task board`, 'red', '/tasks');
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDraft(null);
    }
    setConfirmDeleteId(null);
  };

  const activeCount = tasks.filter((task) => !task.completed).length;
  const overdueCount = tasks.filter(isTaskOverdue).length;
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <div className="max-w-[1240px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-gc-orange">Core Operations</div>
          <h2 className="font-extrabold text-2xl tracking-tight text-foreground">Task Management</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare size={16} className="text-gc-orange" />
            Check tasks normally, expand them for details, and reassign or update them inline.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setDraft(emptyDraft());
            setExpandedId(null);
            setExpandedDraft(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TaskStat label="Active" value={activeCount} tone="orange" />
        <TaskStat label="Overdue" value={overdueCount} tone="red" />
        <TaskStat label="Completed" value={completedCount} tone="green" />
        <TaskStat label="Owners" value={owners.length} tone="purple" />
      </div>

      {showCreate && (
        <TaskEditor
          draft={draft}
          setDraft={setDraft}
          campaigns={campaigns.map((campaign) => `${campaign.id} - ${campaign.name}`)}
          owners={owners}
          title="Create Task"
          onSave={saveTask}
          onCancel={cancelCreate}
        />
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="grid gap-3 border-b border-border bg-muted/30 p-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="settings-input pl-9"
              placeholder="Search task, owner, campaign..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={ownerFilter} onChange={setOwnerFilter} options={['all', ...owners]} />
          <Select value={statusFilter} onChange={(value) => setStatusFilter(value as 'active' | 'completed' | 'all')} options={['all', 'active', 'completed']} />
          <Select value={priorityFilter} onChange={(value) => setPriorityFilter(value as 'all' | Task['priority'])} options={['all', ...PRIORITIES]} />
        </div>

        <div className="divide-y divide-border">
          {filteredTasks.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No tasks match these filters.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const ownerId = task.ownerId?.trim() || 'Unassigned';
              const expanded = expandedId === task.id;

              return (
                <div key={task.id} className={cn('transition-colors', overdue && 'bg-red-50/50 dark:bg-red-900/10')}>
                  <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { completed: !task.completed })}
                        className={cn(
                          'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border-2 shrink-0 transition-colors',
                          task.completed ? 'border-green-600 bg-green-600 text-white' : 'border-border text-transparent hover:border-gc-orange'
                        )}
                        aria-label={task.completed ? 'Reopen task' : 'Complete task'}
                      >
                        <Check size={17} strokeWidth={3} />
                      </button>

                      <button type="button" onClick={() => openTask(task)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <p className={cn('text-sm font-bold text-foreground', task.completed && 'line-through text-muted-foreground')}>
                              {task.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {task.description || 'No description'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <TaskPill label={ownerId} tone="neutral" />
                            <TaskPill label={task.priority} tone={priorityTone(task.priority)} />
                            <TaskPill label={formatDueDate(task.dueDate, 'MMM dd, yyyy')} tone={overdue ? 'red' : 'neutral'} />
                            <TaskPill label={task.completed ? 'Done' : 'Open'} tone={task.completed ? 'green' : 'orange'} />
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 lg:justify-end">
                      <span className="text-[11px] text-muted-foreground">{task.campaignId || 'Generic Ops'}</span>
                      <button
                        type="button"
                        onClick={() => openTask(task)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:border-gc-orange hover:text-gc-orange"
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? 'Collapse' : 'Expand'}
                      </button>
                    </div>
                  </div>

                  {expanded && expandedDraft && (
                    <div className="border-t border-border bg-muted/20 px-5 py-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                          label="Title"
                          value={expandedDraft.title || ''}
                          onChange={(value) => setExpandedDraft((current) => ({ ...current!, title: value }))}
                        />
                        <label>
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</span>
                          <select
                            className="settings-input"
                            value={expandedDraft.ownerId || ''}
                            onChange={(event) => setExpandedDraft((current) => ({ ...current!, ownerId: event.target.value }))}
                          >
                            {owners.map((owner) => (
                              <option key={owner} value={owner}>
                                {owner}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Campaign</span>
                          <input
                            className="settings-input"
                            list={`campaign-options-${task.id}`}
                            value={expandedDraft.campaignId || ''}
                            onChange={(event) => setExpandedDraft((current) => ({ ...current!, campaignId: event.target.value }))}
                          />
                          <datalist id={`campaign-options-${task.id}`}>
                            {campaigns.map((campaign) => (
                              <option key={campaign.id} value={`${campaign.id} - ${campaign.name}`} />
                            ))}
                          </datalist>
                        </label>

                        <label>
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Priority</span>
                          <select
                            className="settings-input"
                            value={expandedDraft.priority || 'Medium'}
                            onChange={(event) => setExpandedDraft((current) => ({ ...current!, priority: event.target.value as Task['priority'] }))}
                          >
                            {PRIORITIES.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</span>
                          <input
                            className="settings-input"
                            type="date"
                            value={formatDueDate(expandedDraft.dueDate, 'yyyy-MM-dd')}
                            onChange={(event) => setExpandedDraft((current) => ({ ...current!, dueDate: parseDateInput(event.target.value, current?.dueDate) }))}
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
                          <select
                            className="settings-input"
                            value={expandedDraft.completed ? 'completed' : 'active'}
                            onChange={(event) => setExpandedDraft((current) => ({ ...current!, completed: event.target.value === 'completed' }))}
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                        </label>

                        <label className="md:col-span-2">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
                          <textarea
                            className="settings-input min-h-24"
                            value={expandedDraft.description || ''}
                            onChange={(event) => setExpandedDraft((current) => ({ ...current!, description: event.target.value }))}
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>ID: {task.id}</span>
                          <span>Created by {task.createdBy}</span>
                          <span>Updated {formatDueDate(task.updatedAt, 'MMM dd, yyyy')}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {confirmDeleteId === task.id ? (
                            <>
                              <span className="text-[10px] font-bold text-destructive">Delete task?</span>
                              <button onClick={() => deleteTask(task.id)} className="rounded-lg bg-destructive px-3 py-2 text-[11px] font-bold text-white hover:bg-destructive/90">
                                Yes, delete
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold hover:bg-accent">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setExpandedDraft(normalizeTaskDraft(task))}
                                className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold hover:bg-accent"
                              >
                                Reset
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(task.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                              <button
                                onClick={saveExpandedTask}
                                className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-4 py-2 text-[11px] font-bold text-white hover:bg-gc-orange/90"
                              >
                                <Save size={14} />
                                Save Updates
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function TaskEditor({ draft, setDraft, campaigns, owners, title, onSave, onCancel }: any) {
  return (
    <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-900/30 dark:bg-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-gc-orange">Task Editor</p>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <button onClick={onCancel} className="icon-btn"><X size={15} /></button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title" value={draft.title || ''} onChange={(value: string) => setDraft({ ...draft, title: value })} />
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</span>
          <select className="settings-input" value={draft.ownerId || ''} onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })}>
            {owners.map((owner: string) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Campaign</span>
          <input className="settings-input" list="campaign-options" value={draft.campaignId || ''} onChange={(event) => setDraft({ ...draft, campaignId: event.target.value })} />
          <datalist id="campaign-options">
            {campaigns.map((campaign: string) => <option key={campaign} value={campaign} />)}
          </datalist>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Priority</span>
          <select className="settings-input" value={draft.priority || 'Medium'} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
            {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</span>
          <input className="settings-input" type="date" value={formatDueDate(draft.dueDate, 'yyyy-MM-dd')} onChange={(event) => setDraft({ ...draft, dueDate: parseDateInput(event.target.value, draft.dueDate) })} />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
          <textarea className="settings-input min-h-24" value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent">Cancel</button>
        <button onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90">
          <Save size={15} />
          Save Task
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input className="settings-input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select className="settings-input min-w-36 capitalize" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function TaskStat({ label, value, tone }: { label: string; value: number; tone: 'orange' | 'red' | 'green' | 'purple' }) {
  const tones = {
    orange: 'text-gc-orange',
    red: 'text-red-600',
    green: 'text-green-600',
    purple: 'text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', tones[tone])}>{value}</p>
    </div>
  );
}

function TaskPill({ label, tone }: { label: string; tone: 'neutral' | 'orange' | 'red' | 'green' | 'purple' }) {
  const tones = {
    neutral: 'border-border bg-secondary text-foreground',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
  };

  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.2px]', tones[tone])}>
      {label}
    </span>
  );
}

function priorityTone(priority: Task['priority']): 'green' | 'orange' | 'purple' | 'red' {
  if (priority === 'Critical') return 'red';
  if (priority === 'High') return 'orange';
  if (priority === 'Medium') return 'purple';
  return 'green';
}
