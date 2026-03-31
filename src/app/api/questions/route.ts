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

// GET 获取题目列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    
    const subject = searchParams.get('subject');
    const chapter = searchParams.get('chapter');
    const questionType = searchParams.get('question_type');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    let query = client
      .from('questions')
      .select('*', { count: 'exact' });

    if (subject) {
      query = query.eq('subject', subject);
    }
    if (chapter) {
      query = query.eq('chapter', chapter);
    }
    if (questionType) {
      query = query.eq('question_type', questionType);
    }

    const offset = (page - 1) * pageSize;
    const { data, error, count } = await query
      .order('id')
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      data: data,
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

// POST 批量导入题目
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!await checkAdminAuth()) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限，请先登录' },
        { status: 401 }
      );
    }
    
    const client = getSupabaseClient();
    
    // 安全解析请求体
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON 解析错误:', parseError);
      return NextResponse.json(
        { success: false, error: '请求体 JSON 格式错误，请检查数据格式' },
        { status: 400 }
      );
    }
    
    // 支持单个题目或批量导入
    const questions = Array.isArray(body) ? body : [body];
    
    // 验证必填字段
    for (const q of questions) {
      if (!q.subject || !q.chapter || !q.question_type || !q.content || !q.answer) {
        return NextResponse.json(
          { success: false, error: '缺少必填字段：subject, chapter, question_type, content, answer' },
          { status: 400 }
        );
      }
      // 验证科目
      if (!['geography', 'biology'].includes(q.subject)) {
        return NextResponse.json(
          { success: false, error: '科目必须是 geography 或 biology' },
          { status: 400 }
        );
      }
      // 验证题型
      if (!['single', 'multiple', 'judge'].includes(q.question_type)) {
        return NextResponse.json(
          { success: false, error: '题型必须是 single, multiple 或 judge' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await client
      .from('questions')
      .insert(questions)
      .select();

    if (error) throw new Error(`导入失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      data: data,
      message: `成功导入 ${data?.length || 0} 道题目`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
