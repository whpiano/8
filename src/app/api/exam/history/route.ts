import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET 获取考试历史记录
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '10');

    const offset = (page - 1) * pageSize;
    const { data, error, count } = await client
      .from('exam_sessions')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        page_size: pageSize,
        total: count,
        total_pages: Math.ceil((count || 0) / pageSize)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
