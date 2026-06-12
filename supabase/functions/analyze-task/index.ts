import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const validCategories = [
  "Assignment", "Exam Review", "Project", "Research", "Reading", "Lab Work", "Presentation",
  "Personal", "Health", "Errands", "Chores", "Social", "Finance", "Fitness",
  "Freelancing", "Virtual Assistant",
  "Client Communication", "Email Management", "Calendar Scheduling", "Project Tracking",
  "Social Media Management", "Content Creation", "Graphic Design", "Video Editing",
  "Data Entry", "Research Task", "Bookkeeping", "Invoicing",
  "Customer Support", "Lead Generation", "Transcription", "Translation",
  "SEO Optimization", "Website Maintenance", "Proposal Writing", "Meeting Notes",
  "General"
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const categoryContext = category ? `\nUser-selected category: ${category}` : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a task analyzer. Extract structured metadata from task descriptions. Available categories: ${validCategories.join(", ")}. If the user already selected a category, use that one.`
          },
          {
            role: "user",
            content: `Analyze this task and extract metadata:\nTitle: ${title}\nDescription: ${description || "No description"}${categoryContext}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_task_metadata",
            description: "Extract duration, difficulty, and category from a task",
            parameters: {
              type: "object",
              properties: {
                duration: { type: "number", description: "Estimated duration in minutes (5-480)" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Task difficulty level" },
                category: { type: "string", enum: validCategories, description: "Task category" }
              },
              required: ["duration", "difficulty", "category"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_task_metadata" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status} ${text}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-task error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
