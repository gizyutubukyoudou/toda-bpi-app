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
  if (!row || row.status !== "completion_reported") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { residualCheckTime?: string };
  if (!body.residualCheckTime?.trim()) {
    return NextResponse.json({ error: "残火確認時刻を入力してください" }, { status: 400 });
  }

  await admin.from("applications").update({
    status:               "final_approval_pending",
    residual_check_time:  body.residualCheckTime,
    residual_checked_at:  new Date().toISOString(),
    residual_checked_by:  reviewer.id,
  }).eq("id", appId);

  // 所長に最終承認依頼
  const { data: managers } = await admin
    .from("profiles").select("email, display_name")
    .eq("work_site_name", row.work_site_name).eq("role", "manager");

  for (const mgr of managers ?? []) {
    await sendEmail(
      { email: mgr.email, name: mgr.display_name },
      `【火気使用届】残火確認完了 — 最終承認をお願いします（${row.work_site_name}）`,
      `
        <p>${mgr.display_name} 様</p>
        <p>担当職員が残火確認を完了しました。最終承認をお願いします。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p><a href="${APP_URL}/apply/${appId}" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">最終承認する →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
