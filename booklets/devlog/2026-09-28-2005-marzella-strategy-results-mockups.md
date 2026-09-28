# Planner mockups S7-S10 generated from a Java2D script

- **Author:** Marzella
- **Task / user stories:** MAR-6; screens of US-19 to US-27 (planner
  parameters, planner result, what-if, scenarios compare)
- **What changed:**
  - `booklets/user-stories/mockups/S7-planner-parameters.png`,
    `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`:
    LoFi grayscale mockups, 1280 x 900, with the elements listed in the
    mockups README (starting base with Save and geocoded position, campaign
    chips, dates, working days, enterprise weight sliders, agents, advanced
    section, Simulate; KPI cards, timeline per agent and day, map with the day
    route and its badge, not-planned list, warnings, Save scenario; horizon
    chips, coverage curve, marginal revenue bars, results table; 2-3 scenario
    columns with the differing cells shaded). Non-functional notes are written
    on the images (response time, deterministic what-if, OSRM fallback).
  - `booklets/user-stories/mockups/tools/GenerateMockups.java`: single-file
    Java program (Java2D, headless, no dependencies) that draws the four
    screens; it is the source of the mockups, there is no `.bmpr`.
  - `booklets/user-stories/mockups/README.md`: S7-S10 marked as generated,
    with the command to regenerate them.
  - `booklets/team/TASKS.md`: MAR-6 reworded as "Mockups S7-S10";
    `booklets/team/TASK_STATUS.md`: new dated section, MAR-6 done, RIV-4
    recorded as merged (PR #8).
- **Why / decisions:** MAR-6 originally also asked for a "measured results"
  section in `OPTIMIZATION_STRATEGY.md`, fed by a JUnit run of the planner on
  the synthetic sample. The sample has no coordinates and the test would have
  needed a hand-made fixture of coordinates; the scope was reduced to the
  mockups on 2026-09-28 (Marzella), the document already reports the
  synthetic 1,000-point timing check of MAR-2. Python and Node were not
  available on the machine, so the mockups are drawn with the JDK 21 already
  required by the backend: anyone can regenerate them with
  `java tools/GenerateMockups.java .`, and changes are reviewed as code. All
  names come from `source/sample-data/generate_samples.py`; every figure is
  invented for the sketch (NDA).
- **Verification:** `java tools/GenerateMockups.java .` run from
  `booklets/user-stories/mockups/` with `~/.jdks/ms-21.0.12.1`, the four PNG
  files were opened and checked against the "Must show" column of the README
  (labels, overlaps, grayscale). No code under `source/` was touched, so no
  backend or frontend build was run.
- **Slide note:** The planner screens were sketched before the pages were
  built: one screen for the parameters, one for the result, one for the
  what-if curve and one for comparing saved scenarios.
- **Screenshot path:** `booklets/user-stories/mockups/S7-planner-parameters.png`,
  `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`.
- **Publication:** Local branch
  `matteomarzella-feat/MAR-6-strategy-results-mockups`, not pushed.
