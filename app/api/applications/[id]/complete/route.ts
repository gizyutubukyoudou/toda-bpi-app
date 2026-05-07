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

  const user = await verifyTokenAndGetProfile(token);
  if (!user || user.role !== "contractor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();
  const appId = params.id;
  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row || row.submitted_by !== user.id || row.status !== "in_progress") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { completionTime?: string };
  if (!body.completionTime?.trim()) {
    return NextResponse.json({ error: "作業終了時刻を入力してください" }, { status: 400 });
  }

  await admin.from("applications").update({
    status:               "completion_reported",
    completion_time:      body.completionTime,
    completion_reported_at: new Date().toISOString(),
    completion_reported_by: user.id,
  }).eq("id", appId);

  // 担当職員に残火確認依頼
  const { data: supervisors } = await admin
    .from("profiles").select("email, display_name")
    .eq("work_site_name", row.work_site_name).eq("role", "supervisor");

  for (const sup of supervisors ?? []) {
    await sendEmail(
      { email: sup.email, name: sup.display_name },
      `【火気使用届】作業終了 — 残火確認をお願いします（${row.work_site_name}）`,
      `
        <p>${sup.display_name} 様</p>
        <p>火元責任者が作業終了を報告しました。残火確認をお願いします。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date} / 終了時刻: ${body.completionTime}</p>
        <p><a href="${APP_URL}/apply/${appId}/residual" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">残火確認へ →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
