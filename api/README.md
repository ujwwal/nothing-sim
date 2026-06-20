---
title: QuietCost API
emoji: 🏠
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
---

# QuietCost API

FastAPI backend for the [QuietCost](https://nothing-sim-pvt.vercel.app) Cost of Inaction Simulator.

Runs a calibrated Discrete-Time Markov State Transition Model using real HUD SPM + PIT data
to estimate the long-term fiscal cost of delaying supportive housing interventions.

## Endpoints

- `GET /` — Health check
- `GET /api/data-health` — Dataset & pipeline status
- `POST /api/simulation/run` — Run scenario simulation
