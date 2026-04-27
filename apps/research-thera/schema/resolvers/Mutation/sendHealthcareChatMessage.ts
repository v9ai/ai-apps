import type { MutationResolvers } from "./../../types.generated";
import { sendHealthcareChat } from "@/src/lib/healthcare-backend";

export const sendHealthcareChatMessage: NonNullable<MutationResolvers['sendHealthcareChatMessage']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const messages = args.input.messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  return sendHealthcareChat(messages, userEmail);
};
