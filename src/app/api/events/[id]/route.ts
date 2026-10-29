import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import { Query } from 'node-appwrite';
import {
  getEventById,
  getEventFacts,
  listEventMaterials,
  listClaims,
  listEventChanges,
  listResolutions,
  dbAdapter,
} from '@/lib/server/tables-db';
import { compareMaterialClaims, OfficialFact, Claim } from '@/lib/comparison';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: eventId } = await params;

    const event = await getEventById(eventId, user.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const [factsRows, materialsRows, claimsRows, changesRows, resolutionsRows, versionsRows] =
      await Promise.all([
        getEventFacts(eventId, user.id),
        listEventMaterials(eventId, user.id),
        listClaims(eventId, user.id),
        listEventChanges(eventId, user.id),
        listResolutions(eventId, user.id),
        dbAdapter.listRows<any>('material_versions', [
          Query.equal('ownerId', user.id),
          Query.equal('eventId', eventId),
        ]).catch(() => []),
      ]);

    // Format facts for comparison engine
    const facts: OfficialFact[] = factsRows.map((f) => ({
      id: f.$id,
      field: f.field,
      displayValue: f.displayValue,
      normalizedValue: f.normalizedValue,
      revision: f.revision,
    }));

    // Format claims
    const claims: Claim[] = claimsRows.map((c) => ({
      id: c.$id,
      materialId: c.materialId,
      materialVersion: c.materialVersion,
      factId: c.factId,
      field: c.field,
      rawValue: c.rawValue,
      normalizedValue: c.normalizedValue,
      evidenceQuote: c.evidenceQuote,
      evidenceLocation: c.evidenceLocation,
      reviewState: c.reviewState,
      ambiguityReason: c.ambiguityReason,
    }));

    // Compute summaries per material
    const summariesRecord: Record<string, ReturnType<typeof compareMaterialClaims>> = {};
    let currentCount = 0;
    let conflictCount = 0;
    let reviewCount = 0;
    let unverifiedCount = 0;

    for (const mat of materialsRows) {
      const summary = compareMaterialClaims(
        mat.$id,
        mat.version,
        claims,
        facts,
        event.currentRevision,
        mat.sourceText
      );
      summariesRecord[mat.$id] = summary;

      if (summary.status === 'conflicting') conflictCount++;
      else if (summary.status === 'current') currentCount++;
      else if (summary.status === 'needs_review') reviewCount++;
      else unverifiedCount++;
    }

    return NextResponse.json({
      event,
      facts: factsRows,
      materials: materialsRows,
      claims: claimsRows,
      changes: changesRows,
      resolutions: resolutionsRows,
      versions: versionsRows,
      summaries: summariesRecord,
      stats: {
        totalMaterials: materialsRows.length,
        currentCount,
        conflictCount,
        reviewCount,
        unverifiedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized or server error' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
