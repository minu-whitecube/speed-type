import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 게임 플로우 테스트 API
 * 실제 게임에서 데이터가 제대로 저장되는지 확인
 */
export async function GET() {
  try {
    // 1. 최근 생성된 유저 확인
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      return NextResponse.json(
        {
          success: false,
          error: '유저 조회 실패',
          details: usersError.message,
        },
        { status: 500 }
      );
    }

    // 2. 최근 추천인 관계 확인
    const { data: recentReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (referralsError) {
      return NextResponse.json(
        {
          success: false,
          error: '추천인 관계 조회 실패',
          details: referralsError.message,
        },
        { status: 500 }
      );
    }

    // 3. 통계 정보
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalReferrals } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });

    const { count: completedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', true);

    const { count: usersWithTickets } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('tickets', 0);

    return NextResponse.json({
      success: true,
      message: '게임 플로우 데이터 확인',
      statistics: {
        totalUsers: totalUsers || 0,
        totalReferrals: totalReferrals || 0,
        completedUsers: completedUsers || 0,
        usersWithTickets: usersWithTickets || 0,
      },
      recentData: {
        users: recentUsers || [],
        referrals: recentReferrals || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
