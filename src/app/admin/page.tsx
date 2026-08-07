import { requireAdmin, listAllTenants } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminPage() {
  await requireAdmin();
  const tenants = await listAllTenants();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Operator Admin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only view across every workspace on this deployment. No destructive actions live here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>
            {tenants.length} {tenants.length === 1 ? "workspace" : "workspaces"} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No workspaces yet.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tenant.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">{tenant.accountCount}</TableCell>
                    <TableCell className="text-right">{tenant.projectCount}</TableCell>
                    <TableCell className="text-right">{tenant.transactionCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
