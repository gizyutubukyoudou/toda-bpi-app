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
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = { id: profile.id };

  const admin = getAdminClient();
  const appId = params.id;
  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row || row.submitted_by !== user.id || row.status !== "rejected") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  await admin.from("applications").update({
    status:            "submitted",
    rejection_comment: null,
    rejected_at:       null,
    rejected_by:       null,
  }).eq("id", appId);

  const { data: submitter } = await admin
    .from("profiles").select("display_name, company, work_site_name").eq("id", user.id).single();

  const { data: reviewers } = await admin
    .from("profiles").select("email, display_name")
    .eq("work_site_name", row.work_site_name).in("role", ["supervisor", "manager"]);

  for (const reviewer of reviewers ?? []) {
    await sendEmail(
      { email: reviewer.email, name: reviewer.display_name },
      `【火気使用届】再提出がありました — ${row.work_site_name}`,
      `
        <p>${reviewer.display_name} 様</p>
        <p>火気使用届が修正・再提出されました。確認をお願いします。</p>
        <p>申請者: ${submitter?.display_name ?? ""}（${submitter?.company ?? ""}）</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p><a href="${APP_URL}/apply/${appId}/review" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">確認する →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
