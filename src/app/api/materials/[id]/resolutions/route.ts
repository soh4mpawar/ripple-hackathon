import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import { dbAdapter, recordResolution, MaterialRow } from '@/lib/server/tables-db';
import { z } from 'zod';

const RecordResolutionSchema = z.object({
  action: z.string().min(1, 'Action description is required'),
  note: z.string().optional(),
  eventRevision: z.number().int().positive(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: materialId } = await params;
    const body = await req.json();

    const validated = RecordResolutionSchema.parse(body);

    const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
    if (!material || material.ownerId !== user.id) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const resolution = await recordResolution(
      user.id,
      material.eventId,
      materialId,
      material.version,
      validated.eventRevision,
      validated.action,
      validated.note
    );

    return NextResponse.json({ success: true, resolution }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to record resolution' },
      { status: error.message?.includes('Unauthorized') ? 401 : 400 }
    );
  }
}
