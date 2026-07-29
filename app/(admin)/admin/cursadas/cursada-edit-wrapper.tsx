"use client";

import type { ComponentProps } from "react";
import { CursadaDialog } from "./cursada-dialog";

type CursadaEditWrapperProps = ComponentProps<typeof CursadaDialog> & {
  canEdit: boolean;
};

/**
 * En las vistas de calendario la tarjeta de la cursada abre el diálogo de
 * edición al hacer clic. Sin permiso de edición en la sede de esa cursada, la
 * tarjeta se muestra igual pero sin el diálogo.
 */
export function CursadaEditWrapper({
  canEdit,
  children,
  ...props
}: CursadaEditWrapperProps) {
  if (!canEdit) return <>{children}</>;
  return <CursadaDialog {...props}>{children}</CursadaDialog>;
}
