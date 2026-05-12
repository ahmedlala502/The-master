import type { LocalAuthRole } from '../services/localAuth';

const OPERATIONS_PATHS = new Set([
  '/',
  '/handover',
  '/tasks',
  '/blockers',
  '/analytics',
  '/assets',
  '/reporting',
  '/templates',
]);
const MASTER_ONLY_PATHS = new Set(['/audit', '/settings', '/admin']);

export function canAccessOperations(role: LocalAuthRole | null): boolean {
  return role === 'master' || role === 'operations';
}

export function canAccessCommunity(role: LocalAuthRole | null): boolean {
  return role === 'master' || role === 'community';
}

export function canAccessAdmin(role: LocalAuthRole | null): boolean {
  return role === 'master';
}

export function canAccessPath(role: LocalAuthRole | null, pathname: string): boolean {
  if (!role) return false;
  if (MASTER_ONLY_PATHS.has(pathname)) return canAccessAdmin(role);
  if (OPERATIONS_PATHS.has(pathname)) return role === 'master' || role === 'operations' || role === 'community';
  return false;
}

export function getHomePath(role: LocalAuthRole | null): string {
  return '/';
}

export function getRoleLabel(role: LocalAuthRole | null): string {
  if (role === 'master') return 'Master';
  if (role === 'community') return 'Community';
  if (role === 'operations') return 'Operations';
  return 'Workspace';
}
