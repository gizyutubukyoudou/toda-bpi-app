"use client";

import { type UseFormRegister } from "react-hook-form";
import type { ApplicationFormValues } from "@/lib/types";

interface CheckboxRowProps {
  fieldName: keyof ApplicationFormValues;
  label: string;
  register: UseFormRegister<ApplicationFormValues>;
}

export function CheckboxRow({ fieldName, label, register }: CheckboxRowProps) {
  const id = `chk-${fieldName}`;
  return (
    <div className="checkbox-row">
      <input
        id={id}
        type="checkbox"
        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
        {...register(fieldName)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
