# QUIETCOST — FULL BUILD SPECIFICATION FOR GITHUB COPILOT

Build a production-quality MVP called **QuietCost**.

QuietCost is an AI-assisted policy simulation platform that helps municipal decision-makers understand the long-term fiscal consequences of delaying supportive housing interventions for people experiencing chronic homelessness.

The platform DOES NOT make decisions for policymakers.

The platform provides:

- Scenario simulation
- Cost projections
- Population projections
- Uncertainty ranges
- Data quality monitoring
- Transparent methodology
- Plain-language decision briefs

The application must use the datasets stored in:

/datasets

The goal is to generate approximately 70–80% of the final application automatically.

---

# TECH STACK

## Frontend

- React 19
- Next.js 15 App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Recharts
- TanStack Table
- React Hook Form
- Zod
- Zustand

## Backend

- FastAPI (Python)
- Pandas
- NumPy
- SciPy
- Pydantic

## Data Validation

- Pandera

## AI Layer

- OpenAI-compatible provider abstraction
- Must function without API keys
- Graceful fallback mode

---

# DESIGN PHILOSOPHY

Desktop-first.

Fully responsive.

Mobile compatible.

Tablet compatible.

Primary users:

- Municipal CFOs
- Budget Directors
- County Commissioners
- City Managers
- Housing Directors
- Public Health Directors
- Continuum of Care Leadership

Primary usage environment:

- Desktop monitors
- Laptops
- Budget meetings
- Policy planning sessions

Secondary usage:

- Mobile review of results
- Quick scenario checks

Desktop version should contain maximum functionality.

---

# APPLE LIQUID GLASS DESIGN SYSTEM

The UI should feel inspired by:

- Apple Vision Pro
- Apple Weather
- Apple Stocks
- Apple Health
- Linear

NOT:

- Bootstrap Admin Templates
- Generic SaaS Dashboards
- Material Design Admin Panels

Use:

- Glassmorphism
- Frosted glass cards
- Layered depth
- Semi-transparent panels
- backdrop-blur-xl
- backdrop-blur-2xl
- Soft shadows
- Floating surfaces
- Rounded corners (24px+)
- Smooth animations
- Spring motion
- Elegant typography
- Spacious layouts

Use Framer Motion extensively.

Animate:

- Cards
- Charts
- Scenario switching
- Page transitions
- KPI changes

Support:

- Light Mode
- Dark Mode
- System Theme

Charts must support both themes.

---

# RESPONSIVE REQUIREMENTS

Desktop First.

Breakpoints:

Mobile:
<768px

Tablet:
768px–1024px

Desktop:
1024px+

Large Desktop:
1440px+

Requirements:

Desktop:

- Multi-column layout
- Sidebar navigation
- Large charts
- Data tables visible
- Full simulation controls

Tablet:

- Responsive grid
- Collapsible sidebar
- Responsive charts

Mobile:

- Bottom navigation
- Card-based layouts
- Accordions
- Simplified controls

Never allow horizontal scrolling.

Use:

- CSS Grid
- Flexbox
- Responsive typography

Charts must resize automatically.

---

# APPLICATION STRUCTURE

Create:

/app

/dashboard
/simulation
/data-health
/methodology
/about

/components

/lib

/lib/data
/lib/simulation
/lib/drift
/lib/imputation
/lib/validation
/lib/ai
/lib/charts

/types

/api

/datasets

---

# LANDING PAGE

Hero Section

Headline:

"The Cost of Doing Nothing"

Subheadline:

Understand the long-term fiscal consequences of delaying supportive housing investments.

Buttons:

- Run Simulation
- Explore Data
- Methodology

Sections:

- Problem Overview
- How QuietCost Works
- Data Sources
- Responsible AI
- System Architecture

Use animated glass cards.

---

# DASHBOARD PAGE

Executive Overview Dashboard.

Display:

- Current homeless population
- Sheltered population
- Unsheltered population
- Estimated annual system cost
- PSH cost estimate
- Net Present Cost of Delay

Desktop Layout:

Top:
KPI cards

Middle:
2-column chart grid

Bottom:
Data quality summary
Scenario launcher

Mobile Layout:

Stack cards vertically.

Charts become full width.

Secondary sections collapse into accordions.

Charts:

- Population trends
- Cost trends
- County comparison
- State distribution
- Department-level costs

---

# SIMULATION PAGE

Most important page.

Scenario Selection:

Scenario 1:
Act Now

Scenario 2:
Delay X Years

Default:
3 years

Scenario 3:
Do Nothing

Desktop Layout:

Left:
Simulation controls

Right:
Results

Width:
30/70

Tablet:

Controls above results.

Mobile:

Accordion workflow:

1 Select Scenario
2 Configure Inputs
3 Run Simulation
4 View Results

Run Simulation Button.

---

# CORE MODEL

Implement a Discrete-Time Markov State Transition Model.

States:

1 Stable Housing

2 Emergency Shelter

3 Street Homelessness (Unsheltered)

4 Jail / Justice System

5 Acute Healthcare

6 Deceased

Deceased is an absorbing state.

Simulation Horizon:

10 years

Time Step:

Monthly

Each state stores:

- Cost per person
- Mortality risk
- Transition probabilities

---

# MONTE CARLO SIMULATION

Run:

1000 simulations

Output:

- Median projection
- 80% confidence interval
- 95% confidence interval

Never display single deterministic forecasts.

All projections must show uncertainty bands.

---

# INVISIBLE POPULATION MODELING

Implement sensitivity controls.

User options:

Low Estimate

Medium Estimate

High Estimate

Show impact on:

- Population projections
- Cost projections
- Fiscal outcomes

Make uncertainty visible.

---

# COST MODEL

Track:

- Shelter costs
- Healthcare costs
- Incarceration costs
- PSH costs

Calculate:

- Total taxpayer burden
- Cost of delay

Display:

Average-Cost Estimate

Marginal-Cost-Adjusted Estimate

---

# FLAGSHIP METRIC

Net Present Cost of Delay (NP-CoD)

Definition:

Total taxpayer cost attributable to delaying supportive housing interventions.

Display prominently throughout the dashboard.

---

# DATA INGESTION

Auto-discover datasets inside:

/datasets

Support:

- CSV
- XLSX
- XLS
- JSON

Create ingestion adapters.

Each dataset gets a parser.

Create:

/lib/data/ingestion

---

# EXPECTED DATASETS

HUD PIT Count

HUD System Performance Measures

CoC Award Summary

CoC HIC

CDC WONDER

Vera Institute Incarceration

HUD Fair Market Rent

USPS Crosswalk

NHGIS

NSDUH

ED Visits

Automatically detect available files.

---

# UNIFIED DATA SCHEMA

Build a unified schema:

year

fips_county

homeless_population

sheltered_count

unsheltered_count

er_cost_per_person

shelter_cost_per_bed_night

incarceration_cost

psh_cost_per_unit

poverty_rate

source_flag

---

# DATA QUALITY PIPELINE

Create:

Dataset Registry

Missingness Detection

Schema Validation

Drift Monitoring

Imputation Tracking

Validation Reports

---

# IMPUTATION

Implement:

1 Linear Interpolation

2 MICE Placeholder Pipeline

All imputed values must be flagged.

Store flags inside:

source_flag

---

# DATA HEALTH PAGE

Create four tabs.

TAB 1

Sources

Display:

- Dataset Name
- Status
- Last Updated
- API / Manual

TAB 2

Drift

Display:

- Schema Drift
- Feature Drift
- Geographic Drift
- Definition Drift
- Missingness Drift

Threshold:

10%

TAB 3

Schema

Display:

- Completeness bars
- Validation results
- Missingness percentages

TAB 4

Changelog

Display:

- Failures
- Fixes
- Open issues

---

# DRIFT DETECTION

Implement:

Definition Drift

Geographic Drift

Missingness Drift

Schema Drift

Feature Drift

Use:

Population Stability Index (PSI)

Display warning indicators.

---

# METHODOLOGY PAGE

Explain:

- Problem Statement
- Markov Model
- State Definitions
- Monte Carlo Simulation
- Data Sources
- Assumptions
- Imputation
- Drift Monitoring
- Responsible AI
- Limitations

Include:

Architecture diagrams

State transition diagrams

Process flow diagrams

---

# RESPONSIBLE AI PAGE

Display:

Human-in-the-Loop Design

Known Limitations

Invisible Population Bias

Data Staleness Risks

Model Assumptions

Misuse Prevention

Governance Process

---

# HARD BYPASS CONDITIONS

Disable simulation automatically if:

Data older than 18 months

Missing data exceeds 25%

Population size below 100

External shock flag active

Examples:

- Pandemic
- Natural disaster

Show warning panel.

Prevent simulation execution.

---

# MISUSE PREVENTION

Clearly state:

Do not use for:

- Individual-level decisions
- Housing eligibility decisions
- Real-time crisis response
- Emergency forecasting
- Automated policy decisions

---

# AI DECISION BRIEF

Generate plain-language summaries.

Inputs:

- Simulation results
- Costs
- Population projections
- Confidence intervals

Outputs:

Executive Summary

Fiscal Impact

Major Risks

Key Assumptions

Questions Policymakers Should Consider

DO NOT:

Recommend policy.

Make decisions.

Prescribe actions.

Only explain projected outcomes.

---

# API ENDPOINTS

Create:

/api/simulation/run

/api/data-health

/api/methodology

/api/datasets

/api/scenario

/api/decision-brief

---

# STATE MANAGEMENT

Use Zustand.

Store:

- Current scenario
- User settings
- Simulation outputs
- Dataset status
- Theme

---

# CHARTS REQUIRED

Population Projection Chart

Cost Projection Chart

Scenario Comparison Chart

State Distribution Chart

Department Cost Breakdown Chart

Confidence Interval Visualization

All charts:

Responsive

Dark mode compatible

Animated

---

# TABLES REQUIRED

Dataset Registry

Data Quality Reports

Simulation Outputs

Scenario Comparisons

Use TanStack Table.

---

# TESTING

Create:

Unit Tests

Integration Tests

Simulation Tests

Schema Validation Tests

API Tests

---

# DOCUMENTATION

Generate:

README.md

Architecture Overview

Data Pipeline Documentation

Simulation Methodology

Responsible AI Documentation

Developer Setup Guide

---

# CODE QUALITY

Requirements:

Strong TypeScript typing

Reusable components

Clean architecture

Comments explaining simulation logic

No lorem ipsum

No fake charts

Use real data when available

Graceful error handling

Graceful fallback states

Production-ready folder structure

---

# ACCEPTANCE CHECKLIST

[ ] datasets auto-discover successfully

[ ] ingestion pipeline works

[ ] unified schema builds

[ ] dashboard renders

[ ] simulation executes

[ ] Markov model runs

[ ] Monte Carlo runs

[ ] confidence intervals display

[ ] charts render correctly

[ ] methodology page works

[ ] responsible AI page works

[ ] data health dashboard works

[ ] invisible population controls work

[ ] AI brief generates

[ ] responsive design works

[ ] desktop layout optimized

[ ] mobile layout functional

[ ] dark mode works

[ ] TypeScript compiles

[ ] no build errors

[ ] production build succeeds

Build the application file-by-file.

Prioritize working functionality over visual perfection.

Use the datasets in /datasets whenever possible.

Generate implementation code, not placeholders.