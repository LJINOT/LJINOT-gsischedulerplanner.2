import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PersonalizationPage() {
  const [peakStart, setPeakStart] = useState("09:00");
  const [peakEnd, setPeakEnd] = useState("12:00");
  const [breakStyle, setBreakStyle] = useState("pomodoro");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold">Personalization</h1>
      <p className="text-muted-foreground">Customize how the AI adapts to your working style</p>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Preferred Working Times</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peak Start</Label>
              <Input type="time" value={peakStart} onChange={(e) => setPeakStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Peak End</Label>
              <Input type="time" value={peakEnd} onChange={(e) => setPeakEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">The system will schedule high-difficulty tasks during your peak hours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Break Style</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={breakStyle} onValueChange={setBreakStyle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pomodoro">Pomodoro (25 min work / 5 min break)</SelectItem>
              <SelectItem value="long-focus">Long Focus (50 min work / 10 min break)</SelectItem>
              <SelectItem value="flexible">Flexible (AI decides)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">These preferences will be used by the behavior learning module to optimize your schedule</p>
        </CardContent>
      </Card>

      <Button onClick={() => toast.success("Personalization saved!")} className="w-full">Save Preferences</Button>
    </motion.div>
  );
}
