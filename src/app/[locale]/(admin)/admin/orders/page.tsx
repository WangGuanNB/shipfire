import AdminOrdersFilter from "@/components/dashboard/admin-orders-filter";
import TableSlot from "@/components/dashboard/slots/table";
import {
  getAdminOrdersFiltered,
  hasAdminOrderFilters,
  type AdminOrderFilters,
} from "@/models/order";
import { Table as TableSlotType } from "@/types/slots/table";
import { TableColumn } from "@/types/blocks/table";
import moment from "moment";

function fmtTime(v: Date | null | undefined) {
  return v ? moment(v).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function clipText(s: string | null | undefined, max = 96) {
  if (s == null || s === "") return "-";
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function fmtAmount(row: { amount: number; currency: string | null }) {
  const sym = row.currency?.toUpperCase() === "CNY" ? "¥" : "$";
  return `${sym}${row.amount / 100}`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    status?: string;
    pay_type?: string;
    product_name?: string;
    created_from?: string;
    created_to?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters: AdminOrderFilters = {
    email: sp.email,
    status: sp.status,
    pay_type: sp.pay_type,
    product_name: sp.product_name,
    created_from: sp.created_from,
    created_to: sp.created_to,
  };

  const shouldQuery = hasAdminOrderFilters(filters);
  const orders = shouldQuery
    ? await getAdminOrdersFiltered(1, 200, filters)
    : [];

  const columns: TableColumn[] = [
    { name: "id", title: "ID" },
    { name: "order_no", title: "Order No" },
    { name: "status", title: "Status" },
    { name: "pay_type", title: "Pay Type" },
    { name: "user_uuid", title: "User UUID" },
    { name: "user_email", title: "User Email" },
    { name: "paid_email", title: "Paid Email" },
    {
      name: "amount",
      title: "Amount",
      callback: (row) => fmtAmount(row),
    },
    { name: "currency", title: "Currency" },
    { name: "credits", title: "Credits" },
    { name: "interval", title: "Interval" },
    { name: "product_id", title: "Product ID" },
    { name: "product_name", title: "Product Name" },
    { name: "valid_months", title: "Valid Months" },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) => fmtTime(row.created_at),
    },
    {
      name: "paid_at",
      title: "Paid At",
      callback: (row) => fmtTime(row.paid_at),
    },
    {
      name: "expired_at",
      title: "Expired At",
      callback: (row) => fmtTime(row.expired_at),
    },
    { name: "stripe_session_id", title: "Stripe Session" },
    { name: "sub_id", title: "Sub ID" },
    {
      name: "sub_interval_count",
      title: "Sub Interval Count",
    },
    {
      name: "sub_cycle_anchor",
      title: "Sub Cycle Anchor",
    },
    {
      name: "sub_period_start",
      title: "Sub Period Start",
      callback: (row) =>
        row.sub_period_start != null ? String(row.sub_period_start) : "-",
    },
    {
      name: "sub_period_end",
      title: "Sub Period End",
      callback: (row) =>
        row.sub_period_end != null ? String(row.sub_period_end) : "-",
    },
    {
      name: "sub_times",
      title: "Sub Times",
    },
    {
      name: "order_detail",
      title: "Order Detail",
      callback: (row) => clipText(row.order_detail),
    },
    {
      name: "paid_detail",
      title: "Paid Detail",
      callback: (row) => clipText(row.paid_detail),
    },
  ];

  const table: TableSlotType = {
    title: "All Orders",
    filters: (
      <AdminOrdersFilter
        defaults={{
          email: sp.email,
          status: sp.status,
          pay_type: sp.pay_type,
          product_name: sp.product_name,
          created_from: sp.created_from,
          created_to: sp.created_to,
        }}
      />
    ),
    columns,
    data: orders,
    empty_message: shouldQuery
      ? "No orders match these filters"
      : "请至少选择或填写一项条件后点击 Search（默认不加载数据）",
  };

  return <TableSlot {...table} />;
}
