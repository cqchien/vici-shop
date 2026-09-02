"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/basics";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { actions, useAppState } from "@/lib/mock/store";

const personas = [
  { email: "minhanh.collects@example.com", label: "Minh Anh — hạng Gold (vào drop sớm)" },
  { email: "quocbao.toys@example.com", label: "Quốc Bảo — Collector" },
  { email: "halinh.deskpop@example.com", label: "Hà Linh — hạng Silver" },
  { email: "vy@vici.shop", label: "Vy — chủ shop / tenant admin (/admin)" },
  { email: "tu@vici.shop", label: "Tú — vận hành (staff)" },
  { email: "ngan@vici.shop", label: "Ngân — Platform Operator (/platform)" },
];

/** Màn đăng nhập/đăng ký gộp theo v3 — tab segmented + social + persona demo. */
export function AuthForm({ initialTab }: { initialTab: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const state = useAppState();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const next = params.get("next") ?? "/";

  function doLogin(mail: string) {
    const r = actions.login(mail);
    if (r.ok) {
      const user = state.users.find(
        (u) => u.email.toLowerCase() === mail.toLowerCase(),
      );
      toast(`Chào mừng quay lại, ${user?.name ?? "bạn"}`);
      const dest =
        user?.role === "platform_admin"
          ? "/platform"
          : user?.role === "customer"
            ? next
            : "/admin";
      router.push(dest);
    } else toast(r.error, "error");
  }

  function doRegister() {
    const r = actions.register(name, email, "");
    if (r.ok) {
      toast("Chào mừng đến Vici");
      router.push(next);
    } else toast(r.error, "error");
  }

  const tabClass = (active: boolean) =>
    `flex-1 cursor-pointer rounded-lg py-2.5 text-[13px] font-semibold transition-colors ${
      active ? "bg-card text-tx shadow-soft" : "text-tx3 hover:text-tx2"
    }`;

  return (
    <div className="mx-auto max-w-[420px] py-10 pb-16">
      <h1 className="mb-1.5 text-center text-[26px] font-bold tracking-[-0.015em]">
        Chào mừng đến Vici
      </h1>
      <p className="mb-7 text-center text-[13.5px] text-tx2">
        Đăng nhập để theo dõi đơn, tích điểm và vào drop sớm.
      </p>

      <div className="mb-5 flex rounded-[10px] bg-card2 p-1">
        <button className={tabClass(tab === "login")} onClick={() => setTab("login")}>
          Đăng nhập
        </button>
        <button
          className={tabClass(tab === "register")}
          onClick={() => setTab("register")}
        >
          Đăng ký
        </button>
      </div>

      {tab === "register" ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Họ và tên"
          className="mb-3"
        />
      ) : null}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email hoặc số điện thoại"
        className="mb-3"
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mật khẩu"
        className="mb-4.5"
      />
      <Button
        size="lg"
        className="mb-3.5 w-full"
        disabled={tab === "register" ? !name || !email : !email}
        onClick={() => (tab === "login" ? doLogin(email) : doRegister())}
      >
        {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
      </Button>

      <div className="my-3.5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11.5px] text-tx3">hoặc</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" className="text-tx" onClick={() => toast("Mock: dùng persona demo bên dưới")}>
          Google
        </Button>
        <Button variant="secondary" className="text-tx" onClick={() => toast("Mock: dùng persona demo bên dưới")}>
          Zalo
        </Button>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-card p-4.5">
        <p className="mb-2.5 text-[13px] font-semibold">
          Đăng nhập nhanh (persona demo)
        </p>
        <div className="space-y-2">
          {personas.map((p) => (
            <button
              key={p.email}
              onClick={() => doLogin(p.email)}
              className="block w-full cursor-pointer rounded-[10px] border border-line px-3.5 py-2.5 text-left text-[13px] transition-colors hover:border-pri hover:bg-pri-soft"
            >
              {p.label}
              <span className="mt-0.5 block font-data text-[10.5px] text-tx3">
                {p.email}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-tx3">
          Mock: không cần mật khẩu thật — xác minh OTP/email làm ở backend thật
          (FR-AUTH-01).
        </p>
      </div>
    </div>
  );
}
