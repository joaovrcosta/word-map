"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressChartProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "danger";
}

const ProgressChart = React.forwardRef<HTMLDivElement, ProgressChartProps>(
  ({ className, value, max = 100, variant = "default", ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variantClasses = {
      default: "bg-purple-600",
      success: "bg-green-600",
      warning: "bg-yellow-600",
      danger: "bg-red-600",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full bg-gray-200 rounded-full overflow-hidden",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

ProgressChart.displayName = "ProgressChart";

export { ProgressChart };
