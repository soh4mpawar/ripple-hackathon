import { ID, Query, Permission, Role } from 'node-appwrite';
import { createAdminClient, DATABASE_ID } from './appwrite';
import { normalizeFieldValue } from '../comparison';
import type {
  OfficialField,
  OfficialFact,
  Claim,
  ClaimReviewState,
} from '../comparison';

export interface EventRow {
  $id: string;
  ownerId: string;
  name: string;
  timezone: string;
  currentRevision: number;
  createdAt: string;
  updatedAt: string;
}

export interface FactRow {
  $id: string;
  ownerId: string;
  eventId: string;
  field: OfficialField;
  displayValue: string;
  normalizedValue: string;
  revision: number;
}

export interface MaterialRow {
  $id: string;
  ownerId: string;
  eventId: string;
  title: string;
  kind: 'text' | 'image';
  sourceText?: string | null;
  storageFileId?: string | null;
  version: number;
  extractionStatus: 'pending' | 'ready' | 'failed';
  reviewStatus: 'unreviewed' | 'reviewed';
  createdAt: string;
  updatedAt: string;
}

export interface MaterialVersionRow {
  $id: string;
  ownerId: string;
  eventId: string;
  materialId: string;
  version: number;
  sourceText?: string | null;
  storageFileId?: string | null;
  createdAt: string;
}

export interface ClaimRow {
  $id: string;
  ownerId: string;
  eventId: string;
  materialId: string;
  materialVersion: number;
  factId?: string | null;
  field: OfficialField;
  rawValue: string;
  normalizedValue?: string | null;
  evidenceQuote: string;
  evidenceLocation?: string | null;
  reviewState: ClaimReviewState;
  ambiguityReason?: string | null;
}

export interface ChangeRow {
  $id: string;
  ownerId: string;
  eventId: string;
  revision: number;
  field: OfficialField;
  oldDisplayValue: string;
  newDisplayValue: string;
  oldNormalizedValue: string;
  newNormalizedValue: string;
  createdAt: string;
}

export interface ResolutionRow {
  $id: string;
  ownerId: string;
  eventId: string;
  materialId: string;
  materialVersion: number;
  eventRevision: number;
  action: string;
  note?: string | null;
  createdAt: string;
}

/**
 * Standard user permissions for created rows.
 */
function getRowPermissions(ownerId: string) {
  return [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];
}

/**
 * TablesDB Service Adapter: calls Appwrite TablesDB directly without silent fallbacks.
 * Surfaces authentic SDK, permission, and schema errors.
 */
class TablesDBAdapter {
  private admin = createAdminClient();

  async listRows<T = any>(tableId: string, queries: string[] = []): Promise<T[]> {
    const res = await this.admin.tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries,
    });
    return (res.rows || []) as unknown as T[];
  }

  async getRow<T = any>(tableId: string, rowId: string): Promise<T> {
    const res = await this.admin.tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId,
      rowId,
    });
    return res as unknown as T;
  }

  async createRow<T = any>(
    tableId: string,
    rowId: string,
    data: Record<string, any>,
    permissions?: string[],
    transactionId?: string | null
  ): Promise<T> {
    const res = await this.admin.tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId,
      rowId,
      data,
      permissions,
      transactionId: transactionId || undefined,
    });
    return res as unknown as T;
  }

  async updateRow<T = any>(
    tableId: string,
    rowId: string,
    data: Record<string, any>,
    permissions?: string[],
    transactionId?: string | null
  ): Promise<T> {
    const res = await this.admin.tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId,
      rowId,
      data,
      permissions,
      transactionId: transactionId || undefined,
    });
    return res as unknown as T;
  }

  async deleteRow(
    tableId: string,
    rowId: string,
    transactionId?: string | null
  ): Promise<void> {
    await this.admin.tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId,
      rowId,
      transactionId: transactionId || undefined,
    });
  }

  /**
   * Starts a transaction, returning the unique transaction ID.
   */
  async startTransaction(): Promise<string> {
    const tx = await this.admin.tablesDB.createTransaction({ ttl: 60 });
    return tx.$id;
  }

  /**
   * Finalizes a transaction by committing or rolling back.
   */
  async endTransaction(transactionId: string, commit: boolean): Promise<void> {
    await this.admin.tablesDB.updateTransaction({
      transactionId,
      commit,
      rollback: !commit,
    });
  }
}

export const dbAdapter = new TablesDBAdapter();

// ----------------------------------------------------
// Service Functions with Strict Ownership Verification
// ----------------------------------------------------

export async function listUserEvents(ownerId: string): Promise<EventRow[]> {
  return await dbAdapter.listRows<EventRow>('events', [
    Query.equal('ownerId', ownerId),
    Query.orderDesc('createdAt'),
  ]);
}

export async function getEventById(
  eventId: string,
  ownerId: string
): Promise<EventRow | null> {
  try {
    const event = await dbAdapter.getRow<EventRow>('events', eventId);
    if (!event || event.ownerId !== ownerId) {
      return null;
    }
    return event;
  } catch {
    return null;
  }
}

export async function createEventWithFacts(
  ownerId: string,
  name: string,
  timezone: string,
  factsData: Record<OfficialField, string>
): Promise<{ event: EventRow; facts: FactRow[] }> {
  const eventId = ID.unique();
  const now = new Date().toISOString();
  const permissions = getRowPermissions(ownerId);

  const event = await dbAdapter.createRow<EventRow>(
    'events',
    eventId,
    {
      ownerId,
      name,
      timezone,
      currentRevision: 1,
      createdAt: now,
      updatedAt: now,
    },
    permissions
  );

  const createdFacts: FactRow[] = [];
  const fields: OfficialField[] = [
    'event_date',
    'start_time',
    'venue',
    'registration_deadline',
  ];

  for (const field of fields) {
    const displayValue = factsData[field] || '';
    const normalizedValue = normalizeFieldValue(field, displayValue);
    const factId = ID.unique();

    const fact = await dbAdapter.createRow<FactRow>(
      'facts',
      factId,
      {
        ownerId,
        eventId,
        field,
        displayValue,
        normalizedValue,
        revision: 1,
      },
      permissions
    );
    createdFacts.push(fact);
  }

  return { event, facts: createdFacts };
}

export async function getEventFacts(
  eventId: string,
  ownerId: string
): Promise<FactRow[]> {
  // Verify ownership
  const event = await getEventById(eventId, ownerId);
  if (!event) throw new Error('Event not found or unauthorized');

  return await dbAdapter.listRows<FactRow>('facts', [
    Query.equal('ownerId', ownerId),
    Query.equal('eventId', eventId),
  ]);
}

/**
 * Atomically updates official event details using TablesDB transactions.
 * Enforces optimistic concurrency via expectedRevision.
 */
export async function updateOfficialDetails(
  ownerId: string,
  eventId: string,
  expectedRevision: number,
  updatedFields: Partial<Record<OfficialField, string>>
): Promise<{ event: EventRow; changes: ChangeRow[]; newRevision: number }> {
  const event = await getEventById(eventId, ownerId);
  if (!event) {
    throw new Error('Event not found or unauthorized');
  }

  // Prevent stale edits from silently overwriting newer revisions
  if (event.currentRevision !== expectedRevision) {
    throw new Error(
      `Revision conflict: Current event revision is ${event.currentRevision}, but expected ${expectedRevision}. Please refresh.`
    );
  }

  const existingFacts = await getEventFacts(eventId, ownerId);
  const factMap = new Map<OfficialField, FactRow>();
  for (const f of existingFacts) {
    factMap.set(f.field, f);
  }

  const newRevision = expectedRevision + 1;
  const now = new Date().toISOString();
  const permissions = getRowPermissions(ownerId);

  // Start atomic transaction
  const txId = await dbAdapter.startTransaction();

  try {
    // 1. Update event row with newRevision
    const updatedEvent = await dbAdapter.updateRow<EventRow>(
      'events',
      eventId,
      {
        currentRevision: newRevision,
        updatedAt: now,
      },
      permissions,
      txId
    );

    const changesRecorded: ChangeRow[] = [];

    // 2. Process each changed field
    for (const [fieldKey, newDisplay] of Object.entries(updatedFields)) {
      if (!newDisplay) continue;
      const field = fieldKey as OfficialField;
      const existingFact = factMap.get(field);

      const oldDisplay = existingFact ? existingFact.displayValue : '';
      const oldNorm = existingFact ? existingFact.normalizedValue : '';
      const newNorm = normalizeFieldValue(field, newDisplay);

      // Only record change and update if value actually changed
      if (oldDisplay !== newDisplay || oldNorm !== newNorm) {
        if (existingFact) {
          await dbAdapter.updateRow<FactRow>(
            'facts',
            existingFact.$id,
            {
              displayValue: newDisplay,
              normalizedValue: newNorm,
              revision: newRevision,
            },
            permissions,
            txId
          );
        } else {
          await dbAdapter.createRow<FactRow>(
            'facts',
            ID.unique(),
            {
              ownerId,
              eventId,
              field,
              displayValue: newDisplay,
              normalizedValue: newNorm,
              revision: newRevision,
            },
            permissions,
            txId
          );
        }

        // Record in changes audit table
        const changeId = ID.unique();
        const changeRow = await dbAdapter.createRow<ChangeRow>(
          'changes',
          changeId,
          {
            ownerId,
            eventId,
            revision: newRevision,
            field,
            oldDisplayValue: oldDisplay,
            newDisplayValue: newDisplay,
            oldNormalizedValue: oldNorm,
            newNormalizedValue: newNorm,
            createdAt: now,
          },
          permissions,
          txId
        );
        changesRecorded.push(changeRow);
      }
    }

    // Commit transaction
    if (txId) {
      await dbAdapter.endTransaction(txId, true);
    }

    return {
      event: updatedEvent,
      changes: changesRecorded,
      newRevision,
    };
  } catch (error) {
    if (txId) {
      await dbAdapter.endTransaction(txId, false);
    }
    throw error;
  }
}

export async function listEventMaterials(
  eventId: string,
  ownerId: string
): Promise<MaterialRow[]> {
  const event = await getEventById(eventId, ownerId);
  if (!event) throw new Error('Event not found or unauthorized');

  return await dbAdapter.listRows<MaterialRow>('materials', [
    Query.equal('ownerId', ownerId),
    Query.equal('eventId', eventId),
    Query.orderDesc('createdAt'),
  ]);
}

export async function createMaterial(
  ownerId: string,
  eventId: string,
  title: string,
  kind: 'text' | 'image',
  sourceText?: string | null,
  storageFileId?: string | null
): Promise<MaterialRow> {
  const event = await getEventById(eventId, ownerId);
  if (!event) throw new Error('Event not found or unauthorized');

  const now = new Date().toISOString();
  const materialId = ID.unique();
  const permissions = getRowPermissions(ownerId);

  const material = await dbAdapter.createRow<MaterialRow>(
    'materials',
    materialId,
    {
      ownerId,
      eventId,
      title,
      kind,
      sourceText: sourceText || null,
      storageFileId: storageFileId || null,
      version: 1,
      extractionStatus: 'pending',
      reviewStatus: 'unreviewed',
      createdAt: now,
      updatedAt: now,
    },
    permissions
  );

  // Snapshot initial version 1 in material_versions
  await dbAdapter.createRow<MaterialVersionRow>(
    'material_versions',
    ID.unique(),
    {
      ownerId,
      eventId,
      materialId,
      version: 1,
      sourceText: sourceText || null,
      storageFileId: storageFileId || null,
      createdAt: now,
    },
    permissions
  );

  return material;
}

export async function updateMaterialStatus(
  ownerId: string,
  materialId: string,
  extractionStatus?: 'pending' | 'ready' | 'failed',
  reviewStatus?: 'unreviewed' | 'reviewed'
): Promise<MaterialRow> {
  const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
  if (!material || material.ownerId !== ownerId) {
    throw new Error('Material not found or unauthorized');
  }

  const data: Partial<MaterialRow> = {
    updatedAt: new Date().toISOString(),
  };
  if (extractionStatus) data.extractionStatus = extractionStatus;
  if (reviewStatus) data.reviewStatus = reviewStatus;

  return await dbAdapter.updateRow<MaterialRow>(
    'materials',
    materialId,
    data,
    getRowPermissions(ownerId)
  );
}

export async function createNewMaterialVersion(
  ownerId: string,
  materialId: string,
  newSourceText?: string | null,
  newStorageFileId?: string | null
): Promise<MaterialRow> {
  const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
  if (!material || material.ownerId !== ownerId) {
    throw new Error('Material not found or unauthorized');
  }

  const nextVersion = material.version + 1;
  const now = new Date().toISOString();
  const permissions = getRowPermissions(ownerId);

  // 1. Snapshot the new version in material_versions so historical copy is never lost
  await dbAdapter.createRow<MaterialVersionRow>(
    'material_versions',
    ID.unique(),
    {
      ownerId,
      eventId: material.eventId,
      materialId,
      version: nextVersion,
      sourceText: newSourceText ?? material.sourceText,
      storageFileId: newStorageFileId ?? material.storageFileId,
      createdAt: now,
    },
    permissions
  );

  // 2. Update active version on material
  return await dbAdapter.updateRow<MaterialRow>(
    'materials',
    materialId,
    {
      version: nextVersion,
      sourceText: newSourceText ?? material.sourceText,
      storageFileId: newStorageFileId ?? material.storageFileId,
      extractionStatus: 'pending',
      reviewStatus: 'unreviewed',
      updatedAt: now,
    },
    permissions
  );
}

export async function listMaterialVersions(
  ownerId: string,
  materialId: string
): Promise<MaterialVersionRow[]> {
  const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
  if (!material || material.ownerId !== ownerId) {
    throw new Error('Material not found or unauthorized');
  }

  return await dbAdapter.listRows<MaterialVersionRow>('material_versions', [
    Query.equal('ownerId', ownerId),
    Query.equal('materialId', materialId),
    Query.orderAsc('version'),
  ]);
}

export async function listClaims(
  eventId: string,
  ownerId: string,
  materialId?: string
): Promise<ClaimRow[]> {
  const event = await getEventById(eventId, ownerId);
  if (!event) throw new Error('Event not found or unauthorized');

  const queries = [
    Query.equal('ownerId', ownerId),
    Query.equal('eventId', eventId),
  ];
  if (materialId) {
    queries.push(Query.equal('materialId', materialId));
  }

  return await dbAdapter.listRows<ClaimRow>('claims', queries);
}

export async function createClaim(
  ownerId: string,
  eventId: string,
  materialId: string,
  materialVersion: number,
  claim: {
    field: OfficialField;
    rawValue: string;
    normalizedValue?: string | null;
    evidenceQuote: string;
    evidenceLocation?: string | null;
    reviewState: ClaimReviewState;
    ambiguityReason?: string | null;
  }
): Promise<ClaimRow> {
  // Strict parent-child ownership verification
  const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
  if (!material || material.ownerId !== ownerId || material.eventId !== eventId) {
    throw new Error('Material not found, wrong event, or unauthorized');
  }
  if (material.version < materialVersion) {
    throw new Error('Invalid material version specified');
  }

  const norm = claim.normalizedValue || normalizeFieldValue(claim.field, claim.rawValue);
  const claimId = ID.unique();

  return await dbAdapter.createRow<ClaimRow>(
    'claims',
    claimId,
    {
      ownerId,
      eventId,
      materialId,
      materialVersion,
      field: claim.field,
      rawValue: claim.rawValue,
      normalizedValue: norm,
      evidenceQuote: claim.evidenceQuote,
      evidenceLocation: claim.evidenceLocation || null,
      reviewState: claim.reviewState,
      ambiguityReason: claim.ambiguityReason || null,
    },
    getRowPermissions(ownerId)
  );
}

export async function updateClaim(
  ownerId: string,
  claimId: string,
  updates: Partial<ClaimRow>
): Promise<ClaimRow> {
  const existing = await dbAdapter.getRow<ClaimRow>('claims', claimId);
  if (!existing || existing.ownerId !== ownerId) {
    throw new Error('Claim not found or unauthorized');
  }

  const data: Partial<ClaimRow> = { ...updates };
  if (updates.rawValue && !updates.normalizedValue) {
    data.normalizedValue = normalizeFieldValue(existing.field, updates.rawValue);
  }

  return await dbAdapter.updateRow<ClaimRow>(
    'claims',
    claimId,
    data,
    getRowPermissions(ownerId)
  );
}

export async function deleteClaim(
  ownerId: string,
  claimId: string
): Promise<void> {
  const existing = await dbAdapter.getRow<ClaimRow>('claims', claimId);
  if (!existing || existing.ownerId !== ownerId) {
    throw new Error('Claim not found or unauthorized');
  }

  await dbAdapter.deleteRow('claims', claimId);
}

export async function listEventChanges(
  eventId: string,
  ownerId: string
): Promise<ChangeRow[]> {
  const event = await getEventById(eventId, ownerId);
  if (!event) throw new Error('Event not found or unauthorized');

  return await dbAdapter.listRows<ChangeRow>('changes', [
    Query.equal('ownerId', ownerId),
    Query.equal('eventId', eventId),
    Query.orderDesc('createdAt'),
  ]);
}

export async function recordResolution(
  ownerId: string,
  eventId: string,
  materialId: string,
  materialVersion: number,
  eventRevision: number,
  action: string,
  note?: string | null
): Promise<ResolutionRow> {
  const event = await getEventById(eventId, ownerId);
  if (!event) throw new Error('Event not found or unauthorized');

  const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
  if (!material || material.ownerId !== ownerId || material.eventId !== eventId) {
    throw new Error('Material not found, wrong event, or unauthorized');
  }

  const resolutionId = ID.unique();
  const now = new Date().toISOString();

  return await dbAdapter.createRow<ResolutionRow>(
    'resolutions',
    resolutionId,
    {
      ownerId,
      eventId,
      materialId,
      materialVersion,
      eventRevision,
      action,
      note: note || null,
      createdAt: now,
    },
    getRowPermissions(ownerId)
  );
}

export async function listResolutions(
  eventId: string,
  ownerId: string
): Promise<ResolutionRow[]> {
  const event = await getEventById(eventId, ownerId);
  if (!event) throw new Error('Event not found or unauthorized');

  return await dbAdapter.listRows<ResolutionRow>('resolutions', [
    Query.equal('ownerId', ownerId),
    Query.equal('eventId', eventId),
    Query.orderDesc('createdAt'),
  ]);
}
