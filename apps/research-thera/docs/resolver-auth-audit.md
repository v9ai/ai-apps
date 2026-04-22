# Resolver Authorization Audit (round 3)

Scope: every resolver under `schema/resolvers/`. Prior 12 fixes (Team 1 + Team 2) are treated as compliant and not re-flagged unless they also have a distinct auth gap outside what was fixed. Assume Neon migration 0004 is live (ctx.userId = UUID).

## Summary

- Resolvers scanned: 128 (75 Mutation, 47 Query, 2 Subscription, ~4 type resolvers re-checked).
- Findings: **18** (6 critical, 5 high, 4 medium, 3 low).
- Clean (out of already-fixed list): ~95 resolvers pass cleanly on the ownership dimension.
- The report is capped; lows grouped.

Worst offenders:
1. `Mutation/updateFamilyMember.ts` — full cross-user PII overwrite.
2. `Query/familyMember.ts` + type resolvers — IDOR on family-member PII (DOB, email, phone, location).
3. `Mutation/{deleteClaimCard,refreshClaimCard,buildClaimCards}.ts` + `Query/{claimCard,claimCardsForNote}.ts` — claim-card table has no auth at all.

---

## Findings

### CRITICAL

#### C1. `schema/resolvers/Mutation/updateFamilyMember.ts:10-21`
- **Kind**: Cross-user write (rule 4) + no ownership check on `args.id` (rule 2).
- **Impact**: Any authenticated user can overwrite *any* family member row — DOB, email, phone, location, bio, name — because `db.updateFamilyMember(id, params)` runs `UPDATE family_members … WHERE id = ?` with no `user_id` filter (`src/db/index.ts:192`). Mass PII tampering.
- **Patch**:
  ```ts
  const member = await db.getFamilyMember(args.id);
  if (!member || member.userId !== ctx.userId) throw new Error("Family member not found");
  await db.updateFamilyMember(args.id, ctx.userId, { /* existing params */ });
  ```
  Also add `userId` param to `db.updateFamilyMember` and append `AND user_id = ?` in the UPDATE.

#### C2. `schema/resolvers/Query/familyMember.ts:19`
- **Kind**: IDOR via unchecked ID input (rule 2).
- **Impact**: `db.getFamilyMember(args.id)` (`src/db/index.ts:43`) has no `user_id` filter. Any authenticated user can read ANY other user's child/family PII — first name, DOB, email, phone, location, bio — by iterating numeric IDs.
- **Patch**:
  ```ts
  const member = await db.getFamilyMember(args.id);
  if (!member || member.userId !== ctx.userId) return null;
  ```
  Slug path is already scoped; only the `id` branch leaks.

#### C3. `schema/resolvers/Mutation/deleteClaimCard.ts:4-7`
- **Kind**: No context use (rule 1) + unchecked ID input (rule 2).
- **Impact**: `claimCardsTools.deleteClaimCard(id)` takes ID only; any authenticated user (no auth check at all) can delete anyone's claim cards, including those attached to private notes.
- **Patch**:
  ```ts
  export const deleteClaimCard = async (_parent, { id }, ctx) => {
    if (!ctx.userId) throw new Error("Authentication required");
    const card = await claimCardsTools.getClaimCard(id);
    if (!card) throw new Error("Not found");
    // verify through parent note: getNoteById(card.noteId, ctx.userId)
    const note = await getNoteById(card.noteId, ctx.userId);
    if (!note || note.createdBy !== ctx.userId) throw new Error("Not found");
    await claimCardsTools.deleteClaimCard(id);
    return true;
  };
  ```

#### C4. `schema/resolvers/Mutation/refreshClaimCard.ts:4-17`
- **Kind**: No context use (rule 1) + unchecked ID input (rule 2).
- **Impact**: Completely unauthenticated. Any caller can trigger an expensive DeepSeek refresh on any claim card and overwrite it with fresh evidence (integrity + cost attack).
- **Patch**: same pattern as C3 — gate on `ctx.userId`, re-check note ownership via `card.noteId`.

#### C5. `schema/resolvers/Mutation/buildClaimCards.ts:115-319`
- **Kind**: No context use (rule 1) + unchecked ID input (rule 2) when `persist=true` + `noteId` set.
- **Impact**: Resolver persists claim cards against any `noteId` the caller supplies, with zero auth. An attacker can inject fabricated evidence into another user's note. Also runs expensive DeepSeek + external search with no rate-limit key.
- **Patch**:
  ```ts
  export const buildClaimCards = async (_parent, { input }, ctx) => {
    if (!ctx.userId) throw new Error("Authentication required");
    if (input.persist && input.noteId != null) {
      const note = await getNoteById(input.noteId, ctx.userId);
      if (!note || note.createdBy !== ctx.userId) throw new Error("Note not found");
    }
    /* existing body */
  };
  ```

#### C6. `schema/resolvers/Mutation/generateOpenAIAudio.ts:50-57`
- **Kind**: Unchecked ID input (rule 2) — `storyId` accepted, row read/insert performed with no ownership check.
- **Impact**: `SELECT goal_id, language FROM stories WHERE id = ${storyId}` has no `user_id` filter (line 51), and a generation_jobs row is then inserted with `user_id = ${userId}` but `story_id = ${storyId}` pointing at someone else's story. Attacker can (a) discover arbitrary storyIds, (b) enqueue expensive TTS jobs keyed to other users' stories, (c) eventually overwrite `audio_url` on another user's story once the worker calls `updateStoryAudio` (which also doesn't filter by user_id — see L2).
- **Patch**:
  ```ts
  if (storyId) {
    const rows = await neonSql`
      SELECT goal_id, language FROM stories
      WHERE id = ${storyId} AND (user_id = ${userId} OR user_id IS NULL)`;
    if (rows.length === 0) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
    /* rest unchanged */
  }
  ```

### HIGH

#### H1. `schema/resolvers/Query/research.ts:9-14`
- **Kind**: Unchecked ID input (rule 2).
- **Impact**: Returns therapy research for any `goalId`/`issueId`/`feedbackId`/`journalEntryId` without checking that the parent belongs to the caller. `listTherapyResearch` (`src/db/index.ts:579`) has no user filter. Leaks research, which often contains quotations of user notes/content.
- **Patch**:
  ```ts
  if (args.goalId) await db.getGoal(args.goalId, ctx.userId);          // throws if not owned
  if (args.issueId) { const i = await db.getIssue(args.issueId, ctx.userId); if (!i) throw new Error("Not found"); }
  if (args.feedbackId) { const f = await db.getContactFeedback(args.feedbackId, ctx.userId); if (!f) throw new Error("Not found"); }
  if (args.journalEntryId) { const e = await db.getJournalEntry(args.journalEntryId, ctx.userId); if (!e) throw new Error("Not found"); }
  return listTherapyResearch(args.goalId ?? undefined, args.issueId ?? undefined, args.feedbackId ?? undefined, args.journalEntryId ?? undefined);
  ```
  Mirror the pattern used by `Query/therapeuticQuestions.ts` which is already correct.

#### H2. `schema/resolvers/Query/stories.ts:14`
- **Kind**: Unchecked ID input (rule 2).
- **Impact**: `db.listStories(goalId)` (`src/db/index.ts:1006`) returns all stories for any goal — no `user_id` filter. Auth is enforced only for "logged-in" but any goalId works.
- **Patch**:
  ```ts
  await db.getGoal(args.goalId, ctx.userId); // throws on mismatch
  return db.listStories(args.goalId);
  ```

#### H3. `schema/resolvers/Query/story.ts:8-11`
- **Kind**: No context use (rule 1) + unchecked ID input (rule 2).
- **Impact**: Any authenticated (or unauthenticated — no check!) caller can fetch any story body by numeric ID. Stories contain personalised therapeutic narratives about a family member.
- **Patch**:
  ```ts
  const userId = ctx.userId;
  if (!userId) throw new Error("Authentication required");
  const story = await getStory(args.id);
  if (!story) return null;
  if (story.createdBy !== userId && story.createdBy != null) return null;
  // if (story.goalId) await db.getGoal(story.goalId, userId);
  return { ...story, segments: [], audioAssets: [] } as any;
  ```

#### H4. `schema/resolvers/Mutation/generateDeepIssueAnalysis.ts:13-14`
- **Kind**: Unchecked ID input (rule 2).
- **Impact**: Verifies family member *exists* but not that it belongs to the caller. Attacker triggers a deep-analysis LangGraph job against another user's child, producing a SUCCEEDED generation_jobs row on their account with the generated summary — and pollutes `deep_issue_analyses` for the target family member.
- **Patch**:
  ```ts
  const familyMember = await db.getFamilyMember(familyMemberId);
  if (!familyMember || familyMember.userId !== userEmail) throw new Error("Family member not found");
  if (triggerIssueId) {
    const issue = await db.getIssue(triggerIssueId, userEmail);
    if (!issue) throw new Error("Issue not found");
  }
  ```

#### H5. `schema/resolvers/Mutation/generateHabitsForFamilyMember.ts:10-12`
- **Kind**: Unchecked ID input (rule 2).
- **Impact**: `familyMemberId` forwarded to LangGraph and queried back — no ownership check. Attacker can generate habit suggestions that reference another user's child's issues.
- **Patch**:
  ```ts
  const fm = await db.getFamilyMember(familyMemberId);
  if (!fm || fm.userId !== userEmail) throw new Error("Family member not found");
  ```

### MEDIUM

#### M1. `schema/resolvers/Mutation/generateParentAdvice.ts:10-20`
- **Kind**: Unchecked ID input (rule 2).
- **Impact**: Accepts `goalId` and sends to LangGraph. Worker uses `goal_id` to fetch goal context server-side. If worker trusts the goalId (which it should) but caller isn't the owner, the generated advice — saved on the goal row — comes from attacker. Mutates the owner's `goals.parent_advice` column.
- **Patch**:
  ```ts
  await getGoal(goalId, userEmail); // throws if not owned
  ```

#### M2. `schema/resolvers/Mutation/createRelationship.ts:14-24`
- **Kind**: Cross-user write (rule 4) — `subjectId` / `relatedId` unchecked.
- **Impact**: Creates a relationships row pointing to any subject/related id. User A can create a relationship that references User B's family member or contact id — polluting enumeration and exposing hinting data. Row is scoped by `user_id = A` so B can't read it, but A can see that B's family_member #42 exists.
- **Patch**:
  ```ts
  // Verify subject ownership based on subjectType
  if (input.subjectType === "FAMILY_MEMBER") {
    const m = await db.getFamilyMember(input.subjectId);
    if (!m || m.userId !== userEmail) throw new Error("Subject not found");
  } // etc. for CONTACT / GOAL / ISSUE
  ```

#### M3. `schema/resolvers/Mutation/createContactFeedback.ts:14-23` (and `createIssue`, `createJournalEntry`, `createAffirmation`, `createHabit`, `createTeacherFeedback`, `convertJournalEntryToIssue`)
- **Kind**: Cross-user write via unchecked `familyMemberId` (rule 4).
- **Impact**: Each of these mutations accepts `args.input.familyMemberId` and writes a new row with `user_id = caller, family_member_id = <anything>`. The new row is scoped to the caller so the *victim* never sees it, but: (a) the `family_members` table is enumerated by success/fail and (b) LangGraph context-building joins across tables and could surface the attacker's feedback when analysing the victim's child if any resolver uses `family_member_id` as the primary filter without `user_id`. Low-likelihood data-pollution.
- **Patch** (per resolver):
  ```ts
  const fm = await getFamilyMember(args.input.familyMemberId);
  if (!fm || fm.userId !== userEmail) throw new Error("Family member not found");
  ```

#### M4. `schema/resolvers/Mutation/createNote.ts:14-23`
- **Kind**: Cross-user write (rule 4) — `entityId` unchecked.
- **Impact**: User can create a note with `entityType = Goal, entityId = <someone else's goalId>`. Since `notes.user_id = caller`, only the attacker sees it — *but* this note will surface via `Goal.notes` field resolver if that ever drops the user_id filter, and claim-card pollution on a victim's goal becomes possible via `buildClaimCards.persist=true` (see C5) once that's tightened — attacker could still point at their own note that claims to be on victim's goal.
- **Patch**:
  ```ts
  if (args.input.entityType === "Goal") await db.getGoal(args.input.entityId, userEmail);
  else if (args.input.entityType === "Issue") { const i = await db.getIssue(args.input.entityId, userEmail); if (!i) throw new Error("Entity not found"); }
  // etc.
  ```

### LOW (grouped)

| # | File | Kind | Note |
|---|------|------|------|
| L1 | `schema/resolvers/Query/claimCard.ts:4-10` | rule 1 + 2 | No auth, no ownership check; returns any claim card by id. Same table-level leak as C3/C4. Fix: require `ctx.userId`, then verify parent note ownership. |
| L2 | `schema/resolvers/Query/claimCardsForNote.ts:4-6` | rule 1 + 2 | No auth, no note-ownership check; returns claims for any `noteId`. Fix: verify `getNoteById(noteId, ctx.userId)` first. |
| L3 | `schema/resolvers/Query/allRecommendedBooks.ts:4-9` | rule 1 | Accepts `category` and returns global book list with `goal_id IS NULL`. Intentional? If so, add `ctx.userId` gate to prevent anonymous scraping (informational). |
| L4 | `schema/resolvers/Query/publicDiscussionGuide.ts:4-18` | public by design | Intentionally public; double-check that journal entries flagged `isPrivate` cannot leak through `familyMemberName`/`entryTitle`. Currently only returns public guides — OK, but add a `WHERE isPrivate = false` guard defensively in `getJournalEntryPublic`. |
| L5 | `schema/resolvers/Query/audioFromR2.ts:19-66` | rule 1 | `_ctx` ignored. R2 key is effectively a capability but the bucket is world-readable via `R2_PUBLIC_DOMAIN`. Still, add `if (!ctx.userId) throw …` to prevent un-auth enumeration of voice/model metadata. |
| L6 | `Subscription/audioJobStatus.ts`, `Subscription/researchJobStatus.ts` | rule 1 | Both throw "not implemented"; no-op. Keep, but when implemented must filter by `ctx.userId`. |
| L7 | `schema/resolvers/FamilyMember.ts:6-17` (`goals`, `shares` field resolvers) | rule 2 | Trust `parent.userId` set by the Query resolver. If `Query/familyMember` (C2) is fixed, this becomes safe. Until then these widen the leak (owner's goal titles + share recipients become readable). No change needed after C2 fix. |
| L8 | `schema/resolvers/Goal.ts:45` (`subGoals`) | potential scope | Fetches full `listGoals(userEmail)` and filters. Not an auth bug but a perf/data-shape issue — n+1 across parent goals. Flag as perf in out-of-scope. |

---

## Clean list (confirmed fine)

Only resolvers that were *not* flagged above and therefore pass the audit are listed briefly. Grouped to save lines.

- **Goals/Issues/Journals/Teacher & Contact Feedbacks / Habits / Affirmations / Observations / Relationships / Conversations** — all CRUD except flagged items use helpers that filter `WHERE … AND user_id = ?`. Specifically clean:
  `Mutation/{createGoal,createIssue,createJournalEntry,createTeacherFeedback,createAffirmation,createHabit,createSubGoal,createContact,createStory,createConversation,createRelatedIssue,updateGoal,updateIssue,updateJournalEntry,updateNote,updateContact,updateContactFeedback,updateTeacherFeedback,updateAffirmation,updateHabit,updateStory,updateRelationship,updateBehaviorObservation,updateUserSettings,convertIssueToGoal,convertJournalEntryToIssue,deleteIssue,deleteJournalEntry,deleteJournalAnalysis,deleteDiscussionGuide,deleteHabit,deleteHabitLog,deleteTeacherFeedback,deleteContact,deleteContactFeedback,deleteBehaviorObservation,deleteAffirmation,deleteDeepIssueAnalysis,deleteConversation,deleteRelationship,deleteIssueScreenshot,linkIssues,unlinkIssues,linkContactToIssue,unlinkContactFromIssue,unlinkGoalFamilyMember,logHabit,sendConversationMessage,markTeacherFeedbackExtracted,extractContactFeedbackIssues,shareNote,unshareNote,shareFamilyMember,unshareFamilyMember,setNoteVisibility,generateHabitsFromIssue,generateLongFormText,generateResearch}`. 
  Each calls an ownership-checking helper or explicitly verifies the parent via `getGoal/getIssue/getJournalEntry/getContactFeedback/getNoteById` with `userId`.
- **Queries scoped by user_id in helper**:
  `Query/{goal,goals,issue,issues,allIssues,allNotes,allStories,allTags,note,notes,journalEntry,journalEntries,habit,habits,affirmation,affirmations,behaviorObservation,behaviorObservations,contact,contacts,contactFeedback,contactFeedbacks,teacherFeedback,teacherFeedbacks,conversation,conversationsForIssue,relationship,relationships,deepIssueAnalysis,deepIssueAnalyses,familyMembers,mySharedFamilyMembers,mySharedNotes,userSettings,tagLanguage,therapeuticQuestions,recommendedBooks,generationJob,generationJobs}`.
- **Already-fixed in prior rounds (not re-audited)**:
  Team 1 — `Mutation/generateAudio, Mutation/checkNoteClaims, Query/generationJob, Query/recommendedBooks, Query/therapeuticQuestions`.
  Team 2 — `Mutation/deleteNote, Mutation/deleteGoal, Mutation/deleteFamilyMember, Mutation/setTagLanguage, Query/tagLanguage, Mutation/generateDiscussionGuide, Mutation/generateJournalAnalysis, Mutation/generateTherapeuticQuestions, Mutation/generateOpenAIAudio`.
  Note: Team 2's `generateOpenAIAudio` is still flagged for a *separate* gap (C6) — storyId ownership — which wasn't part of the email→UUID fix.

---

## Out-of-scope observations

1. **`deleteTherapyResearch(goalId)` / `deleteRecommendedBooks(goalId)` / `deleteTherapeuticQuestions`** — the resolvers (`Mutation/deleteResearch`, `Mutation/deleteRecommendedBooks`, `Mutation/deleteTherapeuticQuestions`) do *not* call these helpers with a user_id, but the helpers themselves have no `user_id` column to filter by (research/books/questions tables are scoped only through parent `goal_id`/`issue_id`/`journal_entry_id`). Since Team 2 fixed the caller-side ownership check path for the delete mutations (per spec: email→UUID), and the helpers are parameterised, once main migrates to UUID user_id these resolvers need to *also* verify the parent is owned (same pattern as `Query/recommendedBooks`). Currently the delete resolvers only check `if (!ctx.userEmail)` — missing the `getGoal(goalId, userEmail)` call before delete. **Will be functionally broken under 0004 anyway** (all three mutations accept goal/issue/journal IDs without re-verifying). Suggest backend-dev add ownership checks at the same time as the identity migration lands.
2. **`buildClaimCards.old.ts`** — legacy empty stub, but imported from codegen? Confirm & delete.
3. **`Goal.subGoals`** — fetches full goal list per parent; n+1 on pages showing many goals. Perf, not auth.
4. **Generation_jobs via `listGenerationJobs`** — `Query/generationJobs.ts` passes `userId: ctx.userEmail` but doesn't require it; if `ctx.userEmail` is null the helper may list all jobs. Add explicit `if (!ctx.userEmail) throw`.
5. **`Mutation/generateRecommendedBooks.ts`** — good ownership check via `getGoal(goalId, userEmail)`, but also forwards `userEmail` as `user_email` to a CF Container (`LANGGRAPH_URL_BOOKS`). Confirm the container doesn't trust an attacker-supplied `user_email` in its own DB writes (out of scope for resolver audit — review the container auth).
6. **`extractContactFeedbackIssues.ts`** — logs to stderr the raw Qwen API response if non-200. That response can include the user's feedback `content` in the reply body — minor info leak into logs. PII concern.

---

## Handoff to backend-dev

Patch order (critical path first):

1. **C1** — `Mutation/updateFamilyMember.ts` + `src/db/index.ts:updateFamilyMember` signature change. Biggest blast radius.
2. **C2** — `Query/familyMember.ts` ownership gate.
3. **C3 / C4 / C5 / L1 / L2** — claim-card family (6 files). Share the helper `assertNoteOwnership(noteId, userId)` if possible.
4. **C6** — `Mutation/generateOpenAIAudio.ts` storyId check + also tighten `updateStoryAudio` to `AND user_id = ?` OR `AND user_id IS NULL`.
5. **H1–H5** — research/story/stories queries + deep-issue/habits-for-family generations.
6. **M1–M4** — parent advice, relationship subject check, create* familyMemberId checks, createNote entity check.
7. **L3–L8** — informational / perf / subscription placeholders.

No code changes proposed here (security-reviewer is read-only). Generate as a single PR grouped by file so test coverage tracks.
