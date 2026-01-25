"use client";

import * as React from "react";
type AccordionSingleProps = React.ComponentPropsWithoutRef<"div"> & {
  type?: "single" | "multiple";
  collapsible?: boolean;
};

import { cn } from "./utils";

function Accordion({ type, collapsible, ...props }: AccordionSingleProps) {
  return <div data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"details">) {
  return (
    <details
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"summary">) {
  return (
    <summary
      data-slot="accordion-trigger"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 list-none items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </summary>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="accordion-content"
      className="overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
