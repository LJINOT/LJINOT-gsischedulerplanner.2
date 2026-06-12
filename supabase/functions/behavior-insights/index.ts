import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json().catch(() => ({}));
    const rangeDays: number = Number(body?.rangeDays) || 30;
    const sinceISO = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch tasks within the requested range
    const { data: allTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", sinceISO);

    const { data: timeEntries } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", sinceISO);

    const tasks = allTasks || [];
    const completedTasks = tasks.filter(t => t.status === "done");
    const pendingTasks = tasks.filter(t => t.status !== "done");

    // ---- Deadline risk factor ----
    // For each pending task with a due_date, compute how many hours until due.
    // Risk: overdue = 1.0, <24h = 0.85, <72h = 0.6, <7d = 0.35, else 0.1
    const now = Date.now();
    const riskScores: number[] = [];
    let overdueCount = 0;
    let dueSoonCount = 0; // within 24h
    let atRiskCount = 0;  // within 72h
    const riskyTasks: { title: string; due: string; hoursLeft: number; risk: number }[] = [];

    for (const t of pendingTasks) {
      if (!t.due_date) continue;
      const due = new Date(t.due_date).getTime();
      const hoursLeft = (due - now) / (1000 * 60 * 60);
      let risk: number;
      if (hoursLeft < 0) { risk = 1.0; overdueCount++; }
      else if (hoursLeft < 24) { risk = 0.85; dueSoonCount++; }
      else if (hoursLeft < 72) { risk = 0.6; atRiskCount++; }
      else if (hoursLeft < 168) { risk = 0.35; }
      else { risk = 0.1; }
      riskScores.push(risk);
      if (risk >= 0.6) {
        riskyTasks.push({ title: t.title, due: t.due_date, hoursLeft: Math.round(hoursLeft), risk });
      }
    }

    // Late completion factor: completed tasks where updated_at > due_date
    let lateCompletions = 0;
    for (const t of completedTasks) {
      if (t.due_date && new Date(t.updated_at).getTime() > new Date(t.due_date).getTime()) {
        lateCompletions++;
      }
    }
    const lateRate = completedTasks.length ? lateCompletions / completedTasks.length : 0;

    const avgPendingRisk = riskScores.length ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;
    // Weighted: 70% pending risk, 30% historical late rate
    const deadlineRiskFactor = Math.round((avgPendingRisk * 0.7 + lateRate * 0.3) * 100);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const completedInfo = completedTasks.map(t => `Category: ${t.category}, Difficulty: ${t.difficulty}, Duration: ${t.estimated_duration}min, Completed: ${t.updated_at}, Due: ${t.due_date || 'none'}`).join("\n");
    const timeInfo = (timeEntries || []).map(e => `Start: ${e.start_time}, End: ${e.end_time || 'ongoing'}, Duration: ${e.duration || '?'}min`).join("\n");
    const riskInfo = `Pending tasks: ${pendingTasks.length}, Overdue: ${overdueCount}, Due within 24h: ${dueSoonCount}, Due within 72h: ${atRiskCount}, Late completion rate: ${(lateRate * 100).toFixed(1)}%`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a behavior analyst. Analyze user's task completion, time tracking, and DEADLINE risk patterns over the last ${rangeDays} days to provide personalized productivity insights. Pay special attention to deadline adherence and risk mitigation.`
          },
          {
            role: "user",
            content: `Analyze my productivity patterns over the last ${rangeDays} days:\n\nCompleted Tasks (${completedTasks.length}):\n${completedInfo || "No data"}\n\nTime Entries:\n${timeInfo || "No data"}\n\nDeadline Risk Snapshot:\n${riskInfo}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_behavior",
            description: "Analyze user behavior patterns including deadline risk",
            parameters: {
              type: "object",
              properties: {
                peak_hours: { type: "string", description: "When user is most productive" },
                avg_task_duration: { type: "number", description: "Average task duration in minutes" },
                preferred_categories: { type: "array", items: { type: "string" } },
                insights: { type: "array", items: { type: "string" }, description: "3-5 actionable insights including deadline risk recommendations" },
                productivity_score: { type: "number", description: "Score 0-100" },
                deadline_risk_summary: { type: "string", description: "1-2 sentence summary of the user's deadline risk behavior pattern" }
              },
              required: ["peak_hours", "avg_task_duration", "preferred_categories", "insights", "productivity_score", "deadline_risk_summary"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "analyze_behavior" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      await response.text();
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    // Attach computed deadline risk metrics
    const enriched = {
      ...result,
      range_days: rangeDays,
      deadline_risk: {
        factor: deadlineRiskFactor,
        overdue_count: overdueCount,
        due_within_24h: dueSoonCount,
        due_within_72h: atRiskCount,
        pending_with_deadline: riskScores.length,
        late_completion_rate: Math.round(lateRate * 100),
        risky_tasks: riskyTasks.sort((a, b) => b.risk - a.risk).slice(0, 5),
      },
      totals: {
        completed: completedTasks.length,
        pending: pendingTasks.length,
        total: tasks.length,
      },
    };

    return new Response(JSON.stringify(enriched), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("behavior-insights error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
