import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/appwrite';

export async function GET() {
  const user = await getAuthUser();
  return NextResponse.json({ user });
}
