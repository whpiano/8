import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, generateToken } from '@/lib/auth';

// POST 用户注册
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

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: '用户名长度需在 3-20 个字符之间' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码长度至少 6 个字符' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 创建用户
    const passwordHash = hashPassword(password);
    const { data: newUser, error: createError } = await client
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        free_count: 10 // 新用户 10 次免费答题
      })
      .select('id, username, free_count, vip_expired_at, created_at')
      .single();

    if (createError) {
      throw new Error(`创建用户失败: ${createError.message}`);
    }

    // 创建会话
    const token = generateToken();
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 7); // 7 天过期

    const { error: sessionError } = await client
      .from('user_sessions')
      .insert({
        user_id: (newUser as { id: number }).id,
        token,
        expired_at: expiredAt.toISOString()
      });

    if (sessionError) {
      throw new Error(`创建会话失败: ${sessionError.message}`);
    }

    // 设置 Cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: newUser,
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
    console.error('注册失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '注册失败' },
      { status: 500 }
    );
  }
}
