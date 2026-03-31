import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET 获取错题列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const mastered = searchParams.get('mastered');
    const subject = searchParams.get('subject');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    let query = client
      .from('wrong_questions')
      .select('*, questions(*)', { count: 'exact' });

    if (mastered !== null) {
      query = query.eq('mastered', mastered === 'true');
    }

    const offset = (page - 1) * pageSize;
    const { data, error, count } = await query
      .order('last_wrong_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`查询失败: ${error.message}`);

    // 如果需要按科目过滤，在应用层过滤
    let filteredData = data;
    if (subject) {
      filteredData = data?.filter((item: { questions: { subject: string } | null }) => 
        item.questions?.subject === subject
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
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
