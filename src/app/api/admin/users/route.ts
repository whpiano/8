import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 验证管理员权限
async function checkAdmin(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    
    if (!token) return false;
    
    // 验证 token 格式
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return decoded.startsWith('admin:');
  } catch {
    return false;
  }
}

// GET 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') || '';

    let query = client
      .from('users')
      .select('id, username, free_count, vip_expired_at, created_at', { count: 'exact' });

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data, error, count } = await query
      .order('id', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// PUT 更新用户信息（增减会员时长、免费次数）
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const client = getSupabaseClient();
    const body = await request.json();
    const { userId, action, value } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    // 获取用户当前信息
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, vip_expired_at, free_count')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'add_vip_hours': {
        // 增加VIP时长（小时）
        const hours = parseInt(value, 10) || 0;
        const now = new Date();
        let currentExpired = user.vip_expired_at ? new Date(user.vip_expired_at) : now;
        if (currentExpired < now) currentExpired = now;
        const newExpired = new Date(currentExpired.getTime() + hours * 60 * 60 * 1000);
        updateData.vip_expired_at = newExpired.toISOString();
        break;
      }
      case 'set_vip_expired': {
        // 设置VIP过期时间
        updateData.vip_expired_at = value;
        break;
      }
      case 'add_free_count': {
        // 增加免费次数
        const count = parseInt(value, 10) || 0;
        updateData.free_count = (user.free_count || 0) + count;
        break;
      }
      case 'set_free_count': {
        // 设置免费次数
        updateData.free_count = parseInt(value, 10) || 0;
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }

    const { error: updateError } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: '操作成功',
      data: updateData
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json(
      { success: false, error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// DELETE 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    const { error } = await client
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '用户已删除' });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
}
