import type { QueryResolvers } from "./../../types.generated";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "longform-tts";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export const audioFromR2: NonNullable<QueryResolvers['audioFromR2']> = async (
  _parent,
  args,
  ctx,
) => {
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

    // Get object metadata from R2
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    // Generate public URL
    const audioUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${key}` : null;

    // Extract metadata
    const metadata = response.Metadata
      ? {
          voice: response.Metadata.voice || null,
          model: response.Metadata.model || null,
          textLength: response.Metadata.textlength || null,
          chunks: response.Metadata.chunks || null,
          generatedBy: response.Metadata.generatedby || null,
          instructions: response.Metadata.instructions || null,
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
