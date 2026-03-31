import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET 获取题目统计信息
export async function GET() {
  try {
    const client = getSupabaseClient();

    // 获取总题数和各科目题数
    const { count: totalCount, error: totalError } = await client
      .from('questions')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw new Error(`统计失败: ${totalError.message}`);

    // 获取地理题数
    const { count: geographyCount, error: geoError } = await client
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject', 'geography');

    if (geoError) throw new Error(`统计失败: ${geoError.message}`);

    // 获取生物题数
    const { count: biologyCount, error: bioError } = await client
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject', 'biology');

    if (bioError) throw new Error(`统计失败: ${bioError.message}`);

    // 获取各题型统计
    const { data: typeStats, error: typeError } = await client
      .from('questions')
      .select('question_type');

    if (typeError) throw new Error(`统计失败: ${typeError.message}`);

    const questionTypeCount = {
      single: 0,
      multiple: 0,
      judge: 0
    };

    typeStats?.forEach((q: { question_type: string }) => {
      if (q.question_type === 'single') questionTypeCount.single++;
      else if (q.question_type === 'multiple') questionTypeCount.multiple++;
      else if (q.question_type === 'judge') questionTypeCount.judge++;
    });

    // 获取章节统计
    const { data: chapters, error: chapterError } = await client
      .from('questions')
      .select('subject, chapter');

    if (chapterError) throw new Error(`统计失败: ${chapterError.message}`);

    const chapterStats: Record<string, Record<string, number>> = {
      geography: {},
      biology: {}
    };

    chapters?.forEach((q: { subject: string; chapter: string }) => {
      if (!chapterStats[q.subject]) {
        chapterStats[q.subject] = {};
      }
      if (!chapterStats[q.subject][q.chapter]) {
        chapterStats[q.subject][q.chapter] = 0;
      }
      chapterStats[q.subject][q.chapter]++;
    });

    // 获取错题数
    const { count: wrongCount, error: wrongError } = await client
      .from('wrong_questions')
      .select('*', { count: 'exact', head: true })
      .eq('mastered', false);

    if (wrongError) throw new Error(`统计失败: ${wrongError.message}`);

    // 获取答题记录数
    const { count: answerCount, error: answerError } = await client
      .from('answer_records')
      .select('*', { count: 'exact', head: true });

    if (answerError) throw new Error(`统计失败: ${answerError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        total: totalCount || 0,
        subject: {
          geography: geographyCount || 0,
          biology: biologyCount || 0
        },
        question_type: questionTypeCount,
        chapters: chapterStats,
        wrong_questions: wrongCount || 0,
        answer_records: answerCount || 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
