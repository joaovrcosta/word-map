import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 !h-[44px]",
  {
    variants: {
      variant: {
        default:
          "bg-[#24c875] text-white rounded-xl hover:bg-[#1eaf68] hover:shadow-md focus-visible:ring-[#24c875]/50 active:scale-[0.98]",
        destructive:
          "bg-red-500 text-white rounded-full hover:bg-red-600 hover:shadow-xl focus-visible:ring-red-500/50 active:scale-[0.98]",
        outline:
          "border border-[#24c875] bg-transparent text-[#14804a] rounded-xl shadow-sm hover:bg-[#24c875] hover:text-white focus-visible:ring-[#24c875]/50 active:scale-[0.98] dark:text-[#7ddea8]",
        secondary:
          "bg-gray-100 text-gray-700 rounded-full shadow-sm hover:bg-gray-200 hover:shadow-md focus-visible:ring-gray-500/50 active:scale-[0.98]",
        ghost:
          "text-gray-600 rounded-full hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500/50 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
        link: "text-[#14804a] underline-offset-4 hover:underline rounded-none shadow-none dark:text-[#7ddea8]",
        success:
          "bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 hover:shadow-xl focus-visible:ring-green-500/50 active:scale-[0.98]",
        warning:
          "bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600 hover:shadow-xl focus-visible:ring-yellow-500/50 active:scale-[0.98]",
        info: "bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 hover:shadow-xl focus-visible:ring-blue-500/50 active:scale-[0.98]",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm has-[>svg]:px-5",
        sm: "h-10 px-4 py-2 text-xs has-[>svg]:px-3",
        lg: "h-14 px-8 py-4 text-base has-[>svg]:px-6",
        xl: "h-16 px-10 py-5 text-lg has-[>svg]:px-8",
        icon: "size-12 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-14 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
