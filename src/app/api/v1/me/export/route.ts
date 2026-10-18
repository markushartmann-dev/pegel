import { route } from "@/server/http";
import { exportAccount } from "@/server/services/account";

export const GET = route(
  { access: "user", activity: true, rateLimit: { name: "export", max: 5, windowMs: 60_000 } },
  async ({ user, req }) => {
    const data = await exportAccount(user, req.headers);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="pegel-export-${date}.json"`,
      },
    });
  },
);
