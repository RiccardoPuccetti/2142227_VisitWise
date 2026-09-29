# PUC-13 - Working days slider bound to the campaign time frame

- **Author:** Puccetti
- **Task / user stories:** PUC-13; US-19, US-20
- **What changed:** On the planner, "Working days available" was a free number input (1-260). It is now a slider:
  - it ends at the number of working days between the start date and the deadline, and the label shows "N of M";
  - it starts with the whole time frame and keeps a shorter choice;
  - it is clamped when the time frame shrinks, and a value at the end follows the time frame when it grows again;
  - without a deadline the horizon stays free up to 260;
  - a time frame with no working days disables the slider and blocks the plan with a message.

  The count comes from `working-calendar.ts`, which mirrors the engine's `WorkingCalendar` (Monday to Friday, Italian and Rome holidays, Easter Monday).
- **Why / decisions:** A campaign could be planned past its deadline by typing more days than its time frame holds, and the planner showed no warning. The slider makes the time frame the limit.

  The count is done in the browser, so no API change was needed. The price is that the holiday list lives in two places, which must be kept in step. The engine and the API still accept 1-260: the slider only limits what the page offers. The planner default changes from 20 days to the whole time frame (34 for Christmas 2026).
- **Verification:** Tests written first:
  - `working-calendar.spec.ts`: Christmas 2026 = 34, Easter Monday skipped, weekend and reversed dates = 0, invalid dates = null. It failed first because the module was missing.
  - `planner-page.spec.ts`:
    - the slider spans the campaign and starts full;
    - the keyboard moves it and the plan request uses the value;
    - a shorter deadline clamps it;
    - there is no limit without a deadline;
    - an empty time frame blocks the plan.

    These failed first with the number input still in place. The existing request test was updated from 20 to 34.

  Planner specs: 49 tests, 0 failures. `ng build` succeeds; the bundle and `app.css` warnings are the same as on `develop`. Checked in the browser on the synthetic import: the keyboard, the clamp to a shorter deadline and the return to the full window.
- **Slide note:** The planner offers exactly the working days of the chosen campaign: no more planning past the deadline by mistake.
- **Screenshot path:** Not added (`booklets/slides/assets/` does not exist in the repository yet).
- **Publication:** Branch `fix/PUC-13-working-days-slider`, pushed to origin; the branch stays open for more planner changes.
