"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { SimpleApprovalView } from "@/components/approval/SimpleApprovalView";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication } from "@/lib/db";
import type { ApplicationData } from "@/lib/types";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [app, setApp]         = useState<ApplicationData | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) { router.replace("/login"); return; }
    if (profile.role === "contractor") { router.replace("/dashboard"); return; }

    (async () => {
      const data = await getApplication(id);
      if (!data) { router.replace("/dashboard"); return; }
      setApp(data);
      setFetching(false);
    })();
  }, [id, user, profile, loading, router]);

  if (fetching || !app || !profile) {
    return (
      <>
        <AppHeader title="申請確認" showBack backHref="/dashboard" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="申請確認" showBack backHref="/dashboard" />
      <main className="max-w-2xl mx-auto">
        <SimpleApprovalView app={app} reviewerRole={profile.role} />
      </main>
    </>
  );
}
