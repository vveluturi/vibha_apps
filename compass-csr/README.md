Compass CSR
AI-powered platform that empowers businesses to design, launch, and manage impactful corporate social responsibility (CSR) programs.

🌐 Live Demo: compass-csr.vercel.app
Why I Built This
Businesses have the people, expertise, and resources to create meaningful change in their communities. CSR programs have the potential to support underserved populations, strengthen local nonprofits, and unite employees around a shared purpose. Yet many organizations never launch these initiatives because they don't know where to start, lack a clear strategy, or view CSR as a secondary priority.

My motivation comes from firsthand experience working with nonprofits. During my time with the Seattle branch of VTSEVA, a nonprofit that supports the education of visually impaired students in rural India, I saw how difficult it was for mission-driven organizations to expand their reach despite the importance of their work. Many nonprofits have impactful missions but limited resources for outreach, partnerships, and long-term growth.

That experience led me to realize that companies often have the resources to create significant social impact, while nonprofits have the expertise and community connections to put those resources to good use. Bridging that gap can create value for everyone involved.

Compass CSR helps organizations design, launch, and manage CSR programs from the ground up using AI, and gives companies a platform to discover and partner with nonprofits that align with their mission. By making CSR strategy more accessible, the tool aims to help businesses support the communities around them while fostering employee engagement, collaboration, and a stronger sense of purpose within their own organizations.

My goal: make it easier for businesses to turn good intentions into meaningful, measurable community impact.
What It Does
Compass CSR guides companies through the entire CSR lifecycle, from initial strategy to active program management.
AI-Powered Program Design
Companies complete a multi-step intake form covering their brand mission, core values, industry, team size, goals, and budget. Claude (Anthropic's AI) analyzes these inputs and generates a fully tailored CSR program blueprint including a custom program overview, a 90-day launch timeline with phase-by-phase tasks, recommended nonprofit partners matched to the company's focus areas, brand and website positioning guidance, and team roles and time commitments.
Nonprofit Partner Discovery
A curated directory of verified nonprofit organizations organized by cause area: Education, Environment, Food Security, Workforce Development, Health & Wellbeing, Diversity & Inclusion, Community Development, and Youth & Families. Companies can search, filter, and connect with partners. The platform suggests nonprofits based on the company's program focus and tracks partnership progression from initial interest through active collaboration.
Partnership Management
A full partnership workflow that takes companies from "Exploring" to "Active Partner" through structured stages. Each stage includes AI-generated checklists, outreach email drafts, and activity logging (volunteer hours, dollars donated, employees engaged, events held, and photos).
Program Dashboard
An interactive workspace for managing the 90-day launch timeline with task assignments, AI-suggested deadlines, status tracking, team member assignments, custom task creation, and progress notes. Program status updates automatically as tasks are completed.
Impact Report
A comprehensive impact report aggregating data across all programs and active partnerships — volunteer hours, employees engaged, dollars donated, events held, and cause areas covered. Includes a company photo gallery and PDF export for sharing with leadership and investors.
Team Collaboration
Role-based access (Admin and Member) with an invite system, Team Inbox for questions and feedback, Weekly Digest for keeping the team aligned, and a My Tasks page showing each member's assigned work across all programs.
Personalized Experience
The platform reads each company's intake answers and surfaces relevant features contextually: if a team selects "Assign tasks to team members," they're guided to the task assignment flow. If they use Slack or Teams, direct links are provided. A first-time onboarding flow tailored to Admins and invited Members ensures every user understands the platform from day one.

Tech Stack
Layer
Technology
Frontend
React + TypeScript + Vite
Styling
Tailwind CSS + shadcn/ui
AI
Anthropic API (claude-sonnet-4-6)
Authentication
Supabase Auth
Database
Supabase (PostgreSQL)
Deployment
Vercel
PDF Export
html2pdf.js


Key Features
AI Blueprint Generation: Anthropic API generates personalized CSR program blueprints from intake form answers
Nonprofit Directory: 12+ verified organizations across 8 cause areas with partnership tracking
90-Day Timeline: Phase-by-phase task management with AI-suggested deadlines and team assignments
Partnership Workflow: Full progression from Express Interest → In Discussion → Active Partner
Activity Logging: Track volunteer hours, donations, events, and photos per partnership
Impact Report: Aggregated metrics with PDF export for leadership reporting
Team Inbox — Structured feedback and Q&A between Admins and Members
Weekly Digest: Auto-generated team update with email export
Role-Based Access: Admin and Member roles with invite-only team joining
Onboarding Flow: Tailored first-time experience for Admins and invited Members
Supabase Auth: Email/password signup with invite system and password reset


Running Locally
Prerequisites
Node.js 18+
A Supabase project (supabase.com)
An Anthropic API key (console.anthropic.com)
Setup
# Clone the repository

git clone https://github.com/vveluturi/vibha_apps.git

cd vibha_apps/compass-csr

# Install dependencies

npm install

# Create environment file

cp .env.example .env

Add your credentials to .env:

VITE_SUPABASE_URL=your_supabase_url

VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

ANTHROPIC_API_KEY=your_anthropic_api_key

# Start the development server

npm run dev

Open http://localhost:5173 in your browser.
Database Setup
Run the SQL in compass-csr/src/lib/supabase-rls.sql in your Supabase SQL Editor to set up the required tables and Row Level Security policies.


Project Structure
compass-csr/

├── api/

│   └── anthropic.js          # Vercel serverless function for Anthropic API

├── src/

│   └── app/

│       ├── components/        # Reusable UI components

│       ├── context/           # React context (auth, programs, wizard)

│       ├── lib/               # Utilities and data helpers

│       ├── pages/             # Page components

│       │   ├── auth/          # Signin, signup, reset password

│       │   ├── dashboard.tsx

│       │   ├── new-program*.tsx

│       │   ├── program-dashboard.tsx

│       │   ├── nonprofit-partners.tsx

│       │   ├── impact-report.tsx

│       │   └── ...

│       ├── types/             # TypeScript types

│       ├── App.tsx

│       └── routes.tsx

└── vercel.json
How the AI Works
When a company completes the intake form, Compass sends a structured JSON payload to the Anthropic API containing the company profile, program focus areas, goals, budget, timeline, and team collaboration preferences.

Claude returns a JSON blueprint that maps directly to the app's data schema: program pillars, 90-day phase tasks, nonprofit recommendations with rationale, brand positioning suggestions, sample website copy, and team role definitions.

The same API powers AI-generated In Discussion checklists for nonprofit partnerships (tailored to the specific nonprofit's cause area and the company's program type) and outreach email drafts for partnership inquiries.
Roadmap
Full Supabase data migration (real-time data sharing between team members)
Resend integration for automated invite and digest emails
GuideStar/Candid API integration for verified nonprofit data
ESG reporting templates (GRI, SASB standards)
Custom domain support
Mobile-responsive polish
Built By
Vibha Veluturi
