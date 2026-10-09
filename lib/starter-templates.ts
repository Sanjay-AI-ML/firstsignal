import type { StarterId } from "./onboarding-intent";

export type StarterTemplate = {
  id: StarterId; role: "founder" | "investor"; title: string; description: string;
  outcome: string; sections: { title: string; prompt: string }[]; markdown: string;
};

export const starterTemplates: StarterTemplate[] = [
  {
    id: "founder-brief", role: "founder", title: "Founder brief",
    description: "Turn an early idea into a story someone can understand.",
    outcome: "The problem. The learning. The next experiment.",
    sections: [
      { title: "Start with the problem", prompt: "Who faces it, how do they manage it today, and what have you observed?" },
      { title: "Separate evidence from assumptions", prompt: "What did you test, with whom and when? Untested is a useful answer too." },
      { title: "Make the next step concrete", prompt: "State an assumption, a test, a measurement and a decision criterion before testing." },
    ],
    markdown: `# Founder brief

Replace the prompts with your own information. Leave undecided details blank.
Keep confidential information and personal customer details out of public summaries.

## Startup at a glance
- Working name:
- Public founder name:
- City:
- Sector:
- Stage: Idea-stage / Pre-product / Prototype / Early traction
- One-line idea: We help [customer] do [task] by [approach].

## The problem
Who faces it? How do they handle it today? What have you observed?

## Proposed solution
What will you build? Say what exists today and what is still proposed.

## Relevant background
What skills, experience or customer access can your team bring?

## Evidence and customer learning
What did you test, with whom, and when?
What did you observe? Distinguish interest from commitments or paying customers.
It is fine to say the idea has not been tested.
- Evidence date: YYYY-MM-DD
- Method and participant selection:
- Sample size and relevant denominator:
- Source or record reference, with sharing permission:
- What the evidence cannot establish:

## What remains uncertain
Which assumption matters most? What evidence would change your view?

## Next milestone
Describe an observable next step, its time frame and what you hope to learn.

## Next experiment
- Assumption to test:
- Method and consenting participants:
- Measurement:
- Decision criterion — choose before testing:
- Planned date:
- Status: Proposed / In progress / Completed / Inconclusive
An interview count alone does not establish willingness to pay or investment readiness.

## Planning budget — optional
- Estimated next-step cost in INR:
- What it covers:
- Basis of the estimate and exclusions:

## Current status
- Product:
- Revenue:
- Incorporation:

## Before sharing
Check accuracy, permission to share and your intended visibility.
A planning budget is an estimate, not an investment offer.
`,
  },
  {
    id: "progress-update", role: "founder", title: "Progress update",
    description: "Give people a reason to revisit your idea.",
    outcome: "What changed. What didn’t. What comes next.",
    sections: [
      { title: "Describe the test", prompt: "What question did you investigate? Include the date, method and scope." },
      { title: "Share the learning", prompt: "Include negative or inconclusive results. Say what the test cannot tell you." },
      { title: "Choose the next experiment", prompt: "What assumption, measurement and decision criterion will guide your next test?" },
    ],
    markdown: `# Founder progress update

## Title
[The specific test or learning, rather than a promotional headline]

## Date
YYYY-MM-DD — when the activity happened

## What we tested
What question did you investigate? Describe the people, method and scope.
- Participant selection and sample size:
- Measurement and decision criterion set before testing:
- Source or record reference, with sharing permission:

## What we observed
Report what happened, including negative or inconclusive results.
Separate expressed interest from purchase commitments and revenue.

## What changed
What did you change in the idea, priorities or understanding?

## What remains uncertain
What can this test not tell you?

## Next step
What will you test next, by when, and what would change your decision?
- Assumption:
- Method:
- Measurement:
- Decision criterion — choose before testing:

## Before sharing
Remove confidential details. Check permission and profile visibility.
Updates on a listed FirstSignal profile are public with that profile.
`,
  },
  {
    id: "investor-preferences", role: "investor", title: "Investor preferences",
    description: "Help the right founders understand your interests.",
    outcome: "Your thesis. Your expectations. Your availability.",
    sections: [
      { title: "Define your focus", prompt: "Which problems, sectors and stages interest you? Include important exclusions." },
      { title: "Explain what helps you decide", prompt: "What evidence do you need before a conversation? Separate essentials from extras." },
      { title: "Set useful expectations", prompt: "Describe indicative check ranges, current availability and questions to prepare." },
    ],
    markdown: `# Investor preference brief

Replace the prompts with current information.
These are discussion preferences, not a commitment to invest.

## Introduction
- Public investor or organisation name:
- Public contact name:
- City:
- Investing role and relevant background:

## One-line thesis
We are interested in [sector/customer problem] at [stage].

## Who we want to meet
- Sectors:
- Stages: Idea-stage / Pre-product / Prototype / Early traction
- Important interests or exclusions:

## Evidence we seek
What helps you decide whether to have a conversation?
Distinguish essential requirements from useful extras.

## Indicative check range — optional
- Minimum INR:
- Maximum INR:
Leave both blank if undecided. Explain any important conditions.

## Availability
How many introductions can you reasonably consider, over what period?
Describe current limits and when these preferences were updated.

## Useful first conversation
What questions should a founder prepare to discuss?

## Before sharing
Check accuracy and permission to share. Revisit availability when it changes.
`,
  },
];

export function getStarterTemplate(id: string) {
  return starterTemplates.find(template => template.id === id);
}
