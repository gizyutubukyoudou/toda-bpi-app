import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyApprovalToken } from "@/lib/approval-token";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const appId = params.id;

  const html = (title: string, msg: string, isError = false) => `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f9ff}
.card{background:#fff;border-radius:12px;padding:48px 40px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,.1);max-width:400px}
h1{font-size:22px;color:${isError ? "#dc2626" : "#16a34a"};margin-bottom:12px}p{color:#555;font-size:15px;line-height:1.6}
a{display:inline-block;margin-top:20px;background:#1E40AF;color:#fff;padding:10px 28px;text-decoration:none;border-radius:6px;font-size:14px}</style>
</head><body><div class="card"><h1>${isError ? "✗" : "✓"} ${title}</h1><p>${msg}</p>
${!isError ? `<a href="${APP_URL}/apply/${appId}">申請詳細を見る</a>` : ""}
</div></body></html>`;

  if (!email || !token) {
    return new NextResponse(html("無効なリンク", "リンクが不正です。", true), {
      status: 400, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!verifyApprovalToken(appId, email, token)) {
    return new NextResponse(html("無効なリンク", "リンクが不正または改ざんされています。", true), {
      status: 401, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const admin = getAdminClient();

  const { data: reviewer } = await admin.from("profiles").select("*").eq("email", email).single();
  if (!reviewer) {
    return new NextResponse(html("エラー", "アカウントが見つかりません。", true), {
      status: 404, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { data: row } = await admin.from("applications").select("*").eq("id", appId).single();
  if (!row) {
    return new NextResponse(html("エラー", "申請が見つかりません。", true), {
      status: 404, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 所長事前承認（簡略ワークフロー）
  if (reviewer.role === "manager" && row.status === "submitted" && row.workflow_type === "simplified") {
    const now = new Date().toISOString();
    await admin.from("applications").update({
      status:                     "simplified_pre_approved",
      manager_pre_approved_at:    now,
      manager_pre_approved_by:    reviewer.id,
      supervisor_pre_approved_at: now,
      supervisor_pre_approved_by: reviewer.id,
    }).eq("id", appId);

    const { data: submitter } = await admin
      .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

    if (submitter) {
      await sendEmail(
        { email: submitter.email, name: submitter.display_name },
        `【火気使用届】事前承認されました — ${row.work_site_name}`,
        `<p>${submitter.display_name} 様</p>
        <p>所長が火気使用届を事前承認しました。作業終了後、点検・終了報告を記入してください。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date} / 作業場所: ${row.work_location}</p>
        <p><a href="${APP_URL}/apply/${appId}/simplified-progress" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">点検・終了報告へ →</a></p>`
      ).catch(console.error);
    }

    return new NextResponse(html("事前承認が完了しました", `${row.work_site_name} / ${row.use_date} の申請を承認しました。申請者に通知メールを送信しました。`), {
      status: 200, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 所長事前承認（正規ワークフロー）
  if (reviewer.role === "manager" && row.status === "submitted") {
    const instructions =
      "火器作業開始前点検は火元責任者、担当社員が実施\n作業中点検は、立ち合い・巡回で実施";

    await admin.from("applications").update({
      status:                   "manager_pre_approved",
      manager_pre_instructions: instructions,
      manager_pre_approved_at:  new Date().toISOString(),
      manager_pre_approved_by:  reviewer.id,
    }).eq("id", appId);

    const { data: submitter } = await admin
      .from("profiles").select("email, display_name").eq("id", row.submitted_by).single();

    if (submitter) {
      await sendEmail(
        { email: submitter.email, name: submitter.display_name },
        `【火気使用届】所長が事前承認しました — ${row.work_site_name}`,
        `<p>${submitter.display_name} 様</p>
        <p>所長が火気使用届を事前承認しました。作業直前に現地確認チェックリストを記入してください。</p>
        <p>作業所: ${row.work_site_name} / 使用日: ${row.use_date}</p>
        <p><a href="${APP_URL}/apply/${appId}/pre-check" style="background:#1E40AF;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">現地確認へ →</a></p>`
      ).catch(console.error);
    }

    return new NextResponse(html("事前承認が完了しました", `${row.work_site_name} / ${row.use_date} の申請を承認しました。申請者に通知メールを送信しました。`), {
      status: 200, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // すでに処理済み
  if (reviewer.role === "manager" && row.status !== "submitted") {
    return new NextResponse(html("処理済み", "この申請はすでに処理されています。"), {
      status: 200, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(html("操作不可", "現在のステータスでは承認できません。", true), {
    status: 400, headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
