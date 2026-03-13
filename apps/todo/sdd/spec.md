# SDD Delta Specifications: todo-app

## 1. Project Structure & Configuration

### ADDED Requirements
**1.1.1** The application SHALL be created within the `apps/todo/` directory of the pnpm monorepo structure.

**1.1.2** The development server SHALL run on port 3007 with the command `next dev -p 3007`.

**1.1.3** The project SHALL use Turbopack for development and SHALL be deployable to Vercel.

**Scenarios for 1.1.1-1.1.3:**
- Given the monorepo exists with other Next.js applications
- When I run `pnpm dev` from the `apps/todo/` directory
- Then the development server starts on port 3007 using Turbopack

**1.1.4** The application SHALL use the exact mandatory tech stack: Next.js App Router, React 19, @radix-ui/themes, Neon PostgreSQL with drizzle-orm, Better Auth, and @anthropic-ai/sdk.

**Scenarios for 1.1.4:**
- Given I examine the package.json in `apps/todo/`
- When I check the dependencies
- Then I MUST find the exact specified packages and versions as required

## 2. Authentication & User Management

### ADDED Requirements
**2.1.1** User authentication SHALL be implemented using Better Auth with server-side sessions managed via Next.js middleware.

**2.1.2** The authentication flow SHALL support email/password registration and login.

**2.1.3** Protected routes SHALL redirect unauthenticated users to the login page.

**Scenarios for 2.1.1-2.1.3:**
- Given I am an unauthenticated user
- When I try to access the main dashboard
- Then I am redirected to the login page

### REMOVED Requirements
**2.2.1** Clerk, Supabase Auth, or any other authentication provider besides Better Auth SHALL NOT be used.

## 3. Database Schema

### ADDED Requirements
**3.1.1** The database SHALL use Neon PostgreSQL with the `@neondatabase/serverless` driver.

**3.1.2** Database schema and queries SHALL be defined using drizzle-orm for type safety.

**3.1.3** The schema SHALL include tables for: users, tasks, subtasks, priorities, streaks, and time_blocks.

**Scenarios for 3.1.1-3.1.3:**
- Given the database is initialized
- When I examine the schema definition in `apps/todo/lib/db/schema.ts`
- Then I see the required tables with proper relationships and indexes

## 4. Core Task Management

### ADDED Requirements
**4.1.1** Users SHALL be able to create, read, update, and delete tasks with a maximum of 2-level subtask hierarchy.

**4.1.2** Task capture SHALL support "one-tap capture" through a global keyboard shortcut (Cmd/Ctrl+N).

**4.1.3** Lists of tasks SHALL be chunked to display 5-9 items (7±2) per view with automatic pagination.

**Scenarios for 4.1.1-4.1.3:**
- Given I have 15 tasks in my list
- When I view the main task list
- Then I see only 7 tasks with pagination controls
- And I can create a new task with Cmd/Ctrl+N

### MODIFIED Requirements
**4.2.1** Task completion SHALL provide visual feedback with progress indicators and celebration animations.

**Scenarios for 4.2.1:**
- Given I mark a task as complete
- When the action is processed
- Then I see a visual progress indicator and subtle celebration animation

## 5. Evidence-Based UI Components

### ADDED Requirements
**5.1.1** The interface SHALL implement progressive disclosure where advanced features are hidden by default and revealed based on user expertise.

**5.1.2** Task items SHALL support swipe gestures for complete/delete actions on touch devices.

**5.1.3** Priority indicators SHALL use a simplified model (e.g., High/Medium/Low) with visual color coding.

**Scenarios for 5.1.1-5.1.3:**
- Given I am a new user
- When I view a task
- Then I see only basic information (title, due date)
- And when I long-press or click expand, I see advanced fields

## 6. Priority & Dependency System

### ADDED Requirements
**6.1.1** The system SHALL calculate dynamic priority scores using the formula: `P = f(deadline_urgency, user_defined_value, dependency_status, project)`.

**6.1.2** Users SHALL be able to adjust the weight of priority factors through settings.

**6.1.3** Lightweight dependency tracking SHALL allow marking tasks as blocking or blocked by other tasks.

**Scenarios for 6.1.1-6.1.3:**
- Given I have tasks with deadlines and dependencies
- When I view the priority list
- Then tasks are ordered by calculated priority score
- And I can adjust priority weights in settings

## 7. Gamification Features

### ADDED Requirements
**7.1.1** Streak mechanics SHALL track daily task completion with visual progress indicators.

**7.1.2** Streak systems SHALL include recovery periods or "freeze" functionality to prevent anxiety.

**7.1.3** Progress bars SHALL use the endowed progress effect (starting partially filled).

**Scenarios for 7.1.1-7.1.3:**
- Given I have a 5-day streak
- When I miss a day
- Then my streak is frozen rather than reset
- And I see a progress bar that starts at 30% filled

### MODIFIED Requirements
**7.2.1** Gamification features SHALL be opt-in or easily disabled in user settings.

**Scenarios for 7.2.1:**
- Given I prefer no gamification
- When I access settings
- Then I can disable all streak and progress features

## 8. Scheduling & Calendar Integration

### ADDED Requirements
**8.1.1** Users SHALL be able to drag tasks onto a calendar view for time-blocking.

**8.1.2** The system SHALL apply chronotype-aware scheduling suggestions based on time of day.

**8.1.3** Time estimates SHALL include a configurable buffer percentage (default 25%) to combat planning fallacy.

**Scenarios for 8.1.1-8.1.3:**
- Given I am a "morning person" (lark chronotype)
- When I drag a task to schedule it
- Then the system suggests morning time slots
- And adds 25% buffer time to my estimate

## 9. AI Integration

### ADDED Requirements
**9.1.1** The Claude API SHALL be used for smart categorization of natural language task input.

**9.1.2** AI suggestions SHALL consider energy levels and time of day for optimal scheduling.

**9.1.3** All AI features SHALL provide explanations for suggestions to maintain transparency.

**Scenarios for 9.1.1-9.1.3:**
- Given I enter "Call accountant about taxes tomorrow"
- When the AI processes this task
- Then it categorizes it as "Finance" with priority "High"
- And suggests scheduling in the afternoon with explanation

## 10. API Architecture

### ADDED Requirements
**10.1.1** All API endpoints SHALL be implemented as Next.js API route handlers in `app/api/` directory.

**10.1.2** Database queries SHALL be executed server-side via React Server Components or API routes.

**Scenarios for 10.1.1-10.1.2:**
- Given I need to fetch tasks
- When I make a request to `/api/tasks`
- Then I receive JSON data from the server
- And no database client is exposed to the browser

### REMOVED Requirements
**10.2.1** Express, standalone Node servers, or GraphQL SHALL NOT be used for API implementation.

## 11. Performance & Optimization

### ADDED Requirements
**11.1.1** Core CRUD operations SHALL complete in under 200ms.

**11.1.2** AI API calls SHALL respond within 2 seconds with appropriate loading states.

**11.1.3** The application SHALL pass Lighthouse performance audits for mobile responsiveness.

**Scenarios for 11.1.1-11.1.3:**
- Given I have a list of 50 tasks
- When I mark one as complete
- Then the update reflects in the UI within 200ms
- And the AI suggestion loads within 2 seconds with a skeleton loader

## 12. Deployment & Environment

### ADDED Requirements
**12.1.1** The application SHALL be deployable to Vercel with environment variables for database and API keys.

**12.1.2** Database migrations SHALL be reversible with rollback capabilities.

**Scenarios for 12.1.1-12.1.2:**
- Given I need to deploy to production
- When I push to the main branch
- Then Vercel automatically deploys with environment variables
- And I can rollback database changes if needed

---

## Implementation Notes

1. **Component Structure**: All React components MUST use @radix-ui/themes for styling; Tailwind CSS MUST NOT be used.
2. **State Management**: Prefer React Server Components for data fetching; use React Context only for UI state that cannot be managed server-side.
3. **Error Handling**: All AI and database operations MUST include comprehensive error handling and user-friendly error messages.
4. **Testing**: Each requirement SHOULD have corresponding test cases in the test suite.
5. **Documentation**: All AI features MUST include tooltips explaining how suggestions are generated.

## Success Metrics Alignment

Each requirement aligns with the success criteria from the proposal:
- Technical Success: Requirements 11.x ensure performance targets
- Feature Success: Requirements 4.x, 5.x, 7.x ensure core functionality
- User Success: Requirements 5.x, 7.x ensure engagement and satisfaction
- Evidence-Based Validation: All requirements implement research-backed principles

## Risk Mitigation

Features are scoped to allow gradual rollout:
- AI features can be disabled via environment variables
- Gamification is opt-in (Requirement 7.2.1)
- Database schema supports backward compatibility
- Progressive disclosure prevents feature overload