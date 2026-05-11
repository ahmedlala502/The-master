import { type ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date() && iso.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

export function getStatusColor(status: string): string {
  switch ((status || '').toLowerCase()) {
    case 'backlog': return 'bg-slate-100 text-slate-700';
    case 'in progress': return 'bg-blue-100 text-blue-700';
    case 'waiting': return 'bg-amber-100 text-amber-700';
    case 'blocked': return 'bg-red-100 text-red-700';
    case 'done': return 'bg-green-100 text-green-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}
