import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc/60 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "btn-acc text-white",
        outline:
          "glass text-zinc-200 hover:text-white hover:border-acc/50",
        ghost: "text-zinc-300 hover:text-white hover:bg-white/5",
        subtle: "bg-acc/10 text-acc-soft border border-acc/25 hover:bg-acc/15",
        danger: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
        link: "text-acc-soft underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "h-9 w-9 rounded-lg",
        iconSm: "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
