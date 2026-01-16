import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 유저 존재 확인
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch user', details: fetchError.message },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json({
        userId: existingUser.user_id,
        tickets: existingUser.tickets,
        isCompleted: existingUser.is_completed,
        isNew: false,
      });
    }

    // 새 유저 생성
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        tickets: 3,
        is_completed: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create user', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId: newUser.user_id,
      tickets: newUser.tickets,
      isCompleted: newUser.is_completed,
      isNew: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
