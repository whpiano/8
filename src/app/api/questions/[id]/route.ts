import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 验证管理员权限
async function checkAdminAuth(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;
    
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return decoded.startsWith('admin:');
  } catch {
    return false;
  }
}

// GET 获取单个题目
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('id', parseInt(id))
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);

    if (!data) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// PUT 更新题目
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    if (!await checkAdminAuth()) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限，请先登录' },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await client
      .from('questions')
      .update(body)
      .eq('id', parseInt(id))
      .select();

    if (error) throw new Error(`更新失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// DELETE 删除题目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    if (!await checkAdminAuth()) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限，请先登录' },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();
    const { id } = await params;

    const { error } = await client
      .from('questions')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
