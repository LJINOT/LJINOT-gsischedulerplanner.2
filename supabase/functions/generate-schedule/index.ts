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

    // Fetch user's incomplete tasks
    const { data: tasks } = await supabase.from("tasks").select("*").neq("status", "done").eq("user_id", user.id);
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ blocks: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch user preferences
    const { data: profile } = await supabase.from("profiles").select("work_start, work_end").eq("id", user.id).single();
    const workStart = profile?.work_start || "09:00";
    const workEnd = profile?.work_end || "17:00";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const taskList = tasks.map(t => `- "${t.title}" (duration: ${t.estimated_duration || 30}min, difficulty: ${t.difficulty || 'medium'}, due: ${t.due_date || 'none'}, category: ${t.category || 'other'})`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a schedule optimizer using PSO (Particle Swarm Optimization) and CSP (Constraint Satisfaction) principles. Create an optimized daily schedule. Work hours: ${workStart} to ${workEnd}. Rules: no overlapping tasks, respect deadlines, harder tasks in the morning, group similar categories.`
          },
          {
            role: "user",
            content: `Create an optimized schedule for today with these tasks:\n${taskList}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_schedule",
            description: "Create an optimized daily schedule",
            parameters: {
              type: "object",
              properties: {
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_id: { type: "string" },
                      title: { type: "string" },
                      start: { type: "string", description: "Start time HH:MM" },
                      end: { type: "string", description: "End time HH:MM" },
                      category: { type: "string" }
                    },
                    required: ["title", "start", "end", "category"],
                    additionalProperties: false
                  }
                }
              },
              required: ["blocks"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "create_schedule" } }
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
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-schedule error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
