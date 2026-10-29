import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ID } from 'node-appwrite';
import { createAdminClient, SESSION_COOKIE_NAME } from '@/lib/server/appwrite';
import { seedSampleEvent } from '@/lib/server/sample-event';

export async function POST() {
  try {
    const admin = createAdminClient();
    const userId = ID.unique();

    // Create an isolated demo user account using admin client
    await admin.users.create({
      userId,
      name: 'Demo Organizer',
    });

    // Create an immediately usable session for this demo user
    const session = await admin.users.createSession({ userId });

    // Set HTTP-only session cookie with the session secret
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Seed isolated sample event for this distinct user ID
    const sampleEventId = await seedSampleEvent(userId);

    return NextResponse.json({
      success: true,
      userId,
      eventId: sampleEventId,
    });
  } catch (error: any) {
    console.error('Demo initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize sample demo' },
      { status: 500 }
    );
  }
}
