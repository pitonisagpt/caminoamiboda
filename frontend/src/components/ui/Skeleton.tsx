interface SkeletonProps {
  className?: string;
}

/** Base placeholder block — pass sizing/shape via className (h-4 w-3/4,
 * aspect-[4/3], rounded-full, etc.) to match the real element it stands in
 * for. Callers wrap a group of these in a `SkeletonGroup` for the
 * accessibility announcement instead of repeating it per block. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

interface SkeletonGroupProps {
  children: React.ReactNode;
  label: string;
  className?: string;
}

/** A visible skeleton has no text a screen reader can announce — this
 * gives it the same `role="status"` + accessible name a spinner would
 * have, without changing how it looks. */
export function SkeletonGroup({ children, label, className = "" }: SkeletonGroupProps) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}
