import { UsersDataTable } from "./data-table";
import { getUsers } from "./users.api";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();

  const filteredUsers = users.filter((user) => {
    const hasCredentials = Boolean(user.email?.trim()) && Boolean(user.username?.trim());
    const role = typeof user.role === "string" ? user.role.toUpperCase() : "";

    return hasCredentials && role !== "GUEST";
  });

  const mappedUsers = filteredUsers.map((user) => ({
    ...user,
    createdAt: user.createdAt ?? "",
  }));

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Usuarios</h1>
        <div className="overflow-x-auto">
          <UsersDataTable data={mappedUsers} />
        </div>
      </div>
    </section>
  );
}
