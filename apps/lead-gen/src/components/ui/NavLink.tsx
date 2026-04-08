import Link from "next/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cx } from "styled-system/css";
import { navLink } from "@/recipes/nav";

interface NavLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  active?: boolean;
  collapsed?: boolean;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ active = false, collapsed = false, className, children, ...rest }, ref) => {
    return (
      <Link
        ref={ref}
        className={cx(navLink({ active, collapsed }), className)}
        {...rest}
      >
        {children}
      </Link>
    );
  }
);
NavLink.displayName = "NavLink";
