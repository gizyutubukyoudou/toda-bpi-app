import { createHmac } from "crypto";

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

export function createApprovalToken(appId: string, email: string): string {
  return createHmac("sha256", secret()).update(`${appId}:${email}`).digest("hex");
}

export function verifyApprovalToken(appId: string, email: string, token: string): boolean {
  const expected = createApprovalToken(appId, email);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}
