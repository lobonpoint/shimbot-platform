import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { shimbotApi, type ShimbotDecision } from "../../api/shimbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function priorityBadge(p: number) {
  if (p <= 2) return <Badge className="bg-red-600 text-white">Urgent</Badge>;
  if (p <= 3) return <Badge className="bg-orange-500 text-white">High</Badge>;
  return <Badge variant="secondary">Normal</Badge>;
}

function confidenceBadge(c: string | null) {
  if (!c) return null;
  if (c === "high") return <Badge className="bg-green-600 text-white">High conf</Badge>;
  if (c === "medium") return <Badge className="bg-yellow-500 text-white">Medium conf</Badge>;
  return <Badge variant="outline">{c}</Badge>;
}

function DecisionCard({
  decision,
  onReview,
}: {
  decision: ShimbotDecision;
  onReview: (taskId: string, action: "approved" | "rejected" | "deferred") => void;
}) {
  const [loading, setLoading] = useState(false);

  const handle = async (action: "approved" | "rejected" | "deferred") => {
    setLoading(true);
    await onReview(decision.task_id, action);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold leading-tight">{decision.title}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {priorityBadge(decision.priority)}
            {confidenceBadge(decision.confidence)}
            <Badge variant="outline" className="text-xs capitalize">
              {decision.category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{decision.description}</p>
        {decision.risk_level && (
          <p className="text-xs text-muted-foreground">
            Risk: <span className="capitalize font-medium">{decision.risk_level}</span>
          </p>
        )}
        {decision.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
              onClick={() => handle("approved")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={loading}
              onClick={() => handle("rejected")}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => handle("deferred")}
            >
              Defer
            </Button>
          </div>
        )}
        {decision.status !== "pending" && (
          <p className="text-xs text-muted-foreground capitalize">
            Decision: <span className="font-medium">{decision.decision ?? decision.status}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function Decisions() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: "ShimBot" }, { label: "Decisions" }]);
  }, [setBreadcrumbs]);

  const { data: decisions, isLoading } = useQuery({
    queryKey: ["shimbot", "decisions", selectedCompanyId, statusFilter],
    queryFn: () => shimbotApi.decisions(selectedCompanyId!, statusFilter),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const handleReview = async (
    taskId: string,
    action: "approved" | "rejected" | "deferred",
  ) => {
    await shimbotApi.reviewDecision(selectedCompanyId!, taskId, action);
    await queryClient.invalidateQueries({
      queryKey: ["shimbot", "decisions", selectedCompanyId],
    });
  };

  const pending = (decisions ?? []).filter((d) => d.status === "pending").length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decision Queue</h1>
          <p className="text-muted-foreground text-sm">
            {pending} pending · Auto-refreshes every 30s
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && (decisions ?? []).length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No {statusFilter === "pending" ? "pending " : ""}decisions
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {(decisions ?? []).map((d) => (
          <DecisionCard key={d.task_id} decision={d} onReview={handleReview} />
        ))}
      </div>
    </div>
  );
}
