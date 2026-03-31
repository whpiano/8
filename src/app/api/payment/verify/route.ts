import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

const PAYMENT_API_HOST = 'https://pay.0728.im';
const VIP_PRICE = 10.00; // VIP 价格 10 元
const VIP_DURATION_HOURS = 24; // VIP 有效期 24 小时

// POST 验证支付凭证并开通 VIP
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    
    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: '请输入支付凭证码' },
        { status: 400 }
      );
    }

    // 检查凭证码是否已被使用
    const { data: usedCode } = await client
      .from('used_payment_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (usedCode) {
      return NextResponse.json(
        { success: false, error: '该凭证码已被使用' },
        { status: 400 }
      );
    }

    // 调用支付网关验证凭证
    const verifyResponse = await fetch(`${PAYMENT_API_HOST}/api/query_reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errorData.error || '凭证码无效' },
        { status: 400 }
      );
    }

    const paymentData = await verifyResponse.json();

    // 检查支付金额是否足够
    if (paymentData.amount < VIP_PRICE) {
      return NextResponse.json(
        { success: false, error: `支付金额不足，需要 ${VIP_PRICE} 元` },
        { status: 400 }
      );
    }

    // 计算新的 VIP 过期时间
    const now = new Date();
    let newVipExpiredAt = new Date(now.getTime() + VIP_DURATION_HOURS * 60 * 60 * 1000);
    
    // 如果用户已有 VIP 且未过期，在此基础上延长
    if (user.vip_expired_at) {
      const currentExpired = new Date(user.vip_expired_at);
      if (currentExpired > now) {
        newVipExpiredAt = new Date(currentExpired.getTime() + VIP_DURATION_HOURS * 60 * 60 * 1000);
      }
    }

    // 更新用户 VIP 过期时间
    const { error: updateError } = await client
      .from('users')
      .update({ vip_expired_at: newVipExpiredAt.toISOString() })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`更新 VIP 失败: ${updateError.message}`);
    }

    // 记录已使用的凭证码
    await client
      .from('used_payment_codes')
      .insert({
        code,
        user_id: user.id,
        amount: paymentData.amount
      });

    return NextResponse.json({
      success: true,
      message: `VIP 开通成功，有效期至 ${newVipExpiredAt.toLocaleString('zh-CN')}`,
      data: {
        vip_expired_at: newVipExpiredAt.toISOString(),
        amount: paymentData.amount
      }
    });
  } catch (error) {
    console.error('支付验证失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '支付验证失败' },
      { status: 500 }
    );
  }
}
