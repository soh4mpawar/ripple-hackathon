import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionClient, SESSION_COOKIE_NAME } from '@/lib/server/appwrite';

export async function POST() {
  try {
    const sessionClient = await createSessionClient();
    if (sessionClient) {
      try {
        await sessionClient.account.deleteSession({ sessionId: 'current' });
      } catch {
        // Continue even if session deletion on Appwrite fails
      }
    }

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
