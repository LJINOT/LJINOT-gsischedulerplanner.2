import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle2, Archive } from "lucide-react";
import { formatPH } from "@/lib/date-utils";

export default function Completed() {
  const [tasksByMonth, setTasksByMonth] = useState<Record<string, any[]>>({});

  useEffect(() => {
    supabase.from("tasks").select("*").eq("status", "done").order("updated_at", { ascending: false }).then(({ data }) => {
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((t) => {
        const monthKey = formatPH(t.updated_at, "MMMM yyyy");
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(t);
      });
      setTasksByMonth(grouped);
    });
  }, []);

  const months = Object.keys(tasksByMonth);
  const totalTasks = months.reduce((sum, m) => sum + tasksByMonth[m].length, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Completed</h1>
        <p className="text-muted-foreground">{totalTasks} task{totalTasks !== 1 ? "s" : ""} completed</p>
      </div>

      {months.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>No completed tasks yet</p>
        </CardContent></Card>
      ) : (
        months.map((month) => (
          <Card key={month}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                {month}
                <Badge variant="secondary" className="ml-auto">{tasksByMonth[month].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByMonth[month].map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 opacity-80">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <div>
                      <p className="font-medium line-through">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.category && `${t.category} · `}
                        Completed {formatPH(t.updated_at, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {t.estimated_duration && <Badge variant="outline">{t.estimated_duration} min</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </motion.div>
  );
}
