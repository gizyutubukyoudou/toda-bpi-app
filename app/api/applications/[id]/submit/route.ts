import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyTokenAndGetProfile } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import { rowToApp } from "@/lib/db";
import { extractCheckedItems } from "@/lib/types";

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
  if (!row || row.submitted_by !== user.id || row.status !== "draft") {
    return NextResponse.json({ error: "Not found or invalid status" }, { status: 404 });
  }

  await admin.from("applications").update({ status: "submitted" }).eq("id", appId);

  const { data: reviewers } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("work_site_name", row.work_site_name)
    .in("role", ["supervisor", "manager"]);

  const { data: submitter } = await admin
    .from("profiles")
    .select("display_name, company")
    .eq("id", user.id)
    .single();

  const app     = rowToApp(row as Record<string, unknown>);
  const items   = extractCheckedItems(app);
  const itemHtml = items.map((i) => `<li>${i}</li>`).join("");

  for (const reviewer of reviewers ?? []) {
    await sendEmail(
      { email: reviewer.email, name: reviewer.display_name },
      `【火気使用届】新規申請が届きました — ${row.work_site_name}`,
      `
        <p>${reviewer.display_name} 様</p>
        <p>以下の火気使用届が提出されました。確認をお願いします。</p>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#666">申請者</td><td>${submitter?.display_name ?? ""}（${submitter?.company ?? ""}）</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">作業所</td><td>${row.work_site_name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">使用日</td><td>${row.use_date}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">作業場所</td><td>${row.work_location}</td></tr>
        </table>
        <p style="margin-top:12px">チェック済み項目：</p>
        <ul style="font-size:14px">${itemHtml}</ul>
        <p><a href="${APP_URL}/apply/${appId}/review" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">確認する →</a></p>
      `
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
