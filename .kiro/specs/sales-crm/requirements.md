# Requirements Document

## Introduction

A modern, minimalistic Sales CRM web application focused exclusively on sales management and lead tracking. The system helps sales teams manage leads, track follow-ups, monitor the sales pipeline, maintain lead activity history, and close deals efficiently. The product is intentionally scoped to sales operations only — it is not project management, marketing automation, ERP, HR, or customer support software.

The core problems it solves: missed follow-ups, unorganized lead tracking, scattered customer data, and lack of visibility into sales progress.

## Glossary

- **CRM**: The Sales CRM web application described in this document.
- **Lead**: A prospective customer being tracked through the sales process.
- **Lead_Source**: The channel through which a lead was acquired (e.g., referral, website, cold call).
- **Status**: The current stage of a lead in the sales process. Valid values: New Lead, Contacted, Interested, Follow-up, Negotiation, Won, Lost.
- **Activity**: A recorded event associated with a lead, such as a call, meeting, note, status update, or follow-up update.
- **Follow-up**: A scheduled action to contact or revisit a lead on a specific date.
- **Pipeline**: The visual representation of all leads organized by their current Status.
- **Salesperson**: A user of the CRM who is assigned to and responsible for one or more leads.
- **Dashboard**: The home screen of the CRM displaying summary metrics, recent activity, and today's follow-ups.
- **Sidebar**: The persistent left-side navigation panel containing links to Dashboard, Leads, Pipeline, and Follow-ups.
- **Topbar**: The persistent top navigation bar containing the global search field, the Add Lead button, and a profile avatar placeholder.
- **Lead_Drawer**: A side panel that opens when a lead is selected, displaying full lead details without navigating away from the current page.
- **Activity_Timeline**: A chronological log of all activities recorded against a lead.

---

## Requirements

### Requirement 1: Application Layout

**User Story:** As a salesperson, I want a consistent, uncluttered application layout, so that I can navigate quickly between sections without losing context.

#### Acceptance Criteria

1. THE CRM SHALL render a persistent Sidebar on the left containing navigation links for Dashboard, Leads, Pipeline, and Follow-ups.
2. THE CRM SHALL render a persistent Topbar containing a global search field, an Add Lead button, and a profile avatar placeholder.
3. THE CRM SHALL render a main content area that updates dynamically based on the active navigation item without full page reloads.
4. THE CRM SHALL apply a minimalistic SaaS-style design using a white or light neutral background, a single primary accent color, rounded corners, soft shadows, and generous whitespace.
5. THE CRM SHALL NOT render nested navigation menus, multi-level dropdowns, or secondary sidebars.

---

### Requirement 2: Lead Data Model

**User Story:** As a salesperson, I want each lead to carry a consistent set of fields, so that all relevant contact and sales information is stored in one place.

#### Acceptance Criteria

1. THE CRM SHALL represent each Lead with the following fields: `id`, `full_name`, `phone`, `email`, `company`, `lead_source`, `assigned_to`, `status`, `followup_date`, `notes`, `created_at`.
2. THE CRM SHALL represent each Activity with the following fields: `id`, `lead_id`, `activity_type`, `description`, `created_at`.
3. THE CRM SHALL enforce that `status` is one of: New Lead, Contacted, Interested, Follow-up, Negotiation, Won, Lost.
4. THE CRM SHALL enforce that `activity_type` is one of: Call, Meeting, Note, Status Update, Follow-up Update.
5. WHEN a Lead is created, THE CRM SHALL automatically populate `created_at` with the current timestamp and set `status` to "New Lead" if no status is provided.

---

### Requirement 3: Add Lead

**User Story:** As a salesperson, I want to add a new lead from anywhere in the application, so that I can capture lead information immediately without navigating away.

#### Acceptance Criteria

1. WHEN the Add Lead button in the Topbar is clicked, THE CRM SHALL display an Add Lead form containing fields for: Full Name, Phone Number, Email Address, Company Name, Lead Source, Assigned Salesperson, Status, Follow-up Date, and Notes.
2. WHEN the Add Lead form is submitted with a missing Full Name, THE CRM SHALL display an inline validation error on the Full Name field and prevent submission.
3. WHEN the Add Lead form is submitted with all required fields valid, THE CRM SHALL create the Lead, close the form, and display the new lead in the Leads list without a full page reload.
4. THE CRM SHALL keep the Add Lead form short and free of fields unrelated to the Lead data model.

---

### Requirement 4: Leads Page

**User Story:** As a salesperson, I want to view, search, filter, and manage all leads in a single list view, so that I can quickly find and act on any lead.

#### Acceptance Criteria

1. THE CRM SHALL display all leads in a tabular or list layout with the following columns: Lead Name, Phone Number, Email, Company, Lead Source, Status, Assigned To, Follow-up Date, Created Date.
2. THE CRM SHALL display a colored Status badge on each row reflecting the lead's current Status value.
3. WHEN a search term is entered in the Leads page search field, THE CRM SHALL filter the displayed leads to those whose Full Name, Phone Number, or Company contains the search term, within 300ms of the last keystroke.
4. WHEN a filter is applied for Status, Lead Source, Assigned Person, or Follow-up Date, THE CRM SHALL display only leads matching all active filter criteria simultaneously.
5. WHEN a column header is clicked, THE CRM SHALL sort the lead list by that column in ascending order; clicking the same header again SHALL sort in descending order.
6. WHEN a lead row is clicked, THE CRM SHALL open the Lead_Drawer for that lead without navigating away from the Leads page.
7. WHEN the Delete action is triggered for a lead, THE CRM SHALL display a confirmation prompt before permanently removing the lead and all associated Activities.

---

### Requirement 5: Lead Detail View (Lead Drawer)

**User Story:** As a salesperson, I want to view and edit all details of a lead in a side panel, so that I can review history and take action without losing my place in the list.

#### Acceptance Criteria

1. THE Lead_Drawer SHALL display the following sections: Lead Information, Current Status, Follow-up Information, Notes, and Activity Timeline.
2. THE Lead_Drawer SHALL display the Activity_Timeline as a chronological list of all Activities associated with the lead, ordered from most recent to oldest.
3. WHEN a salesperson submits a new note or activity from within the Lead_Drawer, THE CRM SHALL append the new Activity to the Activity_Timeline and update `created_at` to the current timestamp.
4. WHEN the Status field is updated within the Lead_Drawer, THE CRM SHALL record a "Status Update" Activity in the Activity_Timeline with the previous and new status values in the description.
5. WHEN the Follow-up Date is updated within the Lead_Drawer, THE CRM SHALL record a "Follow-up Update" Activity in the Activity_Timeline.
6. WHEN the Lead_Drawer is closed, THE CRM SHALL return focus to the Leads list without losing the current scroll position or active filters.

---

### Requirement 6: Edit Lead

**User Story:** As a salesperson, I want to edit an existing lead's information, so that I can keep lead data accurate as the sales process progresses.

#### Acceptance Criteria

1. WHEN the Edit action is triggered for a lead, THE CRM SHALL display the lead's current field values pre-populated in an editable form.
2. WHEN the edit form is submitted with a missing Full Name, THE CRM SHALL display an inline validation error and prevent saving.
3. WHEN the edit form is submitted with valid data, THE CRM SHALL update the Lead record and reflect the changes immediately in the Leads list and Lead_Drawer without a full page reload.

---

### Requirement 7: Pipeline Page

**User Story:** As a salesperson, I want to see all leads organized in a Kanban-style pipeline, so that I can understand the distribution of leads across stages at a glance and move leads between stages by dragging.

#### Acceptance Criteria

1. THE CRM SHALL display the Pipeline page as a Kanban board with one column for each Status value: New Lead, Contacted, Interested, Follow-up, Negotiation, Won, Lost.
2. THE CRM SHALL display the count of leads in each column as a badge on the column header.
3. THE CRM SHALL display each lead as a card showing: Lead Name, Company, Follow-up Date, Assigned Person, and Current Status.
4. WHEN a lead card is dragged from one column and dropped into another column, THE CRM SHALL update the lead's Status to match the destination column and record a "Status Update" Activity in the Activity_Timeline.
5. WHEN a lead card is clicked, THE CRM SHALL open the Lead_Drawer for that lead.
6. THE CRM SHALL animate drag-and-drop interactions smoothly without layout jank or flicker.

---

### Requirement 8: Follow-ups Page

**User Story:** As a salesperson, I want a dedicated view of all follow-ups organized by urgency, so that I never miss a scheduled follow-up.

#### Acceptance Criteria

1. THE CRM SHALL display the Follow-ups page with three sections: Today, Upcoming, and Overdue.
2. THE CRM SHALL place a follow-up in the "Today" section when its `followup_date` matches the current calendar date.
3. THE CRM SHALL place a follow-up in the "Upcoming" section when its `followup_date` is after the current calendar date.
4. THE CRM SHALL place a follow-up in the "Overdue" section when its `followup_date` is before the current calendar date and the follow-up has not been marked complete.
5. THE CRM SHALL visually distinguish Overdue follow-ups from Today and Upcoming follow-ups using a subtle color or border treatment.
6. EACH follow-up entry SHALL display: Lead Name, Follow-up Date and Time, Notes, Assigned Person, and Current Status.
7. WHEN the "Mark Complete" action is triggered on a follow-up, THE CRM SHALL clear the `followup_date` on the Lead, record a "Follow-up Update" Activity, and remove the entry from the Follow-ups page.
8. WHEN the "Reschedule" action is triggered on a follow-up, THE CRM SHALL display a date picker and update the `followup_date` on the Lead upon confirmation.
9. WHEN the lead name on a follow-up entry is clicked, THE CRM SHALL open the Lead_Drawer for that lead.

---

### Requirement 9: Dashboard Page

**User Story:** As a salesperson, I want a summary dashboard showing key metrics and today's follow-ups, so that I can start my day with a clear picture of my sales activity.

#### Acceptance Criteria

1. THE Dashboard SHALL display the following metric cards: Total Leads, New Leads, Interested Leads, Won Deals, Lost Deals, Follow-ups Today.
2. WHEN the Dashboard is loaded, THE CRM SHALL compute each metric card value from the current state of all Lead records.
3. THE Dashboard SHALL display a Recent Activity section showing the most recent 10 Activities across all leads, each entry showing the activity type, lead name, description, and timestamp.
4. THE Dashboard SHALL display a Follow-up section listing all follow-ups due today and all overdue follow-ups, ordered by date ascending.
5. THE Dashboard SHALL NOT display complex financial charts, revenue forecasts, funnel analytics, or KPIs unrelated to lead counts and follow-up status.

---

### Requirement 10: Global Search

**User Story:** As a salesperson, I want to search for leads from anywhere in the application, so that I can find a specific lead instantly without navigating to the Leads page.

#### Acceptance Criteria

1. WHEN a search term of at least 2 characters is entered in the Topbar search field, THE CRM SHALL display a dropdown of matching leads filtered by Full Name, Phone Number, or Company within 300ms of the last keystroke.
2. WHEN a search result is selected from the dropdown, THE CRM SHALL open the Lead_Drawer for the selected lead.
3. WHEN the search field is cleared or loses focus, THE CRM SHALL dismiss the search results dropdown.
4. IF no leads match the search term, THE CRM SHALL display a "No results found" message in the dropdown.

---

### Requirement 11: Status Badges

**User Story:** As a salesperson, I want lead statuses to be visually distinct, so that I can identify a lead's stage at a glance without reading the text.

#### Acceptance Criteria

1. THE CRM SHALL render a distinct colored badge for each Status value: New Lead, Contacted, Interested, Follow-up, Negotiation, Won, Lost.
2. THE CRM SHALL apply the same badge color consistently for a given Status value across the Leads page, Pipeline page, Follow-ups page, and Lead_Drawer.
3. THE CRM SHALL use a minimal color palette for badges, avoiding more than 7 distinct badge colors.

---

### Requirement 12: Responsive and Performant UI

**User Story:** As a salesperson, I want the CRM to feel fast and work on different screen sizes, so that I can use it comfortably on a laptop or desktop throughout the workday.

#### Acceptance Criteria

1. THE CRM SHALL render correctly and remain fully usable on viewport widths from 1024px to 2560px.
2. WHEN navigating between pages, THE CRM SHALL complete the transition and render the new page content within 500ms under normal network conditions.
3. THE CRM SHALL apply smooth CSS transitions for interactive elements such as hover states, drawer open/close, and drag-and-drop, with transition durations between 150ms and 300ms.
4. THE CRM SHALL maintain a layout free of horizontal scrollbars on viewports of 1280px or wider.
