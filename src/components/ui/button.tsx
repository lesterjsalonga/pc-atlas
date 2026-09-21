import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
const styles = cva(
  "ui-button inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "button-primary",
        outline: "button-outline",
        ghost: "button-ghost",
      },
      size: {
        default: "button-default",
        icon: "button-icon",
        sm: "button-small",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof styles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={twMerge(clsx(styles({ variant, size }), className))}
      {...props}
    />
  );
}
