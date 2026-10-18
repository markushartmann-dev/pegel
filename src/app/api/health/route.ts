import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** Healthcheck für Docker: prüft, ob die Datenbank erreichbar ist. Gibt keine internen Details preis. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
