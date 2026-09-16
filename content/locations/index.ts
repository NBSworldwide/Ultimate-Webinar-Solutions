export interface ServiceLocationFaq {
  question: string;
  answer: string;
}

export interface ServiceLocation {
  slug: string;
  city: string;
  region: string;
  timezone: string;
  accent: "teal" | "coral" | "gold";
  eyebrow: string;
  title: string;
  summary: string;
  description: string;
  bestFor: string[];
  deliveryModes: string[];
  faqs: ServiceLocationFaq[];
}

/**
 * Synthetic service-area copy for the standalone release. These are
 * virtual-first coverage examples, not imported customers, offices, or local
 * business listings.
 */
export const serviceLocations: ServiceLocation[] = [
  {
    slug: "chicago-il",
    city: "Chicago",
    region: "Illinois",
    timezone: "Central Time",
    accent: "teal",
    eyebrow: "Sample coverage · Central Time",
    title: "Webinar operations support for Chicago teams",
    summary: "A calm, practical production rhythm for briefings, labs, and workshops coordinated from Chicago.",
    description: "This sample service page shows how Webinar Studio can describe virtual-first facilitation and registration support for teams working in the Chicago time zone. It is a planning example, not a claim of a local storefront or an imported customer relationship.",
    bestFor: ["Central-time leadership briefings", "Cross-functional operating reviews", "Small-group learning labs"],
    deliveryModes: ["Virtual room setup", "Live facilitation support", "Post-session replay handoff"],
    faqs: [
      { question: "Is this an in-person Chicago venue?", answer: "No. This release models virtual-first webinar delivery. A future production deployment can attach a confirmed venue or streaming provider to an individual session." },
      { question: "Can the session work across time zones?", answer: "Yes. The webinar record stores UTC time together with its IANA timezone so operators can publish a clear local time and attendees can plan confidently." },
      { question: "What can a Chicago team start with?", answer: "Start with a published sample session, choose a tier, and use the registration flow to exercise seat holds, confirmation records, and attendee access." },
    ],
  },
  {
    slug: "austin-tx",
    city: "Austin",
    region: "Texas",
    timezone: "Central Time",
    accent: "coral",
    eyebrow: "Sample coverage · Central Time",
    title: "Interactive webinar facilitation for Austin teams",
    summary: "A flexible lab format for growing teams that need better conversations, decisions, and follow-through.",
    description: "This synthetic Austin example focuses on interactive learning: a clear run of show, a focused attendee experience, and an operational record that survives the live room. It intentionally contains no local addresses, customer lists, or inherited product catalog.",
    bestFor: ["Manager enablement labs", "Distributed team onboarding", "Decision-making workshops"],
    deliveryModes: ["Interactive agenda design", "Moderated Q&A flow", "Attendance and replay tracking"],
    faqs: [
      { question: "Can the lab include multiple seat tiers?", answer: "Yes. Each webinar can define its own tiers and capacities. The server keeps inventory authoritative and records the selected tier with each registration." },
      { question: "Do attendees need an account?", answer: "No for the demo registration flow. An optional attendee account gives returning participants a place to see their synthetic registrations and replay links." },
      { question: "Can operators change the format later?", answer: "The playbook templates are intentionally separate from the webinar record, so an operator can start with a lab template and refine the session without coupling it to a product entry." },
    ],
  },
  {
    slug: "denver-co",
    city: "Denver",
    region: "Colorado",
    timezone: "Mountain Time",
    accent: "gold",
    eyebrow: "Sample coverage · Mountain Time",
    title: "Tabletop workshop production for Denver teams",
    summary: "A structured workshop path for teams that want to rehearse response decisions before the pressure is real.",
    description: "This sample Denver page demonstrates a tabletop-workshop service line for virtual teams. It emphasizes preparation, a repeatable facilitation pattern, and post-event follow-through without inventing reviews, local offices, or customer outcomes.",
    bestFor: ["Incident response rehearsals", "Risk and resilience workshops", "Leadership scenario practice"],
    deliveryModes: ["Scenario and agenda planning", "Facilitator runbook", "Action summary and replay plan"],
    faqs: [
      { question: "What makes a tabletop different from a briefing?", answer: "A tabletop asks participants to make decisions against a shared scenario. The sample catalog keeps that format distinct from a one-way briefing so the operator can choose the right experience." },
      { question: "Is the Denver workshop a real scheduled event?", answer: "It is synthetic sample content for the new standalone release. Operators can publish a real session only after adding their own confirmed schedule and provider details." },
      { question: "Can the workshop be delivered remotely?", answer: "Yes. The sample delivery mode is virtual-first, with an explicit provider adapter reserved for a future production connection." },
    ],
  },
];

export function getServiceLocation(slug: string): ServiceLocation | undefined {
  return serviceLocations.find((location) => location.slug === slug);
}
