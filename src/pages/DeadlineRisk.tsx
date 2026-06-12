import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatPH } from "@/lib/date-utils";

type RiskTask = {
  id: string;
  title: string;
  due_date: string;
  estimated_duration: number | null;
  status: string;
  daysLeft: number;
  risk: "critical" | "high" | "medium" | "low";
};

export default function DeadlineRisk() {
  const [riskTasks, setRiskTasks] = useState<RiskTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyze = async () => {
      // Fetch ALL tasks with a due_date (including done/overdue)
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .not("due_date", "is", null)
        .order("due_date");

      const todayPH = formatPH(new Date(), "yyyy-MM-dd");

      const analyzed: RiskTask[] = (data || []).map((t) => {
        const duePH = formatPH(t.due_date!, "yyyy-MM-dd");
        const dueDate = new Date(duePH + "T00:00:00");
        const todayDate = new Date(todayPH + "T00:00:00");
        const daysLeft = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

        let risk: RiskTask["risk"] = "low";
        if (daysLeft < 0) risk = "critical";
        else if (daysLeft === 0) risk = "critical";
        else if (daysLeft <= 1) risk = "high";
        else if (daysLeft <= 3) risk = "medium";

        return {
          id: t.id,
          title: t.title,
          due_date: t.due_date!,
          estimated_duration: t.estimated_duration,
          status: t.status,
          daysLeft,
          risk,
        };
      });

      // Show all risks (critical, high, medium) — including overdue/done tasks
      const filtered = analyzed.filter((t) => t.risk !== "low");
      filtered.sort((a, b) => a.daysLeft - b.daysLeft);
      setRiskTasks(filtered);
      setLoading(false);
    };
    analyze();
  }, []);

  const riskColors: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive border-destructive/30",
    high: "bg-warning/10 text-warning border-warning/30",
    medium: "bg-info/10 text-info border-info/30",
  };

  const riskLabels: Record<string, string> = {
    critical: "⚠️ Overdue / Due Today",
    high: "Due Tomorrow",
    medium: "Due in 2-3 Days",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Deadline Risk Detector</h1>
        <p className="text-muted-foreground mt-1">All tasks at risk — including overdue ones</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : riskTasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto h-12 w-12 mb-4 text-success opacity-50" />
            <p className="text-lg">All clear!</p>
            <p className="text-sm mt-1">No tasks at risk of missing their deadline</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {riskTasks.map((t) => (
            <Card key={t.id} className={`border-l-4 ${riskColors[t.risk]}`}>
              <CardContent className="flex items-center gap-4 py-4">
                <AlertTriangle className={`h-5 w-5 shrink-0 ${t.risk === "critical" ? "text-destructive" : t.risk === "high" ? "text-warning" : "text-info"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Due: {formatPH(t.due_date, "MMM d, yyyy h:mm a")}
                    {t.daysLeft < 0 ? ` (${Math.abs(t.daysLeft)} day${Math.abs(t.daysLeft) !== 1 ? "s" : ""} overdue)` : t.daysLeft === 0 ? " (today)" : ` (${t.daysLeft} day${t.daysLeft !== 1 ? "s" : ""} left)`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === "done" && <Badge variant="secondary">Done</Badge>}
                  <Badge variant="outline">{riskLabels[t.risk]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
