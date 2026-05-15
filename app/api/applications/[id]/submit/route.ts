import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyTokenAndGetProfile } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import { rowToApp } from "@/lib/db";
import { extractCheckedBySection } from "@/lib/types";
import { createApprovalToken } from "@/lib/approval-token";

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

  // 簡略ワークフロー：提出時に pcCheckedAt をセット（提出=現地確認済み）
  const updatePayload: Record<string, unknown> = { status: "submitted" };
  if (row.workflow_type === "simplified") {
    updatePayload.pc_checked_at = new Date().toISOString();
    updatePayload.pc_checked_by = user.id;
  }
  await admin.from("applications").update(updatePayload).eq("id", appId);

  const { data: reviewers } = await admin
    .from("profiles")
    .select("email, display_name, role")
    .eq("work_site_name", row.work_site_name)
    .in("role", ["supervisor", "manager"]);

  const { data: submitter } = await admin
    .from("profiles")
    .select("display_name, company")
    .eq("id", user.id)
    .single();

  const app      = rowToApp(row as Record<string, unknown>);
  const sections = extractCheckedBySection(app);

  const sectionHtml = (label: string, items: string[]) =>
    items.length === 0 ? "" :
    `<tr><td style="padding:6px 12px 2px 0;color:#666;vertical-align:top;white-space:nowrap">${label}</td>
     <td style="padding:6px 0 2px 0">${items.join("、")}</td></tr>`;

  const isSimplified = row.workflow_type === "simplified";

  const infoTableHtml = `
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:12px">
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">申請者</td><td>${submitter?.display_name ?? ""}（${submitter?.company ?? ""}）</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">作業所</td><td>${row.work_site_name}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">使用日</td><td>${row.use_date}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">作業時間</td><td>${row.use_start_time} 〜 ${row.use_end_time}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">作業場所</td><td>${row.work_location}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">火元責任者</td><td>${row.fire_chief_name}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">作業員</td><td>${row.fire_worker_name}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">監視員</td><td>${row.watchman_name}（${row.watchman_company}）</td></tr>
      ${Array.isArray(row.selected_supervisors) && row.selected_supervisors.length > 0
        ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">担当者</td><td>${(row.selected_supervisors as string[]).join("、")}</td></tr>`
        : ""}
      ${Array.isArray(row.work_content_types) && row.work_content_types.length > 0
        ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">作業内容</td><td>${(row.work_content_types as string[]).join("・")}${row.work_content_other ? `（${row.work_content_other}）` : ""}</td></tr>`
        : row.work_content_other
        ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">作業内容</td><td>${row.work_content_other}</td></tr>`
        : ""}
    </table>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
      ${sectionHtml("火気作業", sections.fireWork)}
      ${sectionHtml("可燃物", sections.combustibles)}
      ${sectionHtml("作業環境", sections.environment)}
      ${sectionHtml("防火対策", sections.prevention)}
      ${sectionHtml("消火設備", sections.equipment)}
    </table>`;

  for (const reviewer of reviewers ?? []) {
    const isManager = reviewer.role === "manager";

    let actionHtml: string;
    if (isSimplified) {
      // 簡略ワークフロー: 担当者・所長ともにアプリ内承認ページへ誘導
      const label = isManager ? "事前承認をお願いします。" : "事前承認または内容確認をお願いします。";
      actionHtml = `<p>以下の火気使用届（簡略ワークフロー）が提出されました。${label}</p>
        ${infoTableHtml}
        <p><a href="${APP_URL}/apply/${appId}/simplified-pre" style="background:#16a34a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold">① 事前承認する →</a>
           &nbsp;&nbsp;<a href="${APP_URL}/apply/${appId}" style="background:#1E40AF;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">詳細を確認する →</a></p>`;
    } else {
      // 正規ワークフロー: 所長はメールワンクリック承認、担当者は確認のみ
      const approveToken = createApprovalToken(appId, reviewer.email);
      const approveUrl   = `${APP_URL}/api/applications/${appId}/email-approve?email=${encodeURIComponent(reviewer.email)}&token=${approveToken}`;
      const label = isManager ? "事前承認をお願いします。" : "内容を確認してください。";
      actionHtml = `<p>以下の火気使用届が提出されました。${label}</p>
        ${infoTableHtml}
        ${isManager
          ? `<p><a href="${approveUrl}" style="background:#16a34a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold">事前承認する →</a>
             &nbsp;&nbsp;<a href="${APP_URL}/apply/${appId}" style="background:#1E40AF;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">詳細を確認する →</a></p>`
          : `<p><a href="${APP_URL}/apply/${appId}" style="background:#1E40AF;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">確認する →</a></p>`
        }`;
    }

    await sendEmail(
      { email: reviewer.email, name: reviewer.display_name },
      `【火気使用届】新規申請が届きました — ${row.work_site_name}`,
      `<p>${reviewer.display_name} 様</p>${actionHtml}`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
