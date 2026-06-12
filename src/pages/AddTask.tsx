import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Brain, Loader2 } from "lucide-react";

const categories = [
  "Assignment", "Exam Review", "Project", "Research", "Reading", "Lab Work", "Presentation",
  "Personal", "Health", "Errands", "Chores", "Social", "Finance", "Fitness",
  "Freelancing", "Virtual Assistant",
  // Freelancing / Virtual Assistant subcategories
  "Client Communication", "Email Management", "Calendar Scheduling", "Project Tracking",
  "Social Media Management", "Content Creation", "Graphic Design", "Video Editing",
  "Data Entry", "Research Task", "Bookkeeping", "Invoicing",
  "Customer Support", "Lead Generation", "Transcription", "Translation",
  "SEO Optimization", "Website Maintenance", "Proposal Writing", "Meeting Notes",
];

export default function AddTask() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMeta, setAiMeta] = useState<{ duration: number; difficulty: string; category: string } | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setDueTime("");
    setStartTime("");
    setStartDate("");
    setCategory("");
    setAiMeta(null);
  };

  const analyzeTask = async () => {
    if (!title) { toast.error("Enter a title first"); return; }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-task", {
        body: { title, description, category: category || undefined },
      });
      if (error) throw error;
      setAiMeta(data);
      toast.success("AI analysis complete!");
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not logged in"); setLoading(false); return; }

    const PH_OFFSET = "+08:00";

    let dueDatetime: string | null = null;
    if (dueDate) {
      dueDatetime = dueTime ? `${dueDate}T${dueTime}:00${PH_OFFSET}` : `${dueDate}T23:59:00${PH_OFFSET}`;
    }

    let startDatetime: string | null = null;
    const effectiveStartDate = startDate || dueDate;
    if (effectiveStartDate && startTime) {
      startDatetime = `${effectiveStartDate}T${startTime}:00${PH_OFFSET}`;
    }

    const finalCategory = category || aiMeta?.category || "General";

    // Determine initial status: if start_time is in the past or now, set to in_progress
    let initialStatus = "todo";
    if (startDatetime && new Date(startDatetime) <= new Date()) {
      initialStatus = "in_progress";
    }

    const { error } = await supabase.from("tasks").insert({
      title,
      description: description || null,
      due_date: dueDatetime,
      start_time: startDatetime,
      estimated_duration: aiMeta?.duration || null,
      difficulty: aiMeta?.difficulty || null,
      category: finalCategory,
      status: initialStatus,
      user_id: user.id,
    });

    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Task created!");
      resetForm();
      navigate("/tasks");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold">Add Task</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="font-display">New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Finish Math Assignment or Grocery shopping"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-time">Due Time</Label>
                <Input id="due-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Task will auto-switch to "In Progress" when this date/time is reached. If no start date is set, the due date will be used.</p>

            <Button type="button" variant="outline" onClick={analyzeTask} disabled={analyzing} className="w-full">
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              {analyzing ? "Analyzing..." : "Analyze with AI"}
            </Button>

            {aiMeta && (
              <Card className="bg-accent/30 border-primary/20">
                <CardContent className="py-4">
                  <p className="text-sm font-medium mb-2">AI Analysis</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">⏱ {aiMeta.duration} min</Badge>
                    <Badge variant="outline">📊 {aiMeta.difficulty}</Badge>
                    <Badge variant="outline">📁 {aiMeta.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </motion.div>
  );
}
