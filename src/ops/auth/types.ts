export type OpsRole = 'master' | 'operations' | 'community';

export type OpsUserStatus = 'active' | 'suspended';

export type OpsUser = {
  uid: string;
  email: string;
  displayName: string;
  role: OpsRole;
  status: OpsUserStatus;
  createdAt?: string | null;
  lastSignInAt?: string | null;
};

export function isOpsRole(value: unknown): value is OpsRole {
  return value === 'master' || value === 'operations' || value === 'community';
}

export function getRoleFromMetadata(value: unknown): OpsRole {
  return isOpsRole(value) ? value : 'operations';
}
