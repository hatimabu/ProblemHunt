import * as React from "react";
import { Button } from "./button";

type PrimaryButtonProps = React.ComponentProps<typeof Button>;

export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(function PrimaryButton(
  { className, ...props },
  ref,
) {
  return <Button ref={ref} className={`primary-button ${className || ""}`.trim()} {...props} />;
});

PrimaryButton.displayName = "PrimaryButton";
