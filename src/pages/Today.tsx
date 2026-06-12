import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";

type SmartPick = { id: string; title: string; reason: string; priority: string };

export default function Today() {
  const [picks, setPicks] = useState<SmartPick[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase.from("tasks").select("*").eq("due_date", today).neq("status", "done").then(({ data }) => setTasks(data || []));
  }, []);

  const getSmartPicks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-picks", { body: {} });
      if (error) throw error;
      setPicks(data?.picks || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to get recommendations");
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Today</h1>
          <p className="text-muted-foreground mt-1">What to focus on right now</p>
        </div>
        <Button onClick={getSmartPicks} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Smart Picks
        </Button>
      </div>

      {tasks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Due Today</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                <span className="font-medium">{t.title}</span>
                <Badge variant="secondary">{t.status?.replace("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {picks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> AI Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {picks.map((p) => (
              <div key={p.id} className="p-3 rounded-lg border">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 && picks.length === 0 && (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Zap className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>No tasks due today. Click "Smart Picks" for AI recommendations.</p>
        </CardContent></Card>
      )}
    </motion.div>
  );
}
