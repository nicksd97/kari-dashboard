# Session Log

- 2026-04-08: Created CLAUDE.md (workflow rules), soul.md (project summary), and SESSION_LOG.md
- 2026-04-09: Reviewed full codebase, updated soul.md current state (clean tree, company ID, recent commits), confirmed CLAUDE.md and SESSION_LOG.md are in place
- 2026-04-09: Dashboard data check — queried Supabase directly (anon key). 1/3 checked in today (Andrii). Project 767 ends today, 732 overdue. Updated employee list in soul.md (5 total now incl. Nick + Roger)
- 2026-04-09: Fixed project data in Supabase — reassigned 767 to Andrii (was Marci), set null end dates to today on 4 active projects. Set customer_name "Nora Samdal" on 767, deleted duplicate project 10023.
- 2026-04-10: Added Avvik (deviations) section to dashboard front page below ProjectsList. New DeviationsList component with open/resolved groups, severity badges, deadline countdown, expandable rows. New fetchLiveDeviations() in lib/data.ts and Deviation type in lib/types.ts.
- 2026-04-13: Fixed checkin status bug in lib/data.ts (fetchLiveCheckins) by querying explicit columns and properly extracting project assignment numbers.
- 2026-04-13: Added "Meldinger" tab to Dashboard to show a live chat-style chronological feed of employee check-in messages. Added `MessageFeed` component and updated types/data fetching.
- 2026-04-13: Expanded "Meldinger" tab to show a unified feed of check-ins, deviations, and checklists with distinct icons, Norwegian labels, and combined Supabase queries.
- 2026-04-13: Updated "Meldinger" feed to include unanswered checkin requests from Kari in orange ("Venter på svar").
- 2026-04-13: Updated Timeline to warn when active workers miss a check-in. Added a ⚠️ warning icon next to the employee's name and extended missing check-in days on the timeline with a semi-transparent striped overlay. Made the ⚠️ warning icon clickable to simulate sending a reminder via a toast notification.
