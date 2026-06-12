import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";

export default function GeneralSettings() {
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("gsi-theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setDarkMode(document.documentElement.classList.contains("dark"));
    }

    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("work_start, work_end, theme").eq("id", user.id).single();
        if (data) {
          if (data.work_start) setWorkStart(data.work_start);
          if (data.work_end) setWorkEnd(data.work_end);
          if (data.theme === "dark") {
            setDarkMode(true);
            document.documentElement.classList.add("dark");
            localStorage.setItem("gsi-theme", "dark");
          } else {
            localStorage.setItem("gsi-theme", data.theme || "light");
          }
        }
      }
      // Check notification permission
      if ("Notification" in window && Notification.permission === "granted") {
        setNotifications(true);
      }
    };
    loadSettings();
  }, []);

  const toggleTheme = async (next: boolean) => {
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("gsi-theme", next ? "dark" : "light");
  };

  const toggleNotifications = async (next: boolean) => {
    if (next && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifications(permission === "granted");
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        return;
      }
    }
    setNotifications(next);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      work_start: workStart,
      work_end: workEnd,
      theme: darkMode ? "dark" : "light",
    });
    if (error) toast.error(error.message);
    else toast.success("Settings saved!");
    setSaving(false);
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const [tasksRes, timeRes, schedulesRes, behaviorRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id),
        supabase.from("time_entries").select("*").eq("user_id", user.id),
        supabase.from("schedules").select("*").eq("user_id", user.id),
        supabase.from("behavior_logs").select("*").eq("user_id", user.id),
      ]);

      const exportPayload = {
        exported_at: new Date().toISOString(),
        tasks: tasksRes.data || [],
        time_entries: timeRes.data || [],
        schedules: schedulesRes.data || [],
        behavior_logs: behaviorRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gsi-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
    setExporting(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold">General Settings</h1>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Work Hours</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">Toggle dark theme</p>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleTheme} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium">Notifications</p>
            <p className="text-sm text-muted-foreground">Enable task reminders</p>
          </div>
          <Switch checked={notifications} onCheckedChange={toggleNotifications} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Data Export</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export all your tasks, time entries, schedules, and behavior data as a JSON file.
          </p>
          <Button onClick={exportData} disabled={exporting} variant="outline" className="w-full">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {exporting ? "Exporting..." : "Export All Data"}
          </Button>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </motion.div>
  );
}
