import type { OpsRole, OpsUser } from '../auth/types';
import { supabase } from '../lib/supabase';

type AdminApiUser = OpsUser;

async function withAuthHeaders(init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers || {}),
    },
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Request failed.';

    try {
      const payload = await response.json();
      message = payload?.error || message;
    } catch {
      // Ignore JSON parse issues and fall back to generic message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const adminApi = {
  async listUsers(): Promise<AdminApiUser[]> {
    const response = await fetch('/api/admin-users', await withAuthHeaders());
    return parseResponse<AdminApiUser[]>(response);
  },

  async createUser(payload: { name: string; email: string; password: string; role: OpsRole }) {
    const response = await fetch(
      '/api/admin-users',
      await withAuthHeaders({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );

    return parseResponse<AdminApiUser>(response);
  },

  async updateUser(payload: { id: string; name?: string; role?: OpsRole; status?: 'active' | 'suspended' }) {
    const response = await fetch(
      '/api/admin-users',
      await withAuthHeaders({
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    );

    return parseResponse<AdminApiUser>(response);
  },

  async deleteUser(id: string) {
    const response = await fetch(
      '/api/admin-users',
      await withAuthHeaders({
        method: 'DELETE',
        body: JSON.stringify({ id }),
      }),
    );

    return parseResponse<{ success: boolean }>(response);
  },
};
