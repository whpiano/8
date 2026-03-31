import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasVipAccess } from '@/lib/auth';
import { cookies } from 'next/headers';

const GUEST_FREE_COUNT = 10; // 未登录用户免费答题次数

// GET 检查用户答题权限
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // 未登录用户
    if (!user) {
      // 从 Cookie 获取未登录用户的免费次数
      const cookieStore = await cookies();
      const guestFreeCountCookie = cookieStore.get('guest_free_count');
      
      let guestFreeCount = GUEST_FREE_COUNT;
      if (guestFreeCountCookie) {
        guestFreeCount = parseInt(guestFreeCountCookie.value, 10);
        if (isNaN(guestFreeCount) || guestFreeCount < 0) {
          guestFreeCount = 0;
        }
      }
      
      const canAnswer = guestFreeCount > 0;
      
      const response = NextResponse.json({
        success: true,
        data: {
          isLoggedIn: false,
          canAnswer,
          reason: canAnswer ? 'guest_free' : 'no_quota',
          freeCount: guestFreeCount,
          isVip: false,
          vipExpiredAt: null
        }
      });
      
      // 如果 Cookie 中没有记录，设置初始值
      if (!guestFreeCountCookie) {
        response.cookies.set('guest_free_count', String(GUEST_FREE_COUNT), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 天
          path: '/'
        });
      }
      
      return response;
    }

    // 已登录用户
    const isVip = await hasVipAccess(user);
    let canAnswer = false;
    let reason = 'no_quota';
    
    if (isVip) {
      canAnswer = true;
      reason = 'vip';
    } else if (user.free_count > 0) {
      canAnswer = true;
      reason = 'free';
    }

    return NextResponse.json({
      success: true,
      data: {
        isLoggedIn: true,
        canAnswer,
        reason,
        freeCount: user.free_count,
        isVip,
        vipExpiredAt: user.vip_expired_at
      }
    });
  } catch (error) {
    console.error('检查权限失败:', error);
    return NextResponse.json(
      { success: false, error: '检查权限失败' },
      { status: 500 }
    );
  }
}
