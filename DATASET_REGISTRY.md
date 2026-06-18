# Aegis-Sim Dataset Registry

## Project Rules

1. Scope is limited to chronic homelessness only.
2. Aegis-Sim is a county-level planning and decision-support tool.
3. The platform assists policymakers but never makes decisions for them.
4. Human-in-the-loop review is required for all policy decisions.
5. The simulation engine uses a Discrete-Time Markov State Transition Model.
6. All projections must include uncertainty ranges.
7. Single-point predictions are prohibited.
8. Monte Carlo simulation must be used for scenario analysis.
9. All assumptions must be documented and visible.
10. All imputed values must be flagged.
11. Data quality issues must be surfaced to users.
12. The simulator must disable itself when safety thresholds are exceeded.
13. Chronic homelessness is defined according to HUD standards.
14. The primary outcome is understanding the cost of delaying supportive housing interventions.
15. The platform must remain transparent, explainable, and auditable.

---

# Project Overview

## Application Name

Aegis-Sim

## Full Name

Aegis-Sim: Cost of Inaction Simulator for Chronic Homelessness

## Challenge

USAII Global AI Hackathon 2026

Challenge 6: AI for Systems & Society

Direction A: The Cost of Doing Nothing Simulator

## Core Objective

Help municipal decision-makers understand the long-term fiscal consequences of delaying supportive housing interventions for people experiencing chronic homelessness.

---

# Geographic Unit

Primary geographic unit:

- FIPS County

---

# Population Scope

Included:

- Chronic homelessness

Excluded:

- General homelessness
- Transition-age youth modeling
- Family homelessness modeling
- Veteran-specific modeling
- Individual-level decisions
- Real-time crisis forecasting

---

# Dataset Inventory

## Dataset 1

### File Name

System-Performance-Measures-Data.xlsx

### Source

HUD

### Purpose

Used to calibrate transition probabilities and system performance indicators.

### Key Concepts

- Length of homelessness
- Returns to homelessness
- Exits to permanent housing
- Housing retention

### Maps To

- Markov transition matrix
- Housing transition rates
- Recidivism estimates

### Update Frequency

Annual

### Data Type

Observed

---

## Dataset 2

### File Name

ED_Visits_Age_Group_2023.csv

### Source

Healthcare Utilization Dataset

### Purpose

Estimate healthcare utilization and emergency department burden.

### Key Concepts

- Emergency department usage
- Healthcare utilization rates
- Cost estimation

### Maps To

- Acute Healthcare State
- ER Cost Estimates
- Healthcare Burden Metrics

### Update Frequency

Static / Periodic

### Data Type

Observed

---

## Dataset 3

### File Name

CoC_AwardComp_NatlTerrDC_2024.pdf

### Source

HUD

### Purpose

Estimate Permanent Supportive Housing (PSH) funding and costs.

### Key Concepts

- Award amounts
- Program funding
- Housing investment

### Maps To

- psh_cost_per_unit
- intervention_cost

### Update Frequency

Annual

### Data Type

Observed

---

## Dataset 4

### File Name

CoC_HIC_NatlTerrDC_2025.pdf

### Source

HUD Housing Inventory Count

### Purpose

Estimate housing inventory and shelter capacity.

### Key Concepts

- Shelter beds
- Housing units
- Capacity constraints

### Maps To

- shelter_capacity
- housing_inventory

### Update Frequency

Annual

### Data Type

Observed

---

## Dataset 5

### File Name

hud pit count_

### Source

HUD PIT Count

### Purpose

Baseline homeless population estimates.

### Key Concepts

- Sheltered population
- Unsheltered population
- Chronic homelessness counts

### Maps To

- homeless_population
- sheltered_count
- unsheltered_count

### Update Frequency

Annual

### Data Type

Observed

---

## Dataset 6

### File Name

vera institute incarceration

### Source

Vera Institute

### Purpose

Estimate incarceration costs and justice-system burden.

### Key Concepts

- Jail costs
- Incarceration burden
- County-level costs

### Maps To

- incarceration_cost

### Update Frequency

Annual

### Data Type

Observed

---

## Dataset 7

### File Name

cdc wonder cause of death_

### Source

CDC WONDER

### Purpose

Estimate mortality rates.

### Key Concepts

- Mortality
- Cause of death
- Population risk

### Maps To

- deceased_transition_probability

### Update Frequency

Annual

### Data Type

Observed

---

## Dataset 8

### File Name

hud fair market rents

### Source

HUD

### Purpose

Provide housing cost baselines.

### Key Concepts

- Rent estimates
- Housing market costs

### Maps To

- psh_cost_per_unit
- housing_cost_baseline

### Update Frequency

Annual

### Data Type

Observed

---

## Dataset 9

### File Name

usps crosswalk

### Source

USPS

### Purpose

Map ZIP codes to counties and FIPS identifiers.

### Key Concepts

- ZIP code mapping
- County mapping
- Geographic standardization

### Maps To

- fips_county

### Update Frequency

Quarterly

### Data Type

Reference

---

## Dataset 10

### File Name

nhgis0001_csv

### Source

NHGIS

### Purpose

Geographic harmonization across changing census boundaries.

### Key Concepts

- Census geography
- Historical harmonization
- Boundary changes

### Maps To

- geographic_standardization

### Update Frequency

Periodic

### Data Type

Reference

---

## Dataset 11

### File Name

2024-nsduh-detailed-tables-072325

### Source

SAMHSA NSDUH

### Purpose

Support disability and behavioral health assumptions.

### Key Concepts

- Disability prevalence
- Behavioral health indicators
- Population characteristics

### Maps To

- population_characteristics

### Update Frequency

Annual

### Data Type

Observed

---

# Unified Schema

All datasets should be transformed into the following unified schema whenever possible.

```text
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
```

---

# Dataset Discovery Rules

The ingestion pipeline must:

1. Recursively scan the /datasets directory.
2. Discover nested files automatically.
3. Support mixed file formats.
4. Build a dataset registry automatically.
5. Continue operating even when some datasets are missing.
6. Log all ingestion failures.
7. Never crash due to a missing dataset.
8. Record metadata for every discovered file.

Supported formats:

- CSV
- XLSX
- XLS
- PDF
- JSON

---

# Data Quality Rules

Rule 1

All datasets must pass schema validation before entering the simulation pipeline.

Rule 2

Missing values must be logged.

Rule 3

All imputed values must be flagged.

Rule 4

Schema drift must generate warnings.

Rule 5

Feature drift greater than 10% must generate alerts.

Rule 6

Data quality status must be visible in the Data Health Dashboard.

Rule 7

Data older than 18 months must generate warnings.

---

# Imputation Strategy

Time-Series Gaps:

- Linear Interpolation

Structural Missingness:

- MICE (placeholder implementation)

Tracking:

- All imputed values stored with source_flag metadata

---

# Drift Monitoring

Monitor:

- Definition Drift
- Geographic Drift
- Missingness Drift
- Schema Drift
- Feature Drift

Feature drift should use:

- Population Stability Index (PSI)

---

# Simulation Dependencies

## Population Baseline

Datasets:

- hud pit count_

Provides:

- Population counts
- Sheltered counts
- Unsheltered counts

---

## Transition Calibration

Datasets:

- System-Performance-Measures-Data.xlsx

Provides:

- Housing exits
- Returns to homelessness
- Length of homelessness

---

## Housing Costs

Datasets:

- CoC_AwardComp_NatlTerrDC_2024.pdf
- hud fair market rents

Provides:

- PSH costs
- Housing investment estimates

---

## Shelter Capacity

Datasets:

- CoC_HIC_NatlTerrDC_2025.pdf

Provides:

- Shelter inventory
- Housing inventory

---

## Healthcare Costs

Datasets:

- ED_Visits_Age_Group_2023.csv

Provides:

- ER utilization
- Healthcare burden estimates

---

## Incarceration Costs

Datasets:

- vera institute incarceration

Provides:

- Jail costs
- Justice-system burden

---

## Mortality

Datasets:

- cdc wonder cause of death_

Provides:

- Mortality estimation
- Deceased state calibration

---

## Geographic Mapping

Datasets:

- usps crosswalk
- nhgis0001_csv

Provides:

- FIPS mapping
- Geographic harmonization

---

## Population Characteristics

Datasets:

- 2024-nsduh-detailed-tables-072325

Provides:

- Disability assumptions
- Behavioral health assumptions

---

# Responsible AI Constraints

The simulator must automatically disable itself if:

- Data is older than 18 months
- Missing data exceeds 25%
- Population size falls below 100
- External shock flag is active

Examples:

- Pandemic
- Natural disaster

---

# Final Principle

Aegis-Sim is a transparent decision-support platform.

It exists to help policymakers understand possible consequences of action and inaction.

It does not make decisions.

It does not determine eligibility.

It does not automate policy.

Humans remain responsible for all final decisions.