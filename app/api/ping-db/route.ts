import { prisma } from "@/lib/db/client";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Database ping failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
