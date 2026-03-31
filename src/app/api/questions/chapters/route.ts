import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET 获取章节列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const subject = searchParams.get('subject');

    let query = client
      .from('questions')
      .select('chapter, subject');

    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    // 统计各章节题目数
    const chapterMap: Record<string, { geography: number; biology: number }> = {};
    
    data?.forEach((q: { chapter: string; subject: string }) => {
      if (!chapterMap[q.chapter]) {
        chapterMap[q.chapter] = { geography: 0, biology: 0 };
      }
      chapterMap[q.chapter][q.subject as 'geography' | 'biology']++;
    });

    const chapters = Object.entries(chapterMap).map(([name, counts]) => ({
      name,
      geography: counts.geography,
      biology: counts.biology,
      total: counts.geography + counts.biology
    }));

    return NextResponse.json({
      success: true,
      data: chapters
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
