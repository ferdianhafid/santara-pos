import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type StaffRole = 'admin' | 'cashier';
type StaffAction = 'create' | 'update' | 'reset_password';

type RequestBody = {
  action?: StaffAction;
  email?: string;
  fullName?: string;
  isActive?: boolean;
  password?: string;
  role?: StaffRole;
  staffId?: string;
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return response({ error: 'Metode tidak didukung.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authorization = request.headers.get('Authorization') ?? '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      return response({ error: 'Konfigurasi atau sesi tidak tersedia.' }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return response({ error: 'Sesi login tidak valid.' }, 401);
    }

    const { data: caller, error: callerError } = await adminClient
      .from('profiles')
      .select('id, business_id, role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (
      callerError ||
      !caller ||
      caller.is_active !== true ||
      !['owner', 'admin'].includes(caller.role)
    ) {
      return response({ error: 'Anda tidak memiliki izin mengelola staff.' }, 403);
    }

    const body = (await request.json()) as RequestBody;
    const action = body.action;
    const role = body.role;
    const fullName = body.fullName?.trim() ?? '';

    if (action === 'create') {
      const email = body.email?.trim().toLowerCase() ?? '';
      const password = body.password ?? '';

      if (!email || !fullName || !role || password.length < 8) {
        return response({ error: 'Nama, email, role, dan password minimal 8 karakter wajib diisi.' }, 400);
      }

      if (role === 'admin' && caller.role !== 'owner') {
        return response({ error: 'Hanya owner yang dapat membuat admin.' }, 403);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { full_name: fullName },
      });

      if (createError || !created.user) {
        return response({ error: createError?.message ?? 'Akun gagal dibuat.' }, 400);
      }

      const { error: profileError } = await adminClient.from('profiles').insert({
        business_id: caller.business_id,
        email,
        full_name: fullName,
        id: created.user.id,
        is_active: true,
        role,
      });

      if (profileError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return response({ error: profileError.message }, 400);
      }

      return response({ message: 'Akun staff berhasil dibuat.' });
    }

    const staffId = body.staffId?.trim() ?? '';
    if (!staffId || staffId === caller.id) {
      return response({ error: 'Akun sendiri tidak dapat diubah dari menu ini.' }, 400);
    }

    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id, role, business_id')
      .eq('id', staffId)
      .eq('business_id', caller.business_id)
      .maybeSingle();

    if (targetError || !target || target.role === 'owner') {
      return response({ error: 'Akun staff tidak ditemukan atau tidak dapat dikelola.' }, 404);
    }

    if (caller.role === 'admin' && target.role === 'admin') {
      return response({ error: 'Admin hanya dapat mengelola akun kasir.' }, 403);
    }

    if (action === 'reset_password') {
      const password = body.password ?? '';
      if (password.length < 8) {
        return response({ error: 'Password baru minimal 8 karakter.' }, 400);
      }
      const { error } = await adminClient.auth.admin.updateUserById(staffId, { password });
      return error
        ? response({ error: error.message }, 400)
        : response({ message: 'Password staff berhasil diperbarui.' });
    }

    if (action === 'update') {
      if (!fullName || !role || typeof body.isActive !== 'boolean') {
        return response({ error: 'Nama, role, dan status akun wajib diisi.' }, 400);
      }
      if (role === 'admin' && caller.role !== 'owner') {
        return response({ error: 'Hanya owner yang dapat menetapkan role admin.' }, 403);
      }

      const { error } = await adminClient
        .from('profiles')
        .update({ full_name: fullName, is_active: body.isActive, role })
        .eq('id', staffId)
        .eq('business_id', caller.business_id);

      return error
        ? response({ error: error.message }, 400)
        : response({ message: 'Data staff berhasil diperbarui.' });
    }

    return response({ error: 'Aksi tidak dikenali.' }, 400);
  } catch (error) {
    return response(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan.' },
      500,
    );
  }
});
