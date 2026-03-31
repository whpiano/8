import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// GET 获取当前用户信息
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: true,
        data: null,
        isLoggedIn: false
      });
    }
    
    return NextResponse.json({
      success: true,
      data: user,
      isLoggedIn: true
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

// DELETE 退出登录
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const cookieStore = request.cookies;
    const token = cookieStore.get('user_token')?.value;
    
    if (token) {
      // 删除会话
      await client
        .from('user_sessions')
        .delete()
        .eq('token', token);
    }
    
    // 清除 Cookie
    const response = NextResponse.json({
      success: true,
      message: '已退出登录'
    });
    
    response.cookies.delete('user_token');
    
    return response;
  } catch (error) {
    console.error('退出登录失败:', error);
    return NextResponse.json(
      { success: false, error: '退出登录失败' },
      { status: 500 }
    );
  }
}
