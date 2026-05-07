import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

admin.initializeApp();
const db = admin.firestore();

// ─── SendGrid ────────────────────────────────────────────────────────────────

const FROM_EMAIL  = "noreply@kaiki-app.example.com";
const FROM_NAME   = "火気使用届システム";

function initSendGrid() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY not set");
  sgMail.setApiKey(key);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | "draft" | "submitted" | "supervisor_reviewing" | "manager_reviewing"
  | "approved" | "rejected";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft:                "下書き",
  submitted:            "承認待ち",
  supervisor_reviewing: "監督確認中",
  manager_reviewing:    "所長確認中",
  approved:             "承認済み",
  rejected:             "差し戻し",
};

// Checkbox fields → Japanese labels (used in email body)
const CHECKBOX_FIELDS: Record<string, string> = {
  fw_gasCutting:           "ガス溶接・切断",
  fw_gasCompression:       "ガス圧接",
  fw_arcWelding:           "アーク溶接",
  fw_grinder:              "グラインダー類",
  fw_highSpeedCutter:      "高速カッター",
  fw_torch:                "トーチランプ",
  fw_solderingIron:        "電気コテ",
  fw_dryer:                "ドライヤー",
  fw_jetHeater:            "ジェットヒーター",
  fw_other:                "その他（内燃機関他）",
  cb_polystyrene:          "ポリスチレンフォーム",
  cb_rigidUrethane:        "硬質ウレタンフォーム",
  cb_styrofoam:            "発泡スチロール",
  cb_refrigerantInsulation:"冷媒配管用保温材",
  cb_organicSolvent:       "有機溶剤",
  cb_petroleum:            "石油類",
  cb_gasType:              "ガス類（アセチレン・プロパン）",
  cb_sprayCan:             "スプレー缶",
  cb_cardboard:            "段ボール・紙",
  cb_polyethylene:         "ポリエチレンシート他",
  cb_woodWaste:            "木くず・鉋屑他",
  cb_clothThread:          "布・糸類",
  cb_asphalt:              "アスファルト防水",
  cb_urethane:             "ウレタン防水",
  cb_plywood:              "コンパネ・桟木",
  cb_oil:                  "油類",
  cb_furniture:            "家具・木製加工品",
  cb_plastic:              "プラスチック等",
  cb_none:                 "可燃物なし",
  env_belowSleeve:         "スリーブ等の下に可燃物あり",
  env_wallOpening:         "壁開口・火の粉が落ちる空間に可燃物あり",
  env_outdoorBelow:        "屋外作業・火の粉が落ちる下に可燃物あり",
  fp_nonFlammableCovering: "不燃材で養生（スパッタシート・鉄板）",
  fp_closeOpening:         "開口部をふさぐ（鉄板等）",
  fp_waterSpray:           "作業前・作業中に散水",
  fp_removeInsulation:     "飛散範囲の断熱材を除去",
  fp_enclose:              "火気使用場所を囲う",
  fp_moveCombustibles:     "可燃物を範囲外に移動",
  fp_noFlammable:          "作業場所に可燃物無し・消火用具携行",
  fe_fireExtinguisher:     "消火器",
  fe_fireBucket:           "防火バケツ",
  fe_fireSand:             "防火砂",
  fe_wetSpatterSheet:      "濡らしたスパッタシート",
};

function extractCheckedItems(data: admin.firestore.DocumentData): string[] {
  return Object.entries(CHECKBOX_FIELDS)
    .filter(([field]) => data[field] === true)
    .map(([, label]) => label);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getReviewerEmails(workSiteName: string): Promise<{
  supervisors: string[];
  managers: string[];
}> {
  const snap = await db
    .collection("users")
    .where("workSiteName", "==", workSiteName)
    .get();

  const supervisors: string[] = [];
  const managers: string[]    = [];
  snap.docs.forEach((d) => {
    const { role, email } = d.data() as { role: string; email: string };
    if (role === "supervisor") supervisors.push(email);
    if (role === "manager")    managers.push(email);
  });
  return { supervisors, managers };
}

async function getSubmitterEmail(uid: string): Promise<string | null> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return (snap.data() as { email: string }).email ?? null;
}

// ─── submitApplication ───────────────────────────────────────────────────────
// draft → submitted; 監督・所長に同時メール通知 (FR-003)

export const submitApplication = functions
  .region("asia-northeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "要認証");

    const { appId } = data as { appId: string };
    const ref       = db.collection("applications").doc(appId);
    const snap      = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "申請が見つかりません");

    const app = snap.data()!;
    if (app.submittedBy !== context.auth.uid)
      throw new functions.https.HttpsError("permission-denied", "権限がありません");
    if (app.status !== "draft" && app.status !== "rejected")
      throw new functions.https.HttpsError("failed-precondition", "提出できないステータスです");

    await ref.update({
      status:      "submitted" as ApplicationStatus,
      updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
    });

    // メール送信 (FR-003): 監督・所長に同時通知
    try {
      initSendGrid();
      const { supervisors, managers } = await getReviewerEmails(app.workSiteName);
      const recipients = [...supervisors, ...managers];
      if (recipients.length > 0) {
        const checkedItems = extractCheckedItems(app);
        const itemList     = checkedItems.length > 0
          ? checkedItems.map((i) => `  ・${i}`).join("\n")
          : "  （なし）";

        const html = `
<p>火気使用届の申請が提出されました。</p>
<table style="border-collapse:collapse;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">作業所名</td><td>${app.workSiteName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">会社名</td><td>${app.submitterCompany}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">使用日</td><td>${app.useDate}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">使用時刻</td><td>${app.useStartTime} 〜 ${app.useEndTime}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">作業場所</td><td>${app.workLocation}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">火元責任者</td><td>${app.fireChiefName}</td></tr>
</table>
<p style="margin-top:12px"><strong>チェック済み項目：</strong></p>
<pre style="font-size:13px;background:#f9fafb;padding:8px;border-radius:4px">${itemList}</pre>
<p><a href="${process.env.APP_URL}/apply/${appId}/review" style="color:#1e40af">→ アプリで確認する</a></p>
`;
        await sgMail.sendMultiple({
          to:      recipients,
          from:    { email: FROM_EMAIL, name: FROM_NAME },
          subject: `【火気使用届】申請あり: ${app.submitterCompany} / ${app.useDate}`,
          html,
        });
      }
    } catch (e) {
      functions.logger.error("submitApplication: mail error", e);
    }

    return { success: true };
  });

// ─── approveSupervisor ───────────────────────────────────────────────────────
// submitted → supervisor_reviewing → manager_reviewing; 所長に行動促進メール (FR-005)

export const approveSupervisor = functions
  .region("asia-northeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "要認証");

    const { appId, comment } = data as { appId: string; comment?: string };
    const ref  = db.collection("applications").doc(appId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "申請が見つかりません");

    const app = snap.data()!;
    if (app.status !== "submitted" && app.status !== "supervisor_reviewing")
      throw new functions.https.HttpsError("failed-precondition", "承認できないステータスです");

    await ref.update({
      status:                  "manager_reviewing" as ApplicationStatus,
      supervisorApprovedAt:    admin.firestore.FieldValue.serverTimestamp(),
      supervisorApprovedBy:    context.auth.uid,
      supervisorComment:       comment ?? "",
      updatedAt:               admin.firestore.FieldValue.serverTimestamp(),
    });

    // FR-005: 所長向け行動促進メール
    try {
      initSendGrid();
      const { managers } = await getReviewerEmails(app.workSiteName);
      if (managers.length > 0) {
        const html = `
<p>監督の確認が完了しました。所長による最終承認をお願いします。</p>
<table style="border-collapse:collapse;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">作業所名</td><td>${app.workSiteName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">会社名</td><td>${app.submitterCompany}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">使用日</td><td>${app.useDate}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">作業場所</td><td>${app.workLocation}</td></tr>
</table>
<p><a href="${process.env.APP_URL}/apply/${appId}/review" style="color:#1e40af">→ アプリで承認する</a></p>
`;
        await sgMail.sendMultiple({
          to:      managers,
          from:    { email: FROM_EMAIL, name: FROM_NAME },
          subject: `【火気使用届】所長承認をお願いします: ${app.submitterCompany} / ${app.useDate}`,
          html,
        });
      }
    } catch (e) {
      functions.logger.error("approveSupervisor: mail error", e);
    }

    return { success: true };
  });

// ─── rejectSupervisor ────────────────────────────────────────────────────────

export const rejectSupervisor = functions
  .region("asia-northeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "要認証");

    const { appId, comment } = data as { appId: string; comment: string };
    if (!comment?.trim()) throw new functions.https.HttpsError("invalid-argument", "差し戻し理由が必要です");

    const ref  = db.collection("applications").doc(appId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "申請が見つかりません");

    const app = snap.data()!;
    await ref.update({
      status:           "rejected" as ApplicationStatus,
      rejectionComment: comment,
      rejectedAt:       admin.firestore.FieldValue.serverTimestamp(),
      rejectedBy:       context.auth.uid,
      updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
    });

    // FR-009: 申請者へ差し戻し通知
    await sendRejectionMail(appId, app, comment);
    return { success: true };
  });

// ─── approveManager ──────────────────────────────────────────────────────────

export const approveManager = functions
  .region("asia-northeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "要認証");

    const { appId, comment } = data as { appId: string; comment?: string };
    const ref  = db.collection("applications").doc(appId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "申請が見つかりません");

    const app = snap.data()!;
    if (app.status !== "manager_reviewing")
      throw new functions.https.HttpsError("failed-precondition", "承認できないステータスです");

    await ref.update({
      status:             "approved" as ApplicationStatus,
      managerApprovedAt:  admin.firestore.FieldValue.serverTimestamp(),
      managerApprovedBy:  context.auth.uid,
      updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
    });

    // 申請者へ承認完了通知
    try {
      initSendGrid();
      const submitterEmail = await getSubmitterEmail(app.submittedBy);
      if (submitterEmail) {
        await sgMail.send({
          to:      submitterEmail,
          from:    { email: FROM_EMAIL, name: FROM_NAME },
          subject: `【火気使用届】承認されました: ${app.useDate} ${app.workLocation}`,
          html: `
<p>申請が承認されました。</p>
<table style="border-collapse:collapse;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">使用日</td><td>${app.useDate} ${app.useStartTime}〜${app.useEndTime}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">作業場所</td><td>${app.workLocation}</td></tr>
  ${comment ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">コメント</td><td>${comment}</td></tr>` : ""}
</table>
<p><a href="${process.env.APP_URL}/apply/${appId}" style="color:#1e40af">→ 申請を確認する</a></p>
`,
        });
      }
    } catch (e) {
      functions.logger.error("approveManager: mail error", e);
    }

    return { success: true };
  });

// ─── rejectManager ───────────────────────────────────────────────────────────

export const rejectManager = functions
  .region("asia-northeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "要認証");

    const { appId, comment } = data as { appId: string; comment: string };
    if (!comment?.trim()) throw new functions.https.HttpsError("invalid-argument", "差し戻し理由が必要です");

    const ref  = db.collection("applications").doc(appId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "申請が見つかりません");

    const app = snap.data()!;
    await ref.update({
      status:           "rejected" as ApplicationStatus,
      rejectionComment: comment,
      rejectedAt:       admin.firestore.FieldValue.serverTimestamp(),
      rejectedBy:       context.auth.uid,
      updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendRejectionMail(appId, app, comment);
    return { success: true };
  });

// ─── resubmitApplication ─────────────────────────────────────────────────────

export const resubmitApplication = functions
  .region("asia-northeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "要認証");

    const { appId } = data as { appId: string };
    const ref       = db.collection("applications").doc(appId);
    const snap      = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "申請が見つかりません");

    const app = snap.data()!;
    if (app.submittedBy !== context.auth.uid)
      throw new functions.https.HttpsError("permission-denied", "権限がありません");
    if (app.status !== "rejected")
      throw new functions.https.HttpsError("failed-precondition", "再提出できないステータスです");

    await ref.update({
      status:           "submitted" as ApplicationStatus,
      rejectionComment: admin.firestore.FieldValue.delete(),
      rejectedAt:       admin.firestore.FieldValue.delete(),
      rejectedBy:       admin.firestore.FieldValue.delete(),
      updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
    });

    // 再提出通知（submitApplication と同じメール）
    try {
      initSendGrid();
      const { supervisors, managers } = await getReviewerEmails(app.workSiteName);
      const recipients = [...supervisors, ...managers];
      if (recipients.length > 0) {
        await sgMail.sendMultiple({
          to:      recipients,
          from:    { email: FROM_EMAIL, name: FROM_NAME },
          subject: `【火気使用届】再提出あり: ${app.submitterCompany} / ${app.useDate}`,
          html: `<p>差し戻し後の再提出がありました。</p><p><a href="${process.env.APP_URL}/apply/${appId}/review">→ アプリで確認する</a></p>`,
        });
      }
    } catch (e) {
      functions.logger.error("resubmitApplication: mail error", e);
    }

    return { success: true };
  });

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function sendRejectionMail(
  appId: string,
  app: admin.firestore.DocumentData,
  comment: string
): Promise<void> {
  try {
    initSendGrid();
    const submitterEmail = await getSubmitterEmail(app.submittedBy as string);
    if (!submitterEmail) return;

    await sgMail.send({
      to:      submitterEmail,
      from:    { email: FROM_EMAIL, name: FROM_NAME },
      subject: `【火気使用届】差し戻し: ${app.useDate} ${app.workLocation}`,
      html: `
<p>申請が差し戻されました。理由を確認の上、修正して再提出してください。</p>
<table style="border-collapse:collapse;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">使用日</td><td>${app.useDate}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280">作業場所</td><td>${app.workLocation}</td></tr>
</table>
<p style="margin-top:12px"><strong>差し戻し理由：</strong></p>
<blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#991b1b">${comment}</blockquote>
<p><a href="${process.env.APP_URL}/apply/${appId}/edit" style="color:#1e40af">→ 修正して再提出する</a></p>
`,
    });
  } catch (e) {
    functions.logger.error("sendRejectionMail error", e);
  }
}
