import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET 获取公开的系统配置
export async function GET() {
  try {
    const client = getSupabaseClient();
    
    // 只获取公开配置
    const publicKeys = ['free_count', 'vip_price', 'vip_duration_hours', 'friend_links', 'questions_page_notice'];
    
    const { data, error } = await client
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', publicKeys);

    if (error) throw error;

    // 转换为对象格式
    const config: Record<string, string> = {};
    for (const item of data || []) {
      config[item.config_key] = item.config_value;
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    // 返回默认配置
    return NextResponse.json({
      success: true,
      data: {
        free_count: '10',
        vip_price: '10',
        vip_duration_hours: '24',
        friend_links: '[]',
        questions_page_notice: '题库管理功能仅限管理员使用。如需导入题目，请联系管理员。'
      }
    });
  }
}
