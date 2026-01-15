import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { referrerId, referredId } = await request.json();

    if (!referrerId || !referredId) {
      return NextResponse.json(
        { error: 'referrerId and referredId are required' },
        { status: 400 }
      );
    }

    // 자기 자신 초대 방지
    if (referrerId === referredId) {
      return NextResponse.json(
        { error: 'Cannot refer yourself' },
        { status: 400 }
      );
    }

    // 기존 매칭 관계 확인
    const { data: existingReferral, error: checkError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerId)
      .eq('referred_id', referredId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check referral', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingReferral) {
      return NextResponse.json(
        { error: 'Referral already exists' },
        { status: 400 }
      );
    }

    // 피초대자가 users 테이블에 없으면 생성
    const { data: referredUser, error: referredUserError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', referredId)
      .single();

    if (referredUserError && referredUserError.code === 'PGRST116') {
      // 유저가 없으면 생성
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          user_id: referredId,
          tickets: 1,
          is_completed: false,
        });

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create referred user', details: insertError.message },
          { status: 500 }
        );
      }
    } else if (referredUserError) {
      return NextResponse.json(
        { error: 'Failed to check referred user', details: referredUserError.message },
        { status: 500 }
      );
    }

    // referrals 테이블에 새로운 초대 관계 생성
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: referredId,
      });

    if (referralError) {
      return NextResponse.json(
        { error: 'Failed to create referral', details: referralError.message },
        { status: 500 }
      );
    }

    // 초대자에게 도전권 부여 (최대 1개까지)
    const { data: referrerUser, error: referrerFetchError } = await supabase
      .from('users')
      .select('tickets')
      .eq('user_id', referrerId)
      .single();

    if (referrerFetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch referrer', details: referrerFetchError.message },
        { status: 500 }
      );
    }

    let ticketsAwarded = false;
    if (referrerUser.tickets === 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ tickets: 1 })
        .eq('user_id', referrerId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to award tickets', details: updateError.message },
          { status: 500 }
        );
      }
      ticketsAwarded = true;
    }

    // 업데이트된 tickets 조회
    const { data: updatedReferrer, error: finalFetchError } = await supabase
      .from('users')
      .select('tickets')
      .eq('user_id', referrerId)
      .single();

    if (finalFetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch updated referrer', details: finalFetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Referral processed successfully',
      ticketsAwarded,
      referrerTickets: updatedReferrer.tickets,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
