import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyTokenAndGetProfile } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviewer = await verifyTokenAndGetProfile(token);
  if (!reviewer || reviewer.role !== "supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();
  const appId = params.id;
  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row || row.status !== "fire_chief_in_progress") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { residualCheckTime?: string };
  if (!body.residualCheckTime?.trim()) {
    return NextResponse.json({ error: "残火確認時刻を入力してください" }, { status: 400 });
  }

  await admin.from("applications").update({
    status:                   "in_progress",
    wp_residual_check_time:   body.residualCheckTime,
    wp_supervisor_signed_at:  new Date().toISOString(),
  }).eq("id", appId);

  // 申請者に作業終了報告依頼
  const { data: submitter } = await admin
    .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

  if (submitter) {
    await sendEmail(
      { email: submitter.email, name: submitter.display_name },
      `【火気使用届】作業中点検が完了しました — ${row.work_site_name}`,
      `
        <p>${submitter.display_name} 様</p>
        <p>担当職員が作業中点検に署名しました。作業終了後は終了報告を記入してください。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p><a href="${APP_URL}/apply/${appId}/completion" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">終了報告へ →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
