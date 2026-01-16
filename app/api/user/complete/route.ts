import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, finalTime } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 업데이트할 데이터 객체 생성
    const updateData: { is_completed: boolean; last_time?: number } = {
      is_completed: true,
    };

    // finalTime이 제공된 경우에만 last_time 업데이트
    if (finalTime !== undefined && finalTime !== null) {
      updateData.last_time = parseFloat(finalTime);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update completion status', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isCompleted: data.is_completed,
      lastTime: data.last_time,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
