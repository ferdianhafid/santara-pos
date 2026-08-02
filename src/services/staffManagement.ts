import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from './supabaseAuth';

export type StaffMember = {
  createdAt: string;
  email: string;
  fullName: string;
  id: string;
  isActive: boolean;
  role: UserRole;
};

type StaffRow = {
  created_at: string;
  email: string | null;
  full_name: string | null;
  id: string;
  is_active: boolean;
  role: UserRole;
};

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as StaffRow[]).map((staff) => ({
    createdAt: staff.created_at,
    email: staff.email ?? '',
    fullName: staff.full_name ?? staff.email ?? 'Staff',
    id: staff.id,
    isActive: staff.is_active,
    role: staff.role,
  }));
}

export async function manageStaff(payload: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  const { data, error } = await supabase.functions.invoke('manage-staff', {
    body: payload,
  });

  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      throw new Error(body.error || error.message);
    } catch (contextError) {
      if (contextError instanceof Error && contextError.message !== error.message) {
        throw contextError;
      }
      throw new Error(error.message);
    }
  }
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return String(data?.message ?? 'Perubahan berhasil disimpan.');
}
