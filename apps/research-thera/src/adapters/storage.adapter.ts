/**
 * Neon Storage Adapter for Generic Claim Cards
 *
 * Implements StorageAdapter for persisting claim cards to Neon PostgreSQL.
 * Uses existing schema: claim_cards and notes_claims tables.
 */

import { sql as neonSql } from "@/src/db/neon";
import type {
  StorageAdapter,
  ClaimCard,
  EvidenceItem,
  ClaimScope,
} from "../tools/generic-claim-cards.tools";
import { toGqlClaimCards } from "@/schema/resolvers/utils/normalize-claim-card";

export function createStorageAdapter(): StorageAdapter {
  return {
    name: "neon",

    async saveCard(card: ClaimCard, itemId?: string | number): Promise<void> {
      const noteId =
        typeof itemId === "number"
          ? itemId
          : itemId
            ? parseInt(itemId, 10)
            : null;

      // Convert confidence from 0-1 to 0-100 for storage
      const confidenceInt = Math.round(card.confidence * 100);

      // Serialize complex fields as JSON
      const scope = card.scope ? JSON.stringify(card.scope) : null;
      const evidence = JSON.stringify(card.evidence);
      const queries = JSON.stringify(card.queries);
      const provenance = JSON.stringify(card.provenance);

      // Upsert claim card
      await neonSql`
        INSERT INTO claim_cards (id, note_id, claim, scope, verdict, confidence, evidence, queries, provenance, notes, created_at, updated_at)
        VALUES (${card.id}, ${noteId}, ${card.claim}, ${scope}, ${card.verdict}, ${confidenceInt}, ${evidence}, ${queries}, ${provenance}, ${card.notes ?? null}, ${card.createdAt}, ${card.updatedAt})
        ON CONFLICT (id) DO UPDATE SET
          claim = excluded.claim,
          scope = excluded.scope,
          verdict = excluded.verdict,
          confidence = excluded.confidence,
          evidence = excluded.evidence,
          queries = excluded.queries,
          provenance = excluded.provenance,
          notes = excluded.notes,
          updated_at = excluded.updated_at`;

      // Link to note if itemId provided
      if (noteId) {
        await neonSql`
          INSERT INTO notes_claims (note_id, claim_id, created_at)
          VALUES (${noteId}, ${card.id}, ${new Date().toISOString()})
          ON CONFLICT DO NOTHING`;
      }
    },

    async saveCardsForItem(
      cards: ClaimCard[],
      itemId: string | number,
    ): Promise<void> {
      for (const card of cards) {
        await this.saveCard(card, itemId);
      }
    },

    async getCard(cardId: string): Promise<ClaimCard | null> {
      const rows = await neonSql`SELECT * FROM claim_cards WHERE id = ${cardId} LIMIT 1`;

      if (rows.length === 0) return null;

      return deserializeClaimCard(rows[0]);
    },

    async getCardsForItem(itemId: string | number): Promise<ClaimCard[]> {
      const noteId = typeof itemId === "number" ? itemId : parseInt(itemId, 10);

      const rows = await neonSql`
        SELECT cc.* FROM claim_cards cc
        INNER JOIN notes_claims nc ON nc.claim_id = cc.id
        WHERE nc.note_id = ${noteId}`;

      const rawCards = rows.map((row) => deserializeClaimCard(row));

      // Normalize to ensure consistent GraphQL output
      return toGqlClaimCards(rawCards) as any;
    },

    async deleteCard(cardId: string): Promise<void> {
      await neonSql`DELETE FROM notes_claims WHERE claim_id = ${cardId}`;
      await neonSql`DELETE FROM claim_cards WHERE id = ${cardId}`;
    },
  };
}

function deserializeClaimCard(row: any): ClaimCard {
  return {
    id: row.id as string,
    claim: row.claim as string,
    scope: row.scope
      ? (JSON.parse(row.scope as string) as ClaimScope)
      : undefined,
    topic: undefined, // Not stored in current schema
    verdict: row.verdict as any,
    confidence: (row.confidence as number) / 100, // Convert back to 0-1
    evidence: JSON.parse(row.evidence as string) as EvidenceItem[],
    queries: JSON.parse(row.queries as string) as string[],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    provenance: JSON.parse(row.provenance as string),
    notes: row.notes ? (row.notes as string) : undefined,
  };
}
