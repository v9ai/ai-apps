/**
 * Shared CPN (Claude Partner Network) followup utilities.
 * Used by both the email detail page and the bulk followup API route.
 */

export type CpnFollowupStatus =
  | "ready"
  | "declined"
  | "has_questions"
  | "already_replied_to_followup";

export const DECLINE_PATTERNS = [
  "not interested",
  "no thanks",
  "pass on this",
  "not a fit",
  "i'll pass",
  "pass for now",
  "not for us",
  "we'll pass",
  "please don't contact",
  "stop emailing",
  "unsubscribe",
  "remove me",
  "opt out",
  "not a good fit",
];

export const CPN_TAG = '["cpn-outreach"]';
export const CPN_FOLLOWUP_TAGS = '["cpn-outreach","cpn-followup-1"]';
export const FROM = "Vadim Nicolai <contact@vadim.blog>";

export function buildCpnFollowup(firstNameStr: string) {
  const subject = `Re: Claude Partner Network — ${firstNameStr}`;
  const text = `Hi ${firstNameStr},

Here's what I have from Karl Kadon (Head of Partner Experience, Anthropic):

The Claude Partner Network training path opens next week. The first step is getting a cohort through it together — that's what I'm putting together now.

Karl's advice for anyone joining:
1. List your active Claude/Anthropic work — client projects, internal tools, anything you're building with Claude
2. Registration opens in the coming weeks — I'll forward the link the moment it's live

You're on my list. I'll loop you in as soon as the next steps land.

Vadim Nicolai
vadim.blog`;
  return { subject, text };
}

export function buildCpnTrainingPath(firstNameStr: string) {
  const subject = `Claude Partner Network - training path is live`;
  const text = `Hi ${firstNameStr},

Update: Anthropic's partner team confirmed our application and the training path is now live.

Here's what's needed: complete 4 courses on Anthropic Academy to unlock the Claude Certified Architect certification:

1. Introduction to agent skills
2. Building with the Claude API
3. Introduction to Model Context Protocol
4. Claude Code in Action

Start here: anthropic.com/learn

One logistics thing: Anthropic requires all participants to register under the same organization domain. I can set up a @vadim.blog email that forwards to your personal inbox. Would you be ok with that?

Just reply with a yes if you're in and I'll get your email set up.

Vadim
vadim.blog`;
  return { subject, text };
}

export function buildCpnEmailReady(firstNameStr: string) {
  const subject = `Your @vadim.blog email is ready - start the courses`;
  const text = `Hi ${firstNameStr},

Your email is set up: bella.belgarokova@vadim.blog → forwards to bella.belgarokova@hotmail.com

Use bella.belgarokova@vadim.blog when you register for Anthropic Academy. Anthropic verifies completion by org domain, so this is important.

Welcome video featuring Karl (the one I mentioned before from Anthropic's partner team): https://youtu.be/O9yc_Qaj5Ns

Direct link to the learning path: anthropic.skilljar.com/page/claude-partner-network-learning-path

4 courses to complete:
1. Introduction to agent skills
2. Building with the Claude API
3. Introduction to Model Context Protocol
4. Claude Code in Action

Once all of us finish, I submit for verification and Anthropic unlocks the Claude Certified Architect Foundations (CCAF) exam for our org. No cost.

Let me know when you're done.

Vadim`;
  return { subject, text };
}

export function buildCpnWaitingReply(firstNameStr: string) {
  const subject = `Re: Claude Partner Network — ${firstNameStr}`;
  const text = `Hi ${firstNameStr},

Thanks for following up — I appreciate the persistence.

I'm still waiting on Karl's side for the registration link and cohort details. Haven't forgotten about you — you're on my list and I'll forward everything the moment it lands.

I'll be in touch as soon as there's movement.

Vadim Nicolai
vadim.blog`;
  return { subject, text };
}

export const STATUS_ORDER: Record<CpnFollowupStatus, number> = {
  ready: 0,
  has_questions: 1,
  already_replied_to_followup: 2,
  declined: 3,
};
