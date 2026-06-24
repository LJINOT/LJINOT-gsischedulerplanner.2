import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * THESIS: AHP Pairwise Comparison Matrix (Saaty's 1-9 scale)
 * Rows/Cols: [Deadline, Difficulty, Duration, Category]
 * This matrix encodes the relative importance of each criterion.
 * Consistency Ratio (CR) is computed to validate the matrix.
 */
const DEFAULT_PAIRWISE_MATRIX = [
  [1,   3,   4,   5],      // Deadline: 3× Difficulty, 4× Duration, 5× Category
  [1/3, 1,   2,   3],      // Difficulty: 2× Duration, 3× Category
  [1/4, 1/2, 1,   2],      // Duration: 2× Category
  [1/5, 1/3, 1/2, 1]       // Category: baseline
];

function normalizeMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const colSums = Array(n).fill(0);
  
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }
  
  const normalized: number[][] = [];
  for (let i = 0; i < n; i++) {
    normalized[i] = [];
    for (let j = 0; j < n; j++) {
      normalized[i][j] = matrix[i][j] / colSums[j];
    }
  }
  return normalized;
}

function computeEigenvector(matrix: number[][], iterations = 100, tolerance = 1e-6): number[] {
  const n = matrix.length;
  let v = Array(n).fill(1 / n);
  
  for (let iter = 0; iter < iterations; iter++) {
    const newV = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newV[i] += matrix[i][j] * v[j];
      }
    }
    
    const norm = Math.sqrt(newV.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < n; i++) newV[i] /= norm;
    
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(newV[i] - v[i]);
    
    v = newV;
    if (diff < tolerance) break;
  }
  
  return v;
}

function computeMaxEigenvalue(matrix: number[][], eigenvector: number[]): number {
  const n = matrix.length;
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) rowSum += matrix[i][j] * eigenvector[j];
    if (eigenvector[i] !== 0) weightedSum += rowSum / eigenvector[i];
  }
  return weightedSum / n;
}

function getRandomIndex(n: number): number {
  const riValues: { [k: number]: number } = {
    1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
  };
  return riValues[n] || 0;
}

function computeConsistencyRatio(matrix: number[][], eigenvector: number[]): number {
  const n = matrix.length;
  const lambdaMax = computeMaxEigenvalue(matrix, eigenvector);
  const ci = (lambdaMax - n) / (n - 1);
  const ri = getRandomIndex(n);
  return ri !== 0 ? ci / ri : 0;
}

function rankTasksAHP(tasks: any[], pairwiseMatrix = DEFAULT_PAIRWISE_MATRIX) {
  const normalized = normalizeMatrix(pairwiseMatrix);
  const eigenvector = computeEigenvector(normalized);
  const cr = computeConsistencyRatio(pairwiseMatrix, eigenvector);
  
  const totalWeight = eigenvector.reduce((a, b) => a + b, 0);
  const weights = {
    deadline: eigenvector[0] / totalWeight,
    difficulty: eigenvector[1] / totalWeight,
    duration: eigenvector[2] / totalWeight,
    category: eigenvector[3] / totalWeight
  };

  const now = Date.now();
  const scored = tasks.map((task: any) => {
    let deadlineScore = 0.1;
    if (task.due_date) {
      const hoursUntil = (new Date(task.due_date).getTime() - now) / (1000 * 60 * 60);
      if (hoursUntil < 24) deadlineScore = 1.0;
      else if (hoursUntil < 72) deadlineScore = 0.8;
      else if (hoursUntil < 168) deadlineScore = 0.6;
      else deadlineScore = Math.max(0.1, 1 - hoursUntil / 720);
    }

    const difficultyScore = task.difficulty === "easy" ? 0.9 : task.difficulty === "medium" ? 0.6 : 0.3;
    const durationScore = Math.max(0.1, 1 - (task.estimated_duration || 30) / 480);
    const categoryScore = 0.5;

    const totalScore = 
      deadlineScore * weights.deadline +
      difficultyScore * weights.difficulty +
      durationScore * weights.duration +
      categoryScore * weights.category;

    return { ...task, _rawScore: totalScore };
  });

  scored.sort((a: any, b: any) => b._rawScore - a._rawScore);

  const maxScore = Math.max(...scored.map((s: any) => s._rawScore), 1);
  const rankings = scored.map((s: any) => ({
    id: s.id,
    score: Math.round(s._rawScore * 100),
    percentile: Math.round((s._rawScore / maxScore) * 100)
  }));

  return {
    rankings,
    ahpData: {
      consistency_ratio: Math.round(cr * 1000) / 1000,
      is_consistent: cr < 0.1,
      weights
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { tasks } = body;

    if (!tasks || !Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: "tasks array required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { rankings, ahpData } = rankTasksAHP(tasks);
    const result = {
      rankings,
      algorithm: "AHP (Analytic Hierarchy Process)",
      ahpMetrics: ahpData,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rank-priorities error:", e);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
