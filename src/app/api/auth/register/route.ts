import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account, ID } from 'node-appwrite';
import { SESSION_COOKIE_NAME } from '@/lib/server/appwrite';
import { z } from 'zod';

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = RegisterSchema.parse(body);

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

    const client = new Client().setEndpoint(endpoint).setProject(projectId);
    const account = new Account(client);

    await account.create({
      userId: ID.unique(),
      email,
      password,
      name,
    });

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
      { error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
