# Team: ux-review

Autonomous UX inspection and fix team. Inspector measures the live browser, fixer applies targeted code changes, lead verifies before/after.

## When to Use

- Visual spacing, alignment, or sizing issues in the UI
- Active/hover state inconsistencies
- Nav, header, or layout problems
- Any "it looks off" report without a clear root cause

## Team Composition

| Agent | Role | Model | Plan Required |
|-------|------|-------|---------------|
| `ux-lead` | coordinator + verifier | sonnet | no |
| `ux-inspector` | browser measurement + diagnosis | sonnet | no |
| `ux-fixer` | code fix implementation | opus | **yes** |

## File Ownership

```
ux-inspector:
  - Read-only (no file edits, browser inspection only)

ux-fixer:
  - app/components/**
  - app/goals/**
  - app/notes/**
  - app/stories/**
  - app/providers/**
  - app/lib/**
  - app/layout.tsx
  - app/page.tsx

ux-lead:
  - Coordination only (no file edits)
```

## Task Structure (Template)

```
1. [pending] Find running dev server port (→ ux-inspector)
   depends_on: []
2. [pending] Screenshot problem page + measure computed styles (→ ux-inspector)
   depends_on: [1]
3. [pending] Diagnose root cause from measurements (→ ux-inspector)
   depends_on: [2]
4. [pending] Read affected component source (→ ux-fixer)
   depends_on: [3]
5. [pending] Plan fix and await lead approval (→ ux-fixer)
   depends_on: [4]
6. [pending] Apply fix (→ ux-fixer)
   depends_on: [5]
7. [pending] Screenshot after fix + verify measurements (→ ux-inspector)
   depends_on: [6]
8. [pending] Sign off or request iteration (→ ux-lead)
   depends_on: [7]
```

## Lead Prompt

```
You are coordinating a UX inspection and fix for research-thera.

Your workflow:
1. Send ux-inspector to find the live dev server port (check lsof for the research-thera next dev process, NOT other Next.js apps) and navigate to the problem page
2. ux-inspector screenshots, measures computed styles, and reports the root cause with exact numbers (px values, margin/padding, positions)
3. ux-fixer reads the relevant component source, then submits a plan — you approve or adjust before they touch any file
4. ux-fixer applies the minimal change needed
5. ux-inspector re-screenshots and confirms the fix with measurements
6. You sign off

CRITICAL RULES:
- Never approve a plan that changes more than necessary — one targeted edit beats a refactor
- ux-inspector must always report px numbers, not just "it looks off"
- ux-fixer must read the source file before proposing any change
- After fixing, always re-verify in the browser

Radix UI gotchas to watch for (baked in from real bugs):
- ghost Button variant applies negative margins (-8px left/right, -4px top/bottom) — gap values must exceed 16px to produce visible spacing
- soft Button variant removes negative margins, causing height/y-position shift vs ghost siblings → never mix soft+ghost for nav items
- Active nav state: use variant="ghost" + color="indigo" + highContrast + border-bottom underline — NOT variant="soft"
- Formula: visual_gap = gap_value - |marginLeft| - |marginRight| — compute this before recommending a gap
```
