"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/shop/auth-form";

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm initialTab="register" />
    </Suspense>
  );
}
