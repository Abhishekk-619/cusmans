# BeyondSure Sales CRM

A modern, role-based Sales CRM built for **BeyondSure** & **Insurance4Life** to manage leads, follow-ups, pipeline tracking, team management, and activity logging — all with real-time data powered by Firebase.

---

## 🛠️ Tech Stack

| Layer              | Technology                                   |
|--------------------|----------------------------------------------|
| Frontend Framework | React 18 + TypeScript 5                      |
| Build Tool         | Vite 5                                       |
| Styling            | Tailwind CSS 3                               |
| State Management   | Zustand 4 (local store) + React Context (Firebase sync) |
| Forms              | React Hook Form 7                            |
| Routing            | React Router DOM 6                           |
| Authentication     | Firebase Auth (Email/Password + Email Verification) |
| Database           | Cloud Firestore (NoSQL, real-time)            |
| Drag & Drop        | @dnd-kit/core + @dnd-kit/sortable            |
| Date Utilities     | date-fns 3                                   |
| Excel I/O          | SheetJS (xlsx) 0.18                          |
| ID Generation      | nanoid 5                                     |
| Testing            | Vitest + React Testing Library + fast-check   |
| Hosting            | Vercel                                       |

---

## 📁 Project Structure

```
SALES CRM/
├── public/                        # Static assets
├── src/
│   ├── main.tsx                   # App entry — BrowserRouter + AuthProvider + CRMProvider
│   ├── App.tsx                    # Root component
│   ├── index.css                  # Global styles
│   │
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces, union types, constants
│   │
│   ├── firebase/
│   │   ├── config.ts              # Firebase app initialization (primary + secondary auth instances)
│   │   ├── AuthContext.tsx         # Auth state, login/logout, email verification gate
│   │   ├── CRMContext.tsx          # CRM data context — leads, activities, drawer state
│   │   ├── useLeads.ts            # Firestore hooks — CRUD for leads & activities (real-time listeners)
│   │   ├── useUsers.ts            # Firestore hook for users collection
│   │   └── useRole.ts             # Current user role helper
│   │
│   ├── store/
│   │   ├── useCRMStore.ts         # Zustand store (local-first CRM state, persisted to localStorage)
│   │   └── selectors.ts           # Derived data selectors (filters, sorting, follow-up logic)
│   │
│   ├── utils/
│   │   ├── formatDateTime.ts      # Date/time formatting helpers (AM/PM, follow-up parsing)
│   │   ├── emailValidation.ts     # Domain whitelist: @beyondsure.* and @insurance4life.*
│   │   └── authErrors.ts          # Firebase error code → human-readable message mapping
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      # Main layout shell (sidebar + topbar + outlet)
│   │   │   ├── Sidebar.tsx        # Navigation sidebar with role-based menu items
│   │   │   ├── Topbar.tsx         # Top navigation bar
│   │   │   └── GlobalSearch.tsx   # Global lead search across all pages
│   │   │
│   │   ├── leads/
│   │   │   ├── LeadForm.tsx       # Add/Edit lead form (react-hook-form powered)
│   │   │   ├── LeadTable.tsx      # Sortable leads table with column headers
│   │   │   ├── LeadRow.tsx        # Individual lead row in the table
│   │   │   ├── LeadDrawer.tsx     # Slide-out panel for lead details/editing
│   │   │   ├── LeadFilters.tsx    # Filter bar (status, source, assigned to, date)
│   │   │   ├── AddLeadModal.tsx   # Modal wrapper for adding a new lead
│   │   │   ├── EditLeadModal.tsx  # Modal wrapper for editing an existing lead
│   │   │   ├── ActivityItem.tsx   # Single activity entry in the timeline
│   │   │   └── ActivityTimeline.tsx # Activity timeline within lead drawer
│   │   │
│   │   ├── pipeline/
│   │   │   ├── KanbanColumn.tsx   # Draggable Kanban column (one per lead status)
│   │   │   └── LeadCard.tsx       # Draggable lead card within the Kanban board
│   │   │
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx     # KPI metric display card
│   │   │   └── RecentActivityList.tsx # Recent activity feed on the dashboard
│   │   │
│   │   ├── followups/
│   │   │   ├── FollowupEntry.tsx  # Single follow-up card (reschedule, mark complete)
│   │   │   └── FollowupSection.tsx # Section container for Today/Overdue/Upcoming
│   │   │
│   │   └── ui/
│   │       └── StatusBadge.tsx    # Color-coded lead status pill/badge
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx          # Login form with email verification handling
│   │   ├── DashboardPage.tsx      # KPIs, charts, recent activities, upcoming follow-ups
│   │   ├── LeadsPage.tsx          # Full leads table with filters, search, export to Excel
│   │   ├── PipelinePage.tsx       # Kanban board — drag leads across status columns
│   │   ├── FollowupsPage.tsx      # Follow-up management (today, overdue, upcoming)
│   │   ├── UsersPage.tsx          # Admin — manage all users (create, update role, delete)
│   │   ├── MyTeamPage.tsx         # Team Lead — manage team employees
│   │   ├── ActivitiesPage.tsx     # Immutable activity log with role-based filtering
│   │   └── ImportLeadsPage.tsx    # Bulk import leads from Excel/CSV files
│   │
│   └── __tests__/                 # Integration tests
│
├── firestore.rules                # Firestore security rules (RBAC)
├── vercel.json                    # Vercel deployment config (SPA rewrites)
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
└── package.json                   # Dependencies and scripts
```

---

## 🗄️ Database Structure (Cloud Firestore)

### Collections

#### `users`
Stores all CRM user accounts. Each document ID is the Firebase Auth UID.

| Field          | Type     | Description                                       |
|----------------|----------|---------------------------------------------------|
| `name`         | string   | Full name of the user                              |
| `email`        | string   | Email address (must be `@beyondsure.*` or `@insurance4life.*`) |
| `role`         | string   | One of: `admin`, `team_lead`, `employee`           |
| `team_lead_id` | string?  | UID of the team lead this employee belongs to (employees only) |

#### `leads`
Stores all sales leads managed in the CRM.

| Field              | Type     | Description                                    |
|--------------------|----------|------------------------------------------------|
| `id`               | string   | Unique identifier (nanoid)                     |
| `full_name`        | string   | Lead's full name (required)                    |
| `phone`            | string   | 10-digit phone number                          |
| `email`            | string   | Lead's email address                           |
| `company`          | string   | Company name                                   |
| `business_type`    | string   | Type of business                               |
| `lead_source`      | string   | One of: `Agent`, `Broker`, `IMF`, `Advisor`, `MF Distributor`, `CA`, `NBFC`, `Other` |
| `assigned_to`      | string   | Name of the assigned user                      |
| `assigned_to_uid`  | string   | UID of the assigned user (for reliable filtering) |
| `created_by_uid`   | string   | UID of the user who created this lead          |
| `status`           | string   | One of: `New Lead`, `Contacted`, `Interested`, `Follow-up`, `Negotiation`, `Post Demo Follow-Up`, `Post Commercial Follow-Up`, `Won`, `Lost` |
| `followup_date`    | string?  | ISO date or datetime string                    |
| `followup_time`    | string?  | Stored separately for flexible scheduling (HH:MM) |
| `followup_status`  | string?  | `Ongoing` or `Completed`                       |
| `lost_reason`      | string?  | `Not Eligible` or `Budget Constraint` (when status = Lost) |
| `website_link`     | string?  | Company website URL                            |
| `notes`            | string   | Free-text notes about the lead                 |
| `created_at`       | string   | ISO timestamp of creation                      |

#### `activities`
Immutable audit log of all actions on leads. **Cannot be updated or deleted.**

| Field               | Type     | Description                              |
|---------------------|----------|------------------------------------------|
| `id`                | string   | Unique identifier (nanoid)               |
| `lead_id`           | string   | Foreign key → Lead ID                    |
| `activity_type`     | string   | One of: `Call`, `Meeting`, `Note`, `Status Update`, `Follow-up Update` |
| `description`       | string   | Human-readable description of what happened |
| `performed_by_uid`  | string?  | UID of the user who performed the action |
| `performed_by_name` | string?  | Name of the user who performed the action |
| `performed_by_role` | string?  | Role of the user (`admin`, `team_lead`, `employee`) |
| `created_at`        | string   | ISO timestamp                            |

#### `settings`
Application-level settings (e.g., import permissions).

| Field  | Type | Description             |
|--------|------|-------------------------|
| *Varies* | any | Admin-configured settings |

---

## 🔐 Security & Access Control

### Firestore Security Rules (RBAC)

| Collection   | Read               | Create              | Update         | Delete              |
|-------------|-------------------|---------------------|----------------|---------------------|
| `users`     | Any authenticated  | Admin, Team Lead    | Admin only     | Admin, Team Lead    |
| `leads`     | Any authenticated  | Any authenticated   | Any authenticated | Admin, Team Lead |
| `activities`| Any authenticated  | Any authenticated   | ❌ **Never**    | ❌ **Never**         |
| `settings`  | Any authenticated  | Admin only          | Admin only     | Admin only          |

> **Activities are immutable** — once logged, they can never be edited or deleted by anyone. This ensures a tamper-proof audit trail.

### Role-Based Page Access

| Page          | Admin | Team Lead | Employee |
|---------------|-------|-----------|----------|
| Dashboard     | ✅    | ✅         | ✅        |
| Leads         | ✅ All leads | ✅ Team's leads | ✅ Own leads |
| Pipeline      | ✅    | ✅         | ✅        |
| Follow-ups    | ✅    | ✅         | ✅        |
| Users         | ✅    | ❌         | ❌        |
| My Team       | ❌    | ✅         | ❌        |
| Activities    | ✅ All | ✅ Team's | ❌        |
| Import Leads  | ✅    | ✅         | ✅        |

### Email Domain Restriction

Only emails matching the following domains can be registered:

- `@beyondsure.*` (any TLD: `.com`, `.in`, etc.)
- `@insurance4life.*` (any TLD)

### Email Verification

- All non-admin users must verify their email before accessing the CRM
- On first login, a verification email is sent automatically
- Admins are exempt from email verification

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- A **Firebase project** with:
  - Authentication (Email/Password) enabled
  - Cloud Firestore database created
  - Your web app registered

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SALES\ CRM

# Install dependencies
npm install

# Start development server
npm run dev
```

### Firebase Configuration

Update the Firebase config in `src/firebase/config.ts` with your project credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

### Deploy Firestore Rules

Copy the contents of `firestore.rules` to your Firebase Console → Firestore → Rules tab, or deploy via CLI:

```bash
firebase deploy --only firestore:rules
```

### Create the First Admin

1. Manually create a user in **Firebase Console → Authentication → Add user**
2. Create a matching document in **Firestore → users collection** with the same UID:
   ```json
   {
     "name": "Admin Name",
     "email": "admin@beyondsure.com",
     "role": "admin"
   }
   ```

---

## 📦 Available Scripts

| Command         | Description                              |
|-----------------|------------------------------------------|
| `npm run dev`   | Start the Vite development server        |
| `npm run build` | Build for production                     |
| `npm run preview` | Preview the production build locally   |
| `npm run lint`  | Run ESLint                               |
| `npm test`      | Run tests with Vitest                    |

---

## 🌐 Deployment (Vercel)

1. Push the repository to GitHub/GitLab
2. Import the project in [Vercel](https://vercel.com)
3. Vercel auto-detects Vite and builds with `npm run build`
4. Add your Vercel domain to **Firebase Console → Authentication → Authorized domains**
5. The `vercel.json` handles SPA routing:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
   ```

### Environment Variables

No `.env` file is required — Firebase config is embedded in `config.ts`. For production, consider moving credentials to Vercel environment variables.

---

## ✨ Key Features

- **Lead Management** — Full CRUD with validation, duplicate phone detection
- **Kanban Pipeline** — Drag-and-drop leads across status columns
- **Follow-up Scheduling** — Date + time picker with AM/PM format, reschedule & mark complete
- **Activity Logging** — Immutable audit trail auto-logged on status/follow-up changes
- **Excel Import/Export** — Bulk import leads from Excel/CSV with smart column matching, export with date stamps
- **Team Management** — Admins manage all users; Team Leads manage their employees
- **Role-Based Visibility** — Leads, activities, and pages filtered by role
- **Global Search** — Search leads across all pages by name, phone, email, or company
- **Email Verification** — Enforced for non-admin users before CRM access
- **Real-time Sync** — Firestore `onSnapshot` listeners keep data live across sessions

---

## 📄 License

This project is proprietary software built for **BeyondSure Insurance**. All rights reserved.
