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
  if (!row || row.status !== "pre_work_checked") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  await admin.from("applications").update({
    status:                      "supervisor_pre_approved",
    supervisor_pre_approved_at:  new Date().toISOString(),
    supervisor_pre_approved_by:  reviewer.id,
  }).eq("id", appId);

  // 申請者（火元責任者）に作業開始通知
  const { data: submitter } = await admin
    .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

  if (submitter) {
    await sendEmail(
      { email: submitter.email, name: submitter.display_name },
      `【火気使用届】担当職員が直前承認しました — ${row.work_site_name}`,
      `
        <p>${submitter.display_name} 様</p>
        <p>担当職員が直前確認を承認しました。作業を開始できます。作業中は点検チェックを記入してください。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p><a href="${APP_URL}/apply/${appId}/in-progress" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">作業中点検へ →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
