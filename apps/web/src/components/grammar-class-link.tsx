import Link from "next/link";
import {
  grammarClassLabel,
  grammarGuidePath,
} from "@/lib/grammar-guide";

export function GrammarClassLink({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const label = grammarClassLabel(value);
  const href = grammarGuidePath(value);
  if (!href) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link href={href} className={className} title={`O que é ${label.toLowerCase()}`}>
      {label}
    </Link>
  );
}
