import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import { seedSampleEvent } from '@/lib/server/sample-event';

export async function POST() {
  try {
    const user = await requireAuthUser();
    const eventId = await seedSampleEvent(user.id);
    return NextResponse.json({ success: true, eventId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to seed sample event' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
