import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getRoleFromMetadata, type OpsUser } from '../auth/types';

const DEFAULT_MASTER_EMAIL = (import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'admin@trygc.com').trim().toLowerCase();

function getDisplayName(user: User): string {
  const metadataName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name;

  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();

  const emailPrefix = user.email?.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Workspace User';
  return emailPrefix.replace(/\b\w/g, (match: string) => match.toUpperCase());
}

export function mapSupabaseUser(user: User): OpsUser {
  const fallbackRole = user.email?.trim().toLowerCase() === DEFAULT_MASTER_EMAIL ? 'master' : 'operations';
  const role = getRoleFromMetadata(user.app_metadata?.role ?? fallbackRole);
  const status = user.banned_until ? 'suspended' : 'active';

  return {
    uid: user.id,
    email: user.email || '',
    displayName: getDisplayName(user),
    role,
    status,
    createdAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
  };
}

export const supabaseAuth = {
  async getSessionUser(): Promise<OpsUser | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    if (!data.user) return null;
    return mapSupabaseUser(data.user);
  },

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from Supabase.');

    return mapSupabaseUser(data.user);
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback: (user: OpsUser | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) {
        callback(null);
        return;
      }

      callback(mapSupabaseUser(session.user));
    });

    return data.subscription;
  },
};
