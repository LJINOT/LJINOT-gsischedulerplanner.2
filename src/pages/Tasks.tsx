import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatPH } from "@/lib/date-utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority_score: number | null;
  category: string | null;
  difficulty: string | null;
  due_date: string | null;
  start_time: string | null;
  estimated_duration: number | null;
};

const statusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-info/10 text-info",
  done: "bg-success/10 text-success",
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTasks(data || []);
    setLoading(false);
  };

  // Auto-switch tasks to in_progress when start_time is reached
  const checkStartTimes = useCallback(async () => {
    const now = new Date();
    const tasksToUpdate = tasks.filter(
      t => t.status === "todo" && t.start_time && new Date(t.start_time) <= now
    );
    for (const task of tasksToUpdate) {
      await supabase.from("tasks").update({ status: "in_progress" }).eq("id", task.id);
      toast.info(`"${task.title}" is now in progress!`);
    }
    if (tasksToUpdate.length > 0) fetchTasks();
  }, [tasks]);

  useEffect(() => { fetchTasks(); }, []);

  useEffect(() => {
    checkStartTimes();
    const interval = setInterval(checkStartTimes, 30000);
    return () => clearInterval(interval);
  }, [checkStartTimes]);

  // Toggle only between todo and done; in_progress is auto-triggered by start_time
  const toggleStatus = async (task: Task) => {
    // in_progress can only go to done, not back to todo
    if (task.status === "in_progress") {
      const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", task.id);
      if (error) toast.error(error.message);
      else fetchTasks();
      return;
    }
    const next = task.status === "done" ? "todo" : "done";
    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", task.id);
    if (error) toast.error(error.message);
    else fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Task deleted"); fetchTasks(); }
  };

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Tasks</h1>
        <Button asChild><Link to="/add-task"><PlusCircle className="mr-2 h-4 w-4" /> Add Task</Link></Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No tasks found. <Link to="/add-task" className="text-primary hover:underline">Create one?</Link></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(task); }} className="shrink-0" title={task.status === "done" ? "Mark as To Do" : "Mark as Done"}>
                      <Badge className={statusColors[task.status] || statusColors.todo}>{task.status.replace("_", " ")}</Badge>
                    </button>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${task.status === "done" ? "line-through opacity-60" : ""}`}>{task.title}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {task.start_time && <span>Start: {formatPH(task.start_time, "MMM d, h:mm a")}</span>}
                        {task.due_date && <span>Due: {formatPH(task.due_date, "MMM d, h:mm a")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.category && <Badge variant="outline">{task.category}</Badge>}
                    {task.difficulty && <Badge variant="secondary">{task.difficulty}</Badge>}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                    {expandedTaskId === task.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {expandedTaskId === task.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {task.description || "No description provided."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
