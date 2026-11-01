/**
 * Prompt templates for the planning engine.
 * Version-stamped so changes can be tracked.
 */

export const PROMPT_VERSION = 'v1';

export const PLANNER_SYSTEM_PROMPT = `You are the planning engine for PlacementOS — a personal AI placement preparation coach for an Electrical Engineering B.Tech pre-final-year student at MNNIT Allahabad preparing for SDE/Backend roles at top product companies.

Your job is to select and schedule the best 2–3 MAJOR tasks for today based on the context provided.

RULES:
1. Select at most {maxMajorTasks} major tasks. Each major task may include smaller sub-steps.
2. Tasks must fit within the available free blocks. Do not schedule tasks outside them.
3. Tasks must not overlap each other.
4. Prefer high-priority, high-deadline-urgency, or due-for-revision topics.
5. On low-energy days: pick lighter tasks, shorter sessions, no marathon DSA.
6. Every task must have a SPECIFIC measurable completion criterion — not "study graphs" but "implement BFS on an adjacency list and solve 2 LeetCode problems: Flood Fill (Easy) and Number of Islands (Medium)".
7. Every task must include at least one FREE learning resource (YouTube, official docs, LeetCode, GeeksForGeeks, etc.).
8. Explain briefly (1–2 sentences) why each task was selected today.
9. Do NOT add filler tasks. 2 excellent tasks beat 3 mediocre ones.
10. Respond ONLY with valid JSON matching the schema provided.

STUDENT PROFILE:
- LeetCode rating: ~1870, Knight badge
- Amazon ML Summer School 2026 selected
- Built: Real-Time Chat App (Node/Express/MongoDB/WebSockets/JWT/queues) and AgentForge (LangGraph/MCP multi-tenant orchestration)
- Current priority: DSA > Core CS > Backend > System Design > GenAI > DevOps
- Target: MAANG/Goldman Sachs-tier SDE/Backend roles, ₹15 LPA+`;

export function buildPlannerPrompt(context: {
  date: string;
  dayOfWeek: string;
  energyLevel: string;
  availableBlocks: Array<{ start: string; end: string; durationMinutes: number }>;
  usableMinutes: number;
  totalFreeMinutes: number;
  userCheckIn: string;
  urgentDeadlines: string[];
  unexpectedCommitments: string[];
  pendingCarryForward: Array<{ title: string; category: string; carriedForwardCount: number; priority: string }>;
  recentCompletions: Array<{ title: string; category: string; completedAt: string }>;
  dueForRevision: Array<{ topic: string; trackName: string; lastPracticed: string | null; nextRevisionAt: string | null }>;
  notStartedTopics: Array<{ topic: string; trackName: string; priority: number }>;
  activeProjects: Array<{ name: string; status: string; nextMilestone: string | null }>;
  maxMajorTasks: number;
}): string {
  return `Generate today's study plan.

DATE: ${context.date} (${context.dayOfWeek})
ENERGY: ${context.energyLevel}
USER CHECK-IN: "${context.userCheckIn || 'No check-in provided — use defaults'}"

FREE STUDY BLOCKS (use only these windows):
${context.availableBlocks.map((b) => `  • ${b.start}–${b.end} (${b.durationMinutes} min)`).join('\n')}
Total free: ${context.totalFreeMinutes} min | Usable (after 20% buffer): ${context.usableMinutes} min

${context.urgentDeadlines.length > 0 ? `URGENT DEADLINES:\n${context.urgentDeadlines.map((d) => `  ⚠️ ${d}`).join('\n')}\n` : ''}
${context.unexpectedCommitments.length > 0 ? `UNEXPECTED COMMITMENTS:\n${context.unexpectedCommitments.map((c) => `  • ${c}`).join('\n')}\n` : ''}
${context.pendingCarryForward.length > 0 ? `PENDING (CARRY FORWARD):\n${context.pendingCarryForward.map((t) => `  • [${t.category}] ${t.title} — priority: ${t.priority}, carried: ${t.carriedForwardCount} times`).join('\n')}\n` : ''}
${context.dueForRevision.length > 0 ? `DUE FOR REVISION:\n${context.dueForRevision.map((r) => `  • ${r.topic} (${r.trackName}) — last practiced: ${r.lastPracticed || 'never'}`).join('\n')}\n` : ''}
${context.notStartedTopics.length > 0 ? `NEXT TOPICS IN ROADMAP:\n${context.notStartedTopics.slice(0, 5).map((t) => `  • ${t.topic} (${t.trackName})`).join('\n')}\n` : ''}
${context.activeProjects.length > 0 ? `ACTIVE PROJECTS:\n${context.activeProjects.map((p) => `  • ${p.name}: ${p.nextMilestone || 'no milestone set'}`).join('\n')}\n` : ''}
${context.recentCompletions.length > 0 ? `RECENTLY COMPLETED (last 3 days):\n${context.recentCompletions.map((c) => `  ✓ ${c.title} (${c.category})`).join('\n')}\n` : ''}

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "planSummary": "One sentence describing today's focus",
  "tasks": [
    {
      "title": "string — specific, actionable",
      "description": "string — what exactly to do, step by step",
      "category": "DSA | Core CS | Backend | System Design | GenAI | DevOps | Placement | Project | Hackathon",
      "priority": "critical | high | medium | low",
      "isMajorTask": true,
      "estimatedMinutes": number,
      "scheduledStart": "HH:mm",
      "scheduledEnd": "HH:mm",
      "completionCriteria": "string — measurable, specific. What does 'done' look like?",
      "expectedOutcome": "string — what skill or knowledge do you gain?",
      "whySelected": "string — 1-2 sentences explaining why this task today",
      "resources": [
        { "title": "string", "url": "string — must be a real, free resource" }
      ]
    }
  ]
}`;
}
