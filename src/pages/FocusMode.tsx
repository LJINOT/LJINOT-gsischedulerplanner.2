import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Focus, CheckCircle2, Clock } from "lucide-react";

type FocusTask = { id: string; title: string; description: string | null; estimated_duration: number | null; category: string | null; difficulty: string | null };

export default function FocusMode() {
  const [focusTask, setFocusTask] = useState<FocusTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFocusTask = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("smart-picks", { body: {} });
        if (error) throw error;
        const topPick = data?.picks?.[0];
        if (topPick) {
          const { data: task } = await supabase.from("tasks").select("*").eq("id", topPick.id).single();
          setFocusTask(task);
        }
      } catch {
        // Fallback: get highest priority incomplete task
        const { data } = await supabase
          .from("tasks")
          .select("*")
          .neq("status", "done")
          .order("priority_score", { ascending: false, nullsFirst: false })
          .limit(1);
        if (data?.[0]) setFocusTask(data[0]);
      }
      setLoading(false);
    };
    fetchFocusTask();
  }, []);

  const markComplete = async () => {
    if (!focusTask) return;
    const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", focusTask.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Task completed! 🎉");
      setFocusTask(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Focus Mode</h1>
        <p className="text-muted-foreground mt-1">The most important task for your current time block</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : focusTask ? (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-primary/30 shadow-lg">
            <CardContent className="py-10 text-center space-y-6">
              <Focus className="mx-auto h-16 w-16 text-primary opacity-60" />
              <div>
                <h2 className="text-2xl font-display font-bold">{focusTask.title}</h2>
                {focusTask.description && <p className="text-muted-foreground mt-2">{focusTask.description}</p>}
              </div>
              <div className="flex justify-center gap-3">
                {focusTask.category && <Badge variant="outline">{focusTask.category}</Badge>}
                {focusTask.difficulty && <Badge variant="secondary">{focusTask.difficulty}</Badge>}
                {focusTask.estimated_duration && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" /> {focusTask.estimated_duration} min
                  </Badge>
                )}
              </div>
              <Button size="lg" onClick={markComplete} className="mt-4">
                <CheckCircle2 className="mr-2 h-5 w-5" /> Mark Complete
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Focus className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">No tasks to focus on</p>
            <p className="text-sm mt-1">All clear! Add some tasks to get focused recommendations.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
