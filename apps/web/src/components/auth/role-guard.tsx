"use client";

import React from "react";
import { type UserRole } from "@/lib/constants";

interface RoleGuardProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

// Mode UI Preview: Tidak memblokir navigasi agar user dapat leluasa menginspeksi UI halaman
export function RoleGuard({ children }: RoleGuardProps) {
  return <>{children}</>;
}
