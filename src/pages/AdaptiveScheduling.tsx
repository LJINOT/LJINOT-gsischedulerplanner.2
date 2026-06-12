import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, CalendarClock } from "lucide-react";

type ScheduleBlock = { task_id: string; title: string; start: string; end: string; category: string };

export default function AdaptiveScheduling() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [generating, setGenerating] = useState(false);

  const rearrangeSchedule = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-schedule", { body: { adaptive: true } });
      if (error) throw error;
      setBlocks(data?.blocks || []);
      toast.success("Schedule adaptively rearranged!");
    } catch (err: any) {
      toast.error(err.message || "Failed to rearrange schedule");
    }
    setGenerating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Adaptive Scheduling</h1>
          <p className="text-muted-foreground mt-1">Automatically rearranges tasks when new ones are added</p>
        </div>
        <Button onClick={rearrangeSchedule} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Rearrange Now
        </Button>
      </div>

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarClock className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">No adaptive schedule yet</p>
            <p className="text-sm mt-1">Add tasks and click "Rearrange Now" to let the AI adaptively reorder your calendar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {blocks.map((b, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="text-sm font-mono text-muted-foreground w-28 shrink-0">{b.start} – {b.end}</div>
                <div className="flex-1">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.category}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
