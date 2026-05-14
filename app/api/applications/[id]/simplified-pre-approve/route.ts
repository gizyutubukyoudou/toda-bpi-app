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
  if (!reviewer || !["supervisor", "manager"].includes(reviewer.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();
  const appId = params.id;
  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row || row.status !== "submitted" || row.workflow_type !== "simplified") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  const now = new Date().toISOString();
  await admin.from("applications").update({
    status:                    "simplified_pre_approved",
    manager_pre_approved_at:   now,
    manager_pre_approved_by:   reviewer.id,
    // ③ 自動承認（担当職員直前承認は①で代替）
    supervisor_pre_approved_at: now,
    supervisor_pre_approved_by: reviewer.id,
  }).eq("id", appId);

  // 申請者（協力会社）に作業開始許可メール
  const { data: submitter } = await admin
    .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

  if (submitter) {
    await sendEmail(
      { email: submitter.email, name: submitter.display_name },
      `【火気使用届】事前承認されました — ${row.work_site_name}`,
      `<p>${submitter.display_name} 様</p>
      <p>火気使用届が承認されました。作業終了後、点検・終了報告を記入してください。</p>
      <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date} / 作業場所: ${row.work_location}</p>
      <p><a href="${APP_URL}/apply/${appId}/simplified-progress" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">点検・終了報告へ →</a></p>`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
