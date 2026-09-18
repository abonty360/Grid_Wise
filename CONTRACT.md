# ⚡ GridWise API Contract & Specification

> **Event:** BUP CSE Fest 2026 — AI Energy Optimization Hackathon  
> **Platform:** GridWise Commercial Edition  
> **Specification Standard:** BUP CSE Fest 2026 Problem Statement (Source of Truth)  
> **Protocol:** JSON over HTTP REST

---

## 1. System Architecture

```
Client (Web UI / REST Client)
       │
       ▼
 [1] Authentication & Rate Limiting (Optional JWT / Open Access)
       │
       ▼
 [2] Input Validation (Zod Strict Schema: 24 Hours, 1–3 Notes, Battery Bounds)
       │
       ▼
 [3] Natural Language Interpretation (LLM Provider: OpenAI / Gemini / Claude)
     └── Fallback: Deterministic Rule-Based Semantic Matcher
       │
       ▼
 [4] Directive Validation & Guardrails (Zod Schema for Exact 6 Directives)
       │
       ▼
 [5] Constraint Transformation (applyDirectives)
       │
       ▼
 [6] 2-Pass Dispatch Optimizer (Greedy Cost Minimization + Battery Neutrality Reconciliation)
       │
       ▼
 [7] 13-Point Mathematical Validation (Energy Balance & Reserve Checks)
       │
       ▼
 [8] Baseline Calculation & Impact Analysis
       │
       ▼
 [9] Neon PostgreSQL Persistence (Scenarios, Notes, Plans)
       │
       ▼
 [10] Standardized JSON Response Output
```

---

## 2. API Endpoints

### `GET /health`
System diagnostics verifying API status, Neon PostgreSQL connectivity, optimizer engine readiness, and LLM provider state.

```json
{
  "status": "ok",
  "services": {
    "api": "online",
    "database": "connected",
    "optimizer": "ready",
    "llm": "available"
  },
  "llm_provider": "openai",
  "timestamp": "2026-09-18T15:30:00.000Z",
  "version": "2.0.0"
}
```

---

### `POST /optimize-energy`

Primary energy dispatch optimization endpoint conforming strictly to the **BUP CSE Fest 2026 Problem Statement**.

#### Request Schema

| Field | Type | Description |
|---|---|---|
| `scenario_id` | `string` | Unique identifier for scenario (optional, auto-generated if omitted) |
| `operator_notes` | `string[]` | Array of 1 to 3 natural language directives |
| `hours` | `object[]` | Exactly 24 hourly records (indices 0 to 23) |
| `battery` | `object` | Battery operational specifications |

##### Hourly Record Schema (`hours` array element)
* `hour`: integer `[0..23]`
* `demand_kwh`: number $\ge 0$ (also supports alias `demand`)
* `solar_kwh`: number $\ge 0$ (also supports alias `solar`)
* `tariff_bdt_per_kwh`: number $\ge 0$ (also supports alias `tariff`)

##### Battery Schema (`battery` object)
* `capacity_kwh`: number $> 0$ (total capacity)
* `initial_energy_kwh`: number $\ge 0$ (state of charge at start of hour 0)
* `minimum_energy_kwh`: number $\ge 0$ (reserve limit floor)
* `max_charge_kwh_per_hour`: number $\ge 0$ (maximum charging rate)
* `max_discharge_kwh_per_hour`: number $\ge 0$ (maximum discharging rate)

*Note: Backward-compatible aliases `capacity`, `initial_energy`, `min_reserve`, `max_charge`, and `max_discharge` are automatically normalized.*

#### Example Request
```json
{
  "scenario_id": "bup-cse-fest-scenario-01",
  "operator_notes": [
    "Do not charge battery between 2 PM and 4 PM",
    "Keep at least 25 kWh in battery as reserve",
    "Expect 10% lower solar due to haze"
  ],
  "battery": {
    "capacity_kwh": 100,
    "initial_energy_kwh": 50,
    "minimum_energy_kwh": 20,
    "max_charge_kwh_per_hour": 25,
    "max_discharge_kwh_per_hour": 25
  },
  "hours": [
    { "hour": 0, "demand_kwh": 50.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 7.5 },
    { "hour": 1, "demand_kwh": 57.8, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 7.5 },
    "...",
    { "hour": 23, "demand_kwh": 42.2, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 7.5 }
  ]
}
```

---

## 3. Directive Interpretation Schema

Each note in `operator_notes` produces **exactly one entry** in `directive_interpretation`:

* `note_index`: integer (0-based index matching input note position)
* `applies`: boolean (`true` if a constraint was recognized; `false` if note is irrelevant/unsupported)
* `directive_type`: enum of 6 exact types:
  1. `solar_reduction`
  2. `minimum_battery_reserve`
  3. `no_charge_window`
  4. `no_discharge_window`
  5. `max_grid_window`
  6. `no_op`
* `structured_adjustment`: structured payload matching the directive type schema (or `null` for `no_op`)
* `explanation`: human-readable explanation of how the directive was applied or why it was ignored

### Exact Six Directive Schemas

| Directive Type | `structured_adjustment` Schema | Example |
|---|---|---|
| `solar_reduction` | `{ "hours": number[], "factor": number }` | `{"hours": [0,1,..,23], "factor": 0.9}` |
| `minimum_battery_reserve` | `{ "hours": number[], "minimum_energy_kwh": number }` | `{"hours": [0,1,..,23], "minimum_energy_kwh": 25}` |
| `no_charge_window` | `{ "hours": number[] }` | `{"hours": [14, 15]}` |
| `no_discharge_window` | `{ "hours": number[] }` | `{"hours": [0, 1, 2, 3]}` |
| `max_grid_window` | `{ "hours": number[], "max_grid_kwh": number }` | `{"hours": [17, 18, 19], "max_grid_kwh": 60}` |
| `no_op` | `null` | `null` |

---

## 4. Response Schema

The optimization response returns the 7 mandatory top-level fields defined by BUP CSE Fest 2026, accompanied by comprehensive validation and baseline metrics:

```json
{
  "scenario_id": "bup-cse-fest-scenario-01",
  "directive_interpretation": [
    {
      "note_index": 0,
      "applies": true,
      "directive_type": "no_charge_window",
      "structured_adjustment": { "hours": [14, 15] },
      "explanation": "Battery charging disabled during hours 14, 15."
    },
    {
      "note_index": 1,
      "applies": true,
      "directive_type": "minimum_battery_reserve",
      "structured_adjustment": {
        "hours": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        "minimum_energy_kwh": 25
      },
      "explanation": "Maintain minimum battery reserve of 25 kWh across all hours."
    }
  ],
  "hourly_plan": [
    {
      "hour": 0,
      "grid_kwh": 50.0,
      "solar_used_kwh": 0.0,
      "battery_action": "idle",
      "battery_kwh": 0.0,
      "battery_energy_after_kwh": 50.0,
      "demand_kwh": 50.0,
      "solar_kwh": 0.0,
      "tariff_bdt_per_kwh": 7.5,
      "cost_bdt": 375.0,
      "charge_kwh": 0.0,
      "discharge_kwh": 0.0,
      "battery_energy_kwh": 50.0
    }
  ],
  "total_grid_kwh": 774.8,
  "total_cost_bdt": 6315.75,
  "peak_grid_kwh": 80.0,
  "plan_summary": "Optimal dispatch generated. Grid import: 774.8 kWh (cost: 6315.75 BDT). End-of-day neutrality verified (final SOC = initial SOC).",
  "validation": {
    "all_pass": true,
    "checks": [
      { "check": "24 hour records", "status": "pass", "description": "Found 24 records." },
      { "check": "Hour range valid", "status": "pass", "description": "Hours 0–23 present sequentially." },
      { "check": "No duplicate hours", "status": "pass", "description": "All hours unique." },
      { "check": "Energy balance valid", "status": "pass", "description": "Energy balance satisfied for all 24 hours." },
      { "check": "Solar limit valid", "status": "pass", "description": "Solar used <= effective solar available at all hours." },
      { "check": "Battery capacity valid", "status": "pass", "description": "Battery stayed within capacity (100 kWh)." },
      { "check": "Minimum reserve valid", "status": "pass", "description": "Minimum battery energy reserve maintained across all hours." },
      { "check": "Charge rate valid", "status": "pass", "description": "Charge rate <= 25 kWh/h." },
      { "check": "Discharge rate valid", "status": "pass", "description": "Discharge rate <= 25 kWh/h." },
      { "check": "Grid non-negative", "status": "pass", "description": "Grid import >= 0 at all hours." },
      { "check": "End-of-day battery neutrality", "status": "pass", "description": "Final battery energy (50.00 kWh) equals initial energy (50.00 kWh)." },
      { "check": "Directives satisfied", "status": "pass", "description": "All operator directives strictly enforced." },
      { "check": "Totals verified", "status": "pass", "description": "All totals and metrics mathematically verified against hourly rows." }
    ]
  }
}
```

---

## 5. Core Battery & Energy Rules

1. **Exact Conservation Balance Equation:**
   $$\text{grid\_kwh} + \text{solar\_used\_kwh} + \text{battery\_discharge} = \text{demand\_kwh} + \text{battery\_charge}$$
2. **Energy Storage Capacity Bounds:**
   $$\text{minimum\_energy\_kwh} \le \text{battery\_energy\_after\_kwh}_h \le \text{capacity\_kwh}, \quad \forall h \in [0, 23]$$
3. **Charge & Discharge Rate Limits:**
   $$\text{battery\_kwh}_h \le \text{max\_charge\_kwh\_per\_hour} \quad (\text{if charge})$$
   $$\text{battery\_kwh}_h \le \text{max\_discharge\_kwh\_per\_hour} \quad (\text{if discharge})$$
4. **Non-Negative Grid Import:**
   $$\text{grid\_kwh}_h \ge 0, \quad \forall h \in [0, 23]$$
5. **End-of-Day Battery Neutrality:**
   $$\text{battery\_energy\_after\_kwh}_{23} == \text{initial\_energy\_kwh}$$
   *Reconciled via Pass 2: discharging excess solar during high-tariff hours and curtailing solar overcharge.*
6. **Cost Minimization Objective:**
   $$\text{Minimize } \sum_{h=0}^{23} \left(\text{grid\_kwh}_h \times \text{tariff\_bdt\_per\_kwh}_h\right)$$
7. **Time Interval Semantics:**
   Time intervals are **start-inclusive and end-exclusive**:
   * `2 PM to 4 PM` $\implies$ hours `[14, 15]`
   * `6 AM to 9 AM` $\implies$ hours `[6, 7, 8]`
   * `5 PM to 10 PM` $\implies$ hours `[17, 18, 19, 20, 21]`
