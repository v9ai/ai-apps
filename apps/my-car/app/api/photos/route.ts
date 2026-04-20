import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { cars, carPhotos } from "@/src/db/schema";
import { generateCarPhotoKey, uploadToR2 } from "@/lib/r2";

const MAX_BYTES = 10 * 1024 * 1024;

const carIdSchema = z.string().uuid();

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const rawCarId = form.get("carId");
  const file = form.get("file");
  const caption = form.get("caption");

  const parsed = carIdSchema.safeParse(typeof rawCarId === "string" ? rawCarId : undefined);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid carId" }, { status: 400 });
  }
  const carId = parsed.data;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const owns = await db
    .select({ id: cars.id })
    .from(cars)
    .where(and(eq(cars.id, carId), eq(cars.userId, session.user.id)))
    .limit(1);
  if (owns.length === 0) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = generateCarPhotoKey(carId, file.name);

  await uploadToR2({
    key,
    body: bytes,
    contentType: file.type,
    metadata: {
      userId: session.user.id,
      carId,
    },
  });

  await db.insert(carPhotos).values({
    carId,
    r2Key: key,
    contentType: file.type,
    sizeBytes: bytes.length,
    caption: typeof caption === "string" && caption.length > 0 ? caption : null,
  });

  revalidatePath(`/cars/${carId}`);
  return NextResponse.json({ ok: true, key });
}
