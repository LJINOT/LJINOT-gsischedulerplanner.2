import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Target } from "lucide-react";

type RankedTask = { id: string; title: string; score: number; priority: string; reasoning: string };

export default function Priorities() {
  const [ranked, setRanked] = useState<RankedTask[]>([]);
  const [loading, setLoading] = useState(false);

  const rankPriorities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("rank-priorities", { body: {} });
      if (error) throw error;
      setRanked(data?.tasks || []);
      toast.success("Priorities ranked with AHP!");
    } catch (err: any) {
      toast.error(err.message || "Failed to rank priorities");
    }
    setLoading(false);
  };

  const priorityColors: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-warning/10 text-warning",
    low: "bg-success/10 text-success",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Priorities</h1>
        <Button onClick={rankPriorities} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
          Rank with AHP
        </Button>
      </div>

      {ranked.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Target className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>Click "Rank with AHP" to get AI-powered priority rankings</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {ranked.map((t, i) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <span className="text-2xl font-display font-bold text-muted-foreground w-8">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.reasoning}</p>
                </div>
                <Badge className={priorityColors[t.priority] || priorityColors.medium}>{t.priority}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
