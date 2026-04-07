import type { MutationResolvers } from "./../../types.generated";
import {
  addConversationMessage,
  getConversation,
  getIssue,
} from "@/src/db";
import { deepseekModel } from "@/src/lib/deepseek";
import { generateText } from "ai";
import { buildConversationSystemPrompt } from "@/src/lib/conversation-context";

export const sendConversationMessage: NonNullable<MutationResolvers['sendConversationMessage']> =
  async (_parent, args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) throw new Error("Authentication required");

    const conversation = await getConversation(args.conversationId, userEmail);
    if (!conversation) throw new Error("Conversation not found");

    const issue = await getIssue(conversation.issueId, userEmail);
    if (!issue) throw new Error("Issue not found");

    await addConversationMessage({
      conversationId: args.conversationId,
      role: "user",
      content: args.message,
    });

    const systemPrompt = await buildConversationSystemPrompt(issue, userEmail);
    const history = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    history.push({ role: "user", content: args.message });

    const { text } = await generateText({
      model: deepseekModel(),
      system: systemPrompt,
      messages: history,
    });

    await addConversationMessage({
      conversationId: args.conversationId,
      role: "assistant",
      content: text,
    });

    const updated = await getConversation(args.conversationId, userEmail);
    return updated as any;
  };

