import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;

function getSupabaseCredentials() {
  const url = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Supabase URL is not set. Please set COZE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
  if (!anonKey) {
    throw new Error('Supabase anon key is not set. Please set COZE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
  }

  return { url, anonKey };
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  // 如果有 token，创建新的带认证的客户端
  if (token) {
    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // 复用全局客户端实例
  if (!clientInstance) {
    clientInstance = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return clientInstance;
}

export { getSupabaseClient, getSupabaseCredentials };
