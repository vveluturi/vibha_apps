export interface Nonprofit {
  id: string;
  name: string;
  mission: string;
  cause: string;
  location: string;
  website: string;
  size: string; // e.g. "Large", "Mid-size", "Small"
  partnershipTypes: string[];
}

// ─── Cause areas ──────────────────────────────────────────────────────────────

export const CAUSE_AREAS = [
  "All",
  "Education",
  "Environment",
  "Food Security",
  "Workforce Development",
  "Health & Wellbeing",
  "Diversity & Inclusion",
  "Community Development",
  "Youth & Families",
];

export const CAUSE_COLORS: Record<string, string> = {
  "Education":             "bg-blue-50 text-blue-700 border-blue-200",
  "Environment":           "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Food Security":         "bg-orange-50 text-orange-700 border-orange-200",
  "Workforce Development": "bg-violet-50 text-violet-700 border-violet-200",
  "Health & Wellbeing":    "bg-rose-50 text-rose-700 border-rose-200",
  "Diversity & Inclusion": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Community Development": "bg-teal-50 text-teal-700 border-teal-200",
  "Youth & Families":      "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Nonprofit directory (placeholder data) ───────────────────────────────────

export const NONPROFITS: Nonprofit[] = [
  {
    id: "1",
    name: "Feeding America",
    mission: "Advance change in America by ensuring equitable access to nutritious food for all.",
    cause: "Food Security",
    location: "Chicago, IL (National)",
    website: "feedingamerica.org",
    size: "Large",
    partnershipTypes: ["Corporate Giving", "Employee Volunteering", "Donation Matching"],
  },
  {
    id: "2",
    name: "Year Up",
    mission: "Closing the opportunity divide by providing young adults with skills, experience, and support.",
    cause: "Workforce Development",
    location: "Boston, MA (National)",
    website: "yearup.org",
    size: "Large",
    partnershipTypes: ["Skills-Based Volunteering", "Internship Programs", "Corporate Giving"],
  },
  {
    id: "3",
    name: "The Nature Conservancy",
    mission: "Conserving the lands and waters on which all life depends.",
    cause: "Environment",
    location: "Arlington, VA (Global)",
    website: "nature.org",
    size: "Large",
    partnershipTypes: ["Corporate Giving", "Employee Volunteering", "Cause Marketing"],
  },
  {
    id: "4",
    name: "Boys & Girls Clubs of America",
    mission: "Enable all young people, especially those who need us most, to reach their full potential.",
    cause: "Youth & Families",
    location: "Atlanta, GA (National)",
    website: "bgca.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Corporate Giving", "Mentorship"],
  },
  {
    id: "5",
    name: "Khan Academy",
    mission: "Providing a free, world-class education for anyone, anywhere.",
    cause: "Education",
    location: "Mountain View, CA (Global)",
    website: "khanacademy.org",
    size: "Mid-size",
    partnershipTypes: ["Corporate Giving", "Skills-Based Volunteering"],
  },
  {
    id: "6",
    name: "American Red Cross",
    mission: "Preventing and alleviating human suffering in the face of emergencies.",
    cause: "Health & Wellbeing",
    location: "Washington, DC (National)",
    website: "redcross.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Disaster Relief Giving", "Blood Drives"],
  },
  {
    id: "7",
    name: "Urban Alliance",
    mission: "Bridging the gap between underserved youth and meaningful employment.",
    cause: "Workforce Development",
    location: "Washington, DC",
    website: "theurbanalliance.org",
    size: "Mid-size",
    partnershipTypes: ["Internship Programs", "Mentorship", "Skills-Based Volunteering"],
  },
  {
    id: "8",
    name: "Meals on Wheels America",
    mission: "Empowering local community programs to improve the health and quality of life of seniors.",
    cause: "Food Security",
    location: "Arlington, VA (National)",
    website: "mealsonwheelsamerica.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Corporate Giving", "Donation Matching"],
  },
  {
    id: "9",
    name: "National Urban League",
    mission: "Empowering African Americans and other underserved communities to achieve economic self-reliance.",
    cause: "Diversity & Inclusion",
    location: "New York, NY (National)",
    website: "nul.org",
    size: "Large",
    partnershipTypes: ["Corporate Giving", "Skills-Based Volunteering", "Sponsorship"],
  },
  {
    id: "10",
    name: "Habitat for Humanity",
    mission: "Seeking to put God's love into action, bringing people together to build homes and hope.",
    cause: "Community Development",
    location: "Americus, GA (Global)",
    website: "habitat.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Corporate Giving", "Team Build Events"],
  },
  {
    id: "11",
    name: "Girls Who Code",
    mission: "Closing the gender gap in technology and supporting women in computing fields.",
    cause: "Diversity & Inclusion",
    location: "New York, NY (National)",
    website: "girlswhocode.com",
    size: "Mid-size",
    partnershipTypes: ["Skills-Based Volunteering", "Corporate Giving", "Mentorship"],
  },
  {
    id: "12",
    name: "Sierra Club Foundation",
    mission: "Protecting and restoring the wild places and wild things upon which all life depends.",
    cause: "Environment",
    location: "Oakland, CA (National)",
    website: "sierraclubfoundation.org",
    size: "Mid-size",
    partnershipTypes: ["Corporate Giving", "Cause Marketing", "Employee Volunteering"],
  },
];

// ─── Connected partners storage ──────────────────────────────────────────────

export const CONNECTED_KEY = "compass_connected_nonprofits_v1";

export function loadConnected(): string[] {
  try {
    const raw = localStorage.getItem(CONNECTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveConnected(ids: string[]) {
  try { localStorage.setItem(CONNECTED_KEY, JSON.stringify(ids)); } catch { /* silent */ }
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function findNonprofitByName(name: string): Nonprofit | undefined {
  const normalized = name.trim().toLowerCase();
  return NONPROFITS.find((n) => n.name.toLowerCase() === normalized);
}

// ─── Corporate partnerships pages ────────────────────────────────────────────

const CORPORATE_PARTNERSHIP_PAGES: Record<string, string> = {
  "Feeding America": "https://www.feedingamerica.org/partner",
  "Year Up": "https://www.yearup.org/partner-with-us",
  "The Nature Conservancy": "https://www.nature.org/en-us/about-us/who-we-are/how-we-work/partners",
  "Boys & Girls Clubs of America": "https://www.bgca.org/get-involved/corporate-partners",
  "Khan Academy": "https://www.khanacademy.org/donate",
  "American Red Cross": "https://www.redcross.org/about-us/our-work/corporate-partnerships.html",
  "Urban Alliance": "https://www.theurbanalliance.org/partnerships",
  "Meals on Wheels America": "https://www.mealsonwheelsamerica.org/engage/corporate-partners",
  "National Urban League": "https://www.nul.org/corporate-partners",
  "Habitat for Humanity": "https://www.habitat.org/partner/corporate-partnerships",
  "Girls Who Code": "https://www.girlswhocode.com/partner-with-us",
  "Sierra Club Foundation": "https://www.sierraclubfoundation.org/partner",
};

export function getCorporatePartnershipUrl(nonprofit: { name: string; website: string | null }): string | null {
  const mapped = CORPORATE_PARTNERSHIP_PAGES[nonprofit.name];
  if (mapped) return mapped;
  if (nonprofit.website) {
    const bareHost = nonprofit.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${bareHost}/partner`;
  }
  return null;
}
