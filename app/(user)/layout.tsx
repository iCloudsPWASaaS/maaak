import React from "react";
import { UserShell } from "@/components/UserShell";

export default function UserAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserShell>{children}</UserShell>;
}
