import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import { dbAdapter, createClaim, MaterialRow } from '@/lib/server/tables-db';
import { z } from 'zod';
import { validateClaimIntegrity } from '@/lib/comparison';

const AddClaimSchema = z.object({
  field: z.enum(['event_date', 'start_time', 'venue', 'registration_deadline']),
  rawValue: z.string().min(1, 'Value is required'),
  evidenceQuote: z.string().min(1, 'Evidence quote is required'),
  evidenceLocation: z.string().optional().nullable(),
  reviewState: z
    .enum(['proposed', 'confirmed', 'rejected', 'needs_clarification'])
    .default('confirmed'),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: materialId } = await params;
    const body = await req.json();

    const validated = AddClaimSchema.parse(body);

    const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
    if (!material || material.ownerId !== user.id) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const validation = validateClaimIntegrity({
      field: validated.field,
      rawValue: validated.rawValue,
      evidenceQuote: validated.evidenceQuote,
      sourceText: material.sourceText,
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const claim = await createClaim(
      user.id,
      material.eventId,
      materialId,
      material.version,
      {
        field: validated.field,
        rawValue: validated.rawValue,
        evidenceQuote: validated.evidenceQuote,
        evidenceLocation: validated.evidenceLocation,
        reviewState: validated.reviewState,
      }
    );

    return NextResponse.json({ success: true, claim }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add claim' },
      { status: error.message?.includes('Unauthorized') ? 401 : 400 }
    );
  }
}
