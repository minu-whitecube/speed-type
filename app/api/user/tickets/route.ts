import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .select('tickets')
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch tickets', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tickets: data?.tickets || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 현재 tickets 조회
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('tickets')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch user', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!user || user.tickets <= 0) {
      return NextResponse.json(
        { error: 'No tickets available' },
        { status: 400 }
      );
    }

    // tickets 차감
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ tickets: user.tickets - 1 })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update tickets', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tickets: updatedUser.tickets,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
