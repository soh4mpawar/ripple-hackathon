import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import { Query } from 'node-appwrite';
import {
  updateClaim,
  deleteClaim,
  dbAdapter,
  updateMaterialStatus,
} from '@/lib/server/tables-db';
import { z } from 'zod';

const UpdateClaimSchema = z.object({
  reviewState: z
    .enum(['proposed', 'confirmed', 'rejected', 'needs_clarification'])
    .optional(),
  rawValue: z.string().optional(),
  normalizedValue: z.string().optional().nullable(),
  evidenceQuote: z.string().optional(),
  ambiguityReason: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: claimId } = await params;
    const body = await req.json();

    const validated = UpdateClaimSchema.parse(body);

    const updatedClaim = await updateClaim(user.id, claimId, validated);

    // Check if all claims for this material version are now reviewed
    const allClaims = await dbAdapter.listRows<any>('claims', [
      Query.equal('ownerId', user.id),
      Query.equal('materialId', updatedClaim.materialId),
      Query.equal('materialVersion', updatedClaim.materialVersion),
    ]);

    const hasPending = allClaims.some(
      (c) => c.reviewState === 'proposed' || c.reviewState === 'needs_clarification'
    );

    if (!hasPending) {
      await updateMaterialStatus(user.id, updatedClaim.materialId, undefined, 'reviewed');
    }

    return NextResponse.json({ success: true, claim: updatedClaim });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update claim' },
      { status: error.message?.includes('Unauthorized') ? 401 : 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: claimId } = await params;

    await deleteClaim(user.id, claimId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete claim' },
      { status: error.message?.includes('Unauthorized') ? 401 : 400 }
    );
  }
}
