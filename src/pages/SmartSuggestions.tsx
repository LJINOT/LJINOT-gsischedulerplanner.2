import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Lightbulb, Clock } from "lucide-react";

type Suggestion = { id: string; title: string; reason: string; priority: string; suggested_time?: string };

export default function SmartSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-picks", { body: {} });
      if (error) throw error;
      setSuggestions(data?.picks || []);
      toast.success("Smart suggestions generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to get suggestions");
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
        <div>
          <h1 className="font-display text-3xl font-bold">Smart Suggestions</h1>
          <p className="text-muted-foreground mt-1">AI-recommended best time slots based on your behavior patterns</p>
        </div>
        <Button onClick={getSuggestions} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
          Get Suggestions
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Lightbulb className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">No suggestions yet</p>
            <p className="text-sm mt-1">Click "Get Suggestions" for AI-powered time slot recommendations based on your behavior learning</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <Card key={s.id || i} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                </div>
                <Badge className={priorityColors[s.priority] || priorityColors.medium}>{s.priority}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
