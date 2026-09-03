# AI-Driven Multi-Agent Negotiation Training & Simulation Platform

## Project Overview

An AI-driven platform designed to simulate and practice real-world negotiations using multiple agents with different roles, goals, constraints, and personalities.

The platform will support both **AI-vs-AI Simulation Mode** and **Human-vs-AI Practice Mode**.

## Negotiation Scenarios

The platform includes three predefined scenarios:

- Vendor Pricing Negotiation
- Job Offer Negotiation
- Project Budget Allocation

It also supports the concept of **custom scenarios**, where users can define their own agents and negotiation objectives.

## Agent Configuration

Each agent is configured with:

- Agent Name
- Role
- Goal
- Constraints
- Personality

### Personalities

- Aggressive
- Collaborative
- Risk-Averse

## Basic Workflow
```text
Scenario Selection
        
Predefined / Custom Scenario
        ↓
Agent Configuration
        ↓
Personality Selection
        ↓
Negotiation
        ↓
Outcome Report
```
**## Current Progress**

**Technology Stack**
Frontend: React
Build Tool: Vite
Programming Language: JavaScript
Styling: CSS
Runtime: Node.js
Package Manager: npm
Version Control: Git
Repository: GitHub

### Milestone 1 – Basic Implementation

Completed / implemented:

+ Scenario Selection
+ Predefined Scenario Data
+ Agent Configuration
+ Personality Selection
+ Basic Application Workflow
+ System Architecture
+ Negotiation State Model
+ Offer Structure
+ Basic Rule-Based Negotiation Logic
+ Accept / Reject / Counteroffer Decisions
+ Progressive Counteroffer Generation
+ Concession Tracking
+ Negotiation Status Tracking
+ Offer and Decision History
+ Negotiation Reset and State Management

LLM-powered autonomous negotiation and advanced reasoning will be implemented in later milestones.

Getting Started
**1. Clone the Repository**
```text
git clone <repository-url>
```
**2. Navigate to the Project**
```text
cd ai-multi-agent-negotiation-platform
```
**3. Install Dependencies**
```text
npm install
```
**4. Start the Development Server**
```text
npm run dev
```
## Negotiation Engine – Current Progress

The project has now progressed beyond the initial UI workflow toward the implementation of the basic negotiation engine.

### Implemented Components

+ Negotiation state model
+ Negotiation status tracking
+ Current round and agent turn tracking
+ Offer structure and offer history
+ Basic rule-based offer evaluation
+ Accept / Reject / Counteroffer decision logic
+ Agent goal and constraint evaluation
+ Progressive counteroffer generation
+ Concession tracking for individual agents
+ Negotiation reset and state management
+ Decision history tracking
+ Agreement, Rejection, Deadlock, and Completion states

### Negotiation State

The negotiation state maintains important information such as:

+ Scenario
+ Current Round
+ Current Agent Turn
+ Previous Offer
+ Current Offer
+ Negotiation Status
+ Agent Goals
+ Agent Constraints
+ Agent Personality
+ Offer History
+ Concession History
+ Decision History

### Rule-Based Negotiation Logic

The current prototype evaluates offers based on the configured agent's:

+ Goal / target value
+ Constraint
+ Decision type (Maximize / Minimize)

The system can produce three basic decisions:

+ **ACCEPT** – The offer meets the agent's target.
+ **COUNTEROFFER** – The offer does not meet the target but remains within the allowed negotiation boundary.
+ **REJECT** – The offer violates the configured constraint.

### Concession Tracking

The system tracks how each agent changes its own offers during negotiation.

For every concession, the system records:

+ Previous offer
+ Current offer
+ Change in value

This allows the platform to analyze whether agents are making meaningful progress during negotiation.

### Negotiation Status

The platform supports the following negotiation states:

`Not Started → In Progress → Agreement / Rejected / Deadlock → Completed`

### Current Development Stage

The current implementation focuses on establishing the **core negotiation state and rule-based prototype**. 
LLM-powered autonomous negotiation, advanced agent reasoning, and detailed outcome reporting are planned for later milestones.
The application will be available at the local URL provided by Vite.

👥 Team

This project is developed collaboratively.

Team Members
Sinchana B
Vinod
Yaswanth samudram

Each team member contributes through the common GitHub repository, with contributions tracked through Git commits and branches.
