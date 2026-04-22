import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { headR2Object } from "@ai-apps/r2";

export const audioFromR2: NonNullable<QueryResolvers['audioFromR2']> = async (
  _parent,
  args,
  ctx,
) => {
  if (!ctx.userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  try {
    const { key } = args;

    if (!key) {
      return {
        success: false,
        message: "Key is required",
        audioUrl: null,
        key: null,
        metadata: null,
      };
    }

    const { audioUrl, metadata: raw } = await headR2Object(key);

    const metadata = raw
      ? {
          voice: raw.voice || null,
          model: raw.model || null,
          textLength: raw.textlength || null,
          chunks: raw.chunks || null,
          generatedBy: raw.generatedby || null,
          instructions: raw.instructions || null,
        }
      : null;

    return {
      success: true,
      message: "Audio retrieved successfully",
      audioUrl,
      key,
      metadata,
    };
  } catch (error) {
    console.error("R2 Retrieval Error:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to retrieve audio from R2",
      audioUrl: null,
      key: null,
      metadata: null,
    };
  }
};
