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

/**
 * Rule-based task analyzer: extracts duration, difficulty, and category.
 * No LLM call needed; deterministic rules based on keywords and heuristics.
 * THESIS: This replaces the LLM black box with transparent, auditable classification logic.
 */
function analyzeTask(title: string, description: string, userCategory?: string): {
  duration: number;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  reasoning: string;
} {
  const fullText = `${title} ${description || ""}`.toLowerCase();

  // Category detection via keyword matching
  let category = userCategory;
  if (!category) {
    const categoryKeywords: { [cat: string]: string[] } = {
      "Exam Review": ["exam", "test", "quiz", "study"],
      "Assignment": ["homework", "assignment", "submit", "deadline"],
      "Project": ["project", "build", "create", "develop", "code"],
      "Presentation": ["present", "slide", "ppt", "speech"],
      "Research": ["research", "investigate", "analyze", "explore"],
      "Reading": ["read", "article", "chapter", "book", "paper"],
      "Lab Work": ["lab", "experiment", "hands-on", "physical"],
      "Email Management": ["email", "respond", "reply", "inbox"],
      "Graphic Design": ["design", "graphic", "visual", "logo", "poster"],
      "Video Editing": ["video", "edit", "film", "footage", "render"],
      "Health": ["exercise", "walk", "sleep", "health", "doctor"],
      "Fitness": ["fitness", "workout", "gym", "exercise"],
      "Finance": ["budget", "invoice", "payment", "financial", "money"],
      "Errands": ["grocery", "shop", "errand", "buy", "pickup"],
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => fullText.includes(kw))) {
        category = cat;
        break;
      }
    }

    if (!category) category = "General";
  }

  // Duration estimation via keywords and patterns
  let duration = 30; // Default 30 minutes
  const durationPatterns: [RegExp, number][] = [
    [/quick|fast|brief|5\s*min/i, 15],
    [/30\s*min|half hour/i, 30],
    [/hour|1\s*hr/i, 60],
    [/2\s*hours?|two hours/i, 120],
    [/3\s*hours?|three hours/i, 180],
    [/half day|4\s*hours?/i, 240],
    [/full day|8\s*hours?|all day/i, 480],
  ];

  for (const [pattern, mins] of durationPatterns) {
    if (pattern.test(fullText)) {
      duration = mins;
      break;
    }
  }

  // Difficulty estimation via complexity keywords
  let difficulty: "easy" | "medium" | "hard" = "medium";
  const easyKeywords = ["simple", "basic", "easy", "straightforward", "quick", "clear", "obvious"];
  const hardKeywords = ["complex", "difficult", "hard", "challenging", "intricate", "research-heavy", "deep"];

  const hasEasy = easyKeywords.some(kw => fullText.includes(kw));
  const hasHard = hardKeywords.some(kw => fullText.includes(kw));

  if (hasHard) difficulty = "hard";
  else if (hasEasy) difficulty = "easy";
  else {
    // Heuristic: longer estimated tasks likely harder
    if (duration > 120) difficulty = "hard";
    else if (duration < 30) difficulty = "easy";
  }

  const reasoning = `Category: "${category}" (keyword match). Duration: ~${duration}min. Difficulty: "${difficulty}" (${
    hasHard ? "complex keywords" : hasEasy ? "simple keywords" : "inferred from duration"
  }).`;

  return { duration, difficulty, category, reasoning };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, category } = await req.json();

    if (!title || typeof title !== "string") {
      return new Response(JSON.stringify({ error: "title is required and must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = analyzeTask(title, description, category);

    // Validate category
    if (!validCategories.includes(result.category)) {
      result.category = "General";
    }

    // Ensure duration is in valid range
    if (result.duration < 5 || result.duration > 480) {
      result.duration = Math.max(5, Math.min(480, result.duration));
    }

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
