import { route } from "@/server/http";
import { deleteOwnAccount } from "@/server/services/account";

export const POST = route(
  { access: "user", rateLimit: { name: "delete-account", max: 5, windowMs: 15 * 60_000 } },
  async ({ user, req }) => {
    await deleteOwnAccount(user, await req.json().catch(() => ({})), req.headers);
    const res = Response.json({ ok: true });
    // Sitzungscookie entfernen (die Sitzung existiert serverseitig nicht mehr)
    res.headers.append("set-cookie", "pegel.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    res.headers.append("set-cookie", "__Secure-pegel.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
    return res;
  },
);
