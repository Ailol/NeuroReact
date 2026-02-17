export interface GoalDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  dimensions: string[];
}

export const GOALS: GoalDefinition[] = [
  {
    id: "weight-loss",
    name: "Weight Loss",
    icon: "\u{1F3CB}\uFE0F",
    description:
      "Chemicals that regulate appetite, impulse control, metabolic rate, and reward pathways related to food and body composition.",
    dimensions: [
      "Emotional Regulation",
      "Stress Response",
      "Playfulness",
      "Sensitivity",
      "Inner Peace",
    ],
  },
  {
    id: "energy",
    name: "Energy",
    icon: "\u26A1",
    description:
      "Chemicals that drive wakefulness, metabolic activation, motivation, and sustained physical and mental energy output.",
    dimensions: [
      "Ambition",
      "Persistence",
      "Stress Capacity",
      "Career Resilience",
      "Competitive Drive",
    ],
  },
  {
    id: "leadership",
    name: "Leadership",
    icon: "\u{1F451}",
    description:
      "Chemicals that underpin authority, strategic decision-making, competitive drive, and risk tolerance in leadership contexts.",
    dimensions: [
      "Strategic Thinking",
      "Team Orientation",
      "Stress Capacity",
      "Risk Tolerance",
      "Context Switching",
    ],
  },
  {
    id: "social-skills",
    name: "Social Skills",
    icon: "\u{1F91D}",
    description:
      "Chemicals that govern social bonding, empathy, communication fluency, trust, and conflict resolution.",
    dimensions: [
      "Social Energy",
      "Sensitivity",
      "Team Orientation",
      "Attachment Security",
      "Knowledge Transfer",
    ],
  },
  {
    id: "emotions",
    name: "Emotions",
    icon: "\u{1F49C}",
    description:
      "Chemicals that shape emotional depth, regulation, resilience, intimacy capacity, and self-awareness.",
    dimensions: [
      "Emotional Depth",
      "Emotional Regulation",
      "Self-Awareness",
      "Healing Capacity",
      "Intimacy Capacity",
    ],
  },
];
