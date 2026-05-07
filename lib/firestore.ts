import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query,
  where, orderBy, limit, serverTimestamp, type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ApplicationData, ApplicationStatus, UserProfile } from "./types";

// ─── Collections ────────────────────────────────────────────────────────────

const applicationsCol = () => collection(db, "applications");
const usersCol        = () => collection(db, "users");

// ─── User ────────────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(usersCol(), uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ─── Application reads ───────────────────────────────────────────────────────

export async function getApplication(appId: string): Promise<ApplicationData | null> {
  const snap = await getDoc(doc(applicationsCol(), appId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ApplicationData) : null;
}

export async function getApplicationsByUser(uid: string): Promise<ApplicationData[]> {
  const q = query(
    applicationsCol(),
    where("submittedBy", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ApplicationData));
}

export async function getApplicationsByWorkSite(
  workSiteName: string,
  statuses?: ApplicationStatus[]
): Promise<ApplicationData[]> {
  const constraints: QueryConstraint[] = [
    where("workSiteName", "==", workSiteName),
    orderBy("createdAt", "desc"),
    limit(100),
  ];
  if (statuses?.length) {
    constraints.push(where("status", "in", statuses));
  }
  const q = query(applicationsCol(), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ApplicationData));
}

// ─── Application writes (client-safe: draft only) ────────────────────────────

export async function createDraftApplication(
  uid: string,
  data: Omit<ApplicationData, "id" | "status" | "submittedBy" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(applicationsCol(), {
    ...data,
    status: "draft",
    submittedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDraftApplication(
  appId: string,
  data: Partial<Omit<ApplicationData, "id" | "status" | "submittedBy" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(applicationsCol(), appId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Status transitions go through Cloud Functions (Admin SDK).
// See functions/src/index.ts for: submitApplication, approveSupervisor,
// rejectSupervisor, approveManager, rejectManager, resubmitApplication
