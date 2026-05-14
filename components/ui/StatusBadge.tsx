"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { ApplicationStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  draft:                   "bg-gray-100 text-gray-600",
  submitted:               "bg-primary-100 text-primary-700",
  manager_pre_approved:    "bg-blue-100 text-blue-700",
  pre_work_checked:        "bg-indigo-100 text-indigo-700",
  supervisor_pre_approved: "bg-purple-100 text-purple-700",
  fire_chief_in_progress:  "bg-orange-100 text-orange-700",
  in_progress:             "bg-yellow-100 text-yellow-700",
  completion_reported:     "bg-amber-100 text-amber-700",
  final_approval_pending:  "bg-accent-100 text-accent-700",
  approved:                  "bg-green-100 text-green-700",
  rejected:                  "bg-red-100 text-red-700",
  simplified_pre_approved:   "bg-blue-100 text-blue-700",
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function StatusBadge({ status, size = "md", animate = false }: StatusBadgeProps) {
  const sizeClass = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  }[size];

  const badge = (
    <span
      className={clsx("status-badge font-display", STATUS_STYLE[status], sizeClass)}
      role="status"
      aria-live="polite"
    >
      {STATUS_LABEL[status]}
    </span>
  );

  if (!animate) return badge;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {badge}
      </motion.div>
    </AnimatePresence>
  );
}
