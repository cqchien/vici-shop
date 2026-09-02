"use client";

// Theme sáng/tối theo v3 — đặt data-theme trên <html>, lưu localStorage,
// script inline trong layout.tsx áp lại trước khi hydrate để không chớp màu.

import { useSyncExternalStore } from "react";

const KEY = "vici_theme";
const listeners = new Set<() => void>();

function current(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, current, () => "light");
}

export function toggleTheme() {
  const next = current() === "dark" ? "light" : "dark";
  if (next === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // localStorage bị chặn — theme vẫn đổi trong phiên
  }
  listeners.forEach((l) => l());
}
