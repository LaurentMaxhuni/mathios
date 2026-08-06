import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("brand-mark", className)} aria-hidden="true">
      <Image
        src="/brand/mathios-logo.png"
        alt=""
        fill
        priority={priority}
        sizes="48px"
        className="brand-mark-image"
      />
    </span>
  );
}
