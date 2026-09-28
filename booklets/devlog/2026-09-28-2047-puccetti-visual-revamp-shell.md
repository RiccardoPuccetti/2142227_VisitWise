# PUC-13 - Visual revamp: theme, inset shell and import detail layout

- **Author:** Puccetti
- **Task / user stories:** PUC-13; US-38 (with US-11 for the import detail)
- **What changed:** New color tokens for the light and dark themes: an app
  frame (`--shell`) around the page panel, raised surfaces inside it and a
  brand orange for the logo, progress and keyboard focus. The app shell became a
  sidebar from 1024 px, collapsible to an icon rail (the choice is kept in the
  browser), with the name of the open import above its sections and the account
  initials at the bottom; below 1024 px and on the login pages it is a top bar
  with pill groups. A shared `PageHeader` (breadcrumb, title, description,
  actions) opens every revamped page. The import detail now has the report
  figures in one strip, the delivery points as the main content and a
  supporting pane with a territory map of the located points, the geocoding
  status, the enterprises and the columns of the file. The imports list uses
  the page header and fills the width with cards. US-38 and PUC-13 were added
  to the stories and the tasks.
- **Why / decisions:** The reference was a dark investment dashboard with one
  orange accent (chosen by the team). Feedback on a first pass ("too empty and
  detached", "use the horizontal space") led to two known layouts: the inset
  shell of Linear and Vercel, where each page is one panel set into the app
  frame, and the supporting-pane canonical layout of Material Design 3 for the
  import pages. The supporting pane is a column on the right only from 1536 px:
  at 1440 px with the sidebar open the points table lost its last column, so
  below 1536 px the pane sits between the figures and the table. The system
  font is kept (no new dependency); labels are in sentence case and details are
  written as sentences instead of dot-separated fragments. The orange is never
  used for data: the enterprise colors stay the only data colors.
- **Verification:** Tests written first: `tenantInitials` and the account badge,
  the remembered sidebar state (`SidebarPreference`), the collapse button and
  the import name in the sidebar, `PageHeader`, `territoryMarkers`, and the new
  figures strip and territory caption of the import detail. Each failed first
  because the code did not exist. The Log out tests now find the button by name
  (it is no longer the first button of the header). App shell, imports, shared
  and core specs: 169 tests, 0 failures; `ng build` succeeds with the initial
  bundle warning (570.78 kB) and a component style warning (`app.css`
  5.50 kB). Checked in the browser on a synthetic sample import in both themes
  at 1026, 1440, 768 and 375 px: no horizontal page scroll.
- **Slide note:** The whole app now reads as one surface: navigation on the
  frame, each page a single panel that opens with where you are, and the
  territory of an import visible next to its customers.
- **Screenshot path:** Not added (`booklets/slides/assets/` does not exist in
  the repository yet).
- **Publication:** Branch `feat/PUC-13-visual-revamp`, pushed and merged into
  `develop`.
