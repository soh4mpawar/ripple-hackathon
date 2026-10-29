import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';
import { SESSION_COOKIE_NAME } from '@/lib/server/appwrite';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = LoginSchema.parse(body);

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

    const client = new Client().setEndpoint(endpoint).setProject(projectId);
    const account = new Account(client);

    const session = await account.createEmailPasswordSession({ email, password });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      userId: session.userId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Invalid credentials' },
      { status: 400 }
    );
  }
}
