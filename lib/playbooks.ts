export interface WebinarTemplate {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  capacity: number;
  startingPriceCents: number;
  format: string;
  accent: "teal" | "coral" | "gold";
}

export const webinarTemplates: WebinarTemplate[] = [
  { id: "briefing", name: "Live briefing", description: "A focused, one-to-many session with a crisp agenda and moderated questions.", durationMinutes: 75, capacity: 26, startingPriceCents: 4900, format: "Presentation + Q&A", accent: "teal" },
  { id: "lab", name: "Interactive lab", description: "A smaller working session built around practice, peer reflection, and a tangible output.", durationMinutes: 90, capacity: 18, startingPriceCents: 6500, format: "Facilitated lab", accent: "coral" },
  { id: "tabletop", name: "Tabletop workshop", description: "A scenario-driven format for rehearsing decisions before they become urgent.", durationMinutes: 120, capacity: 20, startingPriceCents: 14900, format: "Scenario workshop", accent: "gold" },
];
