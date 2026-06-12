import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatPH } from "@/lib/date-utils";

export default function ThisWeek() {
  const [tasksByDay, setTasksByDay] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    supabase.from("tasks").select("*")
      .gte("due_date", start.toISOString().split("T")[0])
      .lte("due_date", end.toISOString().split("T")[0])
      .order("due_date")
      .then(({ data }) => {
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((t) => {
          const d = t.due_date ? formatPH(t.due_date, "yyyy-MM-dd") : "unscheduled";
          if (!grouped[d]) grouped[d] = [];
          grouped[d].push(t);
        });
        setTasksByDay(grouped);
      });
  }, []);

  const days = Object.keys(tasksByDay).sort();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display text-3xl font-bold">This Week</h1>

      {days.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No tasks scheduled this week</CardContent></Card>
      ) : (
        days.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                {day === "unscheduled"
                  ? "Unscheduled"
                  : new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByDay[day].map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                  <span className="font-medium">{t.title}</span>
                  <Badge variant="secondary">{t.status?.replace("_", " ")}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </motion.div>
  );
}
