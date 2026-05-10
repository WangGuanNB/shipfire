import AdminEmailSearch from "@/components/dashboard/admin-email-search";
import AdminUserCreditsEdit from "@/components/dashboard/admin-user-credits-edit";
import TableSlot from "@/components/dashboard/slots/table";
import { getUsers } from "@/models/user";
import { Table as TableSlotType } from "@/types/slots/table";
import { TableColumn } from "@/types/blocks/table";
import moment from "moment";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const users = await getUsers(1, 50, email);

  const columns: TableColumn[] = [
    { name: "uuid", title: "UUID" },
    { name: "email", title: "Email" },
    { name: "nickname", title: "Name" },
    {
      name: "avatar_url",
      title: "Avatar",
      callback: (row) => (
        <img
          src={row.avatar_url || ""}
          alt=""
          className="w-10 h-10 rounded-full"
        />
      ),
    },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) =>
        row.created_at
          ? moment(row.created_at).format("YYYY-MM-DD HH:mm:ss")
          : "-",
    },
    {
      name: "credits",
      title: "Credits",
      callback: (row) => <AdminUserCreditsEdit userUuid={row.uuid} />,
    },
  ];

  const table: TableSlotType = {
    title: "All Users",
    filters: <AdminEmailSearch defaultEmail={email ?? ""} />,
    columns,
    data: users,
  };

  return <TableSlot {...table} />;
}
