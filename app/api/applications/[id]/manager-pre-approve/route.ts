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
  if (!reviewer || reviewer.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();
  const appId = params.id;
  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row || row.status !== "submitted") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { instructions?: string };
  const defaultInstructions =
    "火器作業開始前点検は火元責任者、担当社員が実施\n作業中点検は、立ち合い・巡回で実施";
  const instructions = body.instructions ?? defaultInstructions;

  await admin.from("applications").update({
    status:                   "manager_pre_approved",
    manager_pre_instructions: instructions,
    manager_pre_approved_at:  new Date().toISOString(),
    manager_pre_approved_by:  reviewer.id,
  }).eq("id", appId);

  // 申請者（火元責任者）に現地確認依頼メール
  const { data: submitter } = await admin
    .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

  if (submitter) {
    await sendEmail(
      { email: submitter.email, name: submitter.display_name },
      `【火気使用届】所長が事前承認しました — ${row.work_site_name}`,
      `
        <p>${submitter.display_name} 様</p>
        <p>所長が火気使用届を事前承認しました。作業直前に現地確認チェックリストを記入してください。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p><a href="${APP_URL}/apply/${appId}/pre-check" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">現地確認へ →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
