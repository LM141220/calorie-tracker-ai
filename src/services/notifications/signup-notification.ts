import "server-only";

import { getAppUrl } from "@/lib/supabase/env";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export async function notifyAdminOfSignup(input: {
  email: string;
  userId: string;
  requestedAt: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.APPROVAL_NOTIFICATION_EMAIL;

  if (!apiKey || !from || !to) {
    console.error(
      "Signup notification was not sent: configure RESEND_API_KEY, RESEND_FROM_EMAIL, and APPROVAL_NOTIFICATION_EMAIL.",
    );
    return;
  }

  let appUrl: string;
  try {
    appUrl = getAppUrl();
  } catch (error) {
    console.error(
      "Signup notification cannot build its administration link.",
      error,
    );
    return;
  }
  const adminUrl = `${appUrl}/admin/approvals`;
  const email = escapeHtml(input.email);
  const userId = escapeHtml(input.userId);
  const requestedAt = escapeHtml(
    new Date(input.requestedAt).toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "UTC",
    }),
  );

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lumo-account-approval:${input.userId}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Nouvelle demande d’accès à Lumo",
        html: [
          "<h1>Nouvelle demande d’accès</h1>",
          `<p><strong>E-mail :</strong> ${email}</p>`,
          `<p><strong>Date de demande (UTC) :</strong> ${requestedAt}</p>`,
          `<p><strong>Identifiant Supabase :</strong> ${userId}</p>`,
          `<p><a href="${escapeHtml(adminUrl)}">Ouvrir l’administration</a></p>`,
        ].join(""),
        text: [
          "Nouvelle demande d’accès à Lumo",
          `E-mail : ${input.email}`,
          `Date de demande (UTC) : ${requestedAt}`,
          `Identifiant Supabase : ${input.userId}`,
          `Administration : ${adminUrl}`,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Signup notification request failed.", error);
    return;
  }

  if (!response.ok) {
    console.error("Signup notification provider returned an error.", {
      status: response.status,
    });
  }
}
