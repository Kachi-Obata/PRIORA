# PRIORA — V1 Build Specification

> **Purpose of this document:** This is the complete, authoritative build spec for Priora v1. It is intended to be consumed by Claude Code (or any developer) to build the entire application from scratch without ambiguity. Every decision has been made. Every screen has been specified. Every edge case we identified has been addressed. Your job is to execute this spec faithfully, not to re-interpret or simplify it. If something seems redundant, it's intentional — we'd rather over-specify than leave room for guesswork.

---

## Table of Contents

1. [What Priora Is](#1-what-priora-is)
2. [What Priora Is NOT](#2-what-priora-is-not)
3. [Target Context](#3-target-context)
4. [Tech Stack](#4-tech-stack)
5. [Data Model](#5-data-model)
6. [Authentication & Onboarding](#6-authentication--onboarding)
7. [Roles & Permissions](#7-roles--permissions)
8. [Screen-by-Screen Specification](#8-screen-by-screen-specification)
9. [Task Feed Logic](#9-task-feed-logic)
10. [Attendance Logic](#10-attendance-logic)
11. [Notification System](#11-notification-system)
12. [Navigation Structure](#12-navigation-structure)
13. [Design Principles & UI Guidelines](#13-design-principles--ui-guidelines)
14. [Supabase Configuration](#14-supabase-configuration)
15. [Deployment](#15-deployment)
16. [What NOT to Build](#16-what-not-to-build)

---

## 1. What Priora Is

Priora is an **academic decision-support system** for university students. It answers three questions:

1. **What do I need to do?** — Shows upcoming academic tasks (assignments, tests, exams) sorted by urgency.
2. **What have I not done?** — Tracks what's overdue or incomplete.
3. **What happens if I don't act?** — Projects consequences, especially around attendance thresholds.

### The Core Insight

Students don't fail because they don't know what to do. They fail because:

- They forget
- They misjudge urgency
- They underestimate consequences
- They lack visibility into what's coming
- They delay decisions
- They overthink what to start with

Priora eliminates the thinking. A student opens the app, sees what matters most right now, sees why it matters, and acts. That's it.

### The Relationship to WhatsApp

Students currently get academic information (assignments, schedule changes, deadlines) through WhatsApp group chats, delivered by class reps. This information gets buried under hundreds of messages within hours. Priora is NOT replacing WhatsApp — WhatsApp is too ingrained and convenient to compete with. Instead, **Priora is where the important stuff from WhatsApp _lives_ so it doesn't get lost.** The announcements that matter persist here, become actionable, and stay visible.

---

## 2. What Priora Is NOT

Be very clear on these boundaries. Do not build features that drift into these categories:

- **Not a note-taking app** — no rich text editors, no document storage
- **Not a study platform** — no flashcards, no quizzes, no study timers
- **Not a generic to-do list** — no personal tasks, no lifestyle reminders, no "wake up at 5am"
- **Not an official school system** — no integration with school databases, no authoritative records
- **Not an attendance enforcement tool** — advisory only, never punitive
- **Not a timetable/schedule manager** — no class time tracking, no calendar view

---

## 3. Target Context

### Deployment Environment

- **School:** Babcock University, Nigeria
- **Department:** Computer Science
- **Level:** 200 Level (second year)
- **Groups:** A, B, C, D

### How Groups Work

200-level Computer Science students are divided into 4 groups (A through D). All groups take the same courses, but:

- They may have **different lecturers** for the same course
- They receive **different assignments and tasks**
- They may have **different numbers of class sessions** (cancellations, extras vary by group)
- Some courses are **shared across groups** (e.g., General Studies / GEDS courses), meaning a task for that course applies to all groups simultaneously

### Authority Structure

- **Course Rep** — one per group, manages that group's academic info
- **Assistant Course Rep** — one per group, same permissions as rep
- **Master Admin** — the product owner, has access to everything across all groups
- **Students** — consume information, declare their own attendance

### Scale

Approximately 100-200 students total across all four groups. This is a small-scale deployment. Do not over-engineer for thousands of users.

---

## 4. Tech Stack

These choices are locked. Do not substitute.

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Framework** | Next.js (App Router) | Full-stack React framework, pairs with Vercel |
| **Language** | TypeScript | Type safety, fewer runtime bugs |
| **Styling** | Tailwind CSS | Utility-first, fast iteration, responsive design |
| **Database** | PostgreSQL (via Supabase) | Relational data, free tier, real-time subscriptions |
| **Auth** | Supabase Auth | Email-based auth, free, zero custom backend |
| **ORM / DB Client** | Supabase JS Client | Direct from frontend and server components, no separate ORM needed |
| **Hosting** | Vercel | Free tier, zero-config Next.js deployment, edge functions |
| **App Type** | PWA (Progressive Web App) | Installable on home screen, push notifications, no app store needed |

### Why This Stack

- **Zero budget.** Every service used is on a free tier at this scale.
- **Minimal backend.** Supabase provides auth, database, real-time, and row-level security out of the box. There is no separate backend API to build or maintain.
- **PWA over native.** Push notifications (critical for the value prop) work via PWA. No $99 Apple developer fee, no app store review process, no separate codebase.
- **Next.js on Vercel.** Zero deployment configuration. Push to git, it deploys.

---

## 5. Data Model

Seven tables. This is the complete schema. Do not add tables unless explicitly instructed.

### 5.1 `profiles`

Extends Supabase's built-in `auth.users`. Created automatically on signup via a database trigger.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, references `auth.users(id)` | Same as Supabase auth user ID |
| `full_name` | TEXT | NOT NULL | Set during onboarding |
| `group` | TEXT | NOT NULL, CHECK IN ('A', 'B', 'C', 'D') | Set during onboarding, determines what content the user sees |
| `role` | TEXT | NOT NULL, DEFAULT 'student', CHECK IN ('student', 'rep', 'assistant_rep', 'master_admin') | Controls UI access. Rep and assistant_rep have identical permissions. |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Important behavioral notes:**
- `role` is set by the master admin. Students cannot self-promote. On signup, everyone is a `student` by default.
- `group` is set once during onboarding. There is no UI to change it afterward in v1 (can be changed directly in Supabase dashboard if needed).
- Rep and assistant_rep have **identical permissions**. They are separate roles only so the UI can display attribution correctly ("Group A Rep" vs "Group A Assistant Rep"). In all permission checks, treat them the same.

### 5.2 `courses`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `code` | TEXT | PK | e.g., "CSC 211", "GEDS 102". This IS the unique identifier — no separate numeric ID. |
| `name` | TEXT | NOT NULL | e.g., "Data Structures", "Nigerian Peoples and Culture" |
| `groups` | TEXT[] | NOT NULL | Array of group letters this course applies to. e.g., `{'A','B','C','D'}` for shared courses, `{'A'}` for group-specific. |

**Why `code` is the PK:** Course codes are already unique identifiers in the university system. Using them as the primary key makes queries more readable (`WHERE course_code = 'CSC 211'` instead of joining on a UUID) and eliminates a redundant field.

**Who populates this table:** The master admin, once, at the start of the semester. This is seed data. Courses don't change during a semester. Pre-populate via Supabase dashboard or a seed script — no UI needed for course creation in v1.

### 5.3 `course_group_settings`

Per-group configuration for each course, primarily for attendance projection math.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `course_code` | TEXT | PK (composite), FK → courses.code | |
| `group` | TEXT | PK (composite), CHECK IN ('A','B','C','D') | |
| `expected_sessions` | INTEGER | NULLABLE | Total expected class sessions for the semester. NULL means "not set yet." |

**Behavioral notes:**
- When `expected_sessions` is NULL, the attendance UI for that course shows current stats only (e.g., "attended 3 out of 3 sessions") but **does not show projections or "safe misses remaining."** No misleading math is ever displayed.
- When `expected_sessions` is set, projections activate: "You can miss X more classes," "If you miss the next class, your attendance drops to Y%."
- Admins set this early in the semester and can update it anytime (e.g., when classes get cancelled or added). It does not need to be exact — approximate is fine, and the system recalculates instantly on change.
- This table exists because different groups may have different session counts for the same course (different lecturers cancel/add classes independently).

### 5.4 `tasks`

The core content table. Every assignment, test, and exam lives here.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `course_code` | TEXT | NOT NULL, FK → courses.code | |
| `title` | TEXT | NOT NULL | This is the "What's due?" field — describes the actual work. e.g., "Chapter 3 exercises", "Midterm exam". NOT the course name. |
| `description` | TEXT | NULLABLE | Optional longer details. e.g., "Pages 45-60, submit handwritten." |
| `type` | TEXT | NOT NULL, CHECK IN ('assignment', 'test', 'exam') | Controls display badge and potential priority weighting |
| `due_date` | DATE | NOT NULL | The deadline |
| `weight` | REAL | NULLABLE | Percentage of total grade, if known. e.g., 15.0 means 15%. NULL means unknown — display nothing, don't assume. |
| `groups` | TEXT[] | NOT NULL | Which groups this task applies to. Mirrors the pattern from courses but exists here because an admin might post a task for only some groups of a shared course. |
| `created_by` | UUID | NOT NULL, FK → profiles.id | The admin who posted this |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Behavioral notes:**
- A student sees a task if their `group` is in the task's `groups` array. That's the only filter.
- `weight` is optional because students often don't know the grade weight. When NULL, the UI simply doesn't show a weight tag. It does NOT show "0%" or "unknown" — it shows nothing.
- `type` affects display (badge color/label) and could affect sort tiebreaking (exams > tests > assignments when deadlines are equal). See Task Feed Logic section.
- `title` placeholder text in the admin form should be: `"e.g. Chapter 3 exercises, midterm prep..."` — this prevents admins from confusing it with the course name.

### 5.5 `task_completions`

Tracks which students have marked which tasks as done. This is how the feed knows what to show and what to grey out.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PK (composite), FK → profiles.id | |
| `task_id` | UUID | PK (composite), FK → tasks.id | |
| `completed_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Behavioral notes:**
- Composite PK means a user can only complete a task once. No duplicates.
- Completing a task = inserting a row. Uncompleting = deleting the row. This is a simple toggle — no status field, no history.
- Completed tasks appear greyed out and struck through at the bottom of the task feed on the day they were completed, then disappear from the feed on subsequent days. They are NOT deleted from this table — they just stop being queried for the feed.

### 5.6 `attendance_sessions`

Each row represents one class meeting that happened (or is recorded as having happened) for a specific course and group.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `course_code` | TEXT | NOT NULL, FK → courses.code | |
| `group` | TEXT | NOT NULL, CHECK IN ('A','B','C','D') | |
| `date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | |
| `counts` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether this session counts toward official attendance. FALSE for extra/makeup sessions that don't count. |
| `created_by` | UUID | NOT NULL, FK → profiles.id | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Behavioral notes:**
- An admin logs a session when a class happens. This is the "class happened today" action.
- `counts = FALSE` handles edge cases where a class happened but shouldn't affect attendance math (e.g., an optional review session). Default is TRUE — most sessions count.
- The `date` defaults to today but can be set to a past date (admin forgot to log a session last week).
- The default assumption is that **every student attended every session unless they declare otherwise.** This is important: students declare *misses*, not *attendance*. If a session exists and a student has no declared miss for it, they attended.

### 5.7 `declared_misses`

Students self-report which sessions they missed.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PK (composite), FK → profiles.id | |
| `session_id` | UUID | PK (composite), FK → attendance_sessions.id | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Behavioral notes:**
- Composite PK prevents duplicate declarations.
- Declaring a miss = inserting a row. Undeclaring = deleting the row. Toggle behavior, same as task completions.
- Only sessions where `counts = TRUE` affect the attendance percentage calculation. Sessions where `counts = FALSE` can still have declared misses, but they don't change the math.

---

## 6. Authentication & Onboarding

### Auth Flow

Use Supabase Auth with **email + password** signup/login. Magic links are an alternative but email+password is simpler for this audience.

**Do NOT use Babcock email restriction in v1.** Keep it open — distribution will be controlled by only sharing the app link with the target class. Adding email domain restrictions adds friction for zero security benefit at this scale.

### Onboarding (First Login Only)

After a user creates an account and logs in for the first time, they see a single onboarding screen:

1. **Full name** — text input, required
2. **Group** — four large tappable buttons: A, B, C, D. Required.
3. **Submit** — saves to `profiles` table, redirects to Home

That's it. Two fields. No course selection (courses are auto-associated by group). No preferences. No avatars. No settings.

**How to detect first login:** Check if a `profiles` row exists for the authenticated user. If not → show onboarding. If yes → show Home.

### Database Trigger

Create a Supabase database function + trigger that fires on `auth.users` INSERT and creates a `profiles` row with just the `id` field populated and `role` defaulting to `student`. The onboarding screen then UPDATEs this row with `full_name` and `group`.

---

## 7. Roles & Permissions

### Role Definitions

| Role | Who | Permissions |
|------|-----|------------|
| `student` | Default for everyone | View tasks for their group. Mark tasks complete/incomplete. View attendance for their courses. Declare/undeclare misses. |
| `rep` | One per group, set by master_admin | Everything a student can do, PLUS: post tasks, log attendance sessions, edit expected_sessions for their group's courses. See admin screen. |
| `assistant_rep` | One per group, set by master_admin | **Identical to rep.** Same permissions, different label. |
| `master_admin` | The product owner (one person) | Everything all reps can do, across ALL groups. Can change user roles via Supabase dashboard (no UI for this in v1). |

**master_admin and group filtering:** Every admin form and listing filters by the logged-in user's `group` field — except for `master_admin`, which bypasses all group filtering entirely. Specifically, for `master_admin`:
- The Post Task course dropdown shows every course (not just courses matching their own group).
- The Post Task Groups multi-select shows every group in the selected course's `groups` array, all pre-checked, and any can be toggled on/off.
- The Log Session group selector shows all four groups A, B, C, D (not pre-selected to their own).
- The Activity Log shows actions across every group.

For `rep` and `assistant_rep`, group-based filtering is strict: they only see and act on their own group.

### Permission Implementation

Use Supabase Row Level Security (RLS) policies. Key rules:

**Tasks:**
- SELECT: user's `group` must be in the task's `groups` array
- INSERT: user's `role` must be `rep`, `assistant_rep`, or `master_admin`
- UPDATE/DELETE: same as INSERT, and only if `created_by` matches the user OR user is `master_admin`

**Attendance Sessions:**
- SELECT: user's `group` must match the session's `group`
- INSERT: user's `role` must be `rep`, `assistant_rep`, or `master_admin`

**Declared Misses:**
- SELECT: `user_id` matches authenticated user (students only see their own)
- INSERT/DELETE: `user_id` matches authenticated user (students manage their own declarations)

**Course Group Settings:**
- SELECT: user's `group` must match
- UPDATE: user's `role` must be `rep`, `assistant_rep`, or `master_admin`

**Attribution:** When displaying who posted a task or logged a session, show the role label and group, NOT the person's name. Example: "Posted by Group A Rep" or "Logged by Group B Assistant Rep." This is constructed from the `created_by` user's `role` and `group` fields.

---

## 8. Screen-by-Screen Specification

### 8.1 Home Screen

This is the most important screen. A student should be able to open the app, glance at this screen, and know where they stand without tapping anything else.

#### Top Bar
- Left: "Priora" brand text (simple, not a logo for v1)
- Right: Student's group badge — a small, rounded chip showing "Group A" (or B/C/D). No profile icon, no settings gear, no menu. There is nothing to configure in v1.

#### Attendance Alert Strip

Positioned directly below the top bar. **Only renders when there's something worth alerting about.** This is NOT an always-visible dashboard element.

**When to show:** For each of the student's courses where `expected_sessions` is set, check if current attendance percentage is:
- Within 5 percentage points of the threshold (75% by default) → **warning state**
- Below the threshold → **critical state**

**How it looks:** A compact horizontal strip. One line per at-risk course. Each line shows:
- Course code
- Current percentage
- Remaining safe misses (e.g., "2 misses left")

Warning state uses a warm/amber accent. Critical state uses a red accent. Keep it understated — this is a nudge, not an alarm.

**Tapping** a line navigates to that course's section on the Attendance screen.

**When nothing is at risk:** The strip does not render at all. No "You're all good!" message, no green checkmark, no empty state. Absence of the strip IS the good news. This reduces visual noise for the common case (everything is fine).

#### Task Feed

The main body of the Home screen. A vertical scrollable list of task cards.

**Grouping (visual bands, not separate sections):**

1. **Overdue** — tasks past `due_date` that the student has NOT marked complete. These appear at the top with a red-tinted background or left border. Header text: "Overdue"
2. **Due this week** — tasks due within the next 7 days (inclusive of today). Warm/amber accent. Header text: "Due this week"
3. **Due later** — everything else. Neutral styling. Header text: "Coming up"

Within each band, tasks are sorted by:
1. `due_date` ascending (soonest first)
2. If dates are equal, `type` priority: exam > test > assignment
3. If type is also equal, `weight` descending (higher weight = higher priority). NULL weight sorts last.

**Task Card Layout:**

```
┌──────────────────────────────────────────┐
│ ☐  CSC 211                               │
│    Chapter 3 exercises                    │
│    Assignment · Tomorrow · 15% of grade   │
└──────────────────────────────────────────┘
```

- **Left edge:** Checkbox. Tapping it instantly marks the task complete (inserts into `task_completions`). No confirmation dialog. The card visually transitions to the completed state (greyed out, text struck through) and animates down to the bottom of the feed.
- **Top line:** Course code, displayed as a small muted label
- **Middle line:** Task title (`title` field), displayed prominently — this is the primary text
- **Bottom line:** Three pieces of info separated by middle dots (·):
  - Type badge: "Assignment" / "Test" / "Exam"
  - Relative due date: "Today", "Tomorrow", "In 3 days", "Apr 22" (use relative for ≤7 days, absolute date for further)
  - Weight: "15% of grade" — **only shown if `weight` is not NULL**

**Tapping the card** (not the checkbox) opens the **Task Detail Bottom Sheet.**

**First-time "Tap for details" hint:** The first time a student lands on the Home screen with at least one task, a small muted hint appears directly below the first task card: *"Tap a card for full details"*. It's italic, 12–13 px, the same visual weight as metadata text — a whisper, not a tutorial. As soon as the student taps any task card (opening the detail sheet), the hint disappears permanently. Persist this dismissal with a `localStorage` flag (`priora_hint_shown = true`). If the flag is already set, never show the hint again. If there are no tasks on first visit, don't render the hint — it waits until there's something to annotate.

#### Task Detail Bottom Sheet

A bottom sheet (mobile) or modal (desktop) that slides up over the Home screen. Contains:

- **Course code + course name** (e.g., "CSC 211 — Data Structures")
- **Task title** (large)
- **Description** (if not NULL — otherwise this field is simply absent, no "No description" placeholder)
- **Type** badge
- **Due date** (absolute: "Friday, April 22, 2026")
- **Weight** (if not NULL: "Worth 15% of your grade")
- **Posted by:** attribution line (e.g., "Posted by Group A Rep · 2 days ago")
- **Mark complete** button at the bottom (or **Mark incomplete** if already completed)

Dismissing the sheet (swipe down on mobile, click outside on desktop) returns to the feed.

#### Completed Tasks

Tasks the student has marked complete on the current day appear at the very bottom of the feed, below all three bands. They are greyed out with struck-through text. They are NOT in a separate section with a header — they just sit at the bottom, visually muted.

On subsequent days (i.e., when `completed_at` date < today), completed tasks **do not appear in the feed at all.** They still exist in `task_completions` — they're just not queried for the Home feed.

#### Empty State

When there are no tasks at all (no overdue, no upcoming, no completed today):

Center of the screen, vertically: **"Nothing pending. You're clear."** — small, calm text. No illustrations, no confetti, no emoji. Just a quiet confirmation.

---

### 8.2 Attendance Screen

This screen provides the full per-course attendance breakdown. It's where students go when they want to dig deeper than the alert strip on Home.

#### Layout

A vertically scrollable list of **course attendance cards**, one per course the student takes (determined by their `group` being in the course's `groups` array).

#### Course Attendance Card

Each card shows:

```
┌──────────────────────────────────────────┐
│ CSC 211 — Data Structures                │
│                                          │
│ Attendance: 85% (17/20 sessions)         │
│ If you miss the next class → 80%         │
│ You can miss 3 more classes              │
│                                          │
│ ▼ Session history                        │
└──────────────────────────────────────────┘
```

**Line by line:**

1. **Course code + name** — card header
2. **Current attendance percentage** — format: `XX% (attended/total_counted_sessions)`. Only counts sessions where `counts = TRUE`. Formula: `(total_counted_sessions - declared_misses_for_counted_sessions) / total_counted_sessions * 100`
3. **Projection** — "If you miss the next class → XX%". Formula: `(attended - 1) / (total_counted + 1) * 100` — wait, more precisely: `(current_attended) / (total_counted_sessions + 1) * 100`. This simulates one more counted session that the student misses.
4. **Remaining safe misses** — "You can miss X more classes". Calculated as: how many more sessions can the student miss while staying at or above the 75% threshold, given `expected_sessions`. Formula: `floor(attended - threshold * expected_counted_sessions) ` — more precisely, iterate: keep adding missed sessions until percentage would drop below threshold.

**When `expected_sessions` is not set (NULL in `course_group_settings`):**
- Show line 1 (course code + name)
- Show line 2 (current percentage based on sessions logged so far)
- **Do NOT show lines 3 or 4.** No projection, no safe misses. These require knowing the total expected sessions.
- Optionally show a subtle note: "Projections available once your rep sets expected class count."

**At-risk styling:** If current attendance is within 5% of threshold → warning accent (amber). Below threshold → critical accent (red). Healthy → no special styling.

#### Session History (Expandable)

Below the summary stats, a collapsible/expandable section: "Session history" with a chevron.

When expanded, shows a reverse-chronological list of logged sessions for that course + group:

```
Apr 10, 2026  ·  ☐ I missed this
Apr 8, 2026   ·  ☑ I missed this  (declared miss)
Apr 5, 2026   ·  ☐ I missed this
```

Each row:
- Date of the session
- A toggle: "I missed this". If checked, the student has a `declared_misses` row for this session. If unchecked, they attended (default assumption).
- Toggling this ON inserts a `declared_misses` row. Toggling OFF deletes it. **No confirmation modal.** The attendance math on the card updates immediately in real-time so the student can see the effect of declaring or undeclaring a miss.

This immediacy is intentional — it makes declaring a miss feel low-stakes, which matches the advisory (not punitive) philosophy. Students can experiment: "What would my attendance be if I missed that class?" Toggle on, see the number change, toggle off.

Sessions where `counts = FALSE` are shown in the list but visually dimmed with a note "(does not count toward attendance)". The toggle still works, but the math isn't affected.

#### Disclaimer Footer

Persistent at the bottom of the Attendance screen, always visible:

> *"These figures are estimates to help you plan. Official records may differ."*

Small, muted text. This is non-negotiable — it must always be present. The system is advisory, never authoritative.

#### Attendance Threshold

Default: **75%**. This is the percentage below which the system considers a student "at risk."

In v1, this is a hardcoded constant (or environment variable). It is NOT configurable by users or admins through the UI. If it needs to change, the master admin changes it in the codebase or environment. This avoids building a settings UI for a single number.

---

### 8.3 Admin Screen

Only visible to users with role `rep`, `assistant_rep`, or `master_admin`. If a student somehow navigates to this route, redirect to Home.

#### Layout

**Top section:** Two prominent action buttons, side by side or stacked:
- **"Post a task"** — opens the Post Task bottom sheet
- **"Log a session"** — opens the Log Session bottom sheet

**Middle section:** A quieter, secondary action:
- **"Course settings"** — opens the Course Settings bottom sheet. This is where admins set `expected_sessions`.

**Bottom section:** Activity log — a reverse-chronological feed of all admin actions for the admin's group(s). Each entry shows:
- What was done: "Posted a task" / "Logged a session" / "Updated expected sessions"
- Details: course code, task title (if task), date (if session)
- For which group(s)
- By whom: role label (e.g., "Group A Rep"), NOT personal name
- When: relative timestamp ("2 hours ago", "Yesterday")

**Delete actions.** Task and session entries have a small trash icon on the right side of the row. The icon only appears if the viewer is allowed to delete that entry: `master_admin` can delete any, while `rep` / `assistant_rep` can delete only entries where `created_by` matches their own user ID. Settings-change entries are not deletable.

Tapping the trash icon opens a small confirmation dialog:
- For a task: *"Delete this task? It will be removed from all students' feeds."* — confirming runs `DELETE FROM tasks WHERE id = ?`. The corresponding `task_completions` rows cascade-delete (already enforced by the FK).
- For a session: *"Delete this session? Students' attendance stats will update automatically."* — confirming runs `DELETE FROM attendance_sessions WHERE id = ?`. The corresponding `declared_misses` rows cascade-delete (the FK uses `ON DELETE CASCADE`), so attendance percentages recompute naturally on the next page render.

After a successful delete, show a brief toast ("Task deleted" / "Session deleted") and refresh the activity log.

This activity log prevents double-posting. If Rep A sees that Assistant Rep A already posted the CSC 211 assignment, they don't post it again.

For `master_admin`: the activity log shows actions across ALL groups. For `rep` / `assistant_rep`: only their group.

#### Post Task Bottom Sheet

Form fields, in order:

1. **Course** — dropdown/select. Shows only courses where the admin's `group` is in the course's `groups` array. For `master_admin`, shows all courses. Display format: "CSC 211 — Data Structures"
2. **What's due?** — text input. This is the task `title`. Placeholder: `"e.g. Chapter 3 exercises, midterm prep..."`. Required.
3. **Description** — textarea. Placeholder: `"Any additional details (optional)"`. Optional.
4. **Type** — segmented control / radio buttons: Assignment | Test | Exam. Default: Assignment. Required.
5. **Due date** — date picker. No default (force the admin to choose). Required.
6. **% of grade** — number input. Placeholder: `"e.g. 15"`. Optional. Accept values 0-100.
7. **Groups** — multi-select checkboxes. Pre-filled from the selected course's `groups` array. Admin can deselect groups if the task only applies to some. Required (at least one).

**Submit button:** "Post task"

On submit: insert into `tasks` table, close the sheet, show a brief success toast ("Task posted"), and the new task appears at the top of the activity log. If validation fails, show inline errors on the relevant fields.

**Design goal:** This form should take under 30 seconds to fill out. If it's slower than typing in WhatsApp, something is wrong.

#### Log Session Bottom Sheet

Form fields:

1. **Course** — dropdown/select. Same filtering as Post Task.
2. **Group** — single select: A | B | C | D. Pre-selected to the admin's own group. For `master_admin`, no pre-selection. Required.
3. **Date** — date picker. Defaults to today. Allows past dates (admin forgot to log last week's class). Required.
4. **Counts toward attendance** — toggle, defaults to ON. Turning it OFF means this was an extra/optional class that doesn't affect attendance math. Label: "Counts toward attendance."

**Submit button:** "Log session"

On submit: insert into `attendance_sessions`, close sheet, success toast ("Session logged"), activity log updates.

#### Course Settings Bottom Sheet

Shows a list of courses relevant to the admin's group. For each course:

```
CSC 211 — Data Structures
Expected classes this semester: [14] ← editable number input
```

- If `expected_sessions` is NULL, the input is empty with placeholder "Not set"
- Admin types a number, it auto-saves (or saves on blur/submit). Upserts into `course_group_settings`.
- A small help text at the top of the sheet: "Set the approximate total number of classes expected this semester. This powers attendance projections for students. You can update this anytime."

---

### 8.4 Login / Onboarding Screen

#### Login/Signup

Standard auth form with two modes: Sign Up and Sign In.

**Sign Up:**
- Email (text input)
- Password (password input)
- Confirm password (password input)
- Submit button: "Create account"

**Sign In:**
- Email
- Password
- Submit button: "Sign in"

Toggle between modes with a text link: "Already have an account? Sign in" / "Don't have an account? Sign up"

On successful signup → check for `profiles` row → doesn't exist yet (trigger creates skeleton) → redirect to onboarding.
On successful signin → check for `profiles.full_name` → if NULL → redirect to onboarding. If populated → redirect to Home.

#### Onboarding (shown once, after first signup)

Single screen:

1. **Welcome text:** "Welcome to Priora. Let's get you set up." — brief, warm.
2. **Your name** — text input. Required.
3. **Your group** — four large tappable buttons in a 2x2 grid: A, B, C, D. One must be selected. Visually highlight the selected one.
4. **Continue** — button. Saves `full_name` and `group` to the `profiles` row, then redirects to Home.

No skip. No "set up later." Both fields are required to use the app.

---

## 9. Task Feed Logic

This section specifies exactly how the Home screen task feed queries and sorts data. Follow this precisely.

### Query

```sql
SELECT t.*, tc.completed_at
FROM tasks t
LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.user_id = :current_user_id
WHERE :user_group = ANY(t.groups)
ORDER BY
  -- Completed tasks sink to bottom
  CASE WHEN tc.completed_at IS NOT NULL THEN 1 ELSE 0 END ASC,
  -- Then by band: overdue first, then due this week, then later
  CASE
    WHEN t.due_date < CURRENT_DATE AND tc.completed_at IS NULL THEN 0  -- overdue
    WHEN t.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1         -- this week
    ELSE 2                                                              -- later
  END ASC,
  -- Within each band: soonest deadline first
  t.due_date ASC,
  -- Tiebreak: exam > test > assignment
  CASE t.type WHEN 'exam' THEN 0 WHEN 'test' THEN 1 WHEN 'assignment' THEN 2 END ASC,
  -- Tiebreak: higher weight first, NULLs last
  t.weight DESC NULLS LAST
```

### Filtering Completed Tasks

- If `tc.completed_at` is NOT NULL **and** `tc.completed_at::date = CURRENT_DATE` → show at bottom, greyed out
- If `tc.completed_at` is NOT NULL **and** `tc.completed_at::date < CURRENT_DATE` → **exclude from results entirely**

This means completed tasks only show on the day they were completed. After that, they vanish from the feed.

### Band Headers

The feed inserts visual band headers ("Overdue", "Due this week", "Coming up") between task cards. A band header only renders if there is at least one task in that band. No empty bands.

### Relative Date Display

| Condition | Display |
|-----------|---------|
| `due_date` = today | "Today" |
| `due_date` = tomorrow | "Tomorrow" |
| `due_date` within 2-7 days | "In X days" |
| `due_date` > 7 days away | Absolute date, format: "Apr 22" |
| `due_date` < today (overdue) | "X days overdue" |

---

## 10. Attendance Logic

### Core Formula

For a given student + course + group:

```
total_counted_sessions = COUNT(attendance_sessions WHERE course_code = X AND group = Y AND counts = TRUE)
student_misses = COUNT(declared_misses WHERE session_id IN above sessions AND user_id = student)
attended = total_counted_sessions - student_misses
attendance_percentage = (attended / total_counted_sessions) * 100
```

If `total_counted_sessions = 0`, display "No sessions yet" instead of dividing by zero.

### Projection: "If you miss the next class"

```
projected_if_miss = (attended / (total_counted_sessions + 1)) * 100
```

This simulates one additional counted session that the student misses (attended stays the same, total goes up by 1).

### Remaining Safe Misses

**This line depends entirely on `course_group_settings.expected_sessions` being set** for the (course_code, group) pair. When it's `NULL`, the "safe misses remaining" line does not render at all — only the current-attendance line and (if there's at least one logged session) the "if you miss the next class" projection are shown. The moment a rep or master_admin fills in `expected_sessions` for that course+group, the third line appears automatically on the student's next render.

The query that powers the Attendance screen must join `course_group_settings` on **both** `course_code` and `group` (that's the composite primary key of the table — both parts must match). Looking up by `course_code` alone will return the wrong row or none at all and the line will silently go missing.

Let:

```
expected_counted = expected_sessions  (assuming all future sessions count — simplification)
remaining_sessions = expected_counted - total_counted_sessions
max_total_misses = floor(expected_counted * (1 - threshold))  // e.g., 75% threshold → floor(expected * 0.25)
current_misses = student_misses
safe_misses_remaining = max_total_misses - current_misses
```

If `safe_misses_remaining < 0`, the student is already below threshold. Show: "You're below the attendance threshold."

If `safe_misses_remaining = 0`, show: "You cannot miss any more classes."

Otherwise: "You can miss X more classes."

### Threshold

Hardcoded at **75%** (or `0.75`). Store as a constant: `const ATTENDANCE_THRESHOLD = 0.75;`

---

## 11. Notification System

### Delivery Method

PWA push notifications using the [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) + a service worker.

### Implementation Approach

Use Supabase Edge Functions (or Next.js API routes on Vercel) to trigger notifications. The actual push subscription management (registering the service worker, storing push subscriptions) needs a `push_subscriptions` table:

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID | FK → profiles.id |
| `subscription` | JSONB | The PushSubscription object from the browser |
| `created_at` | TIMESTAMPTZ | |

(This is an 8th table, but it's infrastructure, not domain data. Include it.)

### Notification Types

**1. New task posted**
- Trigger: INSERT into `tasks` where user's group matches
- Message: "New [type] in [course_code]: [title], due [relative_date]"
- Example: "New assignment in CSC 211: Chapter 3 exercises, due Friday"
- Timing: Immediately on task creation

**2. Deadline approaching (24 hours)**
- Trigger: Scheduled check (cron job, daily) for tasks where `due_date = tomorrow` and user has NOT completed the task
- Message: "[course_code] [type] due tomorrow: [title]"
- Example: "CSC 211 assignment due tomorrow: Chapter 3 exercises"
- Timing: Evening before (e.g., 8 PM)

**3. Attendance at risk**
- Trigger: Whenever a session is logged or a miss is declared, check if the student's attendance has entered the warning zone (within 5% of threshold)
- Message: "Your [course_code] attendance is at [X]%. You can miss [Y] more classes."
- Example: "Your CSC 211 attendance is at 77%. You can miss 1 more class."
- Timing: Immediately after the triggering event

### What NOT to Build for Notifications in V1

- No notification center / in-app notification list
- No notification preferences / settings
- No "mark as read"
- No email notifications
- No SMS
- No granular frequency controls

Everyone gets all three types. If it becomes a problem, add controls later.

---

## 12. Navigation Structure

### Mobile (Primary — design for this first)

**Bottom tab bar** with icon + label for each tab:

| Tab | Label | Icon suggestion | Visible to |
|-----|-------|----------------|------------|
| 1 | Home | House icon | Everyone |
| 2 | Attendance | Bar chart or checkmark icon | Everyone |
| 3 | Admin | Plus or megaphone icon | rep, assistant_rep, master_admin only |

- Active tab has a filled/highlighted icon + colored label
- Inactive tabs are muted
- The tab bar is persistent — always visible at the bottom

**If the user is a student (no admin access):** only 2 tabs. The tab bar should NOT show an empty 3rd slot or a locked icon. Just 2 tabs.

### Desktop

**Left sidebar** with the same tabs as vertical navigation items. Content fills the center panel. No right panel, no multi-column dashboard layout. Keep it single-column centered content, max width ~640px, even on wide screens. This keeps it feeling focused, not spreadsheet-like.

Bottom sheets on mobile become **modals** on desktop — centered overlay with a backdrop. Same content, different container.

---

## 13. Design Principles & UI Guidelines

### Philosophy

- **Reduce thinking.** The user should never ask "what does this mean?" or "where do I find X?"
- **Show consequences.** Don't just show data — show what the data implies ("you can miss 2 more classes" is more useful than "attendance: 85%").
- **Calm, not urgent.** Even warnings should feel like a nudge from a friend, not an alarm. No red flashing, no exclamation marks, no ALL CAPS.
- **Mobile-first.** Design for a phone screen first. Desktop is a stretched version, not a redesigned version.

### Visual Style

- Clean, minimal. Generous whitespace.
- Rounded corners on cards and buttons (border-radius: 12px-ish for cards, 8px for buttons).
- Muted color palette with selective use of color for status indicators:
  - **Overdue / Critical:** Soft red (not aggressive — think muted rose, not fire engine red)
  - **Warning / Approaching:** Warm amber
  - **Normal:** Neutral grays
  - **Interactive / Primary actions:** A single accent color (pick something calm — blue, teal, or muted purple)
- System font stack. No custom fonts in v1.
- Comfortable tap targets (minimum 44x44px for interactive elements on mobile)

### Typography

- Task titles: medium weight, ~16px
- Course codes: small, muted, ~12-13px
- Metadata (due dates, badges, attribution): small, muted, ~13-14px
- Section headers ("Overdue", "Due this week"): small caps or bold, ~13px, muted
- Attendance numbers: large and prominent on the attendance cards, ~24px

### Spacing

- Card padding: ~16px
- Space between cards: ~12px
- Screen horizontal padding: ~16px (mobile), centered max-width on desktop

### Animations

- Task completion: smooth transition (fade + strike-through + move to bottom). ~300ms duration.
- Bottom sheets: slide up from bottom with slight spring easing.
- Attendance number changes (after declaring/undeclaring a miss): number should animate/transition, not just snap to the new value. This reinforces the cause-and-effect of "I toggled a miss and my percentage changed."

### Empty States

Always calm, never cute:
- No tasks: "Nothing pending. You're clear."
- No attendance sessions: "No classes logged yet."
- No courses: This shouldn't happen if setup is correct, but: "No courses found for your group."

### Loading States

Use skeleton loaders (grey pulsing placeholders mimicking the shape of cards) rather than spinners. The app should feel like it's filling in, not blocking.

---

## 14. Supabase Configuration

### Tables

Create all 7 domain tables + 1 infrastructure table as specified in the Data Model section. Use Supabase migrations for schema management.

### Row Level Security (RLS)

**Enable RLS on every table.** Supabase blocks all access by default when RLS is on, so policies must be explicit.

Key policies (pseudocode):

**profiles:**
- SELECT: `auth.uid() = id` (users read their own profile)
- UPDATE: `auth.uid() = id` (users update their own profile — for onboarding)
- Admin reads: `master_admin` can SELECT all profiles

**courses:**
- SELECT: user's group is in `groups` array → `(SELECT group FROM profiles WHERE id = auth.uid()) = ANY(groups)`

**course_group_settings:**
- SELECT: user's group matches `group` column
- UPDATE: user role is admin-level AND user's group matches (or user is master_admin)

**tasks:**
- SELECT: user's group is in task's `groups` array
- INSERT: user role is admin-level
- UPDATE/DELETE: user is `created_by` OR user is `master_admin`

**task_completions:**
- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`
- DELETE: `user_id = auth.uid()`

**attendance_sessions:**
- SELECT: user's group matches session's group
- INSERT: user role is admin-level

**declared_misses:**
- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`
- DELETE: `user_id = auth.uid()`

### Realtime

Enable Supabase Realtime on the `tasks` and `attendance_sessions` tables. This allows the app to update in real-time when an admin posts a new task or logs a session — students see it immediately without refreshing.

Do NOT enable realtime on `declared_misses` or `task_completions` — those are personal and don't need to sync to other users.

### Database Trigger for Profile Creation

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 15. Deployment

### Vercel

- Connect the GitHub repository to Vercel
- Framework preset: Next.js (auto-detected)
- Environment variables needed:
  - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
  - `VAPID_PUBLIC_KEY` — for web push notifications (generate using `web-push` npm package)
  - `VAPID_PRIVATE_KEY` — for web push notifications

### PWA Setup

- Include a `manifest.json` with app name ("Priora"), theme color, icons
- Register a service worker for push notification handling
- Add meta tags for PWA compatibility (mobile-web-app-capable, apple-mobile-web-app-capable, theme-color)
- The service worker should handle push events and display notifications using the Notification API

### Domain

Vercel provides a free `*.vercel.app` subdomain. Use that for v1. Custom domain can be added later if desired.

---

## 16. What NOT to Build

This list exists to prevent scope creep. Do not build any of these in v1, even if they seem like easy additions:

- ❌ Personal tasks or lifestyle reminders
- ❌ Timetable / class schedule viewer
- ❌ Calendar view
- ❌ Note-taking or file uploads
- ❌ Study timer or pomodoro
- ❌ Chat or messaging
- ❌ Comments on tasks
- ❌ Dark mode (use system default, no toggle)
- ❌ User settings or preferences screen
- ❌ Profile editing (after onboarding)
- ❌ Course creation UI (seed data only)
- ❌ Multi-school or multi-department support
- ❌ Enrollment management
- ❌ Export or reporting
- ❌ Notification preferences
- ❌ Email notifications
- ❌ Admin UI for changing user roles (use Supabase dashboard)
- ❌ Analytics or usage tracking
- ❌ Onboarding tutorial or walkthrough
- ❌ Password reset UI (use Supabase default)
- ❌ Search functionality
- ❌ Filtering or sorting options (the sort is fixed and opinionated — that's the point)

---

## Appendix: Seed Data

For initial deployment, the master admin should seed the `courses` table with all 200-level CS courses. Example structure:

```sql
INSERT INTO courses (code, name, groups) VALUES
  ('CSC 211', 'Data Structures', '{A,B,C,D}'),
  ('CSC 213', 'Computer Architecture', '{A,B,C,D}'),
  ('GEDS 102', 'Nigerian Peoples and Culture', '{A,B,C,D}'),
  -- ... add all courses
;
```

The exact course list will be provided by the master admin (the product owner) before deployment. The system does not need a course creation UI — this is a one-time setup step done via Supabase SQL editor or a migration script.

---

## Appendix: Key Calculations Reference

### Attendance Percentage
```
attended = total_counted_sessions - declared_misses
percentage = (attended / total_counted_sessions) * 100
```

### Projected Attendance If Next Class Missed
```
projected = (attended / (total_counted_sessions + 1)) * 100
```

### Remaining Safe Misses
```
max_misses = floor(expected_sessions * (1 - ATTENDANCE_THRESHOLD))
remaining = max_misses - current_misses
```

### Task Priority Sort
```
1. due_date ASC
2. type: exam(0) > test(1) > assignment(2)
3. weight DESC NULLS LAST
```

---

*End of specification. Build exactly this. When in doubt, re-read the relevant section — the answer is here.*
