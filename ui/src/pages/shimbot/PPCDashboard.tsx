import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { useEffect } from "react";
import { shimbotApi } from "../../api/shimbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function acosBadge(acos: number) {
  if (acos < 30) return <Badge className="bg-green-600 text-white">{acos.toFixed(1)}%</Badge>;
  if (acos < 50) return <Badge className="bg-yellow-500 text-white">{acos.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-600 text-white">{acos.toFixed(1)}%</Badge>;
}

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toFixed(2)}`;
}

export function PPCDashboard() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "ShimBot" }, { label: "PPC" }]);
  }, [setBreadcrumbs]);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["shimbot", "ppc", "summary", selectedCompanyId],
    queryFn: () => shimbotApi.ppcSummary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 60_000,
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["shimbot", "ppc", "campaigns", selectedCompanyId],
    queryFn: () => shimbotApi.ppcCampaigns(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 60_000,
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">PPC Dashboard</h1>
        <p className="text-muted-foreground text-sm">Last 7 days · Auto-refreshes every 60s</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loadingSummary ? "…" : `$${fmt(summary?.total_spend)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loadingSummary ? "…" : `$${fmt(summary?.total_sales)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ACoS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingSummary ? "…" : acosBadge(Number(summary?.acos_pct ?? 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loadingSummary ? "…" : summary?.campaigns ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns by Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCampaigns ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Campaign</th>
                    <th className="pb-2 pr-4 font-medium">ASIN</th>
                    <th className="pb-2 pr-4 font-medium text-right">Spend</th>
                    <th className="pb-2 pr-4 font-medium text-right">Sales</th>
                    <th className="pb-2 pr-4 font-medium text-right">Orders</th>
                    <th className="pb-2 font-medium text-right">ACoS</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaigns ?? []).map((c) => (
                    <tr key={c.campaign_id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="py-2 pr-4 max-w-[220px] truncate font-medium">
                        {c.campaign_name}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {c.asin}
                      </td>
                      <td className="py-2 pr-4 text-right">${fmt(c.spend_7d)}</td>
                      <td className="py-2 pr-4 text-right">${fmt(c.sales_7d)}</td>
                      <td className="py-2 pr-4 text-right">{c.orders_7d}</td>
                      <td className="py-2 text-right">{acosBadge(Number(c.acos_pct ?? 0))}</td>
                    </tr>
                  ))}
                  {!loadingCampaigns && (campaigns ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-muted-foreground">
                        No campaign data in the last 7 days
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
