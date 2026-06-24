import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * THESIS: Smart Picks using AHP for Right-Now Task Selection
 * 
 * Recommends the top 3-5 tasks the user should focus on right now,
 * using a variant of AHP adapted for immediate (next few hours) prioritization.
 * 
 * Weights: Urgency (50%), Quick-win potential (20%), Flow continuity (15%), Cognitive load (15%)
 */

// AHP for immediate task selection
function ahpSmartPicks(tasks: any[]) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const scored = tasks.map((task: any) => {
    // Urgency (0-1): how soon is it due?
    let urgency = 0.1;
    if (task.due_date) {
      const hoursUntil = (new Date(task.due_date).getTime() - now) / (1000 * 60 * 60);
      if (hoursUntil < 1) urgency = 1.0;
      else if (hoursUntil < 6) urgency = 0.9;
      else if (hoursUntil < 24) urgency = 0.7;
      else if (hoursUntil < 72) urgency = 0.4;
      else urgency = 0.1;
    }

    // Quick-win (0-1): can be done in < 30 mins?
    const quickWin = task.estimated_duration && task.estimated_duration < 30 ? 1.0 : 0.3;

    // Flow continuity (0-1): does category match recent work?
    const flowContinuity = 0.5; // Placeholder; in real scenario, check recent time entries

    // Cognitive load (0-1): easy tasks score higher
    const cognitiveLoad = task.difficulty === "easy" ? 0.9 : task.difficulty === "medium" ? 0.6 : 0.2;

    // AHP weights for immediate prioritization
    const weights = { urgency: 0.5, quickWin: 0.2, flowContinuity: 0.15, cognitiveLoad: 0.15 };
    const score = urgency * weights.urgency + quickWin * weights.quickWin + flowContinuity * weights.flowContinuity + cognitiveLoad * weights.cognitiveLoad;

    return {
      ...task,
      _urgency: urgency,
      _quickWin: quickWin,
      _flowContinuity: flowContinuity,
      _cognitiveLoad: cognitiveLoad,
      _score: score
    };
  });

  scored.sort((a: any, b: any) => b._score - a._score);

  // Top 3-5
  const maxPicks = Math.min(5, Math.max(3, Math.ceil(tasks.length / 2)));
  const picks = scored.slice(0, maxPicks).map((s: any, idx: number) => {
    let reason = "";
    if (s._urgency > 0.7) reason = "Urgent deadline";
    else if (s._quickWin > 0.8) reason = "Quick win (< 30 min)";
    else if (s._cognitiveLoad > 0.7) reason = "Easy to start (low friction)";
    else reason = "Good priority balance";

    return {
      id: s.id,
      title: s.title,
      reason,
      priority: idx === 0 ? "high" : idx < 2 ? "medium" : "low",
      score: Math.round(s._score * 100)
    };
  });

  return picks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .eq("user_id", user.id);

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ picks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const picks = ahpSmartPicks(tasks);

    return new Response(JSON.stringify({
      picks,
      algorithm: "AHP (Immediate Task Selection)",
      taskCount: tasks.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("smart-picks error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
