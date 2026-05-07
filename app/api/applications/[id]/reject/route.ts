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
  const user = { id: reviewer.id };

  const admin = getAdminClient();
  const appId = params.id;
  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const REJECTABLE = [
    "submitted", "manager_pre_approved", "pre_work_checked",
    "supervisor_pre_approved", "fire_chief_in_progress",
    "in_progress", "completion_reported", "final_approval_pending",
  ];
  if (!REJECTABLE.includes(row.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { comment } = await req.json();
  if (!comment?.trim()) {
    return NextResponse.json({ error: "Comment required" }, { status: 400 });
  }

  await admin.from("applications").update({
    status:            "rejected",
    rejection_comment: comment,
    rejected_at:       new Date().toISOString(),
    rejected_by:       user.id,
  }).eq("id", appId);

  const { data: submitter } = await admin
    .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

  if (submitter) {
    await sendEmail(
      { email: submitter.email, name: submitter.display_name },
      `【火気使用届】差し戻しがありました — ${row.work_site_name}`,
      `
        <p>${submitter.display_name} 様</p>
        <p>火気使用届が差し戻されました。内容を修正して再提出してください。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p style="background:#FEF2F2;border-left:4px solid #EF4444;padding:8px 12px;margin:12px 0">
          <strong>差し戻し理由：</strong><br>${comment}
        </p>
        <p><a href="${APP_URL}/apply/${appId}/edit" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">修正して再提出する →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
