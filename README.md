# **NegoSphere — AI-Driven Multi-Agent Negotiation Training & Simulation Platform**

## **NegoSphere is a Generative AI-powered negotiation training and simulation platform that allows users to observe AI agents negotiating with one another or practice negotiation directly against AI agents.**

The platform simulates real-world negotiation situations involving different stakeholders, goals, constraints, interests, personalities, and strategies. It provides an interactive Negotiation Arena, structured negotiation rules, learning insights, reports, analytics, and negotiation history.

## Table of Contents
+ Project Overview
+ Objectives
+ Features
+ Scenario Library
+ Technology Stack
+ System Architecture
+ Project Structure
+ Prerequisites
+ Installation
+ Environment Configuration
+ Running the Application
+ Negotiation Workflow
+ Negotiation Learning Experience
+ Reports and Analytics
+ Database
+ Testing
+ Agile Development
+ Deployment
+ Security Considerations
+ Future Enhancements
+ Team Members
+ License
+ Project Overview
### Project Overview 
Negotiation is an important part of procurement, sales, employment, contracts, project management, and strategic decision-making. Traditional negotiation training can be difficult to scale because realistic practice requires appropriate scenarios, participants, time, and repeatable evaluation.

NegoSphere addresses this challenge through a multi-agent negotiation simulator powered by Large Language Models (LLMs) and structured negotiation logic.

The platform supports two primary modes:

+ Simulation Mode: Observe AI agents negotiate with each other.
+ Practice Mode: Participate directly in a negotiation against AI agents.

An orchestrator coordinates negotiation turns, maintains state, tracks rounds, and manages the progression toward agreement, rejection, or deadlock.

The platform also provides scenario configuration, negotiation learning, historical session tracking, and structured reports.

### Objectives

The main objectives of NegoSphere are:

+ Develop a multi-agent negotiation simulator using Generative AI.
+ Support AI-versus-AI Simulation Mode and Human-versus-AI Practice Mode.
+ Model negotiating stakeholders with different goals, constraints, interests, and personalities.
+ Generate contextual offers and counteroffers.
+ Improve negotiation realism using structured decision rules.
+ Track negotiation rounds and concession patterns.
+ Identify stalled negotiations and handle deadlocks.
+ Provide outcome reports and negotiation performance analytics.
+ Help users understand negotiation tactics and important turning points.
+ Maintain user-specific negotiation history for future review.
+ Support predefined and custom negotiation scenarios.

### Features
**1. Simulation Mode**

Simulation Mode enables users to observe AI agents negotiating autonomously.

Features include:

+ AI-versus-AI negotiation.
+ Scenario-specific agent objectives.
+ Negotiation round management.
+ Offer and counteroffer generation.
+ Concession tracking.
+ Acceptance and rejection decisions.
+ Deadlock handling.
+ Progressive negotiation playback.
+ Post-negotiation analysis.

**2. Practice Mode**

Practice Mode enables users to participate directly in a negotiation against AI agents.

Users can:

+ Submit negotiation offers.
+ Respond to counteroffers.
+ Accept or reject proposals.
+ Continue negotiating across multiple rounds.
+ Experience different negotiation personalities.
+ Review their negotiation outcomes.
+ Analyze their negotiation performance.
**3. AI Negotiation Agents**

Negotiating agents are configured with attributes such as:

+ Role and responsibilities.
+ Goals and interests.
+ Constraints.
+ Target outcomes.
+ Reservation boundaries.
+ BATNA or alternative options.
+ Negotiation leverage.
+ Personality.
+ Strategic priorities.
+ Concession behavior.
+ Negotiable terms.

These attributes help agents make decisions based on the negotiation scenario and available conversation history.

**4. Negotiation Orchestrator**

The orchestrator manages the negotiation lifecycle.

Its responsibilities include:

+ Coordinating agent turns.
+ Maintaining negotiation state.
+ Tracking negotiation rounds.
+ Passing relevant history to agents.
+ Managing offers and counteroffers.
+ Coordinating acceptance and rejection.
+ Detecting stalled negotiations.
+ Determining when a negotiation has ended.
**5. Structured Negotiation Rules**

NegoSphere combines AI-generated responses with structured negotiation decision logic.

The negotiation engine considers:

+ Target and reservation boundaries.
+ Feasible joint bargaining ranges.
+ Strategic opening offers.
+ Concession movement.
+ Reciprocal concessions.
+ Conditional trade-offs.
+ Personality-dependent negotiation behavior.
+ Repeated offers and lack of movement.
+ Extreme or unrealistic offers.
+ Deadlock conditions.
+ Validation of AI-generated counteroffers.

The goal is to reduce unrealistic outcomes and make negotiation decisions more consistent.

**6. Negotiation Arena**

The Negotiation Arena is the main interface for following a negotiation.

It provides a chat-style experience for reviewing negotiation events, including:

+ Agent messages.
+ Offers and counteroffers.
+ Negotiation rounds.
+ Agent stance information.
+ Negotiation metrics.
+ Progress indicators.
+ Learning insights.
**7. Scenario Library**

The Scenario Library provides predefined negotiation situations and supports custom scenarios.

Users can explore available scenarios, search for negotiation contexts, select a scenario, configure a negotiation, or create a custom scenario.

**8. AI Negotiation Learning**

The learning layer analyzes observable negotiation behavior and provides insights into negotiation tactics.

It can identify tactics such as:

+ Anchoring.
+ Counter-offering.
+ Strategic concessions.
+ Conditional concessions.
+ Trade-offs.
+ Value creation.
+ Bundling.
+ Information discovery.
+ Pressure.
+ Reframing.
+ Deadlock handling.
+ Holding position.

The learning experience focuses on observable offers, concessions, conditions, and negotiation history. It does not expose hidden model chain-of-thought.

**9. Reports and Analytics**

The reporting functionality provides structured information about negotiation sessions, including:

+ Negotiation outcome.
+ Agreement terms, when an agreement exists.
+ Negotiation rounds.
+ Offer and concession information.
+ Agent performance.
+ Negotiation progress.
+ Performance metrics.
+ Transcript and summary.
+ Key insights.

Rejected and deadlocked negotiations should be represented as No agreement reached, rather than incorrectly displaying the last offer as an agreed value.

**10. Profile and Negotiation History**

The profile and history features provide a way to review recorded user activity.

Depending on the available session data, the application can display:

+ Scenario names.
+ Activity dates and times.
+ Negotiation modes.
+ Negotiation outcomes.
+ Recent activity.
+ Previous negotiation sessions.
+ Practice performance information.
**Scenario Library**

The project includes eight predefined negotiation scenarios in src/data/scenarios.js.

<img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/9a85b92f-80cd-4458-9446-bd364196083b" />

**Custom Scenarios**

The Scenario Library also provides a custom-scenario creation flow.

Users can create their own negotiation context with custom agents, goals, constraints, and personalities.

The library supports displaying predefined scenarios together with custom scenarios supplied by the application.

**Technology Stack**
**Frontend**
+ React
+ Vite
+ JavaScript
+ JSX
+ CSS
  
**Node.js AI Gateway**
+ Node.js
+ Express
+ Google GenAI SDK
+ Configurable LLM provider integration
  
**Python Platform Backend**
+ Python
+ FastAPI
+ Uvicorn
+ SQLAlchemy
+ Pydantic
  
**Database**
+ SQLite for local development.
+ PostgreSQL support for production configurations.

**AI Integration**
+ Large Language Models.
+ Gemini integration.
+ Configurable AI provider and fallback logic, depending on the active configuration.

**System Architecture**

NegoSphere uses a frontend, a Python platform backend, a Node.js AI gateway, database storage, and external AI services.

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/c6d24e6e-6a92-4ffd-9c2b-dc4a09dbb6d5" />

**Negotiation Flow**

<img width="1024" height="1536" alt="image" src="https://github.com/user-attachments/assets/52493f98-013a-4acb-ad5e-00421831f465" />

## 📁 Project Structure

```text
Negosphere/
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── assets/
│   │   ├── auth-office-scene.png
│   │   ├── auth-reference-right.png
│   │   ├── dashboard-hero.png
│   │   ├── auth-reference-left.png
│   │   ├── auth-negotiation-scene.png
│   │   ├── negosphere-login-reference.png
│   │   ├── negosphere-login-hero-generated.png
│   │   ├── auth-right-background.png
│   │   ├── auth-hero-reference.png
│   │   ├── hero.png
│   │   ├── mountains.png
│   │   ├── react.svg
│   │   └── vite.svg
│   │
│   ├── components/
│   │   ├── guide/
│   │   │   ├── GuideBot.jsx
│   │   │   └── GuideBot.css
│   │   ├── AgentCard.jsx
│   │   ├── AgentConfiguration.jsx
│   │   ├── AuthPage.jsx
│   │   ├── AuthPage.css
│   │   ├── ConfigurationChoice.jsx
│   │   ├── CustomScenario.jsx
│   │   ├── LiveStanceIndicator.jsx
│   │   ├── LiveStanceIndicator.css
│   │   ├── NegotiationArena.jsx
│   │   ├── NegotiationArena.css
│   │   ├── OutcomeScreen.jsx
│   │   ├── OutcomeScreen.css
│   │   ├── PersonalitySelector.jsx
│   │   ├── PracticeArena.jsx
│   │   ├── PracticeArena.css
│   │   ├── ReadyScreen.jsx
│   │   ├── ReportsAnalytics.jsx
│   │   ├── ScenarioCard.jsx
│   │   ├── ScenarioLibrary.jsx
│   │   ├── ScenarioSelection.jsx
│   │   ├── SettingsPage.jsx
│   │   └── SettingsPage.css
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── authContext.js
│   │
│   ├── data/
│   │   ├── guide/
│   │   │   └── guideKnowledgeBase.js
│   │   └── scenarios.js
│   │
│   ├── learning/
│   │   ├── learningChallenges.js
│   │   ├── learningEngine.js
│   │   ├── tacticDetector.js
│   │   ├── takeawayGenerator.js
│   │   └── turningPointDetector.js
│   │
│   ├── logic/
│   │   ├── agentInput.js
│   │   ├── agentResponse.js
│   │   ├── concessionTracker.js
│   │   ├── dashboardStore.js
│   │   ├── decisionEngine.js
│   │   ├── geminiAgent.js
│   │   ├── negotiationAnalysis.js
│   │   ├── negotiationEngine.js
│   │   ├── negotiationInsights.js
│   │   ├── negotiationRules.js
│   │   ├── negotiationState.js
│   │   ├── offer.js
│   │   ├── orchestrator.js
│   │   ├── personalityPolicy.js
│   │   ├── practiceNegotiation.js
│   │   ├── reportGenerator.js
│   │   └── strategyEngine.js
│   │
│   ├── models/
│   │   ├── negotiationState.js
│   │   └── offer.js
│   │
│   ├── orchestrator/
│   │   └── negotiationOrchestrator.js
│   │
│   ├── pages/
│   │   ├── AnalyticsPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── ProfilePage.css
│   │   ├── ReportsPage.jsx
│   │   ├── ReportsPage.css
│   │   └── ScenarioLibraryPage.jsx
│   │
│   ├── platform/
│   │   ├── PlatformGate.jsx
│   │   ├── PlatformWorkspace.jsx
│   │   └── PlatformFeatures.css
│   │
│   ├── services/
│   │   ├── guideBotService.js
│   │   └── historyService.js
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   └── negotiationOrchestrator.js
│
├── platform-backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents.py
│   │   │   ├── analytics.py
│   │   │   ├── auth.py
│   │   │   ├── guide.py
│   │   │   ├── negotiations.py
│   │   │   ├── scenarios.py
│   │   │   └── session_history.py
│   │   │
│   │   ├── models/
│   │   │   ├── agent.py
│   │   │   ├── message.py
│   │   │   ├── negotiation.py
│   │   │   └── user.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── agent.py
│   │   │   ├── auth.py
│   │   │   ├── negotiation.py
│   │   │   └── response.py
│   │   │
│   │   ├── services/
│   │   │   ├── analytics_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── concession_tracking.py
│   │   │   ├── deadlock_detection.py
│   │   │   ├── decision_logic.py
│   │   │   ├── email_service.py
│   │   │   ├── guide_service.py
│   │   │   ├── llm_reasoning.py
│   │   │   ├── negotiation_service.py
│   │   │   ├── offer_evaluation.py
│   │   │   └── orchestrator.py
│   │   │
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   │
│   ├── tests/
│   │   ├── test_auth_tokens.py
│   │   └── test_session_history.py
│   ├── .env.example
│   ├── create_database.py
│   ├── EMAIL_OTP_SETUP.md
│   ├── negotiation.sqbpro
│   ├── Procfile
│   └── requirements.txt
│
├── server/
│   └── server.js
│
├── scripts/
│   ├── verify-all-scenarios.mjs
│   ├── verify-dashboard-performance.mjs
│   ├── verify-negotiation-analysis.mjs
│   ├── verify-negotiation.mjs
│   ├── verify-practice-human-decisions.mjs
│   ├── verify-practice-orchestrator.mjs
│   ├── verify-practice.mjs
│   ├── verify-report-integrity.mjs
│   └── verify-strategic-negotiation.mjs
│
├── docs/
│   ├── DASHBOARD_PERFORMANCE.md
│   ├── DEMO_GUIDE.md
│   ├── MILESTONE_3.md
│   ├── NEGOTIATION_DECISION_TABLE.md
│   └── ORCHESTRATOR_FOUNDATION.md
│
├── test-documents/
│   ├── Team-2 Agile document.xlsm
│   ├── Team-2 Defect tracker.xlsx
│   └── Team-2 Test plan.xlsx
│
├── .env.example
├── .gitignore
├── AUTH_SETUP.md
├── CHECK_AUTH_SERVER.bat
├── CHECK_EMAIL_SETUP.bat
├── CREATE_DATABASE.bat
├── DATABASE_AND_AUTH_SETUP.md
├── DATABASE_MANUAL_SETUP.md
├── FINAL_MERGE_NOTES.md
├── IMPLEMENTATION_UPDATES.md
├── index.html
├── package.json
├── package-lock.json
├── PRINT_REPORT_UPDATE.md
├── README.md
├── SETUP.md
├── SETUP_AUTH.md
├── SOCIAL_LOGIN_SETUP.md
├── START_AI_GATEWAY.bat
├── START_BACKEND.bat
├── START_FRONTEND.bat
├── START_NEGOSPHERE.bat
├── vite.config.mjs
└── eslint.config.js
```
## Prerequisites

Before installing and running NegoSphere, ensure the following software is installed on your system.

* **Node.js** — JavaScript runtime for the frontend and AI gateway.
* **npm** — Package manager for installing JavaScript dependencies.
* **Python** — Required for the FastAPI platform backend.
* **pip** — Python package manager.
* **Git** — Version control and repository management.
* **LLM API Key** — Required when using an external AI provider that needs authentication.

Verify your installations by running the following commands in your terminal:

```bash
node --version
npm --version
python --version
pip --version
git --version
```

## Installation

Follow these steps to set up NegoSphere on your local machine.

### Step 1: Clone the Repository

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Negosphere
```

### Step 2: Install Node.js Dependencies

Install the frontend and Node.js dependencies from the project root:

```bash
npm install
```

### Step 3: Create a Python Virtual Environment

A virtual environment keeps the Python backend dependencies isolated from other Python projects.

**Windows:**

```powershell
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Step 4: Install Python Dependencies

With the virtual environment activated, install the backend dependencies:

```bash
pip install -r platform-backend/requirements.txt
```

## Environment Configuration

NegoSphere uses environment variables to configure API endpoints, AI providers, database connections, and other backend services.

**Important:** Never commit API keys, passwords, OAuth client secrets, authentication secrets, or production database credentials to GitHub.

### Frontend Configuration

Create a `.env` file in the project root.

Example local configuration:

```env
VITE_PLATFORM_API_BASE_URL=http://localhost:8000/api
VITE_AI_API_BASE_URL=http://localhost:3001
VITE_API_BASE_URL=http://localhost:3001
VITE_NEGOTIATION_API_BASE_URL=http://localhost:3001/api
```

These are example development URLs. Check your project's source code and environment example files to confirm which variables and endpoint paths are used by each service.

### Python Backend Configuration

Create the backend environment file at the location expected by your application. For example:

```text
platform-backend/.env
```

Example development configuration:

```env
APP_ENV=development

AUTH_SECRET_KEY=replace-with-a-secure-secret

DATABASE_URL=sqlite:///./negotiation.db

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000

LLM_PROVIDER=gemini
LLM_API_KEY=your-llm-api-key
LLM_MODEL=gemini-2.0-flash

OAUTH_CALLBACK_BASE_URL=http://127.0.0.1:8000
```

* Replace placeholder values with the appropriate configuration for your environment.
* Configure email and OAuth variables if those features are enabled.
* Generate a secure authentication secret for your environment.
* Use the supplied `.env.example` files as the authoritative reference for supported variables.
* Keep real environment files private and excluded from version control.

## Running the Application

NegoSphere uses three main services: the React frontend, Python platform backend, and Node.js AI gateway.

Start each service in a separate terminal from the project root.

### Terminal 1: Frontend

Run the React application using Vite:

```bash
npm run dev
```

The development server is normally available at:

**URL:** `http://localhost:5173`

### Terminal 2: Python Platform Backend

Start the FastAPI backend:

```bash
npm run platform-backend
```

The backend is configured to run at:

**URL:** `http://localhost:8000`

If the health endpoint is enabled, check the backend at:

`http://localhost:8000/api/health`

### Terminal 3: Node.js AI Gateway

Start the Node.js AI gateway:

```bash
npm run ai-server
```

The AI gateway is normally available at:

**URL:** `http://localhost:3001`

Ensure that the required environment variables and AI provider credentials are configured before testing the complete negotiation workflow.

## Available npm Scripts

The following table summarizes the scripts defined in the project's `package.json`.

| Command                                | Description                                        |
| -------------------------------------- | -------------------------------------------------- |
| `npm run dev`                          | Starts the Vite development server.                |
| `npm run build`                        | Builds the frontend for production.                |
| `npm run lint`                         | Runs ESLint to check the codebase.                 |
| `npm run preview`                      | Previews the production frontend build.            |
| `npm run server`                       | Starts the Node.js server.                         |
| `npm run ai-server`                    | Starts the Node.js AI gateway.                     |
| `npm run platform-backend`             | Starts the Python FastAPI backend.                 |
| `npm run verify:negotiation`           | Verifies core negotiation behavior.                |
| `npm run verify:all-scenarios`         | Runs verification across predefined scenarios.     |
| `npm run verify:practice`              | Verifies Practice Mode behavior.                   |
| `npm run verify:practice-orchestrator` | Verifies Practice Mode orchestration.              |
| `npm run verify:practice-decisions`    | Verifies human acceptance and rejection decisions. |
| `npm run verify:negotiation-analysis`  | Verifies negotiation analysis.                     |
| `npm run verify:strategic-negotiation` | Verifies strategic negotiation logic.              |
| `npm run verify:report-integrity`      | Checks the integrity of negotiation reports.       |
| `npm run verify:dashboard-performance` | Verifies dashboard performance calculations.       |

Run these commands from the project root. A successful result depends on the current code, dependencies, and environment configuration.

## Negotiation Learning Experience

NegoSphere includes a learning layer designed to help users understand negotiation behavior through observable events, offers, concessions, and negotiation history.

The learning workflow can be represented as follows:

```text
Negotiation History
        |
        v
   Learning Engine
        |
        +---- Tactic Detection
        |
        +---- Move Analysis
        |
        +---- Turning-Point Detection
        |
        +---- Takeaway Generation
        |
        v
 Learning Challenges and Review
```

The learning layer analyzes negotiation activity without replacing the core negotiation decision engine.

Key learning capabilities include:

* **Tactic Detection:** Identifies observable negotiation tactics such as anchoring, counter-offering, and strategic concessions.
* **Move Analysis:** Examines offers, counteroffers, and changes in negotiation positions.
* **Turning-Point Detection:** Highlights important moments that influence negotiation progress.
* **Takeaway Generation:** Provides lessons based on the negotiation history.
* **Learning Challenges:** Supports reflection and practice through negotiation-related challenges.

The learning experience focuses on observable negotiation behavior rather than exposing hidden model reasoning.

## Reports and Analytics

NegoSphere provides reporting and analytical information to help users review negotiation sessions and understand their outcomes.

Depending on the recorded session and available analysis, reports may include:

* Negotiation outcome and status.
* Final agreement value and terms, when an agreement is reached.
* Total negotiation rounds.
* Offers, counteroffers, and concession patterns.
* Agent performance and negotiation progress.
* Concession timeline.
* Negotiation transcript and summary.
* Key negotiation insights.
* Learning observations and performance metrics.

**Outcome integrity:** A rejected or deadlocked negotiation must be represented as **No agreement reached**. The last proposed offer must not be displayed as an agreed value unless an agreement was actually reached.

## Database

### Local Development

SQLite is supported for local development through SQLAlchemy.

Example database configuration:

```env
DATABASE_URL=sqlite:///./negotiation.db
```

The actual database file location depends on the application's working directory and configuration.

### Production

For production deployments, a hosted PostgreSQL database is recommended when persistent, shared database storage is required.

Configure the database connection string through the hosting platform's environment variables:

```env
DATABASE_URL=YOUR_POSTGRES_CONNECTION_STRING
```

* Never commit a real database connection string to GitHub.
* Verify database initialization and schema management before deployment.
* Confirm that session history and user data persist correctly.
* Configure backups and access controls for production databases.
* Ensure the selected hosting platform supports the database configuration.

A local SQLite database should not be assumed to provide persistent storage in a serverless deployment environment.

## Testing

NegoSphere includes verification scripts for key negotiation behaviors and application functionality.

The project's verification work covers areas such as:

* Negotiation decision rules.
* Predefined scenario coverage.
* Practice Mode interactions.
* Human acceptance and rejection decisions.
* Negotiation orchestration and round management.
* Concession tracking.
* Negotiation analysis.
* Report integrity and deadlock reporting.
* Dashboard performance calculations.
* Python backend tests.
* JavaScript syntax checks and Python compilation.
* Backend health and API checks.

### Suggested Pre-Release Checks

Run the following commands from the project root before submitting changes or preparing a release:

```bash
npm run lint
npm run build
npm run verify:negotiation
npm run verify:all-scenarios
npm run verify:practice
npm run verify:report-integrity
```

These checks should be executed against the current version of the project. Do not assume that a test has passed until its result has been verified.

## Agile Development

The project development plan is organized into four milestones.

### Milestone 1 — Weeks 1–2: Planning and Design

* Study negotiation theory and multi-agent system design.
* Define the system architecture and agent personas.
* Create user interface wireframes.
* Implement scenario selection.
* Configure predefined negotiation scenarios.
* Develop agent configuration screens.

### Milestone 2 — Weeks 3–4: Negotiation Engine

* Develop the negotiation orchestrator.
* Implement turn management and round tracking.
* Integrate LLM-powered agent responses.
* Implement offer evaluation and counteroffers.
* Develop concession decision logic.
* Test the AI-versus-AI negotiation workflow.

### Milestone 3 — Weeks 5–6: Interactive Negotiation

* Develop the Negotiation Arena.
* Implement the human participant interface.
* Complete Practice Mode interactions.
* Develop deadlock detection and handling.
* Validate negotiation behavior across scenarios.

### Milestone 4 — Weeks 7–8: Analysis and Finalization

* Develop the negotiation outcome screen.
* Display agreement terms and concession information.
* Implement report generation and transcript review.
* Conduct end-to-end testing.
* Prepare technical documentation.
* Prepare the project report and final demonstration.

*These milestones describe the project's development plan and do not necessarily indicate the current completion status of every feature.*

## Deployment

A recommended production architecture separates the frontend, backend services, AI provider, and persistent database.

```text
                       Users
                         |
                         v
                  Frontend Hosting
                    React + Vite
                         |
                +--------+--------+
                |                 |
                v                 v
         Python Backend     Node.js AI Gateway
            FastAPI              Express
                |                 |
                v                 v
         Database Service      LLM Provider
          PostgreSQL          Gemini / Others
```

### Recommended Hosting Components

| Component          | Suggested Deployment                                        |
| ------------------ | ----------------------------------------------------------- |
| Frontend           | Vercel or another static/frontend hosting platform.         |
| Python backend     | A hosting service that supports Python and FastAPI.         |
| Node.js AI gateway | A hosting service that supports Node.js and Express.        |
| Database           | Hosted PostgreSQL for persistent production storage.        |
| AI integration     | A configured LLM provider with securely stored credentials. |

### Deployment Checklist

Before making the application available to users:

* Verify that the frontend builds successfully.
* Deploy and configure the Python backend.
* Deploy and configure the Node.js AI gateway.
* Configure the production database and connection string.
* Set environment variables separately for each service.
* Configure production CORS origins.
* Update frontend API URLs to the deployed backend endpoints.
* Configure OAuth callback URLs if required.
* Test authentication and email functionality where applicable.
* Verify Simulation Mode and Practice Mode.
* Confirm that reports show the correct negotiation outcomes.
* Test negotiation history and persistent data storage.
* Check server logs and error handling.

The frontend and both backend services must be able to communicate using the configured production URLs.

## Security Considerations

Protect sensitive information throughout development and deployment.

Never commit the following information to a public repository:

* LLM API keys.
* OAuth client secrets.
* Database passwords and connection credentials.
* Authentication signing keys.
* SMTP passwords.
* Production `.env` files.
* Access tokens.
* Private user information.

### Security Best Practices

* Store secrets in environment variables or hosting-platform secret managers.
* Keep local environment files out of version control.
* Use secure authentication and session management.
* Restrict CORS to trusted origins in production.
* Validate and sanitize user input.
* Apply appropriate access controls to user data and reports.
* Review Git history before publishing the repository.

Removing a secret from the latest commit does not necessarily remove it from previous commits. If a real secret has been exposed, revoke or rotate it.

## Future Enhancements

Potential future improvements for NegoSphere include:

* Additional negotiation scenarios and industry-specific templates.
* Multi-issue negotiations with weighted priorities.
* Advanced BATNA and leverage modeling.
* Improved information-discovery strategies.
* Team-based negotiation.
* Adaptive negotiation difficulty.
* Instructor and administrator dashboards.
* More detailed negotiation learning analytics.
* Advanced negotiation replay and visualization.
* Additional LLM provider integrations.
* Automated negotiation benchmarking.
* Expanded evaluation across scenarios, strategies, and agent personalities.

These items represent potential enhancements rather than a guarantee that they are already implemented.

## Team Members

The NegoSphere project team consists of:

* **Sinchana B**
* **Vinod Madgyal**
* **samudram yaswanth**

The project covers planning, architecture, frontend development, backend development, negotiation logic, AI integration, testing, and technical documentation.

## Acknowledgement

NegoSphere was developed as an academic project demonstrating the application of Generative AI, multi-agent systems, negotiation decision logic, interactive web development, and structured analytics to negotiation training and simulation.

## License

This project is licensed under the **MIT License**.

**Note:** The MIT License applies to your project only to the extent that you have the rights to license the included code and assets. Check any third-party assets and dependencies for their own license terms before publishing.

