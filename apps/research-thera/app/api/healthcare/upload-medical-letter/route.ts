import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { uploadToR2 } from "@ai-apps/r2";
import { db } from "@/src/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEALTHCARE_BUCKET = process.env.HEALTHCARE_R2_BUCKET ?? "research-thera";

/**
 * Multipart upload of a medical-letter PDF tied to a doctor.
 * Browser → this API → R2 (research-thera bucket) + medical_letters row.
 *
 * Form fields: file (required), doctor_id (required), description?, letter_date?
 */
export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const doctorId = (form.get("doctor_id") as string | null)?.trim() ?? null;
  const description = (form.get("description") as string | null)?.trim() || null;
  const letterDate = (form.get("letter_date") as string | null)?.trim() || null;

  if (!doctorId) {
    return NextResponse.json({ error: "doctor_id is required" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Ownership check — confirm this doctor belongs to the caller before upload
  const doctor = await db.getDoctor(doctorId, userEmail);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const key = `medical-letters/${userEmail}/${doctorId}/${Date.now()}-${file.name}`;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadToR2({
      key,
      body: bytes,
      contentType: file.type || "application/pdf",
      bucket: HEALTHCARE_BUCKET,
    });

    const letter = await db.createMedicalLetter({
      userId: userEmail,
      doctorId,
      fileName: file.name,
      filePath: key,
      description,
      letterDate,
    });

    return NextResponse.json(letter);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
