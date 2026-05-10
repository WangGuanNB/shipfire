import AdminEmailSearch from "@/components/dashboard/admin-email-search";
import TableSlot from "@/components/dashboard/slots/table";
import { getAdminCreditLedgerByEmail } from "@/models/credit";
import { Table as TableSlotType } from "@/types/slots/table";
import { TableColumn } from "@/types/blocks/table";
import moment from "moment";

function fmtTime(v: Date | null | undefined) {
  return v ? moment(v).format("YYYY-MM-DD HH:mm:ss") : "-";
}

export default async function AdminCreditsLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const q = email?.trim() ?? "";
  const rows = q ? await getAdminCreditLedgerByEmail(1, 500, q) : [];

  const columns: TableColumn[] = [
    { name: "id", title: "ID" },
    { name: "trans_no", title: "Trans No" },
    { name: "user_email", title: "Email" },
    { name: "user_uuid", title: "User UUID" },
    { name: "trans_type", title: "Trans Type" },
    {
      name: "credits",
      title: "Credits (Δ)",
      callback: (row) => String(row.credits),
    },
    { name: "order_no", title: "Order No" },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) => fmtTime(row.created_at),
    },
    {
      name: "expired_at",
      title: "Expired At",
      callback: (row) => fmtTime(row.expired_at),
    },
  ];

  const table: TableSlotType = {
    title: "积分流水",
    filters: <AdminEmailSearch defaultEmail={email ?? ""} />,
    columns,
    data: rows,
    empty_message: q
      ? "No records for this email"
      : "请输入邮箱后点击 Search 查询（默认不加载数据）",
  };

  return <TableSlot {...table} />;
}
