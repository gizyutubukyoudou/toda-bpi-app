import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyTokenAndGetProfile } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requester = await verifyTokenAndGetProfile(token);
  if (!requester || requester.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    email: string;
    displayName: string;
    role: "supervisor" | "contractor";
    company: string;
    workSiteName: string;
  };

  const { email, displayName, role, company, workSiteName } = body;
  if (!email || !displayName || !role || !company || !workSiteName) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const admin = getAdminClient();

  // 既存ユーザー確認（profiles + Auth の両方をチェック）
  const { data: existing } = await admin
    .from("profiles").select("id").eq("email", email).single();
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスはすでに登録されています" }, { status: 409 });
  }
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers();
  if (authUsers.some((u) => u.email === email)) {
    // profiles になくても Auth に残っている場合は削除してから再作成
    const orphan = authUsers.find((u) => u.email === email)!;
    await admin.auth.admin.deleteUser(orphan.id);
  }

  const tempPassword = generatePassword();

  // Supabase Auth にユーザー作成
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? "ユーザー作成に失敗しました" }, { status: 500 });
  }

  // profiles テーブルに登録
  const { error: profileError } = await admin.from("profiles").insert({
    id:            authUser.user.id,
    email,
    display_name:  displayName,
    role,
    company,
    work_site_name: workSiteName,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: "プロフィール作成に失敗しました" }, { status: 500 });
  }

  const roleLabel = role === "supervisor" ? "担当職員" : "協力会社（火元責任者）";

  // 招待メール送信
  try {
    await sendEmail(
      { email, name: displayName },
      `【火気使用届システム】アカウント登録のご案内 — ${workSiteName}`,
      `<p>${displayName} 様</p>
      <p>火気使用届システムのアカウントが作成されました。</p>
      <table style="border-collapse:collapse;font-size:14px;margin:12px 0">
        <tr><td style="padding:4px 16px 4px 0;color:#666">作業所</td><td>${workSiteName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">役職</td><td>${roleLabel}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">ログインID</td><td>${email}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">初期パスワード</td><td style="font-family:monospace;font-size:16px;font-weight:bold">${tempPassword}</td></tr>
      </table>
      <p>初回ログイン後にパスワードを変更してください。</p>
      <p><a href="${APP_URL}/login" style="background:#1E40AF;color:#fff;padding:10px 24px;text-decoration:none;border-radius:4px;display:inline-block">ログインする →</a></p>
      <p style="color:#999;font-size:12px;margin-top:16px">このメールに心当たりがない場合はお手数ですがご連絡ください。</p>`
    );
  } catch (mailErr) {
    console.error("招待メール送信失敗:", mailErr);
    return NextResponse.json(
      { error: `アカウントは作成しましたが招待メールの送信に失敗しました: ${(mailErr as Error).message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId: authUser.user.id });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requester = await verifyTokenAndGetProfile(token);
  if (!requester || requester.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (!userId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = getAdminClient();

  // 同じ作業所のメンバーか確認（所長が他作業所のユーザーを削除できないようにする）
  const { data: target } = await admin
    .from("profiles")
    .select("role, work_site_name")
    .eq("id", userId)
    .single();
  if (!target || target.work_site_name !== requester.work_site_name || target.role === "manager") {
    return NextResponse.json({ error: "削除できません" }, { status: 403 });
  }

  // 外部キー制約対策: このユーザーが提出した申請を先に削除
  await admin.from("applications").delete().eq("submitted_by", userId);

  const { error: profileDeleteError } = await admin
    .from("profiles").delete().eq("id", userId);
  if (profileDeleteError) {
    return NextResponse.json({ error: `プロフィール削除失敗: ${profileDeleteError.message}` }, { status: 500 });
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return NextResponse.json({ error: `認証ユーザー削除失敗: ${authDeleteError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requester = await verifyTokenAndGetProfile(token);
  if (!requester || requester.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, display_name, role, company, work_site_name, created_at")
    .eq("work_site_name", requester.work_site_name)
    .neq("role", "manager")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
