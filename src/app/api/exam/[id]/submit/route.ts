import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST 提交考试答案
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { answers } = body; // { question_id: user_answer }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { success: false, error: '缺少答案数据' },
        { status: 400 }
      );
    }

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

    // 获取考试中的所有题目
    const { data: examAnswers, error: eError } = await client
      .from('exam_answers')
      .select('*, questions(*)')
      .eq('exam_session_id', parseInt(id));

    if (eError) throw new Error(`获取考试题目失败: ${eError.message}`);

    // 计算得分
    let correctCount = 0;
    const results: Array<{
      question_id: number;
      user_answer: string | null;
      correct_answer: string;
      is_correct: boolean;
    }> = [];

    for (const ea of examAnswers || []) {
      const question = ea.questions as { id: number; answer: string } | null;
      if (!question) continue;

      const userAnswer = answers[question.id] || null;
      const isCorrect = userAnswer?.trim() === question.answer.trim();
      
      if (isCorrect) correctCount++;

      results.push({
        question_id: question.id,
        user_answer: userAnswer,
        correct_answer: question.answer,
        is_correct: isCorrect
      });

      // 更新考试答题记录
      await client
        .from('exam_answers')
        .update({
          user_answer: userAnswer,
          is_correct: isCorrect,
          answered_at: new Date().toISOString()
        })
        .eq('id', (ea as { id: number }).id);

      // 更新错题本
      if (!isCorrect && userAnswer) {
        const { data: existingWrong } = await client
          .from('wrong_questions')
          .select('*')
          .eq('question_id', question.id)
          .maybeSingle();

        if (existingWrong) {
          await client
            .from('wrong_questions')
            .update({
              wrong_count: (existingWrong as { wrong_count: number }).wrong_count + 1,
              last_wrong_at: new Date().toISOString(),
              mastered: false
            })
            .eq('question_id', question.id);
        } else {
          await client
            .from('wrong_questions')
            .insert({
              question_id: question.id,
              wrong_count: 1
            });
        }
      }
    }

    // 计算分数（百分制）
    const totalQuestions = (session as { total_questions: number }).total_questions;
    const score = Math.round((correctCount / totalQuestions) * 100);

    // 更新考试会话
    const { error: updateError } = await client
      .from('exam_sessions')
      .update({
        correct_count: correctCount,
        score,
        finished_at: new Date().toISOString(),
        duration: Math.round(
          (new Date().getTime() - new Date((session as { started_at: string }).started_at).getTime()) / 1000
        )
      })
      .eq('id', parseInt(id));

    if (updateError) throw new Error(`更新考试失败: ${updateError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        session_id: parseInt(id),
        total_questions: totalQuestions,
        correct_count: correctCount,
        score,
        results
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
