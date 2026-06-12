import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Wand2 } from "lucide-react";

type ScheduleBlock = { task_id: string; title: string; start: string; end: string; category: string };

export default function Schedule() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [generating, setGenerating] = useState(false);

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-schedule", { body: {} });
      if (error) throw error;
      setBlocks(data?.blocks || []);
      toast.success("Schedule optimized with PSO + CSP!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate schedule");
    }
    setGenerating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Auto Schedule</h1>
          <p className="text-muted-foreground mt-1">CSP automatically places tasks in the calendar</p>
        </div>
        <Button onClick={generateSchedule} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Generate Schedule
        </Button>
      </div>

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Wand2 className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">No schedule generated yet</p>
            <p className="text-sm mt-1">Click "Generate Schedule" to create an optimized plan using PSO & CSP algorithms</p>
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
