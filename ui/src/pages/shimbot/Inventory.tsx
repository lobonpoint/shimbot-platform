import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { shimbotApi, type InventoryItem } from "../../api/shimbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function stockBadge(item: InventoryItem) {
  if (item.fba_quantity === 0)
    return <Badge className="bg-red-600 text-white">Out of Stock</Badge>;
  if (item.days_of_stock != null && item.days_of_stock < 14)
    return <Badge className="bg-yellow-500 text-white">{item.days_of_stock}d left</Badge>;
  if (item.days_of_stock != null)
    return <Badge className="bg-green-600 text-white">{item.days_of_stock}d left</Badge>;
  return <Badge variant="secondary">—</Badge>;
}

function rowClass(item: InventoryItem) {
  if (item.fba_quantity === 0) return "bg-red-50 dark:bg-red-950/20";
  if (item.days_of_stock != null && item.days_of_stock < 14)
    return "bg-yellow-50 dark:bg-yellow-950/20";
  return "";
}

export function Inventory() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "ShimBot" }, { label: "Inventory" }]);
  }, [setBreadcrumbs]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["shimbot", "inventory", selectedCompanyId],
    queryFn: () => shimbotApi.inventory(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 120_000,
  });

  const outOfStock = (items ?? []).filter((i) => i.fba_quantity === 0).length;
  const lowStock = (items ?? []).filter(
    (i) => i.fba_quantity > 0 && i.days_of_stock != null && i.days_of_stock < 14,
  ).length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground text-sm">
          {outOfStock} out of stock · {lowStock} low stock · Refreshes every 2 min
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(items ?? []).length}</p>
          </CardContent>
        </Card>
        <Card className={outOfStock > 0 ? "border-red-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
          </CardContent>
        </Card>
        <Card className={lowStock > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock (&lt;14d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{lowStock}</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground text-sm">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium">ASIN</th>
                    <th className="p-3 font-medium text-right">FBA Qty</th>
                    <th className="p-3 font-medium text-right">Velocity</th>
                    <th className="p-3 font-medium text-right">Reorder At</th>
                    <th className="p-3 font-medium text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(items ?? []).map((item) => (
                    <tr
                      key={item.asin}
                      className={`border-b last:border-0 ${rowClass(item)}`}
                    >
                      <td className="p-3 font-medium max-w-[200px] truncate">{item.title}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{item.asin}</td>
                      <td className="p-3 text-right font-mono">{item.fba_quantity}</td>
                      <td className="p-3 text-right">
                        {item.daily_velocity ? `${Number(item.daily_velocity).toFixed(1)}/d` : "—"}
                      </td>
                      <td className="p-3 text-right">{item.reorder_point ?? "—"}</td>
                      <td className="p-3 text-right">{stockBadge(item)}</td>
                    </tr>
                  ))}
                  {!isLoading && (items ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No inventory data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
