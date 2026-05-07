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
  if (!row || row.submitted_by !== user.id || row.status !== "manager_pre_approved") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, boolean>;

  await admin.from("applications").update({
    status:                  "pre_work_checked",
    pc_combustible_removal:  body.pcCombustibleRemoval  ?? false,
    pc_floor_protection:     body.pcFloorProtection     ?? false,
    pc_fire_equipment:       body.pcFireEquipment        ?? false,
    pc_opening_protection:   body.pcOpeningProtection   ?? false,
    pc_watchman_placement:   body.pcWatchmanPlacement   ?? false,
    pc_fire_work_display:    body.pcFireWorkDisplay      ?? false,
    pc_checked_at:           new Date().toISOString(),
    pc_checked_by:           user.id,
  }).eq("id", appId);

  // 担当職員に直前承認依頼メール
  const { data: supervisors } = await admin
    .from("profiles").select("email, display_name")
    .eq("work_site_name", row.work_site_name).eq("role", "supervisor");

  for (const sup of supervisors ?? []) {
    await sendEmail(
      { email: sup.email, name: sup.display_name },
      `【火気使用届】現地確認完了 — 直前承認をお願いします（${row.work_site_name}）`,
      `
        <p>${sup.display_name} 様</p>
        <p>火元責任者が現地確認チェックリストを記入しました。作業直前の承認をお願いします。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p><a href="${APP_URL}/apply/${appId}/supervisor-pre" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">確認・承認する →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
