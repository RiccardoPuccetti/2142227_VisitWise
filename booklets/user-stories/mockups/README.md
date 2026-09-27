# LoFi Mockups (Balsamiq)

One mockup per screen. Every user story points to its screen in `../USER_STORIES.md`, so each story has a mockup.

| Screen | File names (source + export) | Owner | Must show |
|---|---|---|---|
| S1 Imports list | `S1-imports-list.bmpr` + `S1-imports-list.png` | Puccetti | Card/table toggle, name, created date, status badge, "New import", delete |
| S2 Wizard - upload | `S2-wizard-upload.*` | Puccetti | Stepper (1 of 4), drag & drop area, "Download template" link |
| S3 Wizard - mapping | `S3-wizard-mapping.*` | Puccetti | Preview table (10 rows), one select per field (Customer, Delivery point, Address, City, Agent, Lat, Lon), required markers |
| S4 Wizard - enterprises & name | `S4-wizard-enterprises.*` | Puccetti | Checkbox list of numeric columns, display name + color per enterprise, import name, Confirm |
| S5 Import report / detail | `S5-import-detail.*` | Puccetti | Counts (total/imported/skipped), geocoding progress bar, points table with "Not found" filter and lat/lon edit, buttons Map / Planner |
| S6 Map dashboard | `S6-map-dashboard.*` | Rivera | Map with colored markers, filter bar (enterprise, agent, city, min revenue), popup, KPI side panel, legend |
| S7 Planner - parameters | `S7-planner-parameters.*` | Marzella | Campaign presets, start date, max working days, enterprise weight sliders, agents, advanced section, Simulate |
| S8 Planner - result | `S8-planner-result.*` | Marzella | KPI cards, timeline per agent/day, map with day route + day selector, not-planned list, warnings, Save scenario |
| S9 What-if | `S9-what-if.*` | Marzella | Horizon chips (10/20/30/40/60), coverage curve, marginal revenue bars, table |
| S10 Scenarios compare | `S10-scenarios-compare.*` | Marzella | 2-3 columns of KPIs with differences highlighted |
| S11 Agent plan | `S11-agent-plan.*` | Rivera | Agent selector, day-by-day calendar, Export Excel, Directions link per visit |

Rules

- Export every mockup as PNG with the same name (PNG is what the booklet and the slides embed).
- Annotate non-functional requirements directly on the mockup when they affect the UI (e.g. "progress refreshes every 3 s").
- Mockups are LoFi: grayscale, no real data (NDA) - use the synthetic sample names.
