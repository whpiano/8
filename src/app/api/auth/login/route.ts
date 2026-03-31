import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyPassword, generateToken } from '@/lib/auth';

// POST 用户登录
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { username, password } = body;

    // 参数验证
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 查询用户
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, username, password_hash, free_count, vip_expired_at, created_at')
      .eq('username', username)
      .maybeSingle();

    if (userError) {
      throw new Error(`查询用户失败: ${userError.message}`);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 400 }
      );
    }

    // 验证密码
    if (!verifyPassword(password, (user as { password_hash: string }).password_hash)) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 400 }
      );
    }

    // 删除旧会话
    await client
      .from('user_sessions')
      .delete()
      .eq('user_id', (user as { id: number }).id);

    // 创建新会话
    const token = generateToken();
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 7); // 7 天过期

    const { error: sessionError } = await client
      .from('user_sessions')
      .insert({
        user_id: (user as { id: number }).id,
        token,
        expired_at: expiredAt.toISOString()
      });

    if (sessionError) {
      throw new Error(`创建会话失败: ${sessionError.message}`);
    }

    // 返回用户信息（不含密码）
    const { password_hash, ...userWithoutPassword } = user as { password_hash: string; [key: string]: unknown };

    // 设置 Cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    });

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: false, // 开发环境和生产环境都使用 false，确保兼容性
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 天
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
