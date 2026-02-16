"use client";

import type { PropsWithChildren } from "react";
import { useDeleteActionVisibility } from "@/hooks/use-delete-action-visibility";

export function DeleteActionsGuard({ children }: PropsWithChildren): React.ReactElement {
  const canSeeDeleteActions = useDeleteActionVisibility();
  if (canSeeDeleteActions) {
    return <>{children}</>;
  }
  return (
    <div className="pointer-events-none opacity-50" aria-disabled="true">
      {children}
    </div>
  );
}
