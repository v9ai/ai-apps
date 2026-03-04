import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MDocument } from "@mastra/rag";
import { uploadToR2, generateAudioKey } from "@/lib/r2-uploader";
import { parseBuffer } from "music-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 4000; // OpenAI limit is 4096, use 4000 to be safe

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function chunkTextForSpeech(text: string): Promise<string[]> {
  // Create MDocument from text
  const doc = MDocument.fromText(text);

  // Use recursive strategy for smart content structure splitting
  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: MAX_CHARS,
    overlap: 50,
    separators: ["\n\n", "\n", ". ", "! ", "? "],
  });

  // Extract text from chunks
  return chunks.map((chunk) => chunk.text);
}

export async function POST(request: NextRequest) {
  try {
    const {
      text,
      voice,
      uploadToCloud,
      streamFormat,
      instructions,
      responseFormat,
      storyId,
      userEmail,
    } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Use alloy voice by default (calm, clear, professional)
    // Other options: ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer
    const selectedVoice = voice || "alloy";
    const format = responseFormat || "mp3";
    const useSSE = streamFormat === "sse";

    // Check if text needs to be chunked
    if (text.length > MAX_CHARS) {
      const chunks = await chunkTextForSpeech(text);
      console.log(
        `Text too long (${text.length} chars), split into ${chunks.length} chunks`,
      );

      // Process chunks and combine audio (ALWAYS merge at the end for story)
      const audioChunks: Buffer[] = [];

      for (const chunk of chunks) {
        const response = await openai.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice: selectedVoice,
          input: chunk,
          response_format: format as any,
          speed: 0.9,
          ...(instructions && { instructions }),
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        audioChunks.push(buffer);
      }

      // CRITICAL: Combine all chunks into a single audio file (ALWAYS merge at the end)
      const combined = Buffer.concat(audioChunks);
      console.log(
        `Merged ${chunks.length} audio chunks into single file (${combined.length} bytes)`,
      );

      // Calculate audio duration
      let duration: number | null = null;
      try {
        const metadata = await parseBuffer(combined, {
          mimeType: `audio/${format}`,
        });
        duration = metadata.format.duration || null;
        console.log(`Audio duration: ${duration?.toFixed(2)}s`);
      } catch (error) {
        console.warn("Failed to parse audio duration:", error);
      }

      // Upload to R2 and save to story if requested
      if (uploadToCloud) {
        const key = generateAudioKey("tts");
        const result = await uploadToR2({
          key,
          body: combined,
          contentType: `audio/${format}`,
          metadata: {
            voice: selectedVoice,
            model: "gpt-4o-mini-tts",
            textLength: text.length.toString(),
            chunks: chunks.length.toString(),
            ...(instructions && { instructions }),
          },
        });

        // Save audio to story if both storyId and userEmail are provided
        if (storyId && userEmail) {
          const { d1 } = await import("@/src/db/d1");
          const now = new Date().toISOString();
          await d1.execute({
            sql: `UPDATE stories 
                  SET audio_key = ?, audio_url = ?, audio_generated_at = ?, updated_at = ?
                  WHERE id = ? AND user_id = ?`,
            args: [
              result.key,
              result.publicUrl || "",
              now,
              now,
              storyId,
              userEmail,
            ],
          });
        }

        return NextResponse.json({
          success: true,
          audioUrl: result.publicUrl,
          key: result.key,
          sizeBytes: result.sizeBytes,
          chunks: chunks.length,
          merged: true,
          duration,
        });
      }

      // Return merged audio directly
      return new NextResponse(combined, {
        headers: {
          "Content-Type": `audio/${format}`,
          "Content-Length": combined.length.toString(),
          "X-Audio-Chunks": chunks.length.toString(),
          "X-Audio-Merged": "true",
        },
      });
    }

    // For short text with SSE streaming
    if (useSSE && !uploadToCloud) {
      const response = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: selectedVoice,
        input: text,
        response_format: format as any,
        speed: 0.9,
        stream_format: "sse",
        ...(instructions && { instructions }),
      });

      // Create SSE stream
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // For short text, stream directly
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: selectedVoice,
      input: text,
      response_format: format as any,
      speed: 0.9,
      ...(instructions && { instructions }),
    });

    // Upload to R2 if requested
    if (uploadToCloud) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const key = generateAudioKey("tts");
      const result = await uploadToR2({
        key,
        body: buffer,
        contentType: `audio/${format}`,
        metadata: {
          voice: selectedVoice,
          model: "gpt-4o-mini-tts",
          textLength: text.length.toString(),
          ...(instructions && { instructions }),
        },
      });

      // Save audio to story if both storyId and userEmail are provided
      if (storyId && userEmail) {
        const { d1 } = await import("@/src/db/d1");
        const now = new Date().toISOString();
        await d1.execute({
          sql: `UPDATE stories 
                SET audio_key = ?, audio_url = ?, audio_generated_at = ?, updated_at = ?
                WHERE id = ? AND user_id = ?`,
          args: [
            result.key,
            result.publicUrl || "",
            now,
            now,
            storyId,
            userEmail,
          ],
        });
      }

      return NextResponse.json({
        success: true,
        audioUrl: result.publicUrl,
        key: result.key,
        sizeBytes: result.sizeBytes,
        merged: false, // Not chunked, so no merging needed
      });
    }

    // Convert response to web stream for direct streaming
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": `audio/${format}`,
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
