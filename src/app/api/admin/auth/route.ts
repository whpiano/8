import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 管理员密码（生产环境应使用环境变量）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 简单的 token 生成
function generateToken(): string {
  return Buffer.from(`admin:${Date.now()}:${Math.random().toString(36).slice(2)}`).toString('base64');
}

// 验证 token
function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return decoded.startsWith('admin:');
  } catch {
    return false;
  }
}

// POST 登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password === ADMIN_PASSWORD) {
      const token = generateToken();
      const cookieStore = await cookies();
      cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 小时
      });

      return NextResponse.json({ success: true, message: '登录成功' });
    }

    return NextResponse.json(
      { success: false, error: '密码错误' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '请求错误' },
      { status: 400 }
    );
  }
}

// GET 验证登录状态
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (token && verifyToken(token)) {
      return NextResponse.json({ success: true, isAdmin: true });
    }

    return NextResponse.json({ success: true, isAdmin: false });
  } catch (error) {
    return NextResponse.json({ success: true, isAdmin: false });
  }
}

// DELETE 退出登录
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_token');
    return NextResponse.json({ success: true, message: '已退出登录' });
  } catch (error) {
    return NextResponse.json({ success: false, error: '退出失败' });
  }
}
