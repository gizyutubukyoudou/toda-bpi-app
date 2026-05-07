// Brevo（旧 Sendinblue）Transactional Email API
// SDK不要 — fetch で直接呼び出す

interface EmailRecipient {
  email: string;
  name:  string;
}

export async function sendEmail(
  to:      EmailRecipient,
  subject: string,
  html:    string
): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method:  "POST",
    headers: {
      "api-key":      process.env.BREVO_API_KEY!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name:  "火気使用届システム",
        email: process.env.BREVO_FROM_EMAIL!,
      },
      to:          [{ email: to.email, name: to.name }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo sendEmail failed: ${res.status} ${body}`);
  }
}
