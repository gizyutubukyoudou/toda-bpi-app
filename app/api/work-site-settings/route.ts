import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyTokenAndGetProfile } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await verifyTokenAndGetProfile(token);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data } = await admin
    .from("work_site_settings")
    .select("workflow_type")
    .eq("work_site_name", profile.work_site_name)
    .single();

  return NextResponse.json({ workflowType: data?.workflow_type ?? "standard" });
}

export async function PUT(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await verifyTokenAndGetProfile(token);
  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { workflowType: "standard" | "simplified" };
  if (!["standard", "simplified"].includes(body.workflowType)) {
    return NextResponse.json({ error: "Invalid workflowType" }, { status: 400 });
  }

  const admin = getAdminClient();
  await admin.from("work_site_settings").upsert({
    work_site_name: profile.work_site_name,
    workflow_type:  body.workflowType,
    updated_at:     new Date().toISOString(),
  }, { onConflict: "work_site_name" });

  return NextResponse.json({ success: true });
}
