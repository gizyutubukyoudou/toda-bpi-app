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

  const body = await req.json().catch(() => ({}));

  if (reviewer.role === "supervisor") {
    if (row.status !== "submitted" && row.status !== "supervisor_reviewing") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await admin.from("applications").update({
      status:                 "manager_reviewing",
      supervisor_approved_at: new Date().toISOString(),
      supervisor_approved_by: user.id,
      supervisor_comment:     body.comment ?? null,
    }).eq("id", appId);

    const { data: managers } = await admin
      .from("profiles").select("email, display_name")
      .eq("work_site_name", reviewer.work_site_name).eq("role", "manager");

    for (const mgr of managers ?? []) {
      await sendEmail(
        { email: mgr.email, name: mgr.display_name },
        `【火気使用届】担当職員確認済み — ${row.work_site_name}`,
        `
          <p>${mgr.display_name} 様</p>
          <p>担当職員が火気使用届を確認しました。所長の最終承認をお願いします。</p>
          <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
          <p><a href="${APP_URL}/apply/${appId}/review" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">承認する →</a></p>
        `
      ).catch(console.error);
    }

  } else {
    if (row.status !== "manager_reviewing") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await admin.from("applications").update({
      status:              "approved",
      manager_approved_at: new Date().toISOString(),
      manager_approved_by: user.id,
      inspector_type:      body.inspectorType ?? null,
      inspection_method:   body.inspectionMethod ?? null,
      other_instructions:  body.otherInstructions ?? null,
    }).eq("id", appId);

    const { data: submitter } = await admin
      .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

    if (submitter) {
      await sendEmail(
        { email: submitter.email, name: submitter.display_name },
        `【火気使用届】承認されました — ${row.work_site_name}`,
        `
          <p>${submitter.display_name} 様</p>
          <p>火気使用届が承認されました。</p>
          <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date} / 作業場所: ${row.work_location}</p>
          <p><a href="${APP_URL}/apply/${appId}" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">詳細を確認する →</a></p>
        `
      ).catch(console.error);
    }
  }

  return NextResponse.json({ success: true });
}
