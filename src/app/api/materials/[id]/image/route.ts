import { NextResponse } from 'next/server';
import { requireAuthUser, createAdminClient, STORAGE_BUCKET_ID } from '@/lib/server/appwrite';
import { dbAdapter } from '@/lib/server/tables-db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: materialId } = await params;

    const material = await dbAdapter.getRow('materials', materialId);
    if (!material || material.ownerId !== user.id || !material.storageFileId) {
      return new NextResponse('Not found or unauthorized', { status: 404 });
    }

    const admin = createAdminClient();
    const buffer = await admin.storage.getFileDownload(
      STORAGE_BUCKET_ID,
      material.storageFileId
    );

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    return new NextResponse('Image not found', { status: 404 });
  }
}
