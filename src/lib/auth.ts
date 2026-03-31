import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 生成随机 token
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 简单的密码哈希（生产环境应使用 bcrypt）
export function hashPassword(password: string): string {
  // 使用简单的 base64 + 反转作为示例
  // 生产环境请使用 bcrypt: const bcrypt = require('bcrypt');
  // return await bcrypt.hash(password, 10);
  return Buffer.from(password.split('').reverse().join('')).toString('base64');
}

// 验证密码
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// 用户信息接口
export interface User {
  id: number;
  username: string;
  free_count: number;
  vip_expired_at: string | null;
  created_at: string;
}

// 获取当前登录用户
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('user_token')?.value;
    
    if (!token) return null;
    
    const client = getSupabaseClient();
    
    // 查询有效的会话
    const { data: session, error: sessionError } = await client
      .from('user_sessions')
      .select('user_id, expired_at')
      .eq('token', token)
      .maybeSingle();
    
    if (sessionError || !session) return null;
    
    // 检查会话是否过期
    if (new Date(session.expired_at) < new Date()) {
      // 删除过期会话
      await client.from('user_sessions').delete().eq('token', token);
      return null;
    }
    
    // 获取用户信息
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, username, free_count, vip_expired_at, created_at')
      .eq('id', session.user_id)
      .maybeSingle();
    
    if (userError || !user) return null;
    
    return user as User;
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

// 检查用户是否有 VIP 权限
export async function hasVipAccess(user: User): Promise<boolean> {
  if (user.vip_expired_at) {
    const expiredAt = new Date(user.vip_expired_at);
    return expiredAt > new Date();
  }
  return false;
}

// 检查用户是否可以答题
export async function canAnswerQuestion(user: User): Promise<{ canAnswer: boolean; reason: string }> {
  // 检查 VIP 权限
  if (await hasVipAccess(user)) {
    return { canAnswer: true, reason: 'vip' };
  }
  
  // 检查免费次数
  if (user.free_count > 0) {
    return { canAnswer: true, reason: 'free' };
  }
  
  return { canAnswer: false, reason: 'no_quota' };
}

// 扣除免费次数
export async function deductFreeCount(userId: number): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('users')
      .update({ 
        free_count: client.rpc('decrement_free_count') 
      } as never)
      .eq('id', userId);
    
    if (error) {
      // 如果 RPC 不存在，使用普通方式
      const { data: user } = await client
        .from('users')
        .select('free_count')
        .eq('id', userId)
        .maybeSingle();
      
      if (user && (user as { free_count: number }).free_count > 0) {
        await client
          .from('users')
          .update({ free_count: (user as { free_count: number }).free_count - 1 })
          .eq('id', userId);
      }
    }
    
    return true;
  } catch (error) {
    console.error('扣除免费次数失败:', error);
    return false;
  }
}
