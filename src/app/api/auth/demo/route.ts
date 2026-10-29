import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';
import { SESSION_COOKIE_NAME } from '@/lib/server/appwrite';
import { seedSampleEvent } from '@/lib/server/sample-event';

export async function POST() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

    if (!projectId) {
      return NextResponse.json(
        { error: 'Appwrite Project ID is not configured in .env.local' },
        { status: 500 }
      );
    }

    // Create an isolated anonymous session on Appwrite
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId);

    const account = new Account(client);
    const session = await account.createAnonymousSession();

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Seed isolated sample event for this distinct user ID
    const sampleEventId = await seedSampleEvent(session.userId);

    return NextResponse.json({
      success: true,
      userId: session.userId,
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
