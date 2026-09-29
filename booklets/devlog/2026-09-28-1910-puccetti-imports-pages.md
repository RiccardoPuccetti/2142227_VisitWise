# PUC-6 - Imports list and import detail pages

- **Author:** Puccetti
- **Task / user stories:** PUC-6; US-07, US-08, US-09, US-10, US-11, US-12
- **What changed:** Replaced the two placeholders. The imports list
  (`/imports`) shows the tenant's imports as cards or as a table with name,
  creation date, file, points, status and enterprises, links to the detail and
  the map, and deletes an import after a confirmation dialog. The import detail
  (`/imports/:importId`) shows the import report (rows in the file, imported,
  skipped), the enterprises, the column mapping, the geocoding progress, the
  delivery points in a table and a form to set the coordinates of a point by
  hand; it also deletes the import. `ImportsService` gained the list, detail,
  delete, points, geocoding progress, retry and location calls. Updated
  `Student_doc.md` (pages table), the story statuses and the task status log.
- **Why / decisions:** The card/table choice is kept in `localStorage` (per
  browser, as US-10 asks); a blocked storage only loses the choice. The
  geocoding progress is polled every 3 s only while the import is `GEOCODING`:
  an import can be `READY` with points left `PENDING` (geocoder unavailable, or
  imported before the background job existed), and treating that as running
  would poll without end and hide the retry. After a retry the page keeps
  polling until the job starts, and reloads the detail and the points when a
  run it followed ends. The points table shows 50 points per page so a
  20,000-row import stays usable, with a filter on the points not located. The
  location form accepts a decimal comma (Italian keyboards) and checks the same
  ranges as the backend. The delete confirmation uses the spartan alert dialog
  (focus starts on Cancel); it brings `@angular/cdk` into the startup bundle
  (554.11 kB against the 500 kB budget, 504.39 kB before).
- **Verification:** Tests written first; 58 new tests. Step 1: the service,
  view preference and list page specs did not compile before the code existed;
  after, 48 tests of the imports folder passed. Step 2: the model, form and page
  specs did not compile before `import-detail.model`, `PointLocationForm`,
  `GEOCODING_POLL_MS` and the new service methods existed; the stopped-geocoding
  and focus tests failed before their fixes; the test of a retry that ends
  before the first poll was written after the code. Final run of the imports
  folder: 89 tests, 0 failures; `ng build` succeeds with the budget warning.
  In the browser (containers rebuilt, demo tenant, synthetic sample import):
  cards and table, delete dialog cancelled, report, mapping, one progress
  request on a stopped import, paging, location form errors and cancel; no
  horizontal page scroll at 1024 and 375 px. No location was saved and no retry
  was sent from the browser.
- **Slide note:** Every import of the federation is one click away: the detail
  tells how many rows were imported, follows the geocoding live and lets the
  analyst place by hand the customers the geocoder could not find.
- **Screenshot path:** Not added (`booklets/slides/assets/` does not exist in
  the repository yet).
- **Publication:** Branch `feat/PUC-6-imports-pages`, pushed and merged into
  `develop`.
