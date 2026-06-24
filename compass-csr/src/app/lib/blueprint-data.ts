import type { BlueprintData } from "../types/program";

export function suggestProgramName(companyName: string): string {
  const displayName = companyName.trim() || "Your Company";
  return `${displayName} Community Impact Program`;
}

export function buildBlueprintData(companyName: string): BlueprintData {
  const displayName = companyName.trim() || "Your Company";

  return {
    generatedAt: new Date().toISOString(),
    overview:
      "Based on your company profile, we recommend a Community-First Impact Program centered on employee volunteering, local nonprofit partnerships, and donation matching. This approach aligns authentically with your stated mission and will resonate strongly with both your employees and the customers you serve. The 90-day roadmap below is designed to move you from zero to a fully running program without disrupting your existing operations.",
    pillars: [
      {
        icon: "Users",
        title: "Employee Volunteering",
        desc: "Structured volunteer days and skills-based pro bono opportunities for all staff.",
      },
      {
        icon: "Heart",
        title: "Community Giving",
        desc: "Donation matching and direct grants to vetted nonprofit partners in your region.",
      },
      {
        icon: "Sparkles",
        title: "Employee Engagement",
        desc: "Recognition programs and team challenges that celebrate participation and impact.",
      },
    ],
    phases: [
      {
        label: "Foundation",
        range: "Days 1–14",
        color: "bg-teal-50 border-teal-200",
        dot: "bg-teal-500",
        tasks: [
          "Finalize program charter and goals",
          "Identify internal program champion",
          "Set up Compass workspace and invite team",
          "Define success metrics and KPIs",
        ],
      },
      {
        label: "Planning",
        range: "Days 15–30",
        color: "bg-emerald-50 border-emerald-200",
        dot: "bg-emerald-500",
        tasks: [
          "Select nonprofit partners",
          "Draft employee communication plan",
          "Schedule first volunteer event",
          "Design donation matching policy",
        ],
      },
      {
        label: "Launch",
        range: "Days 31–60",
        color: "bg-cyan-50 border-cyan-200",
        dot: "bg-cyan-500",
        tasks: [
          "Send all-company launch announcement",
          "Host kickoff event or town hall",
          "Open volunteer sign-up portal",
          "Publish CSR page on company website",
        ],
      },
      {
        label: "Expand",
        range: "Days 61–90",
        color: "bg-blue-50 border-blue-200",
        dot: "bg-blue-500",
        tasks: [
          "Gather participation data and feedback",
          "Publish first impact report",
          "Onboard additional nonprofit partners",
          "Plan Q2 program expansion",
        ],
      },
    ],
    nonprofits: [
      {
        name: "Feeding America",
        cause: "Food Security",
        desc: "The nation's largest hunger-relief organization, connecting surplus food to 46 million people annually.",
        color: "bg-orange-50 text-orange-700 border-orange-200",
      },
      {
        name: "Year Up",
        cause: "Workforce Development",
        desc: "Bridges the opportunity divide by providing young adults with technical and professional skills training.",
        color: "bg-violet-50 text-violet-700 border-violet-200",
      },
      {
        name: "The Nature Conservancy",
        cause: "Environmental Stewardship",
        desc: "Conserves land and water worldwide through science-driven conservation and partnerships.",
        color: "bg-teal-50 text-teal-700 border-teal-200",
      },
    ],
    positioning: [
      {
        icon: "Globe",
        channel: "Website Page",
        suggestion:
          "Add a dedicated /impact page featuring your program pillars, partner logos, and a live volunteer-hours counter.",
      },
      {
        icon: "Megaphone",
        channel: "Social Media",
        suggestion: `Post monthly impact milestones on LinkedIn with the hashtag #${displayName.replace(/\s+/g, "")}Impact. Employee spotlights perform especially well.`,
      },
      {
        icon: "FileText",
        channel: "Press Release",
        suggestion:
          "Issue a press release at program launch and again at the 90-day milestone to drive local media coverage. Lead with community impact numbers.",
      },
    ],
    sampleWebsiteCopy: {
      headline: "We believe business is a force for good.",
      body: `At ${displayName}, our Community Impact Program is how we put that belief into action. Through employee volunteering, local nonprofit partnerships, and donation matching, we're building a stronger community — one initiative at a time. Learn how we measure our impact and how you can get involved.`,
    },
    roles: [
      {
        role: "Program Lead",
        responsibility:
          "Own the overall program strategy, manage partner relationships, and report to leadership.",
        time: "4–6 hrs/week",
      },
      {
        role: "Employee Engagement Coordinator",
        responsibility:
          "Recruit participants, manage volunteer sign-ups, and celebrate wins internally.",
        time: "2–4 hrs/week",
      },
      {
        role: "Communications Manager",
        responsibility:
          "Draft announcements, maintain the website page, and manage social content.",
        time: "1–2 hrs/week",
      },
      {
        role: "Finance Liaison",
        responsibility:
          "Administer donation matching, track budget, and prepare ESG reporting data.",
        time: "1–2 hrs/week",
      },
      {
        role: "Executive Sponsor",
        responsibility:
          "Champion the program at the leadership level and attend key milestones.",
        time: "30 min/month",
      },
    ],
  };
}

export function formatProgramDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
