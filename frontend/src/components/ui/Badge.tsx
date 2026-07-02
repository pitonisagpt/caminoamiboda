interface BadgeProps {
  children: React.ReactNode;
  variant?: "gray" | "teal" | "pink" | "gold" | "green" | "blue" | "red";
  className?: string;
}

const variantClasses = {
  gray:  "bg-gray-100 text-gray-700",
  teal:  "bg-brand-100 text-brand-800",
  pink:  "bg-brand-100 text-brand-800",   // legacy alias → teal
  gold:  "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-800",
  blue:  "bg-blue-100 text-blue-800",
  red:   "bg-red-100 text-red-700",
};

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
