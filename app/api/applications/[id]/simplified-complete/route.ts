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

  const profile = await verifyTokenAndGetProfile(token);
  if (!profile || profile.role !== "contractor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();
  const appId = params.id;
  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row || row.submitted_by !== profile.id || row.status !== "simplified_pre_approved") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    inspectionTime?: string;
    completionTime?: string;
  };

  const now = new Date().toISOString();
  await admin.from("applications").update({
    status:                 "completion_reported",
    // ④ 作業中点検
    wp_inspection_time:     body.inspectionTime ?? "",
    wp_fire_chief_signed_at: now,
    wp_supervisor_signed_at: now,
    // ⑤ 作業終了報告
    completion_time:        body.completionTime ?? "",
    completion_reported_at: now,
    completion_reported_by: profile.id,
  }).eq("id", appId);

  // 担当者に残火確認依頼メール
  const { data: supervisors } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("work_site_name", row.work_site_name)
    .eq("role", "supervisor");

  for (const sv of supervisors ?? []) {
    await sendEmail(
      { email: sv.email, name: sv.display_name },
      `【火気使用届】残火確認をお願いします — ${row.work_site_name}`,
      `<p>${sv.display_name} 様</p>
      <p>作業が終了しました。残火確認をお願いします。</p>
      <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date} / 作業場所: ${row.work_location}</p>
      <p><a href="${APP_URL}/apply/${appId}/residual" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">残火確認へ →</a></p>`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
