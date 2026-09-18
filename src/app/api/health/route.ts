import { isDatabaseConfigured, pingDatabase } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = isDatabaseConfigured() && (await pingDatabase());
  return Response.json(
    {
      app: "ok",
      database: database ? "ok" : "unavailable",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
