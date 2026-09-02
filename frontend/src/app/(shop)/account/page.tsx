"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui/basics";
import { FormField, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { actions, currentUser, useAppState } from "@/lib/mock/store";

export default function ProfilePage() {
  const state = useAppState();
  const user = currentUser(state)!;
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);

  return (
    <div className="space-y-4.5">
      <Card className="p-6">
        <h2 className="mb-4.5 font-display text-[15px] font-bold">Hồ sơ</h2>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <FormField label="Họ và tên">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="!bg-card2"
            />
          </FormField>
          <FormField label="Số điện thoại">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="!bg-card2"
            />
          </FormField>
        </div>
        <FormField label="Email">
          <Input value={user.email} disabled className="!bg-card2 text-tx3" />
        </FormField>
        <Button
          className="mt-4"
          onClick={() => {
            actions.updateProfile({ name, phone });
            toast("Đã lưu hồ sơ");
          }}
        >
          Lưu thay đổi
        </Button>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-bold">Sổ địa chỉ</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast("Mock: thêm địa chỉ khi thanh toán")}
          >
            + Thêm địa chỉ
          </Button>
        </div>
        {user.addresses.length === 0 ? (
          <p className="text-sm text-tx2">Chưa có địa chỉ — sẽ nhập khi thanh toán.</p>
        ) : (
          <ul className="space-y-2.5">
            {user.addresses.map((a) => (
              <li
                key={a.id}
                className={`flex items-center justify-between rounded-[11px] px-4 py-3.5 ${
                  a.isDefault
                    ? "border-[1.5px] border-pri bg-pri-soft"
                    : "border border-line"
                }`}
              >
                <div>
                  <p className="text-[13.5px] font-semibold">
                    {a.recipient}
                    {a.isDefault ? (
                      <span className="ml-2 text-[10.5px] font-semibold text-pri uppercase">
                        Mặc định
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-tx2">
                    {a.street}, {a.ward}, {a.district}, {a.province}
                  </p>
                </div>
                <button
                  className="cursor-pointer text-xs text-tx3 underline hover:text-tx"
                  onClick={() => toast("Mock: sửa địa chỉ làm ở backend thật")}
                >
                  Sửa
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
