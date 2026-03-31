import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET 获取考试详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    // 获取考试会话
    const { data: session, error: sError } = await client
      .from('exam_sessions')
      .select('*')
      .eq('id', parseInt(id))
      .maybeSingle();

    if (sError) throw new Error(`查询考试失败: ${sError.message}`);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '考试不存在' },
        { status: 404 }
      );
    }

    // 获取考试答题详情
    const { data: answers, error: aError } = await client
      .from('exam_answers')
      .select('*, questions(*)')
      .eq('exam_session_id', parseInt(id));

    if (aError) throw new Error(`获取答题详情失败: ${aError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        session,
        answers
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
