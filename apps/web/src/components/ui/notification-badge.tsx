import React from "react";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  maxCount?: number;
}

export function NotificationBadge({
  count,
  variant = "destructive",
  className,
  maxCount = 99,
}: NotificationBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  return (
    <Badge
      variant={variant}
      className={cn(
        "absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center font-bold",
        className
      )}
    >
      {displayCount}
    </Badge>
  );
}
