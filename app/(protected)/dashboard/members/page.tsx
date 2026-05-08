"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { useAuth } from "@/lib/hooks/useAuth";

type Member = {
  id: string;
  email: string;
  display_name: string;
  role: "supervisor" | "contractor";
  company: string;
  work_site_name: string;
  created_at: string;
};

const ROLE_LABEL = { supervisor: "担当職員", contractor: "協力会社" };
const ROLE_COLOR = {
  supervisor: "bg-purple-100 text-purple-700",
  contractor: "bg-blue-100 text-blue-700",
};

export default function MembersPage() {
  const { user, profile, loading, accessToken } = useAuth();
  const router = useRouter();

  const [members, setMembers]     = useState<Member[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [showForm, setShowForm]   = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    email:       "",
    role:        "contractor" as "supervisor" | "contractor",
    company:     "",
    workSiteName: "",
  });

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) { router.replace("/login"); return; }
    if (profile.role !== "manager") { router.replace("/dashboard"); return; }
    setForm((f) => ({ ...f, workSiteName: profile.workSiteName }));
    fetchMembers();
  }, [user, profile, loading]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMembers() {
    setFetching(true);
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) setMembers(await res.json());
    setFetching(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.displayName || !form.email || !form.company || !form.workSiteName) {
      setError("すべての項目を入力してください");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "エラーが発生しました");
    } else {
      setSuccess(`${form.displayName} さんのアカウントを作成し、招待メールを送信しました`);
      setForm((f) => ({ ...f, displayName: "", email: "", company: "" }));
      setShowForm(false);
      fetchMembers();
    }
    setSubmitting(false);
  }

  async function handleDelete(member: Member) {
    if (!confirm(`${member.display_name}（${member.email}）を削除しますか？\nこの操作は取り消せません。`)) return;
    setDeletingId(member.id);
    setError(""); setSuccess("");
    const res = await fetch(`/api/users?id=${member.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "削除に失敗しました");
    } else {
      setSuccess(`${member.display_name} を削除しました`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    }
    setDeletingId(null);
  }

  return (
    <>
      <AppHeader title="メンバー管理" />
      <main className="max-w-2xl mx-auto pb-24 px-4">

        {/* 成功・エラーメッセージ */}
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* メンバー追加ボタン */}
        <div className="mt-4 mb-2 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-700">
            {profile?.workSiteName} のメンバー
          </h2>
          <button
            onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
            className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1.5 rounded-lg font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            メンバー追加
          </button>
        </div>

        {/* 追加フォーム */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">新規メンバー登録</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">氏名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="例: 田中 太郎"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">メールアドレス <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="例: tanaka@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">役職 <span className="text-red-500">*</span></label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "supervisor" | "contractor" })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                <option value="contractor">協力会社（火元責任者）</option>
                <option value="supervisor">担当職員</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">会社名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="例: 株式会社テスト工業"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">作業所名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.workSiteName}
                onChange={(e) => setForm({ ...form, workSiteName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "登録中…" : "登録して招待メール送信"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* メンバー一覧 */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {fetching ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              メンバーがいません
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{m.display_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[m.role]}`}>
                      {ROLE_LABEL[m.role]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{m.email}</p>
                  <p className="text-xs text-gray-400">{m.company}</p>
                </div>
                <button
                  onClick={() => handleDelete(m)}
                  disabled={deletingId === m.id}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  aria-label="削除"
                >
                  {deletingId === m.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
