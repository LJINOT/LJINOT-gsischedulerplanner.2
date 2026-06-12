import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { HelpCircle, Brain, Zap, Target, CalendarDays } from "lucide-react";

export default function HelpAbout() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold">Help / About</h1>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">GSI Schedule Planner</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>An AI-driven task management and scheduling system that learns your behavior to optimize your productivity.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">System Algorithms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 p-3 rounded-lg bg-accent/30">
            <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">NLP — Task Analyzer</p>
              <p className="text-xs text-muted-foreground">Natural Language Processing analyzes task titles and descriptions to estimate difficulty, urgency, and duration</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-accent/30">
            <Zap className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">PSO — Behavior Learning</p>
              <p className="text-xs text-muted-foreground">Particle Swarm Optimization learns your productivity patterns and preferred working hours</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-accent/30">
            <CalendarDays className="h-5 w-5 text-info shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">CSP — Auto Schedule</p>
              <p className="text-xs text-muted-foreground">Constraint Satisfaction Problem creates conflict-free schedules by placing tasks in optimal time blocks</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-accent/30">
            <Target className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">AHP — Priority Ranking</p>
              <p className="text-xs text-muted-foreground">Analytic Hierarchy Process systematically ranks tasks based on multiple weighted criteria</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Quick Tips</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Add detailed descriptions to tasks for better AI analysis</p>
          <p>• Use the Auto Schedule feature to let CSP handle your calendar</p>
          <p>• Check Focus Mode to see your most important current task</p>
          <p>• View Deadline Risk to catch tasks before they become overdue</p>
          <p>• The more you use the app, the better behavior learning becomes</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
