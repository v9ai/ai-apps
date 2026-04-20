import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { cars, carPhotos } from "@/src/db/schema";
import { deleteFromR2 } from "@/lib/r2";

const idSchema = z.string().uuid();

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const id = parsed.data;

  const rows = await db
    .select({
      id: carPhotos.id,
      carId: carPhotos.carId,
      r2Key: carPhotos.r2Key,
    })
    .from(carPhotos)
    .innerJoin(cars, eq(cars.id, carPhotos.carId))
    .where(and(eq(carPhotos.id, id), eq(cars.userId, session.user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  const photo = rows[0];

  await deleteFromR2(photo.r2Key);
  await db.delete(carPhotos).where(eq(carPhotos.id, id));

  revalidatePath(`/cars/${photo.carId}`);
  return NextResponse.json({ ok: true });
}
