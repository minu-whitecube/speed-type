import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: '환경 변수가 설정되지 않았습니다',
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey,
          },
        },
        { status: 500 }
      );
    }

    // users 테이블 존재 확인 및 데이터 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      return NextResponse.json(
        {
          success: false,
          error: 'users 테이블 조회 실패',
          details: usersError.message,
          code: usersError.code,
          hint: usersError.hint,
        },
        { status: 500 }
      );
    }

    // referrals 테이블 존재 확인 및 데이터 조회
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .limit(5);

    if (referralsError) {
      return NextResponse.json(
        {
          success: false,
          error: 'referrals 테이블 조회 실패',
          details: referralsError.message,
          code: referralsError.code,
          hint: referralsError.hint,
        },
        { status: 500 }
      );
    }

    // 테이블 통계
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: referralsCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Supabase 연결 성공!',
      data: {
        users: {
          count: usersCount || 0,
          sample: users || [],
        },
        referrals: {
          count: referralsCount || 0,
          sample: referrals || [],
        },
      },
      config: {
        supabaseUrl: supabaseUrl.substring(0, 30) + '...',
        hasAnonKey: !!supabaseAnonKey,
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
