import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("grid min-w-0 gap-1.5 text-sm font-medium", className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 min-w-0 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]",
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
        "h-10 min-w-0 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]",
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
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        className="h-4 w-4 accent-[var(--accent)]"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
