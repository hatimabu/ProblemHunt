import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

interface ActiveNavItemProps extends LinkProps {
  active: boolean;
  children: ReactNode;
  className?: string;
}

export function ActiveNavItem({ active, children, className = "", ...props }: ActiveNavItemProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`active-nav-item ${active ? "is-active" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </Link>
  );
}
