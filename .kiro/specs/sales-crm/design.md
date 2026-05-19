# Design Document: Sales CRM Web Application

## Overview

The Sales CRM is a frontend-only, single-page web application for sales teams to manage leads, track follow-ups, monitor the pipeline, and review activity history. There is no backend — all data is persisted in `localStorage` and managed in-memory during a session.

The application is scoped strictly to sales operations: lead management, pipeline visualization, follow-up tracking, and a summary dashboard. It is intentionally minimal — no financial charts, no marketing automation, no project management features.

### Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| UI Framework | **React 18** (with Vite) | Component model maps cleanly to the drawer/page/card hierarchy; large ecosystem; fast HMR with Vite |
| Language | **TypeScript** | Type safety for the Lead/Activity data models; catches shape mismatches at compile time |
| State Management | **Zustand** | Lightweight, no boilerplate, works well with localStorage persistence via `zustand/middleware`; avoids Redux overhead for a frontend-only app |
| Routing | **React Router v6** | Declarative nested routes; `<Outlet>` pattern keeps Sidebar/Topbar persistent across page changes |
| Drag and Drop | **@dnd-kit/core + @dnd-kit/sortable** | Accessible, pointer/touch-friendly, no jQuery dependency; fine-grained control over drag overlays and animations |
| Styling | **Tailwind CSS v3** | Utility-first; enforces consistent spacing/color tokens; no CSS-in-JS runtime cost |
| Date Handling | **date-fns** | Lightweight, tree-shakeable; covers date comparison, formatting, and relative time needed for follow-up sections |
| Unique IDs | **nanoid** | Tiny, URL-safe ID generation for Lead and Activity records |
| Form Handling | **React Hook Form** | Minimal re-renders, built-in validation, easy field pre-population for edit flows |

### Key Design Decisions

- **No backend, no auth**: The app is a pure frontend prototype. `localStorage` is the persistence layer. All data is scoped to the browser.
- **Drawer over navigation**: Lead details open in a `LeadDrawer` side panel rather than a separate route, preserving list scroll position and active filters.
- **Centralized store**: A single Zustand store holds all leads and activities. Pages and components read from and write to this store — no prop drilling.
- **Auto-activity recording**: Status changes and follow-up date changes automatically append Activity records. This logic lives in store action functions, not in UI components.

---

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  React App (SPA)                                         │ │
│  │  ┌──────────┐  ┌──────────────────────────────────────┐ │ │
│  │  │ Sidebar  │  │  Main Content Area (React Router)    │ │ │
│  │  │          │  │  ┌──────────────────────────────────┐│ │ │
│  │  │ - Dash   │  │  │  Topbar (global search, Add Lead)││ │ │
│  │  │ - Leads  │  │  ├──────────────────────────────────┤│ │ │
│  │  │ - Pipe   │  │  │  <Outlet>                        ││ │ │
│  │  │ - Followup│ │  │  DashboardPage | LeadsPage |     ││ │ │
│  │  └──────────┘  │  │  PipelinePage  | FollowupsPage   ││ │ │
│  │                │  └──────────────────────────────────┘│ │ │
│  │                └──────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────────┐ │
│  │  │  LeadDrawer (portal, overlays current page)          │ │
│  │  └──────────────────────────────────────────────────────┘ │
│  │                                                           │ │
│  │  Zustand Store ←→ localStorage (persist middleware)      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Routing Structure

```
/                     → redirect to /dashboard
/dashboard            → DashboardPage
/leads                → LeadsPage
/pipeline             → PipelinePage
/followups            → FollowupsPage
```

All routes share a single `AppLayout` component that renders the Sidebar and Topbar. The `<Outlet>` renders the active page. The `LeadDrawer` is rendered at the `AppLayout` level (not inside any route) so it can be opened from any page.

### Data Flow

```
User Action (click, drag, form submit)
        │
        ▼
  React Component
        │  calls store action
        ▼
  Zustand Store Action
        │  mutates state + auto-records Activity if needed
        ▼
  Zustand State Update
        │  triggers localStorage persist middleware
        ▼
  localStorage (serialized JSON)
        │
        ▼
  React re-renders subscribed components
```

Components never write to `localStorage` directly. All mutations go through store actions.

---

## Components and Interfaces

### Component Hierarchy

```
App
└── AppLayout
    ├── Sidebar
    ├── Topbar
    │   ├── GlobalSearch
    │   └── AddLeadButton → opens AddLeadForm (modal)
    ├── <Outlet>
    │   ├── DashboardPage
    │   │   ├── MetricCard (×6)
    │   │   ├── RecentActivityList
    │   │   └── FollowupList (today + overdue)
    │   ├── LeadsPage
    │   │   ├── LeadFilters
    │   │   ├── LeadTable
    │   │   │   └── LeadRow
    │   │   │       └── StatusBadge
    │   │   └── (opens LeadDrawer on row click)
    │   ├── PipelinePage
    │   │   └── KanbanBoard
    │   │       └── KanbanColumn (×7)
    │   │           └── LeadCard
    │   │               └── StatusBadge
    │   └── FollowupsPage
    │       ├── FollowupSection ("Today")
    │       ├── FollowupSection ("Upcoming")
    │       └── FollowupSection ("Overdue")
    │           └── FollowupEntry
    └── LeadDrawer (portal, rendered at layout level)
        ├── LeadInfo
        ├── StatusSelect
        ├── FollowupDatePicker
        ├── NotesField
        └── ActivityTimeline
            └── ActivityItem
```

### Component Interfaces (TypeScript)

```typescript
// Sidebar
interface SidebarProps {
  activeRoute: string;
}

// Topbar
interface TopbarProps {
  onAddLeadClick: () => void;
}

// GlobalSearch
interface GlobalSearchProps {
  // reads leads from store internally
}

// AddLeadForm / EditLeadForm
interface LeadFormProps {
  initialValues?: Partial<Lead>;
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
}

// LeadTable
interface LeadTableProps {
  leads: Lead[];
  onRowClick: (leadId: string) => void;
  onDeleteLead: (leadId: string) => void;
}

// StatusBadge
interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

// KanbanBoard
interface KanbanBoardProps {
  // reads leads from store internally; no props needed
}

// KanbanColumn
interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (leadId: string) => void;
}

// LeadCard (Kanban)
interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

// LeadDrawer
interface LeadDrawerProps {
  leadId: string | null;
  onClose: () => void;
}

// ActivityTimeline
interface ActivityTimelineProps {
  activities: Activity[];
}

// FollowupEntry
interface FollowupEntryProps {
  lead: Lead;
  onMarkComplete: (leadId: string) => void;
  onReschedule: (leadId: string, newDate: string) => void;
  onLeadClick: (leadId: string) => void;
}

// MetricCard
interface MetricCardProps {
  label: string;
  value: number;
  accent?: boolean;
}
```

---

## Data Models

### Lead

```typescript
type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Negotiation'
  | 'Won'
  | 'Lost';

type LeadSource =
  | 'Referral'
  | 'Website'
  | 'Cold Call'
  | 'Social Media'
  | 'Email Campaign'
  | 'Event'
  | 'Other';

interface Lead {
  id: string;              // nanoid()
  full_name: string;       // required
  phone: string;
  email: string;
  company: string;
  lead_source: LeadSource;
  assigned_to: string;
  status: LeadStatus;
  followup_date: string | null;  // ISO date string "YYYY-MM-DD" or null
  notes: string;
  created_at: string;      // ISO timestamp, set on creation
}
```

### Activity

```typescript
type ActivityType =
  | 'Call'
  | 'Meeting'
  | 'Note'
  | 'Status Update'
  | 'Follow-up Update';

interface Activity {
  id: string;              // nanoid()
  lead_id: string;         // foreign key to Lead.id
  activity_type: ActivityType;
  description: string;
  created_at: string;      // ISO timestamp
}
```

### Store Shape

```typescript
interface CRMStore {
  // State
  leads: Lead[];
  activities: Activity[];
  openDrawerLeadId: string | null;

  // Lead actions
  addLead: (data: Omit<Lead, 'id' | 'created_at'>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;

  // Activity actions
  addActivity: (data: Omit<Activity, 'id' | 'created_at'>) => void;

  // Drawer control
  openDrawer: (leadId: string) => void;
  closeDrawer: () => void;
}
```

### Status Badge Color Map

```typescript
const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string }> = {
  'New Lead':    { bg: 'bg-slate-100',  text: 'text-slate-700'  },
  'Contacted':   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  'Interested':  { bg: 'bg-violet-100', text: 'text-violet-700' },
  'Follow-up':   { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  'Negotiation': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Won':         { bg: 'bg-green-100',  text: 'text-green-700'  },
  'Lost':        { bg: 'bg-red-100',    text: 'text-red-700'    },
};
```

---

## State Management

### Zustand Store with Persistence

The store uses `zustand/middleware`'s `persist` middleware to serialize state to `localStorage` under the key `sales-crm-store`.

```typescript
// store/useCRMStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

const useCRMStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      leads: [],
      activities: [],
      openDrawerLeadId: null,

      addLead: (data) => {
        const newLead: Lead = {
          ...data,
          id: nanoid(),
          status: data.status ?? 'New Lead',
          created_at: new Date().toISOString(),
        };
        set((s) => ({ leads: [...s.leads, newLead] }));
      },

      updateLead: (id, updates) => {
        const prev = get().leads.find((l) => l.id === id);
        if (!prev) return;

        // Auto-record Status Update activity
        if (updates.status && updates.status !== prev.status) {
          get().addActivity({
            lead_id: id,
            activity_type: 'Status Update',
            description: `Status changed from "${prev.status}" to "${updates.status}"`,
          });
        }

        // Auto-record Follow-up Update activity
        if ('followup_date' in updates && updates.followup_date !== prev.followup_date) {
          get().addActivity({
            lead_id: id,
            activity_type: 'Follow-up Update',
            description: updates.followup_date
              ? `Follow-up scheduled for ${updates.followup_date}`
              : 'Follow-up date cleared',
          });
        }

        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        }));
      },

      deleteLead: (id) => {
        set((s) => ({
          leads: s.leads.filter((l) => l.id !== id),
          activities: s.activities.filter((a) => a.lead_id !== id),
          openDrawerLeadId: s.openDrawerLeadId === id ? null : s.openDrawerLeadId,
        }));
      },

      addActivity: (data) => {
        const newActivity: Activity = {
          ...data,
          id: nanoid(),
          created_at: new Date().toISOString(),
        };
        set((s) => ({ activities: [...s.activities, newActivity] }));
      },

      openDrawer: (leadId) => set({ openDrawerLeadId: leadId }),
      closeDrawer: () => set({ openDrawerLeadId: null }),
    }),
    { name: 'sales-crm-store' }
  )
);
```

### Derived Data (Selectors)

Selectors are plain functions (not stored in Zustand) to avoid unnecessary re-renders:

```typescript
// Leads for a given status (Pipeline columns)
const getLeadsByStatus = (leads: Lead[], status: LeadStatus) =>
  leads.filter((l) => l.status === status);

// Activities for a given lead, newest first
const getActivitiesForLead = (activities: Activity[], leadId: string) =>
  activities
    .filter((a) => a.lead_id === leadId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

// Follow-up categorization
const categorizeFollowups = (leads: Lead[], today: string) => ({
  today:    leads.filter((l) => l.followup_date === today),
  upcoming: leads.filter((l) => l.followup_date != null && l.followup_date > today),
  overdue:  leads.filter((l) => l.followup_date != null && l.followup_date < today),
});

// Dashboard metrics
const computeMetrics = (leads: Lead[], activities: Activity[], today: string) => ({
  total:        leads.length,
  newLeads:     leads.filter((l) => l.status === 'New Lead').length,
  interested:   leads.filter((l) => l.status === 'Interested').length,
  won:          leads.filter((l) => l.status === 'Won').length,
  lost:         leads.filter((l) => l.status === 'Lost').length,
  followupsToday: leads.filter((l) => l.followup_date === today).length,
});
```

---

## Drag-and-Drop Implementation

### Library: @dnd-kit

`@dnd-kit/core` provides the `DndContext`, `DragOverlay`, sensors, and collision detection. `@dnd-kit/sortable` is used within columns if intra-column reordering is needed (optional enhancement).

### Architecture

```
<DndContext
  sensors={[PointerSensor, KeyboardSensor]}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  {STATUSES.map((status) => (
    <KanbanColumn key={status} status={status} leads={leadsByStatus[status]} />
  ))}
  <DragOverlay>
    {activeLeadId ? <LeadCard lead={activeLead} isDragging /> : null}
  </DragOverlay>
</DndContext>
```

### Drag Event Handling

```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;

  const leadId = active.id as string;
  const newStatus = over.id as LeadStatus; // column droppable IDs = status strings

  const lead = leads.find((l) => l.id === leadId);
  if (lead && lead.status !== newStatus) {
    updateLead(leadId, { status: newStatus });
    // updateLead auto-records the Status Update activity
  }
};
```

Each `KanbanColumn` is a `useDroppable` target with `id = status`. Each `LeadCard` is a `useDraggable` with `id = lead.id`.

### Smooth Animation

- `DragOverlay` renders a floating clone of the dragged card, preventing layout shift in the source column.
- CSS `transition: transform 200ms ease` on non-dragged cards for smooth reflow.
- `will-change: transform` applied only during active drag to avoid GPU layer promotion at rest.

---

## Search and Filter Logic

### Global Search (Topbar)

- Debounced 300ms using a `useDebounce` hook.
- Minimum 2 characters before triggering.
- Searches `full_name`, `phone`, `company` (case-insensitive substring match).
- Results rendered in a floating dropdown (`position: absolute`, `z-index: 50`).
- Dismissed on `Escape`, outside click (`useOnClickOutside` hook), or field blur.

```typescript
const searchLeads = (leads: Lead[], term: string): Lead[] => {
  if (term.length < 2) return [];
  const lower = term.toLowerCase();
  return leads.filter(
    (l) =>
      l.full_name.toLowerCase().includes(lower) ||
      l.phone.includes(lower) ||
      l.company.toLowerCase().includes(lower)
  );
};
```

### Leads Page Search and Filters

- Local component state holds: `searchTerm`, `statusFilter`, `sourceFilter`, `assignedFilter`, `followupDateFilter`, `sortColumn`, `sortDirection`.
- Filtering is a pure function applied to the store's `leads` array on each render — no derived state stored in Zustand.
- Sort is stable: secondary sort by `created_at` descending to break ties.

```typescript
const applyFiltersAndSort = (
  leads: Lead[],
  filters: LeadFilters,
  sort: SortConfig
): Lead[] => {
  let result = leads.filter((l) => {
    const term = filters.searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      l.full_name.toLowerCase().includes(term) ||
      l.phone.includes(term) ||
      l.company.toLowerCase().includes(term);

    const matchesStatus = !filters.status || l.status === filters.status;
    const matchesSource = !filters.source || l.lead_source === filters.source;
    const matchesAssigned = !filters.assignedTo || l.assigned_to === filters.assignedTo;
    const matchesFollowup = !filters.followupDate || l.followup_date === filters.followupDate;

    return matchesSearch && matchesStatus && matchesSource && matchesAssigned && matchesFollowup;
  });

  result = [...result].sort((a, b) => {
    const aVal = a[sort.column] ?? '';
    const bVal = b[sort.column] ?? '';
    const cmp = String(aVal).localeCompare(String(bVal));
    return sort.direction === 'asc' ? cmp : -cmp;
  });

  return result;
};
```

---

## Routing Structure

```typescript
// main.tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<AppLayout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="leads" element={<LeadsPage />} />
      <Route path="pipeline" element={<PipelinePage />} />
      <Route path="followups" element={<FollowupsPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

`AppLayout` renders `<Sidebar />`, `<Topbar />`, `<Outlet />`, and `<LeadDrawer />`. The drawer is controlled by `openDrawerLeadId` in the store — any page can open it by calling `openDrawer(leadId)`.

---

## Responsive Layout

The app targets 1024px–2560px. No mobile breakpoints are required.

### Layout Grid

```
┌──────────────────────────────────────────────────────────┐
│  Topbar (full width, h-14, sticky top-0)                 │
├──────────┬───────────────────────────────────────────────┤
│ Sidebar  │  Main Content                                 │
│ w-56     │  flex-1, overflow-y-auto                      │
│ fixed    │  p-6                                          │
│ h-full   │                                               │
└──────────┴───────────────────────────────────────────────┘
```

- Sidebar: `w-56` (224px), fixed, full height.
- Main content: `ml-56` to clear the sidebar, `pt-14` to clear the topbar.
- Topbar: `fixed top-0 left-0 right-0 h-14 z-30`.
- LeadDrawer: slides in from the right, `w-[480px]`, `fixed right-0 top-0 h-full z-40`, with a semi-transparent backdrop.
- Kanban board: `overflow-x-auto` on the board container; columns are `min-w-[240px]` so they scroll horizontally on narrower viewports without breaking the layout.
- No horizontal scrollbar on the main content area at 1280px+.

### Tailwind Breakpoints Used

| Breakpoint | Usage |
|---|---|
| `lg` (1024px) | Minimum supported width; layout is designed for this baseline |
| `xl` (1280px) | Wider table columns, more padding |
| `2xl` (1536px) | Max content width capped at `max-w-screen-2xl mx-auto` |

---

## Error Handling

### Form Validation

- React Hook Form handles field-level validation.
- `full_name` is required; submission is blocked and an inline error message is shown beneath the field.
- No server errors to handle (frontend-only).

### localStorage Failures

- `localStorage` writes are wrapped in try/catch inside the Zustand persist middleware.
- If `localStorage` is unavailable (private browsing quota exceeded), the app continues to function in-memory for the session; a non-blocking toast notification informs the user that data will not be saved.

### Missing Data Guards

- Components that receive a `leadId` from the store check for `null` before rendering (drawer closed state).
- Selectors return empty arrays rather than throwing when no data exists.
- Date comparisons use `date-fns/isValid` to guard against malformed `followup_date` strings.

### Drag-and-Drop Edge Cases

- Dropping a card onto its own column is a no-op (status unchanged, no activity recorded).
- Dropping outside any column cancels the drag without state mutation.

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

Focus on pure logic and component behavior with concrete examples:

- **Store actions**: `addLead`, `updateLead` (status change auto-activity), `deleteLead` (cascades to activities), `addActivity`.
- **Selectors**: `getLeadsByStatus`, `getActivitiesForLead`, `categorizeFollowups`, `computeMetrics`.
- **Filter/sort logic**: `applyFiltersAndSort` with specific filter combinations.
- **Search logic**: `searchLeads` with exact matches, partial matches, case variations, and the 2-character minimum.
- **StatusBadge**: renders correct color class for each status value.
- **LeadDrawer**: opens with correct lead data; close restores focus.
- **FollowupsPage**: correct categorization of today/upcoming/overdue entries.
- **AddLeadForm**: blocks submission on missing `full_name`; submits with valid data.

### Property-Based Tests (fast-check)

See Correctness Properties section below. Each property test runs a minimum of 100 iterations.

Tag format: `// Feature: sales-crm, Property N: <property text>`

### Integration Tests

- Full add-lead flow: open form → fill → submit → lead appears in table.
- Drag-and-drop: drag card to new column → status updated → activity recorded.
- Follow-up mark complete: clears `followup_date` → entry removed from Follow-ups page → activity recorded.
- Global search: type 2+ chars → dropdown appears → select result → drawer opens.

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

Property tests use `fast-check` with `{ numRuns: 100 }` as the minimum. Increase to 500 for CI runs.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Lead creation produces a complete, well-shaped record

*For any* valid lead input data, calling `addLead` should produce a Lead record that contains all required fields (`id`, `full_name`, `phone`, `email`, `company`, `lead_source`, `assigned_to`, `status`, `followup_date`, `notes`, `created_at`), with `created_at` set to a non-null ISO timestamp and `status` defaulting to `"New Lead"` when not explicitly provided.

**Validates: Requirements 2.1, 2.5**

---

### Property 2: Activity creation produces a complete, well-shaped record

*For any* valid activity input data, calling `addActivity` should produce an Activity record that contains all required fields (`id`, `lead_id`, `activity_type`, `description`, `created_at`), with `created_at` set to a non-null ISO timestamp.

**Validates: Requirements 2.2**

---

### Property 3: Status and activity_type fields only accept valid enum values

*For any* Lead record in the store, its `status` field must be one of the seven valid status values. *For any* Activity record in the store, its `activity_type` field must be one of the five valid activity type values. No record with an out-of-range value should ever appear in the store.

**Validates: Requirements 2.3, 2.4**

---

### Property 4: Empty or whitespace-only full_name is always rejected

*For any* string composed entirely of whitespace characters (including the empty string), attempting to create or update a lead with that string as `full_name` should be rejected — the lead should not be added to the store and the existing store state should remain unchanged.

**Validates: Requirements 3.2, 6.2**

---

### Property 5: Adding a valid lead always produces a matching record in the store

*For any* valid lead form data (non-empty `full_name`), after calling `addLead`, the store's `leads` array should contain exactly one new lead whose `full_name`, `company`, `phone`, `email`, `lead_source`, `assigned_to`, `status`, `followup_date`, and `notes` match the submitted values.

**Validates: Requirements 3.3**

---

### Property 6: Search filter returns only leads that match the search term

*For any* search term of length ≥ 2 and *for any* list of leads, every lead returned by `searchLeads` must contain the search term (case-insensitive) in at least one of `full_name`, `phone`, or `company`. No lead that does not match any of those three fields should appear in the results.

**Validates: Requirements 4.3, 10.1**

---

### Property 7: Multi-filter conjunction — all active filters are satisfied simultaneously

*For any* combination of active filter criteria (status, lead_source, assigned_to, followup_date) and *for any* list of leads, every lead returned by `applyFiltersAndSort` must satisfy every active filter criterion. No lead that fails any single active filter should appear in the results.

**Validates: Requirements 4.4**

---

### Property 8: Column sort produces correctly ordered results

*For any* list of leads and *for any* sortable column, applying `applyFiltersAndSort` with `direction: 'asc'` should produce a list where each element is ≤ the next element by that column's value. Applying it again with `direction: 'desc'` should produce the reverse ordering.

**Validates: Requirements 4.5**

---

### Property 9: Deleting a lead removes all associated activities

*For any* lead that has any number of associated activities, after calling `deleteLead`, the store's `activities` array should contain zero activities whose `lead_id` equals the deleted lead's `id`.

**Validates: Requirements 4.7**

---

### Property 10: Activity timeline is always ordered newest-first

*For any* lead with any set of associated activities, the list returned by `getActivitiesForLead` should be sorted in descending `created_at` order — each activity's timestamp should be ≥ the timestamp of the activity that follows it in the list.

**Validates: Requirements 5.2**

---

### Property 11: Status change always auto-records a Status Update activity

*For any* lead and *for any* new status value that differs from the lead's current status, calling `updateLead` with the new status should result in a new Activity record in the store with `activity_type: 'Status Update'`, `lead_id` matching the lead, and a `description` that contains both the previous status string and the new status string.

**Validates: Requirements 5.4, 7.4**

---

### Property 12: Follow-up date change always auto-records a Follow-up Update activity

*For any* lead and *for any* new `followup_date` value that differs from the lead's current `followup_date`, calling `updateLead` with the new date should result in a new Activity record in the store with `activity_type: 'Follow-up Update'` and `lead_id` matching the lead.

**Validates: Requirements 5.5, 8.7**

---

### Property 13: Edit form pre-populates all fields with current lead values

*For any* lead in the store, rendering the edit form for that lead should produce form fields whose initial values exactly match the lead's current `full_name`, `phone`, `email`, `company`, `lead_source`, `assigned_to`, `status`, `followup_date`, and `notes`.

**Validates: Requirements 6.1**

---

### Property 14: Updating a lead reflects the new values in the store

*For any* lead and *for any* valid partial update (non-empty `full_name` if included), after calling `updateLead`, the lead in the store should have all updated fields set to the new values while all non-updated fields remain unchanged.

**Validates: Requirements 6.3**

---

### Property 15: Kanban column count badges match actual lead counts

*For any* list of leads distributed across statuses, the count displayed on each Kanban column header badge should equal the number of leads in the store whose `status` matches that column's status value.

**Validates: Requirements 7.2**

---

### Property 16: Lead cards display all required fields

*For any* lead rendered as a `LeadCard` on the Kanban board, the rendered output should contain the lead's `full_name`, `company`, `followup_date` (or a placeholder if null), `assigned_to`, and `status`.

**Validates: Requirements 7.3**

---

### Property 17: Follow-up categorization is correct for all date relationships

*For any* list of leads with `followup_date` values and *for any* reference date representing "today", `categorizeFollowups` should place each lead in exactly one bucket: leads with `followup_date === today` in `today`, leads with `followup_date > today` in `upcoming`, and leads with `followup_date < today` in `overdue`. No lead should appear in more than one bucket, and no lead with a `followup_date` should be omitted.

**Validates: Requirements 8.2, 8.3, 8.4**

---

### Property 18: Follow-up entries display all required fields

*For any* lead with a `followup_date`, the rendered `FollowupEntry` should contain the lead's `full_name`, `followup_date`, `notes`, `assigned_to`, and `status`.

**Validates: Requirements 8.6**

---

### Property 19: Rescheduling a follow-up updates the lead's followup_date

*For any* lead and *for any* valid new date string, after calling `updateLead` with the new `followup_date`, the lead in the store should have `followup_date` equal to the new date.

**Validates: Requirements 8.8**

---

### Property 20: Dashboard metric computation is accurate

*For any* list of leads, `computeMetrics` should return counts where: `total` equals `leads.length`, `newLeads` equals the count of leads with `status === 'New Lead'`, `interested` equals the count with `status === 'Interested'`, `won` equals the count with `status === 'Won'`, `lost` equals the count with `status === 'Lost'`, and `followupsToday` equals the count with `followup_date === today`.

**Validates: Requirements 9.2**

---

### Property 21: Recent activity list contains at most 10 entries, all from the most recent

*For any* list of activities, the recent activity list shown on the Dashboard should contain at most 10 entries, and every entry in the list should have a `created_at` timestamp that is ≥ the `created_at` of any activity not included in the list.

**Validates: Requirements 9.3**

---

### Property 22: Dashboard follow-up section contains all and only today + overdue leads, ordered by date

*For any* list of leads and *for any* reference date representing "today", the Dashboard follow-up section should contain exactly the leads whose `followup_date` is ≤ today (and non-null), ordered by `followup_date` ascending. No lead with `followup_date > today` should appear, and no qualifying lead should be omitted.

**Validates: Requirements 9.4**

---

### Property 23: StatusBadge renders the correct color for every valid status

*For any* valid `LeadStatus` value, `StatusBadge` should render with the background and text color classes defined in `STATUS_COLORS` for that status. The same status value should always produce the same color classes regardless of where in the application the badge is rendered.

**Validates: Requirements 11.1, 11.2**

