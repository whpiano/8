import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PUT 更新错题状态（标记为已掌握）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { mastered } = body;

    if (mastered === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：mastered' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('wrong_questions')
      .update({ mastered })
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

// DELETE 删除错题记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { error } = await client
      .from('wrong_questions')
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
