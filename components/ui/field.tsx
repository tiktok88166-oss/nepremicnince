import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("grid min-w-0 gap-1.5 text-[13px] font-semibold text-[var(--foreground)]", className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 min-w-0 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[#87949a] hover:border-[#aebcc2] focus:border-[var(--accent)] focus:ring-2 focus:ring-[#146b6f26]",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 min-w-0 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none transition-colors hover:border-[#aebcc2] focus:border-[var(--accent)] focus:ring-2 focus:ring-[#146b6f26]",
        props.className,
      )}
    />
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm font-medium text-[#35443c]">
      <input
        className="h-[18px] w-[18px] shrink-0 accent-[var(--accent)]"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
