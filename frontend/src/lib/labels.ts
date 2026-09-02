import type {
  MovementReason,
  OrderStatus,
  PaymentMethod,
  PointReason,
  ProductStatus,
  ProductType,
  ShipmentStatus,
  TenantStatus,
  Tier,
  VoucherKind,
} from "./types";

// Nhãn tiếng Việt + tông màu badge cho mọi trạng thái trong hệ thống.

type Tone =
  | "neutral"
  | "brand"
  | "info"
  | "positive"
  | "warning"
  | "danger"
  | "special";

// Màu theo design token (DESIGN.md §1) — token tự đổi ở dark mode, không cần `dark:`.
export const toneClasses: Record<Tone, string> = {
  neutral: "bg-line text-tx3",
  brand: "bg-pri-soft text-pri",
  info: "bg-sky-soft text-sky",
  positive: "bg-mint-soft text-mint",
  warning: "bg-gold-soft text-gold",
  danger: "bg-drop-soft text-drop",
  special: "bg-viol-soft text-viol",
};

export const orderStatusMeta: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "Chờ thanh toán", tone: "warning" },
  confirmed: { label: "Đã xác nhận", tone: "info" },
  packing: { label: "Đang đóng gói", tone: "info" },
  shipped: { label: "Đang giao", tone: "info" },
  delivered: { label: "Đã giao", tone: "positive" },
  completed: { label: "Hoàn tất", tone: "positive" },
  cancelled: { label: "Đã huỷ", tone: "danger" },
  return_requested: { label: "Yêu cầu đổi trả", tone: "warning" },
  returned: { label: "Đã hoàn trả", tone: "danger" },
  deposit_paid: { label: "Đã đặt cọc", tone: "special" },
  awaiting_stock: { label: "Chờ hàng về", tone: "special" },
  balance_due: { label: "Chờ thanh toán nốt", tone: "warning" },
  balance_paid: { label: "Đã thanh toán đủ", tone: "positive" },
};

// Các bước chuyển trạng thái hợp lệ (state machine — FR-ORD-02/08)
export const orderTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["shipped"],
  shipped: ["delivered", "returned"],
  delivered: ["completed", "return_requested"],
  return_requested: ["returned", "completed"],
  deposit_paid: ["awaiting_stock", "cancelled"],
  awaiting_stock: ["balance_due", "cancelled"],
  balance_due: ["balance_paid", "cancelled"],
  balance_paid: ["confirmed"],
};

export const shipmentStatusMeta: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Chờ lấy hàng", tone: "neutral" },
  picked_up: { label: "Đã lấy hàng", tone: "info" },
  in_transit: { label: "Đang trung chuyển", tone: "info" },
  out_for_delivery: { label: "Đang phát", tone: "info" },
  delivered: { label: "Giao thành công", tone: "positive" },
  failed: { label: "Phát thất bại", tone: "danger" },
  returned: { label: "Hoàn về shop", tone: "danger" },
};

export const productTypeMeta: Record<ProductType, { label: string; tone: Tone }> = {
  regular: { label: "Bán thường", tone: "neutral" },
  blind_box: { label: "Blind box", tone: "brand" },
  preorder: { label: "Pre-order", tone: "info" },
  drop_exclusive: { label: "Drop", tone: "danger" },
};

export const productStatusMeta: Record<ProductStatus, { label: string; tone: Tone }> = {
  draft: { label: "Nháp", tone: "neutral" },
  active: { label: "Đang bán", tone: "positive" },
  archived: { label: "Lưu trữ", tone: "danger" },
};

export const tierMeta: Record<
  Tier,
  { label: string; tone: Tone; multiplier: number; thresholdVnd: number }
> = {
  standard: { label: "Standard", tone: "neutral", multiplier: 1, thresholdVnd: 0 },
  silver: { label: "Silver", tone: "info", multiplier: 1.2, thresholdVnd: 5_000_000 },
  gold: { label: "Gold", tone: "warning", multiplier: 1.5, thresholdVnd: 12_000_000 },
  collector: {
    label: "Collector",
    tone: "special",
    multiplier: 2,
    thresholdVnd: 20_000_000,
  },
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  vnpay: "VNPay",
  momo: "Momo",
  zalopay: "ZaloPay",
  cod: "COD (khi nhận hàng)",
};

export const movementReasonLabel: Record<MovementReason, string> = {
  sale: "Bán hàng",
  return: "Khách trả hàng",
  adjustment: "Điều chỉnh",
  receipt: "Nhập hàng",
  stocktake: "Kiểm kê",
};

export const pointReasonLabel: Record<PointReason, string> = {
  earn: "Tích điểm",
  spend: "Tiêu điểm",
  expire: "Hết hạn",
  adjust: "Điều chỉnh",
};

export const voucherKindLabel: Record<VoucherKind, string> = {
  percent: "Giảm %",
  fixed: "Giảm tiền",
  freeship: "Free ship",
};

// ── Tenant & Billing (platform plane) ───────────────────────

export const tenantStatusMeta: Record<TenantStatus, { label: string; tone: Tone }> = {
  provisioning: { label: "Đang khởi tạo", tone: "special" },
  active: { label: "Đang hoạt động", tone: "positive" },
  past_due: { label: "Quá hạn thanh toán", tone: "warning" },
  suspended: { label: "Tạm ngưng", tone: "danger" },
  archived: { label: "Đã lưu trữ", tone: "neutral" },
};

/** Token màu nhấn của tenant → cặp class nền-soft + chữ (dùng cho accent trong platform console). */
export const accentPair: Record<string, string> = {
  pri: "bg-pri-soft text-pri",
  viol: "bg-viol-soft text-viol",
  sky: "bg-sky-soft text-sky",
  mint: "bg-mint-soft text-mint",
  gold: "bg-gold-soft text-gold",
  drop: "bg-drop-soft text-drop",
};
