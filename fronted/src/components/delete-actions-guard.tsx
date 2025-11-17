"use client";

import type { PropsWithChildren } from "react";
import { useDeleteActionVisibility } from "@/hooks/use-delete-action-visibility";

export function DeleteActionsGuard({ children }: PropsWithChildren): React.ReactElement | null {
  const canSeeDeleteActions = useDeleteActionVisibility();
  if (!canSeeDeleteActions) {
    return null;
  }
  return <>{children}</>;
}
