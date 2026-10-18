import "server-only";
import { env } from "@/server/env";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const imprintConfigured = () => !!(env.imprint.name && env.imprint.street && env.imprint.city && env.imprint.email);

/**
 * Kontaktblock des Betreibers aus der .env (IMPRINT_*). Die E-Mail-Adresse steht zwischen
 * <!--email_off-->-Markierungen, damit die Cloudflare-Email-Obfuscation sie nicht umschreibt
 * (deren Skript würde von der Content Security Policy blockiert).
 */
export function ImprintContact() {
  const { name, street, city, country, email, phone } = env.imprint;
  const mail = escapeHtml(email);
  return (
    <address className="not-italic leading-relaxed">
      <p className="!mb-0 !text-fg">{name}</p>
      <p className="!mb-0 !text-fg">{street}</p>
      <p className="!mb-0 !text-fg">{city}</p>
      {country && <p className="!mb-0 !text-fg">{country}</p>}
      <p className="!mt-3 !mb-0 !text-fg">
        E-Mail:{" "}
        <span
          // Inhalt stammt ausschließlich aus der Server-Konfiguration und wird escaped
          dangerouslySetInnerHTML={{ __html: `<!--email_off--><a class="underline" href="mailto:${mail}">${mail}</a><!--/email_off-->` }}
        />
      </p>
      {phone && <p className="!mb-0 !text-fg">Telefon: {phone}</p>}
    </address>
  );
}
