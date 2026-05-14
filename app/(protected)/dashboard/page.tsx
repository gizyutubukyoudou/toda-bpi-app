"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplicationsByUser, getApplicationsByWorkSite } from "@/lib/db";
import type { ApplicationData, ApplicationStatus } from "@/lib/types";
import { format, isToday, isThisWeek } from "date-fns";
import { ja } from "date-fns/locale";

type FilterTab = "pending" | "approved" | "rejected" | "all" | "progress";
type PeriodFilter = "today" | "week" | "all";

const ALL_PENDING: ApplicationStatus[] = [
  "submitted", "manager_pre_approved", "pre_work_checked",
  "supervisor_pre_approved", "fire_chief_in_progress",
  "in_progress", "completion_reported", "final_approval_pending",
  "simplified_pre_approved",
];

const FILTER_STATUSES: Record<Exclude<FilterTab, "progress">, ApplicationStatus[]> = {
  pending:  ALL_PENDING,
  approved: ["approved"],
  rejected: ["rejected"],
  all:      [],
};

const STEP_OWNER = ["火元", "所長", "火元", "担当", "両者", "火元", "担当", "所長"] as const;

const STATUS_STEP: Record<ApplicationStatus, number> = {
  draft:                   -1,
  submitted:               1,
  manager_pre_approved:    2,
  pre_work_checked:        3,
  supervisor_pre_approved: 4,
  fire_chief_in_progress:  4,
  in_progress:             5,
  completion_reported:     6,
  final_approval_pending:  7,
  approved:                  8,
  rejected:                  -1,
  simplified_pre_approved:   2,
};

const TURN_LABEL: Record<ApplicationStatus, { label: string; color: string }> = {
  draft:                   { label: "下書き",       color: "bg-gray-100 text-gray-500" },
  submitted:               { label: "所長待ち",     color: "bg-accent-100 text-accent-700" },
  manager_pre_approved:    { label: "火元責任者待ち", color: "bg-blue-100 text-blue-700" },
  pre_work_checked:        { label: "担当職員待ち",    color: "bg-purple-100 text-purple-700" },
  supervisor_pre_approved: { label: "火元責任者待ち",  color: "bg-blue-100 text-blue-700" },
  fire_chief_in_progress:  { label: "担当職員待ち",    color: "bg-purple-100 text-purple-700" },
  in_progress:             { label: "火元責任者待ち",  color: "bg-blue-100 text-blue-700" },
  completion_reported:     { label: "担当職員待ち",    color: "bg-purple-100 text-purple-700" },
  final_approval_pending:  { label: "所長待ち",      color: "bg-accent-100 text-accent-700" },
  approved:                  { label: "完了",          color: "bg-green-100 text-green-700" },
  rejected:                  { label: "差し戻し",      color: "bg-red-100 text-red-700" },
  simplified_pre_approved:   { label: "火元責任者待ち", color: "bg-blue-100 text-blue-700" },
};

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [apps,         setApps]        = useState<ApplicationData[]>([]);
  const [fetching,     setFetching]    = useState(true);
  const [activeTab,    setActiveTab]   = useState<FilterTab>("pending");
  const [period,       setPeriod]      = useState<PeriodFilter>("week");

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) { router.replace("/login"); return; }
    (async () => {
      setFetching(true);
      let data: ApplicationData[];
      if (profile.role === "contractor") {
        data = await getApplicationsByUser(user.id);
      } else {
        data = await getApplicationsByWorkSite(profile.workSiteName);
      }
      setApps(data);
      setFetching(false);
    })();
  }, [user, profile, loading, router]);

  function getFiltered(): ApplicationData[] {
    if (activeTab === "progress") {
      return apps.filter((a) => {
        if (!a.useDate) return false;
        const d = new Date(a.useDate);
        if (period === "today") return isToday(d);
        if (period === "week")  return isThisWeek(d, { locale: ja });
        return true;
      });
    }
    const statuses = FILTER_STATUSES[activeTab];
    return statuses.length === 0 ? apps : apps.filter((a) => statuses.includes(a.status));
  }

  const filtered = getFiltered();

  const tabLabel: Record<FilterTab, string> = {
    pending:  "未対応",
    approved: "承認済み",
    rejected: "差し戻し",
    all:      "すべて",
    progress: "進捗",
  };

  const pendingCount = apps.filter((a) => ALL_PENDING.includes(a.status)).length;

  function getActionHref(app: ApplicationData, role: string): string {
    const base = `/apply/${app.id}`;
    const simplified = app.workflowType === "simplified";

    // 簡略ワークフロー
    if (simplified) {
      if ((role === "supervisor" || role === "manager") && app.status === "submitted")
        return `${base}/simplified-pre`;
      if (role === "contractor" && app.status === "simplified_pre_approved")
        return `${base}/simplified-progress`;
    }

    // 正規ワークフロー
    if (role === "manager"    && app.status === "submitted")               return `${base}/manager-pre`;
    if (role === "contractor" && app.status === "manager_pre_approved")    return `${base}/pre-check`;
    if (role === "supervisor" && app.status === "pre_work_checked")        return `${base}/supervisor-pre`;
    if (role === "contractor" && app.status === "supervisor_pre_approved") return `${base}/in-progress`;
    if (role === "supervisor" && app.status === "fire_chief_in_progress")  return `${base}/in-progress`;
    if (role === "contractor" && app.status === "in_progress")             return `${base}/completion`;
    if (role === "supervisor" && app.status === "completion_reported")     return `${base}/residual`;
    if (role === "manager"    && app.status === "final_approval_pending")  return base;
    return base;
  }

  return (
    <>
      <AppHeader title="申請一覧" />
      <main className="max-w-2xl mx-auto pb-24">

        {/* タブ */}
        <div className="flex border-b border-gray-200 bg-white sticky top-14 z-30">
          {(Object.keys(tabLabel) as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tabLabel[tab]}
              {tab === "pending" && pendingCount > 0 && (
                <span className="ml-1 bg-primary text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 進捗タブ: 期間フィルター */}
        {activeTab === "progress" && (
          <div className="flex gap-2 px-4 py-2.5 bg-white border-b border-gray-100 sticky top-[calc(3.5rem+45px)] z-20">
            {(["today", "week", "all"] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {{ today: "本日", week: "今週", all: "全件" }[p]}
              </button>
            ))}
          </div>
        )}

        {/* リスト */}
        <div className="divide-y divide-gray-100">
          {fetching ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              {activeTab === "pending" ? "未対応の申請はありません" : "該当する申請はありません"}
            </div>
          ) : activeTab === "progress" ? (
            filtered.map((app) => (
              <Link
                key={app.id}
                href={getActionHref(app, profile?.role ?? "contractor")}
                className="block bg-white hover:bg-gray-50 transition-colors"
              >
                <ProgressCard app={app} />
              </Link>
            ))
          ) : (
            filtered.map((app) => (
              <Link
                key={app.id}
                href={getActionHref(app, profile?.role ?? "contractor")}
                className="block bg-white hover:bg-gray-50 transition-colors"
              >
                <ApplicationCard app={app} />
              </Link>
            ))
          )}
        </div>
      </main>

      {profile?.role === "contractor" && (
        <Link
          href="/apply/new"
          aria-label="新規作成"
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-card-md flex items-center justify-center hover:bg-accent-hover active:scale-95 transition-all z-50"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      )}

      {profile?.role === "manager" && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 items-end z-50">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-full shadow-md hover:bg-gray-50 active:scale-95 transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            作業所設定
          </Link>
          <Link
            href="/dashboard/members"
            className="flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-full shadow-card-md hover:bg-primary/90 active:scale-95 transition-all text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3M13.5 4.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM3 20.25a6.75 6.75 0 0 1 13.5 0v.75H3v-.75Z" />
            </svg>
            メンバー管理
          </Link>
        </div>
      )}
    </>
  );
}

// ── 通常カード ────────────────────────────────────────────────
function ApplicationCard({ app }: { app: ApplicationData }) {
  const isPending = ALL_PENDING.includes(app.status);
  const useDateStr = app.useDate
    ? format(new Date(app.useDate), "M月d日(E)", { locale: ja })
    : "—";
  const createdDateStr = app.createdAt
    ? format(new Date(app.createdAt), "M月d日(E)", { locale: ja })
    : "—";

  return (
    <div className={`px-4 py-4 flex flex-col gap-2 ${isPending ? "border-l-4 border-primary" : "border-l-4 border-transparent"}`}>
      {/* 1行目: 書類種別 + 申請日 */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900">火気使用届</span>
        <span className="text-xs text-gray-400 flex-shrink-0">申請 {createdDateStr}</span>
      </div>

      {/* 2行目: ステータス */}
      <div><StatusBadge status={app.status} size="sm" /></div>

      {/* 3行目: 協力会社名 */}
      <p className="text-xs font-medium text-gray-700 truncate">{app.submitterCompany}</p>

      {/* 3行目: 作業所・作業場所 */}
      <div className="flex items-start gap-1">
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <p className="text-xs text-gray-500 truncate">{app.workSiteName}　{app.workLocation}</p>
      </div>

      {/* 4行目: 作業日 */}
      <div className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
        </svg>
        <p className="text-xs text-gray-500">作業日　{useDateStr}　{app.useStartTime && app.useEndTime ? `${app.useStartTime}〜${app.useEndTime}` : ""}</p>
      </div>
    </div>
  );
}

// ── 進捗カード ────────────────────────────────────────────────
function ProgressCard({ app }: { app: ApplicationData }) {
  const dateStr = app.useDate
    ? format(new Date(app.useDate), "M月d日(E)", { locale: ja })
    : "—";
  const currentStep = STATUS_STEP[app.status];
  const turn = TURN_LABEL[app.status];
  const isRejected = app.status === "rejected";
  const isDone = app.status === "approved";

  const progressPct = isDone
    ? 100
    : currentStep <= 0
    ? 0
    : Math.min(100, (currentStep / (STEP_OWNER.length - 1)) * 100);

  return (
    <div className="px-4 py-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{app.submitterCompany}</p>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${turn.color}`}>
            {turn.label}
          </span>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{dateStr}</span>
      </div>

      <p className="text-xs text-gray-500 truncate">{app.workSiteName} · {app.workLocation}</p>

      {isRejected ? (
        <div className="text-xs text-red-500 font-medium">
          差し戻し — {app.rejectionComment?.slice(0, 30)}{(app.rejectionComment?.length ?? 0) > 30 ? "…" : ""}
        </div>
      ) : (
        <div className="relative flex items-end justify-between pt-3">
          {/* ベースライン */}
          <div className="absolute left-2.5 right-2.5 bottom-2.5 h-0.5 bg-gray-200" />
          {/* 進捗ライン */}
          <div
            className="absolute bottom-2.5 h-0.5 bg-primary transition-all duration-300"
            style={{ left: "10px", width: `calc((100% - 20px) * ${progressPct / 100})` }}
          />
          {STEP_OWNER.map((owner, i) => {
            const done   = isDone || i < currentStep;
            const active = !isDone && i === currentStep;
            return (
              <div key={i} className="flex flex-col items-center gap-1 relative z-10">
                <span className={`text-[9px] leading-none font-medium ${
                  active ? "text-amber-500" : done ? "text-primary/70" : "text-gray-400"
                }`}>
                  {owner}
                </span>
                <div className={`w-5 h-5 rounded-full transition-colors ${
                  active ? "bg-amber-400 ring-2 ring-amber-400 ring-offset-1" :
                  done   ? "bg-primary" : "bg-gray-200"
                }`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
