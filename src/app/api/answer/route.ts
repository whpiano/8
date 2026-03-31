import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser, hasVipAccess } from '@/lib/auth';
import { cookies } from 'next/headers';

const GUEST_FREE_COUNT = 10; // 未登录用户免费答题次数

// POST 提交答题记录
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    
    // 获取当前用户
    const user = await getCurrentUser();
    
    // 未登录用户允许答题，但不记录用户 ID
    const userId = user?.id || null;
    
    // 准备响应对象
    let response: NextResponse;
    let remainingFreeCount: number | null = null;
    
    // 如果用户已登录，检查答题权限
    if (user) {
      const isVip = await hasVipAccess(user);
      
      if (!isVip && user.free_count <= 0) {
        return NextResponse.json({
          success: false,
          error: '答题次数已用完，请开通 VIP',
          needPayment: true,
          reason: 'no_quota'
        }, { status: 403 });
      }
      
      // 如果不是 VIP，扣除免费次数
      if (!isVip && user.free_count > 0) {
        const newFreeCount = user.free_count - 1;
        const { error: deductError } = await client
          .from('users')
          .update({ free_count: newFreeCount })
          .eq('id', user.id);
        
        if (deductError) {
          console.error('扣除免费次数失败:', deductError);
        } else {
          remainingFreeCount = newFreeCount;
        }
      }
    } else {
      // 未登录用户，检查 Cookie 中的免费次数
      const cookieStore = await cookies();
      const guestFreeCountCookie = cookieStore.get('guest_free_count');
      
      let guestFreeCount = GUEST_FREE_COUNT;
      if (guestFreeCountCookie) {
        guestFreeCount = parseInt(guestFreeCountCookie.value, 10);
        if (isNaN(guestFreeCount) || guestFreeCount < 0) {
          guestFreeCount = 0;
        }
      }
      
      if (guestFreeCount <= 0) {
        return NextResponse.json({
          success: false,
          error: '免费答题次数已用完，请登录获取更多次数',
          needLogin: true,
          reason: 'guest_no_quota'
        }, { status: 403 });
      }
      
      // 扣除未登录用户的免费次数
      remainingFreeCount = guestFreeCount - 1;
    }

    const body = await request.json();
    const { question_id, user_answer } = body;

    if (!question_id || user_answer === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：question_id, user_answer' },
        { status: 400 }
      );
    }

    // 获取正确答案
    const { data: question, error: qError } = await client
      .from('questions')
      .select('answer')
      .eq('id', question_id)
      .maybeSingle();

    if (qError) throw new Error(`查询题目失败: ${qError.message}`);
    if (!question) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      );
    }

    // 判断答案是否正确
    const normalizeAnswer = (answer: string): string => {
      const trimmed = answer.trim();
      if (trimmed.includes(',')) {
        return trimmed.split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
      }
      return trimmed.split('').filter(c => /[A-Z]/i.test(c)).sort().join(',');
    };
    
    const normalizedUserAnswer = normalizeAnswer(user_answer);
    const normalizedCorrectAnswer = normalizeAnswer(question.answer);
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    // 记录答题（包含用户 ID）
    const { error: insertError } = await client
      .from('answer_records')
      .insert({
        question_id,
        user_answer,
        is_correct: isCorrect,
        user_id: userId
      });

    if (insertError) throw new Error(`记录答题失败: ${insertError.message}`);

    // 如果答错，添加或更新错题本
    if (!isCorrect) {
      let query = client
        .from('wrong_questions')
        .select('*')
        .eq('question_id', question_id);
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }
      
      const { data: existingWrong, error: checkError } = await query.maybeSingle();

      if (checkError) throw new Error(`检查错题失败: ${checkError.message}`);

      if (existingWrong) {
        const updateData: Record<string, unknown> = {
          wrong_count: (existingWrong as { wrong_count: number }).wrong_count + 1,
          last_wrong_at: new Date().toISOString(),
          mastered: false
        };
        
        let updateQuery = client
          .from('wrong_questions')
          .update(updateData)
          .eq('question_id', question_id);
        
        if (userId) {
          updateQuery = updateQuery.eq('user_id', userId);
        } else {
          updateQuery = updateQuery.is('user_id', null);
        }
        
        const { error: updateError } = await updateQuery;
        if (updateError) throw new Error(`更新错题失败: ${updateError.message}`);
      } else {
        const { error: addError } = await client
          .from('wrong_questions')
          .insert({
            question_id,
            wrong_count: 1,
            user_id: userId
          });

        if (addError) throw new Error(`添加错题失败: ${addError.message}`);
      }
    } else {
      let query = client
        .from('wrong_questions')
        .select('id')
        .eq('question_id', question_id)
        .eq('mastered', false);
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }
      
      const { data: existingWrong, error: checkError } = await query.maybeSingle();

      if (checkError) throw new Error(`检查错题失败: ${checkError.message}`);

      if (existingWrong) {
        await client
          .from('wrong_questions')
          .update({ mastered: true })
          .eq('id', (existingWrong as { id: number }).id);
      }
    }

    // 构建响应
    const responseData: Record<string, unknown> = {
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: question.answer
      }
    };
    
    // 返回剩余次数
    if (remainingFreeCount !== null) {
      responseData.freeCount = remainingFreeCount;
    }
    
    response = NextResponse.json(responseData);
    
    // 如果是未登录用户，更新 Cookie 中的免费次数
    if (!user && remainingFreeCount !== null) {
      response.cookies.set('guest_free_count', String(remainingFreeCount), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      });
    }

    return response;
  } catch (error) {
    console.error('答题失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// GET 获取答题记录
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    
    const user = await getCurrentUser();
    const userId = user?.id || null;
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    const offset = (page - 1) * pageSize;
    
    let query = client
      .from('answer_records')
      .select('*, questions(*)', { count: 'exact' })
      .order('answered_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }
    
    const { data, error, count } = await query;

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
