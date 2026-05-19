    # Implementation Plan: Sales CRM Web Application

## Overview

Incremental build of a frontend-only Sales CRM SPA using React 18, TypeScript, Vite, Zustand, React Router v6, Tailwind CSS v3, and @dnd-kit. Each task leaves the application in a runnable state. Property-based tests (fast-check) are required sub-tasks and must be implemented alongside the code they validate.

---

## Tasks

- [x] 1. Scaffold project and install all dependencies
  - Run `npm create vite@latest sales-crm -- --template react-ts` and install all required packages: `zustand`, `react-router-dom`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-hook-form`, `date-fns`, `nanoid`, `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `fast-check`
  - Initialize Tailwind CSS (`npx tailwindcss init -p`), configure `tailwind.config.js` content paths, and add Tailwind directives to `src/index.css`
  - Configure `vitest.config.ts` with `environment: 'jsdom'`, `globals: true`, and `setupFiles: ['./src/test/setup.ts']`
  - Create `src/test/setup.ts` importing `@testing-library/jest-dom`
  - Verify `npm run dev` starts and `npm test -- --run` exits cleanly with no test failures
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Define TypeScript types and constants
  - [x] 2.1 Create `src/types/index.ts` with all shared types
    - Define `LeadStatus` union type (7 values), `LeadSource` union type (7 values), `ActivityType` union type (5 values)
    - Define `Lead` interface with all 11 fields as specified in the data model
    - Define `Activity` interface with all 5 fields
    - Define `CRMStore` interface with state fields and all action signatures
    - Define `LeadFormData`, `LeadFilters`, and `SortConfig` helper types for form and filter logic
    - Export `LEAD_STATUSES`, `LEAD_SOURCES`, `ACTIVITY_TYPES` as `readonly` arrays for iteration
    - Export `STATUS_COLORS` map (`Record<LeadStatus, { bg: string; text: string }>`) with the 7 Tailwind class pairs from the design
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 11.1_

- [x] 3. Implement Zustand store with localStorage persistence
  - [x] 3.1 Create `src/store/useCRMStore.ts`
    - Implement `addLead` — generates `id` via `nanoid()`, sets `created_at` to `new Date().toISOString()`, defaults `status` to `'New Lead'` when omitted
    - Implement `updateLead` — auto-records `'Status Update'` activity when `status` changes; auto-records `'Follow-up Update'` activity when `followup_date` changes
    - Implement `deleteLead` — removes the lead, cascades deletion to all activities with matching `lead_id`, clears `openDrawerLeadId` if it matches
    - Implement `addActivity` — generates `id` via `nanoid()`, sets `created_at` to `new Date().toISOString()`
    - Implement `openDrawer` and `closeDrawer` actions
    - Wrap the store with `persist` middleware using key `'sales-crm-store'`
    - _Requirements: 2.1, 2.2, 2.5, 4.7, 5.3, 5.4, 5.5_

  - [x] 3.2 Write property test: Lead creation produces a complete, well-shaped record
    - **Property 1: Lead creation produces a complete, well-shaped record**
    - Use `fc.record` to generate valid lead input data with arbitrary non-empty `full_name`, `phone`, `email`, `company`, `lead_source`, `assigned_to`, `status`, `followup_date`, and `notes`
    - Assert all 11 required fields are present on the created lead, `created_at` is a valid ISO timestamp, and `status` defaults to `'New Lead'` when not provided
    - **Validates: Requirements 2.1, 2.5**

  - [x] 3.3 Write property test: Activity creation produces a complete, well-shaped record
    - **Property 2: Activity creation produces a complete, well-shaped record**
    - Use `fc.record` to generate valid activity input data
    - Assert all 5 required fields are present on the created activity and `created_at` is a valid ISO timestamp
    - **Validates: Requirements 2.2**

  - [x] 3.4 Write property test: Status and activity_type only accept valid enum values
    - **Property 3: Status and activity_type fields only accept valid enum values**
    - Generate arbitrary leads and activities via store actions using only valid enum values
    - Assert every lead's `status` is in `LEAD_STATUSES` and every activity's `activity_type` is in `ACTIVITY_TYPES`
    - **Validates: Requirements 2.3, 2.4**

  - [x] 3.5 Write property test: Adding a valid lead always produces a matching record in the store
    - **Property 5: Adding a valid lead always produces a matching record in the store**
    - For any valid lead form data, assert the store's `leads` array contains exactly one new lead whose fields match the submitted values after `addLead`
    - **Validates: Requirements 3.3**

  - [x] 3.6 Write property test: Deleting a lead removes all associated activities
    - **Property 9: Deleting a lead removes all associated activities**
    - Seed the store with a lead and arbitrary activities for that lead, call `deleteLead`, assert zero activities remain with that `lead_id`
    - **Validates: Requirements 4.7**

  - [x] 3.7 Write property test: Status change always auto-records a Status Update activity
    - **Property 11: Status change always auto-records a Status Update activity**
    - For any lead and any new status differing from the current one, call `updateLead` and assert a new `'Status Update'` activity exists with the correct `lead_id` and a description containing both the old and new status strings
    - **Validates: Requirements 5.4, 7.4**

  - [x] 3.8 Write property test: Follow-up date change always auto-records a Follow-up Update activity
    - **Property 12: Follow-up date change always auto-records a Follow-up Update activity**
    - For any lead and any new `followup_date` differing from the current one, call `updateLead` and assert a new `'Follow-up Update'` activity exists with the correct `lead_id`
    - **Validates: Requirements 5.5, 8.7**

  - [x] 3.9 Write property test: Updating a lead reflects the new values in the store
    - **Property 14: Updating a lead reflects the new values in the store**
    - For any lead and any valid partial update, assert all updated fields match the new values and all non-updated fields remain unchanged after `updateLead`
    - **Validates: Requirements 6.3**

- [x] 4. Implement selector functions
  - [x] 4.1 Create `src/store/selectors.ts` with all pure selector functions
    - Implement `getLeadsByStatus(leads, status)` — filters leads by status
    - Implement `getActivitiesForLead(activities, leadId)` — filters and sorts descending by `created_at`
    - Implement `categorizeFollowups(leads, today)` — returns `{ today, upcoming, overdue }` buckets
    - Implement `computeMetrics(leads, activities, today)` — returns the 6 dashboard metric values
    - Implement `searchLeads(leads, term)` — returns empty array for `term.length < 2`; case-insensitive substring match on `full_name`, `phone`, `company`
    - Implement `applyFiltersAndSort(leads, filters, sort)` — applies all 5 filter criteria and stable sort with secondary `created_at` descending tiebreak
    - Implement `getRecentActivities(activities, limit)` — returns the most recent `limit` activities sorted descending by `created_at`
    - _Requirements: 4.3, 4.4, 4.5, 8.2, 8.3, 8.4, 9.2, 9.3, 9.4, 10.1_

  - [x] 4.2 Write property test: Empty or whitespace-only full_name is always rejected
    - **Property 4: Empty or whitespace-only full_name is always rejected**
    - Use `fc.stringMatching(/^\s*$/)` to generate whitespace-only strings; assert `addLead` with such a `full_name` does not add a record to the store
    - Note: implement the whitespace guard in `addLead` in `useCRMStore.ts` as part of this task
    - **Validates: Requirements 3.2, 6.2**

  - [x] 4.3 Write property test: Search filter returns only leads that match the search term
    - **Property 6: Search filter returns only leads that match the search term**
    - For any search term of length ≥ 2 and any list of leads, assert every result from `searchLeads` contains the term (case-insensitive) in `full_name`, `phone`, or `company`, and no non-matching lead appears
    - **Validates: Requirements 4.3, 10.1**

  - [x] 4.4 Write property test: Multi-filter conjunction — all active filters are satisfied simultaneously
    - **Property 7: Multi-filter conjunction — all active filters are satisfied simultaneously**
    - For any combination of active filter criteria and any list of leads, assert every lead returned by `applyFiltersAndSort` satisfies every active filter
    - **Validates: Requirements 4.4**

  - [x] 4.5 Write property test: Column sort produces correctly ordered results
    - **Property 8: Column sort produces correctly ordered results**
    - For any list of leads and any sortable column, assert `applyFiltersAndSort` with `direction: 'asc'` produces a non-decreasing sequence and `direction: 'desc'` produces a non-increasing sequence
    - **Validates: Requirements 4.5**

  - [x] 4.6 Write property test: Activity timeline is always ordered newest-first
    - **Property 10: Activity timeline is always ordered newest-first**
    - For any lead with any set of activities, assert `getActivitiesForLead` returns activities in descending `created_at` order
    - **Validates: Requirements 5.2**

  - [x] 4.7 Write property test: Follow-up categorization is correct for all date relationships
    - **Property 17: Follow-up categorization is correct for all date relationships**
    - For any list of leads with `followup_date` values and any reference date, assert each lead appears in exactly one bucket and no lead with a `followup_date` is omitted
    - **Validates: Requirements 8.2, 8.3, 8.4**

  - [x] 4.8 Write property test: Dashboard metric computation is accurate
    - **Property 20: Dashboard metric computation is accurate**
    - For any list of leads, assert `computeMetrics` returns counts that exactly match manual counts of each status and today's follow-ups
    - **Validates: Requirements 9.2**

  - [x] 4.9 Write property test: Recent activity list contains at most 10 entries, all from the most recent
    - **Property 21: Recent activity list contains at most 10 entries, all from the most recent**
    - For any list of activities, assert `getRecentActivities(activities, 10)` returns ≤ 10 entries and every included entry has `created_at` ≥ every excluded entry's `created_at`
    - **Validates: Requirements 9.3**

  - [x] 4.10 Write property test: Dashboard follow-up section contains all and only today + overdue leads, ordered by date
    - **Property 22: Dashboard follow-up section contains all and only today + overdue leads, ordered by date**
    - For any list of leads and any reference date, assert the combined today + overdue set contains exactly the leads with `followup_date ≤ today` (non-null), ordered ascending by `followup_date`
    - **Validates: Requirements 9.4**

  - [x] 4.11 Write property test: Rescheduling a follow-up updates the lead's followup_date
    - **Property 19: Rescheduling a follow-up updates the lead's followup_date**
    - For any lead and any valid new date string, assert `updateLead` with the new `followup_date` results in the lead having `followup_date` equal to the new date
    - **Validates: Requirements 8.8**

- [x] 5. Checkpoint — Ensure all store and selector tests pass
  - Run `npm test -- --run` and confirm all property-based and unit tests pass before proceeding to UI work. Ask the user if any questions arise.

- [x] 6. Implement AppLayout shell (Sidebar + Topbar + routing)
  - [x] 6.1 Create `src/components/layout/Sidebar.tsx`
    - Render nav links for Dashboard (`/dashboard`), Leads (`/leads`), Pipeline (`/pipeline`), Follow-ups (`/followups`) using React Router `<NavLink>`
    - Apply `w-56 fixed h-full` layout; highlight active route with accent color
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 6.2 Create `src/components/layout/Topbar.tsx`
    - Render a fixed top bar (`h-14 fixed top-0 left-0 right-0 z-30`) with a placeholder for GlobalSearch, an "Add Lead" button, and a profile avatar placeholder
    - Accept `onAddLeadClick` prop; wire the button to it
    - _Requirements: 1.2, 1.4_

  - [x] 6.3 Create `src/components/layout/AppLayout.tsx`
    - Compose `<Sidebar>`, `<Topbar>`, `<Outlet>`, and a `<LeadDrawer>` stub (renders `null` for now)
    - Apply `ml-56 pt-14` to the main content area
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.4 Configure routing in `src/main.tsx`
    - Wrap the app in `<BrowserRouter>` with the route tree from the design: `/` redirects to `/dashboard`; nested routes for `dashboard`, `leads`, `pipeline`, `followups` all under `AppLayout`
    - Create stub page components (`DashboardPage`, `LeadsPage`, `PipelinePage`, `FollowupsPage`) that render a heading so routing is verifiable
    - _Requirements: 1.3_

- [x] 7. Implement StatusBadge component
  - [x] 7.1 Create `src/components/ui/StatusBadge.tsx`
    - Accept `status: LeadStatus` and optional `size?: 'sm' | 'md'` props
    - Look up `bg` and `text` classes from `STATUS_COLORS`; render a `<span>` with `rounded-full px-2 py-0.5 text-xs font-medium`
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 7.2 Write property test: StatusBadge renders the correct color for every valid status
    - **Property 23: StatusBadge renders the correct color for every valid status**
    - For any valid `LeadStatus` value, render `<StatusBadge status={status} />` and assert the rendered element contains the `bg` and `text` classes from `STATUS_COLORS[status]`
    - Assert the same status always produces the same classes regardless of render context
    - **Validates: Requirements 11.1, 11.2**

- [x] 8. Implement Add Lead form and modal
  - [x] 8.1 Create `src/components/leads/LeadForm.tsx`
    - Use React Hook Form; render fields for Full Name (required), Phone, Email, Company, Lead Source (select), Assigned To, Status (select, defaults to `'New Lead'`), Follow-up Date (date input), Notes (textarea)
    - Show inline validation error under Full Name when empty; block submission
    - Accept `initialValues?: Partial<Lead>`, `onSubmit`, and `onCancel` props
    - _Requirements: 3.1, 3.2, 3.4, 6.1, 6.2_

  - [x] 8.2 Create `src/components/leads/AddLeadModal.tsx`
    - Render `LeadForm` inside a modal overlay; on submit call `useCRMStore.addLead` and close the modal
    - Wire the modal open/close to the `onAddLeadClick` callback in `Topbar` via state in `AppLayout`
    - _Requirements: 3.1, 3.3_

- [x] 9. Implement Leads page
  - [x] 9.1 Create `src/components/leads/LeadFilters.tsx`
    - Render a search input (debounced 300ms) and dropdowns for Status, Lead Source, Assigned To, and Follow-up Date filters
    - Emit filter state changes via callback props
    - _Requirements: 4.3, 4.4_

  - [x] 9.2 Create `src/components/leads/LeadTable.tsx` and `LeadRow.tsx`
    - Render a `<table>` with columns: Lead Name, Phone, Email, Company, Lead Source, Status, Assigned To, Follow-up Date, Created Date, Actions
    - Each row renders a `<StatusBadge>` for the status column
    - Clicking a row calls `onRowClick(lead.id)`; clicking the delete icon calls `onDeleteLead(lead.id)` after a `window.confirm` prompt
    - Clicking a column header toggles sort asc/desc; show a sort indicator arrow
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7_

  - [x] 9.3 Create `src/pages/LeadsPage.tsx`
    - Read `leads` from the store; apply `applyFiltersAndSort` with local filter/sort state
    - Compose `<LeadFilters>` and `<LeadTable>`; on row click call `openDrawer(leadId)`
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 10. Implement Lead Drawer
  - [x] 10.1 Create `src/components/leads/LeadDrawer.tsx`
    - Render as a fixed right panel (`w-[480px] fixed right-0 top-0 h-full z-40`) with a semi-transparent backdrop
    - Read the lead from the store using `openDrawerLeadId`; render `null` when `openDrawerLeadId` is null
    - Display sections: Lead Information (all fields), Status select (calls `updateLead` on change), Follow-up Date picker (calls `updateLead` on change), Notes field (inline save), and `<ActivityTimeline>`
    - Animate open/close with a CSS slide-in transition (150–300ms)
    - On close, call `closeDrawer()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 10.2 Create `src/components/leads/ActivityTimeline.tsx` and `ActivityItem.tsx`
    - Accept `activities: Activity[]` (already sorted newest-first by selector)
    - Render each activity with its type icon/label, description, and formatted `created_at` timestamp using `date-fns/format`
    - _Requirements: 5.1, 5.2_

  - [x] 10.3 Wire `LeadDrawer` into `AppLayout`
    - Replace the stub in `AppLayout` with the real `<LeadDrawer>` component
    - _Requirements: 5.1, 5.6_

  - [x] 10.4 Write property test: Edit form pre-populates all fields with current lead values
    - **Property 13: Edit form pre-populates all fields with current lead values**
    - For any lead in the store, render `<LeadForm initialValues={lead} ...>` and assert each form field's initial value matches the corresponding lead field
    - **Validates: Requirements 6.1**

- [x] 11. Implement Edit Lead flow
  - [x] 11.1 Add an Edit button to `LeadDrawer` that opens `LeadForm` in edit mode
    - Pre-populate `LeadForm` with the current lead's values via `initialValues`
    - On submit call `useCRMStore.updateLead(lead.id, data)` and return to the detail view
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 12. Checkpoint — Ensure all tests pass and the app is fully navigable
  - Verify routing, the Add Lead flow, the Leads page (search, filter, sort), the Lead Drawer (status/follow-up updates, activity timeline), and the Edit Lead flow all work end-to-end. Run `npm test -- --run`. Ask the user if any questions arise.

- [x] 13. Implement Pipeline (Kanban) page
  - [x] 13.1 Create `src/components/pipeline/KanbanColumn.tsx`
    - Accept `status: LeadStatus`, `leads: Lead[]`, and `onCardClick` props
    - Use `useDroppable({ id: status })` from `@dnd-kit/core`
    - Render a column header with the status label and a lead-count badge
    - Render a `<LeadCard>` for each lead
    - Apply `min-w-[240px]` so columns scroll horizontally on narrow viewports
    - _Requirements: 7.1, 7.2_

  - [x] 13.2 Create `src/components/pipeline/LeadCard.tsx`
    - Accept `lead: Lead`, `onClick`, and optional `isDragging` props
    - Use `useDraggable({ id: lead.id })` from `@dnd-kit/core`
    - Display: `full_name`, `company`, `followup_date` (or placeholder), `assigned_to`, and `<StatusBadge>`
    - Apply `transition: transform 200ms ease` for smooth reflow; apply `will-change: transform` only when dragging
    - _Requirements: 7.3, 7.6_

  - [x] 13.3 Create `src/pages/PipelinePage.tsx` with `KanbanBoard`
    - Wrap all columns in `<DndContext>` with `PointerSensor`, `KeyboardSensor`, and `closestCenter` collision detection
    - Implement `handleDragEnd`: extract `leadId` from `active.id` and `newStatus` from `over.id`; call `updateLead(leadId, { status: newStatus })` only when status differs
    - Render `<DragOverlay>` with a floating `<LeadCard isDragging>` clone during drag
    - On card click call `openDrawer(leadId)`
    - Apply `overflow-x-auto` to the board container
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 13.4 Write property test: Kanban column count badges match actual lead counts
    - **Property 15: Kanban column count badges match actual lead counts**
    - For any list of leads distributed across statuses, render `<KanbanColumn>` for each status and assert the badge text equals the count of leads with that status
    - **Validates: Requirements 7.2**

  - [x] 13.5 Write property test: Lead cards display all required fields
    - **Property 16: Lead cards display all required fields**
    - For any lead, render `<LeadCard lead={lead} onClick={() => {}} />` and assert the rendered output contains `full_name`, `company`, `assigned_to`, and `status`; assert a follow-up date or placeholder is shown
    - **Validates: Requirements 7.3**

- [x] 14. Implement Follow-ups page
  - [x] 14.1 Create `src/components/followups/FollowupEntry.tsx`
    - Accept `lead: Lead`, `onMarkComplete`, `onReschedule`, and `onLeadClick` props
    - Display: `full_name`, `followup_date`, `notes`, `assigned_to`, `<StatusBadge>`
    - Render "Mark Complete" and "Reschedule" action buttons
    - "Mark Complete" calls `onMarkComplete(lead.id)` which calls `updateLead(id, { followup_date: null })` and records a `'Follow-up Update'` activity
    - "Reschedule" shows an inline date picker; on confirm calls `onReschedule(lead.id, newDate)`
    - Clicking the lead name calls `onLeadClick(lead.id)`
    - _Requirements: 8.6, 8.7, 8.8, 8.9_

  - [x] 14.2 Create `src/components/followups/FollowupSection.tsx`
    - Accept `title: string`, `leads: Lead[]`, and action callbacks
    - Render the section heading and a list of `<FollowupEntry>` components
    - Apply a distinct color/border treatment for the "Overdue" section
    - _Requirements: 8.1, 8.5_

  - [x] 14.3 Create `src/pages/FollowupsPage.tsx`
    - Read `leads` from the store; compute today's date string with `date-fns/format`
    - Apply `categorizeFollowups` to get `today`, `upcoming`, `overdue` buckets
    - Render three `<FollowupSection>` components; on lead click call `openDrawer(leadId)`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.9_

  - [x] 14.4 Write property test: Follow-up entries display all required fields
    - **Property 18: Follow-up entries display all required fields**
    - For any lead with a `followup_date`, render `<FollowupEntry lead={lead} ...>` and assert the rendered output contains `full_name`, `followup_date`, `notes`, `assigned_to`, and `status`
    - **Validates: Requirements 8.6**

- [x] 15. Implement Dashboard page
  - [x] 15.1 Create `src/components/dashboard/MetricCard.tsx`
    - Accept `label: string`, `value: number`, and optional `accent?: boolean` props
    - Render a card with the label and value; apply accent styling when `accent` is true
    - _Requirements: 9.1_

  - [x] 15.2 Create `src/components/dashboard/RecentActivityList.tsx`
    - Accept `activities: Activity[]` and `leads: Lead[]`
    - Render the most recent 10 activities (use `getRecentActivities`); each entry shows activity type, lead name (looked up by `lead_id`), description, and formatted timestamp
    - _Requirements: 9.3_

  - [x] 15.3 Create `src/pages/DashboardPage.tsx`
    - Read `leads` and `activities` from the store
    - Compute metrics with `computeMetrics`; render 6 `<MetricCard>` components
    - Render `<RecentActivityList>`
    - Render a follow-up section using `categorizeFollowups` showing today + overdue leads ordered by `followup_date` ascending; on lead click call `openDrawer(leadId)`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 16. Implement Global Search
  - [x] 16.1 Create `src/components/layout/GlobalSearch.tsx`
    - Implement a `useDebounce` hook (300ms) for the search term
    - Trigger `searchLeads` only when term length ≥ 2
    - Render results in a floating dropdown (`position: absolute z-50`) showing `full_name`, `company`, and `<StatusBadge>`
    - On result click call `openDrawer(leadId)` and clear the search field
    - Dismiss on `Escape` key, outside click (`useOnClickOutside` hook), or field blur
    - Show "No results found" when the term is ≥ 2 chars but no leads match
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 16.2 Wire `GlobalSearch` into `Topbar`
    - Replace the placeholder in `Topbar` with the real `<GlobalSearch>` component
    - _Requirements: 1.2, 10.1_

- [x] 17. Integration tests
  - [x] 17.1 Write integration test: Full add-lead flow
    - Render the full app; click "Add Lead" in the Topbar; fill in the form with valid data; submit; assert the new lead appears in the Leads table
    - _Requirements: 3.1, 3.3_

  - [x] 17.2 Write integration test: Drag-and-drop status update
    - Render `<PipelinePage>`; simulate a drag of a lead card from one column to another; assert the lead's status is updated in the store and a `'Status Update'` activity is recorded
    - _Requirements: 7.4_

  - [x] 17.3 Write integration test: Follow-up mark complete
    - Render `<FollowupsPage>` with a lead that has a `followup_date` of today; click "Mark Complete"; assert `followup_date` is cleared, the entry is removed from the page, and a `'Follow-up Update'` activity is recorded
    - _Requirements: 8.7_

  - [x] 17.4 Write integration test: Global search opens Lead Drawer
    - Render the full app; type 2+ characters in the global search field; assert the dropdown appears; click a result; assert the Lead Drawer opens for the correct lead
    - _Requirements: 10.1, 10.2_

- [x] 18. Final checkpoint — Ensure all tests pass and the full app is functional
  - Run `npm test -- --run` and confirm all unit, property-based, and integration tests pass. Verify the app renders correctly at 1280px viewport width with no horizontal scrollbars. Ask the user if any questions arise.

---

## Notes

- Property-based tests (tasks marked with a **Property N** annotation) are required and must be implemented alongside the code they validate. They are not optional.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 5, 12, 18) ensure incremental validation at key milestones.
- The `persist` middleware handles localStorage serialization; components must never write to `localStorage` directly.
- All mutations to lead/activity data must go through store actions — no direct state manipulation in components.
- The `LeadDrawer` is rendered at the `AppLayout` level so it can be opened from any page without unmounting.
