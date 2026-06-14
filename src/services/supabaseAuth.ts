import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'owner' | 'admin' | 'cashier';

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isMissing: boolean;
};

type ProfileRow = {
  id?: unknown;
  email?: unknown;
  full_name?: unknown;
  role?: unknown;
};

export async function getCurrentSession() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export function onSupabaseAuthChange(
  handler: (session: Session | null) => void,
) {
  if (!supabase) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session);
  });

  return () => subscription.unsubscribe();
}

export async function signInToSupabase(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error('Email atau password salah.');
  }
}

export async function signOutFromSupabase() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchUserProfile(user: User): Promise<UserProfile> {
  if (!supabase) {
    return createFallbackProfile(user, true);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return createFallbackProfile(user, true);
  }

  return {
    id: toStringValue((data as ProfileRow).id) || user.id,
    email: toStringValue((data as ProfileRow).email) || user.email || '',
    fullName:
      toStringValue((data as ProfileRow).full_name) ||
      user.email ||
      'Santara Cashier',
    role: toUserRole((data as ProfileRow).role),
    isMissing: false,
  };
}

function createFallbackProfile(user: User, isMissing: boolean): UserProfile {
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: user.email ?? 'Santara Cashier',
    role: 'cashier',
    isMissing,
  };
}

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toUserRole(value: unknown): UserRole {
  const role = toStringValue(value);

  return role === 'owner' || role === 'admin' || role === 'cashier'
    ? role
    : 'cashier';
}
