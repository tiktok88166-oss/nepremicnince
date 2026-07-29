import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "border border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_1px_2px_rgba(21,73,51,0.18)] hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)]",
        secondary: "border border-[var(--border)] bg-white text-[var(--foreground)] shadow-[0_1px_1px_rgba(25,42,33,0.03)] hover:border-[#b8c6bc] hover:bg-[var(--surface-subtle)]",
        ghost: "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]",
        warning: "border border-[#ead7b7] bg-[#fff8e9] text-[#70460e]",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-2.5",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
