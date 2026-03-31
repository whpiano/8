import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST 开始模拟考试
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { subject, count = 30 } = body;

    if (!subject) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：subject' },
        { status: 400 }
      );
    }

    // 获取题目
    let query = client.from('questions').select('*');
    
    if (subject !== 'mixed') {
      query = query.eq('subject', subject);
    }

    const { data: allQuestions, error: qError } = await query;

    if (qError) throw new Error(`获取题目失败: ${qError.message}`);

    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: '题库中没有题目，请先导入题库' },
        { status: 400 }
      );
    }

    // 随机抽取题目
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(count, shuffled.length));

    // 创建考试会话
    const { data: session, error: sError } = await client
      .from('exam_sessions')
      .insert({
        subject,
        total_questions: selectedQuestions.length,
        correct_count: 0,
        score: 0
      })
      .select()
      .single();

    if (sError) throw new Error(`创建考试失败: ${sError.message}`);

    // 创建考试答题记录（未作答状态）
    const examAnswers = selectedQuestions.map((q: { id: number }) => ({
      exam_session_id: (session as { id: number }).id,
      question_id: q.id,
      user_answer: null,
      is_correct: null
    }));

    const { error: aError } = await client
      .from('exam_answers')
      .insert(examAnswers);

    if (aError) throw new Error(`创建答题记录失败: ${aError.message}`);

    // 返回考试信息（不包含正确答案）
    const questionsForExam = selectedQuestions.map((q: { 
      id: number; 
      subject: string; 
      chapter: string;
      question_type: string;
      content: string;
      options: string[] | null;
      difficulty: number;
      image_url: string | null;
    }) => ({
      id: q.id,
      subject: q.subject,
      chapter: q.chapter,
      question_type: q.question_type,
      content: q.content,
      options: q.options,
      difficulty: q.difficulty,
      image_url: q.image_url
    }));

    return NextResponse.json({
      success: true,
      data: {
        session_id: (session as { id: number }).id,
        subject,
        total_questions: selectedQuestions.length,
        started_at: (session as { started_at: string }).started_at,
        questions: questionsForExam
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
