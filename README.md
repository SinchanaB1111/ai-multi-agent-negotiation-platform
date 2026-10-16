# NegoSphere — AI-Driven Multi-Agent Negotiation Platform

**An AI-powered platform for negotiation training, interactive simulations, and strategic decision-making.**

NegoSphere is an AI-driven multi-agent negotiation training and simulation platform designed to help users explore negotiation strategies through realistic, interactive scenarios. It brings together configurable AI agents, negotiation workflows, and analytical insights to create an environment for practicing and understanding negotiation behavior.

The platform focuses on simulating real-world negotiation situations, exploring different agent personalities, evaluating offers and counteroffers, and understanding how negotiation strategies influence outcomes.

## 🚀 Key Features

- **Multiple Negotiation Scenarios** — Explore scenarios such as vendor pricing negotiations, job offer negotiations, and project budget allocation.
- **Configurable AI Agents** — Define agent names, roles, goals, constraints, and negotiation personalities.
- **Personality-Based Negotiation** — Configure agents with Aggressive, Collaborative, and Risk-Averse personalities.
- **Interactive Negotiation Sessions** — Practice negotiation strategies through offers, counteroffers, and decision-making workflows.
- **AI-Powered Negotiation Responses** — Use supported large language model integrations to generate contextual negotiation responses.
- **Negotiation History** — Review negotiation interactions and track how offers evolve throughout a session.
- **Concession Tracking** — Observe changes in negotiation positions and concessions.
- **Negotiation Analytics** — Analyze negotiation behavior and outcomes using the insights available in the application.
- **Practice and Simulation Modes** — Explore negotiation scenarios through different learning and simulation workflows.

## 🎯 Project Objectives

- Create an interactive environment for multi-agent negotiation training.
- Explore how AI agents make decisions under different goals and constraints.
- Demonstrate the impact of personality and strategy on negotiation outcomes.
- Help users understand offers, counteroffers, concessions, and negotiation behavior.
- Provide a foundation for experimenting with AI-driven negotiation systems.

## 🛠️ Technology Stack

| Technology        | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| React             | Interactive user interface                         |
| Vite              | Frontend development and build tooling             |
| JavaScript        | Frontend application logic                         |
| Python            | Backend and application services                   |
| FastAPI           | Backend API framework                              |
| Google Gemini API | Large language model integration, where configured |
| HTML5 and CSS3    | Application structure and styling                  |
| Git and GitHub    | Version control and collaboration                  |

*The exact technologies used depend on the current repository version and its configuration.*

## 🏗️ Project Architecture

NegoSphere follows a frontend-and-backend architecture.

1. **Frontend Layer:** React and Vite provide the interface for selecting scenarios, configuring agents, and interacting with negotiation sessions.
2. **Backend Layer:** Python and FastAPI provide backend API services and support configured application workflows.
3. **AI Integration Layer:** The configured LLM integration supports context-aware negotiation responses and AI-assisted interactions.
4. **Negotiation Logic:** Scenario definitions, agent goals, constraints, offers, and decision-making rules drive the negotiation workflow.
5. **Analysis Layer:** Available analytics and history features help users review negotiation progress and outcomes.

## 📂 Project Structure

```text
ai-driven-multi-agent-negotiation-platform/
├── docs/                       # Project documentation
├── platform-backend/            # Python FastAPI backend
├── public/                      # Static assets
├── scripts/                     # Utility and development scripts
├── server/                      # Server-side services
├── src/                         # React frontend source
├── test-documents/              # Project-related test documents
├── .env.example                 # Environment variable template
├── .gitignore                   # Git exclusions
├── package.json                 # Frontend and server scripts
├── package-lock.json            # Dependency lockfile
├── vite.config.js               # Vite configuration
├── vite.config.mjs              # Additional Vite configuration
├── database_schema.sql          # Database schema
├── LICENSE                      # MIT License
└── README.md                    # Project documentation
```

*Note: This is a simplified overview. Some files and folders may be omitted.*

*The structure above is representative; some files and folders may differ in your current version.*

## ⚙️ Getting Started

Follow these steps to run the project locally.

### Prerequisites

Install the following:

- Node.js and npm
- Python 3.10 or a compatible version required by the backend dependencies
- Git
- A Google Gemini API key if your selected AI features require it

### 1. Clone the repository

```bash
git clone https://github.com/yaswanth495/ai-driven-multi-agent-negotiation-platform.git
cd ai-driven-multi-agent-negotiation-platform
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure environment variables

Check the available `.env.example` files and create the corresponding local `.env` files.

For example, if your backend uses Gemini, configure the variable name expected by your code:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Use the exact variable names required by your application. Configure any other required database, authentication, or service settings according to the supplied environment templates.

**Security:** Never commit API keys, passwords, access tokens, or populated `.env` files to GitHub.

### 4. Start the frontend

```bash
npm run dev
```

Open the local URL displayed in your terminal. The default Vite development address is usually:

```text
http://localhost:5173/
```

### 5. Start the backend

Open another terminal:

```bash
cd platform-backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

## 🔄 Application Workflow

1. **Select a Scenario:** Choose a negotiation scenario.
2. **Configure Agents:** Define agent roles, goals, constraints, and personalities.
3. **Start Negotiation:** Begin an interactive simulation or practice session.
4. **Exchange Offers:** Review proposals and counteroffers as the negotiation progresses.
5. **Evaluate Decisions:** Examine how agent strategies and constraints affect decisions.
6. **Review Insights:** Use available negotiation history, concession tracking, and analytics to understand the outcome.

## 💡 Example Use Cases

- **Vendor Pricing:** Explore how a buyer and supplier negotiate pricing and terms.
- **Job Offers:** Practice negotiating salary, benefits, and employment conditions.
- **Project Budget Allocation:** Simulate negotiations over competing resource and budget requirements.
- **Negotiation Strategy Learning:** Compare approaches used by agents with different personalities and objectives.

## 🔐 Security and Configuration

- Keep API keys and credentials in environment variables.
- Never expose private credentials in frontend code or public repositories.
- Configure backend access controls and authentication where required.
- Use `.gitignore` to exclude sensitive configuration files and generated artifacts.
- Follow the usage limits and terms of any external AI service you integrate.

## 🚧 Future Enhancements

Potential areas for further development include:

- More negotiation scenarios and configurable agent types.
- Enhanced negotiation metrics and outcome comparisons.
- Improved persistence of negotiation sessions and reports.
- Expanded automated testing and validation.
- More detailed visualizations of negotiation progress.
- Additional AI provider integrations where supported.

## 👨‍💻 Development and Contributions

NegoSphere is developed as a software project focused on AI-driven negotiation simulation, application development, and interactive learning.

Contributions that improve usability, negotiation logic, documentation, testing, performance, and security are valuable. Please document changes clearly and ensure that new functionality is tested before submitting updates.

## 📌 Project Summary

NegoSphere combines web development, AI integration, agent configuration, and negotiation analysis in a single platform. It demonstrates how AI-driven agents can be used to explore strategic decision-making in realistic negotiation environments.

**Built to explore smarter negotiation through AI, interactive simulations, and data-driven insights.**

---

---

**Project:** NegoSphere — AI-Driven Multi-Agent Negotiation Training & Simulation Platform

**GitHub Repository:** https://github.com/SinchanaB1111/ai-multi-agent-negotiation-platform?tab=readme-ov-file

**Built to explore smarter negotiation through AI, interactive simulations, and data-driven insights.**

