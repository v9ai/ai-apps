/**
 * D1 Storage Adapter for Generic Claim Cards
 *
 * Implements StorageAdapter for persisting claim cards to Cloudflare D1.
 * Uses existing schema: claim_cards and notes_claims tables.
 */

import { d1 } from "@/src/db/d1";
import type {
  StorageAdapter,
  ClaimCard,
  EvidenceItem,
  ClaimScope,
} from "../tools/generic-claim-cards.tools";
import { toGqlClaimCards } from "@/schema/resolvers/utils/normalize-claim-card";

export function createD1StorageAdapter(): StorageAdapter {
  return {
    name: "d1",

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

      // Upsert claim card using raw SQL
      await d1.execute({
        sql: `INSERT INTO claim_cards (id, note_id, claim, scope, verdict, confidence, evidence, queries, provenance, notes, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                claim = excluded.claim,
                scope = excluded.scope,
                verdict = excluded.verdict,
                confidence = excluded.confidence,
                evidence = excluded.evidence,
                queries = excluded.queries,
                provenance = excluded.provenance,
                notes = excluded.notes,
                updated_at = excluded.updated_at`,
        args: [
          card.id,
          noteId,
          card.claim,
          scope,
          card.verdict,
          confidenceInt,
          evidence,
          queries,
          provenance,
          card.notes ?? null,
          card.createdAt,
          card.updatedAt,
        ],
      });

      // Link to note if itemId provided
      if (noteId) {
        await d1.execute({
          sql: `INSERT INTO notes_claims (note_id, claim_id, created_at)
                VALUES (?, ?, ?)
                ON CONFLICT DO NOTHING`,
          args: [noteId, card.id, new Date().toISOString()],
        });
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
      const result = await d1.execute({
        sql: `SELECT * FROM claim_cards WHERE id = ? LIMIT 1`,
        args: [cardId],
      });

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return deserializeClaimCard(row);
    },

    async getCardsForItem(itemId: string | number): Promise<ClaimCard[]> {
      const noteId = typeof itemId === "number" ? itemId : parseInt(itemId, 10);

      const result = await d1.execute({
        sql: `SELECT cc.* FROM claim_cards cc
              INNER JOIN notes_claims nc ON nc.claim_id = cc.id
              WHERE nc.note_id = ?`,
        args: [noteId],
      });

      const rawCards = result.rows.map((row) => deserializeClaimCard(row));

      // Normalize to ensure consistent GraphQL output
      return toGqlClaimCards(rawCards) as any;
    },

    async deleteCard(cardId: string): Promise<void> {
      // Delete links first
      await d1.execute({
        sql: `DELETE FROM notes_claims WHERE claim_id = ?`,
        args: [cardId],
      });
      // Delete card
      await d1.execute({
        sql: `DELETE FROM claim_cards WHERE id = ?`,
        args: [cardId],
      });
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
