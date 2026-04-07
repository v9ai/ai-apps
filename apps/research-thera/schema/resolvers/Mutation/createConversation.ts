import type { MutationResolvers } from "./../../types.generated";
import {
  addConversationMessage,
  createConversation as _createConversation,
  getConversation,
  getIssue,
} from "@/src/db";
import { deepseekModel } from "@/src/lib/deepseek";
import { generateText } from "ai";
import { buildConversationSystemPrompt } from "@/src/lib/conversation-context";

export const createConversation: NonNullable<MutationResolvers['createConversation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const issue = await getIssue(args.issueId, userEmail);
  if (!issue) throw new Error("Issue not found");

  const title = args.message.slice(0, 60);

  const conversationId = await _createConversation({
    issueId: args.issueId,
    userId: userEmail,
    title,
  });

  await addConversationMessage({ conversationId, role: "user", content: args.message });

  const systemPrompt = await buildConversationSystemPrompt(issue, userEmail);

  const { text } = await generateText({
    model: deepseekModel(),
    system: systemPrompt,
    messages: [{ role: "user", content: args.message }],
  });

  await addConversationMessage({ conversationId, role: "assistant", content: text });

  const conversation = await getConversation(conversationId, userEmail);
  return conversation as any;
};

