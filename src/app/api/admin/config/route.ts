import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 验证管理员权限
async function checkAdmin(request: NextRequest): Promise<boolean> {
  const adminToken = request.cookies.get('admin_token')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return adminToken === adminPassword;
}

// GET 获取系统配置
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('system_config')
      .select('*')
      .order('id');

    if (error) throw error;

    // 转换为对象格式
    const config: Record<string, { value: string; description: string }> = {};
    for (const item of data || []) {
      config[item.config_key] = {
        value: item.config_value,
        description: item.description || ''
      };
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// PUT 更新系统配置
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const client = getSupabaseClient();
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    const { error } = await client
      .from('system_config')
      .update({ 
        config_value: String(value),
        updated_at: new Date().toISOString()
      })
      .eq('config_key', key);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '配置已更新' });
  } catch (error) {
    console.error('更新配置失败:', error);
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
      { status: 500 }
    );
  }
}
