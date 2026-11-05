# 🔍 DeepTrace
### AI-Powered Cybercrime Investigation & Campaign Intelligence Platform

**Trace the evidence. Uncover the campaign.**

DeepTrace is a cybercrime investigation and campaign intelligence platform designed to transform fragmented digital evidence into structured, traceable investigations.

It aims to help investigators organize digital evidence, extract meaningful indicators, discover relationships between suspicious entities, identify potentially coordinated campaigns, reconstruct investigation timelines, and generate explainable intelligence reports.

Rather than treating suspicious indicators as isolated data points, DeepTrace focuses on connecting evidence and uncovering relationships that can support deeper investigations.

---

## 🎯 Project Vision

Digital investigations often involve fragmented information spread across emails, URLs, domains, IP addresses, files, and other digital artifacts.

DeepTrace aims to address this challenge through a unified investigation workflow:

**Evidence → Extraction → Entity Resolution → Relationship Discovery → Campaign Clustering → Timeline Reconstruction → Investigation → Explainable Findings**

The long-term goal is to create an investigation environment where every finding can be traced back to its supporting evidence.

---

## ✨ Key Features

### 1. Investigation Workspace
- Secure authentication and workspace initialization.
- Centralized investigation management.
- Case creation and organization.
- Role-based access and case membership.
- Dedicated investigation views.

### 2. Evidence Vault
- Centralized evidence management.
- Evidence upload and storage workflow.
- Evidence processing status tracking.
- Deterministic text extraction pipeline.
- Structured handling of extracted information.

### 3. PhishGraph – Graph Intelligence Engine

PhishGraph is DeepTrace's internal relationship intelligence component.

It is designed to represent relationships between suspicious indicators and investigation entities through an interactive graph.

Planned intelligence capabilities include:
- Entity relationship mapping.
- Indicator correlation.
- Evidence-backed relationship discovery.
- Suspicious infrastructure visualization.
- Campaign relationship exploration.

### 4. Campaign Intelligence

Planned capabilities include:
- Grouping related suspicious indicators.
- Identifying potentially coordinated activity.
- Discovering infrastructure and communication patterns.
- Campaign-level investigation.

### 5. Timeline Reconstruction

Planned capabilities include:
- Extracting timestamps from digital evidence.
- Organizing investigation events chronologically.
- Reconstructing potential attack sequences.
- Connecting timeline events to their original evidence.

### 6. AI Investigation Copilot

Planned AI-assisted investigation capabilities include:
- Natural-language investigation queries.
- Evidence-grounded summaries.
- Relationship explanations.
- Investigation assistance.
- Context-aware findings with supporting evidence.

### 7. Investigation Reports

Planned reporting capabilities include:
- Structured investigation summaries.
- Evidence references.
- Relationship explanations.
- Campaign findings.
- Exportable investigation reports.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Routing | TanStack Start / TanStack Router |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Database | Lovable Cloud |
| Authentication | Lovable Cloud authentication |
| Storage | Lovable Cloud storage |
| Testing | Vitest |
| Package Manager | Bun |
| Version Control | Git, GitHub |

The architecture is designed to support future graph intelligence, automated analysis, and AI-assisted investigation capabilities.

---

## 🏗️ Architecture Overview

DeepTrace follows a modular architecture that separates the user interface, investigation workflows, evidence processing, and intelligence capabilities.

```text
                 DEEPTRACE
                     |
          Authentication & Workspace
                     |
             Investigation Cases
                     |
                Evidence Vault
                     |
             Evidence Processing
                     |
             Indicator Extraction
                     |
              Entity Resolution
                     |
          +----------+-----------+
          |                      |
       PhishGraph          Campaign Intelligence
          |                      |
          +----------+-----------+
                     |
            Timeline Reconstruction
                     |
             AI Investigation
                  Copilot
                     |
             Findings & Reports
```

The architecture is being developed incrementally, with an emphasis on modularity, traceability, security, and explainability.

---

## 🔐 Security & Data Integrity

Security is an important part of DeepTrace's design.

The project incorporates:
- Authenticated workspace access.
- Organization-based access control.
- Role-based authorization.
- Row Level Security (RLS).
- Case-level membership checks.
- Controlled evidence access.
- Evidence-linked investigation findings.

Investigation relationships and conclusions should be supported by traceable evidence.

DeepTrace aims to distinguish verified observations from analytical hypotheses rather than presenting unsupported attribution as fact.

---

## 📊 Current Development Status

DeepTrace is actively under development.

| Component | Status |
|---|---|
| Project foundation | Completed |
| Authentication and workspace | Implemented |
| Investigation management | Implemented |
| Case creation and membership | Implemented locally; database migration verification pending |
| Evidence Vault | In progress |
| Evidence upload and processing workflow | Implemented |
| Deterministic text extraction | Implemented |
| PhishGraph visualization | Implemented for stored relationships |
| Advanced entity resolution | Planned |
| Automated campaign detection | Planned |
| Timeline reconstruction | Planned |
| AI Investigation Copilot | Planned |
| Investigation report generation | Planned |
| Final security and deployment verification | In progress |

**Note:** Implemented application functionality, locally prepared database migrations, and live-verified functionality are distinct. Some database changes still require verification against the connected Lovable Cloud environment.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/)

You also need access to the project's configured Lovable Cloud environment.

### 1. Clone the Repository

```bash
git clone https://github.com/aditisprasad/DeepTrace.git
```

### 2. Navigate to the Project

```bash
cd DeepTrace
```

### 3. Install Dependencies

```bash
bun install --frozen-lockfile
```

### 4. Configure Lovable Cloud

Configure the project's existing Lovable Cloud connection and required application settings.

Use the appropriate project configuration for authentication, database access, and storage.

Do not replace the existing database configuration with a new project.

### 5. Start the Development Server

```bash
bun run dev
```

The application will be available at:

```text
http://localhost:8080/
```

---

## 🧪 Running Tests

Run the automated test suite:

```bash
bun run test
```

Run TypeScript checks:

```bash
bunx tsc --noEmit
```

Create a production build:

```bash
bun run build
```

Check Drizzle migration metadata:

```bash
bunx drizzle-kit check
```

---

## 📁 Project Structure

```text
DeepTrace/
│
├── .github/
│   └── copilot-instructions.md
│
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_ROADMAP.md
│   └── TECHNICAL_DECISIONS.md
│
├── drizzle/
│   └── migrations/
│       ├── 0000_deeptrace_phase_1.sql
│       ├── 0001_deeptrace_evidence_storage_policies.sql
│       ├── 0002_add_evidence_extraction_status.sql
│       ├── 0003_atomic_case_creator_membership.sql
│       └── meta/
│
├── public/
│
├── src/
│   ├── components/
│   ├── routes/
│   ├── test/
│   └── ...
│
├── AGENTS.md
├── README.md
├── package.json
├── bun.lock
└── vite.config.ts
```

*The structure above highlights the main project directories; individual files and modules may evolve during development.*

---

## 🗺️ Development Roadmap

DeepTrace is being developed through the following major phases:

- [x] Phase 1 – Foundation, Authentication & Workspace
- [ ] Phase 2 – Evidence Ingestion & Evidence Vault
- [ ] Phase 3 – Entity Resolution & PhishGraph Intelligence
- [ ] Phase 4 – Campaign Detection & Clustering
- [ ] Phase 5 – Timeline Reconstruction
- [ ] Phase 6 – Evidence-Grounded AI Copilot
- [ ] Phase 7 – Findings & Report Generation
- [ ] Phase 8 – Security, Testing & Deployment
- [ ] Phase 9 – UI Refinement & Final Polish

---

## 💡 Core Design Principles

DeepTrace is guided by five principles:

**1. Evidence First**  
Every investigation should begin with actual digital evidence.

**2. Explainability**  
Relationships and findings should have clear supporting evidence.

**3. Traceability**  
Investigators should be able to trace conclusions back to their original sources.

**4. Security**  
Investigation data must remain protected through appropriate authentication and authorization.

**5. Analytical Integrity**  
Potential relationships and hypotheses should never be presented as confirmed facts without sufficient evidence.

---

## 🔮 Future Scope

Future development aims to introduce:

- Advanced graph-based threat intelligence.
- Automated phishing infrastructure analysis.
- Cross-evidence correlation.
- Campaign similarity detection.
- Temporal attack-pattern analysis.
- AI-assisted investigation workflows.
- Explainable intelligence generation.
- Comprehensive digital investigation reports.

---

## 👩‍💻 Author

**Aditi S. Prasad**

B.Tech – Computer Science Engineering

GitHub: [@aditisprasad](https://github.com/aditisprasad)

---

## 📌 Project Status

DeepTrace is an actively developed portfolio project focused on cybercrime investigation, digital evidence analysis, graph intelligence, and explainable AI-assisted investigations.

**Trace the evidence. Uncover the campaign.** 🔍
