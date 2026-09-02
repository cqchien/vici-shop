"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/shop/auth-form";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm initialTab="login" />
    </Suspense>
  );
}
