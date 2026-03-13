# Technical Design Document: Evidence-Based Todo Application

## 1. Architecture Decisions

### 1.1 Database Schema Design
**Choice**: Hybrid relational schema with JSONB for flexible metadata
```sql
-- Core structure
users (id, email, name, preferences:jsonb, created_at)
tasks (id, user_id, title, description, priority_score, energy_level, status, 
       due_date, estimated_duration, actual_duration, metadata:jsonb, 
       created_at, updated_at)
subtasks (id, task_id, title, completed, position, created_at)
dependencies (id, task_id, depends_on_task_id, type)
time_blocks (id, user_id, task_id, start_time, end_time, status, calendar_event_id)
streaks (id, user_id, streak_type, current_count, last_updated, frozen_until)
```

**Alternatives Considered**:
1. **Pure relational**: More rigid but better query performance
2. **Document store**: More flexible but harder for complex joins
3. **Hybrid approach**: Chosen for balance between flexibility and query efficiency

**Rationale**: JSONB columns in PostgreSQL allow for flexible metadata (gamification data, AI suggestions, user preferences) while maintaining strong relational integrity for core entities. This supports progressive disclosure where advanced features can store data without schema migrations.

### 1.2 Authentication Strategy
**Choice**: Better Auth with server-side sessions via Next.js middleware
```typescript
// apps/todo/middleware.ts
export const middleware = authMiddleware({
  publicRoutes: ["/", "/login", "/register", "/api/public/*"]
});
```

**Alternatives**:
1. **Clerk**: More batteries-included but violates constraints
2. **NextAuth.js**: More complex configuration
3. **Custom JWT**: More implementation overhead

**Rationale**: Better Auth provides simple server-side session management that works seamlessly with React Server Components, minimal configuration, and good TypeScript support.

### 1.3 AI Integration Pattern
**Choice**: Edge-friendly background processing with optimistic updates
```typescript
// Pattern: Queue AI processing, show immediate feedback
const [optimisticTask, addOptimistic] = useOptimistic(task);
await addOptimistic({...task, category: "Processing..."});
const result = await processWithAI(task); // Non-blocking
```

**Alternatives**:
1. **Real-time streaming**: Better UX but more complex
2. **Synchronous blocking**: Simpler but poor UX
3. **Webhook-based**: More scalable but delayed

**Rationale**: Background processing prevents UI blocking while maintaining responsiveness. Claude API responses are typically <2s, acceptable for background updates.

### 1.4 State Management Strategy
**Choice**: React Server Components + Optimistic Updates + Context for UI state
```typescript
// Hierarchy:
// 1. Server Components fetch initial data
// 2. Client Components handle interactions
// 3. React Context for UI state (theme, sidebar)
// 4. Optimistic updates for mutations
```

**Alternatives**:
1. **Redux/Zustand**: Overkill for this scope
2. **SWR/React Query**: Good for client caching but conflicts with RSC pattern
3. **Pure RSC**: Limited interactivity

**Rationale**: Aligns with Next.js App Router patterns, minimizes client JavaScript, and provides good developer experience.

## 2. Data Flow

### 2.1 Task Creation Flow
```
User Input → Quick Capture API → Validate → 
  ┌→ Save to DB (optimistic)
  └→ Queue AI Processing → 
      ┌→ Categorization
      ├→ Priority scoring
      └→ Energy suggestion → Update DB
```

### 2.2 Daily Workflow
```
1. User opens app → Server fetches:
   - Today's tasks (chunked 7±2)
   - Active streaks
   - Calendar blocks
   
2. User interacts:
   - Complete task → Update DB → Recalculate streak
   - Reschedule → Calendar integration → Update time_blocks
   - Add subtask → Update hierarchy
   
3. Background processes:
   - AI suggestion refresh (hourly)
   - Streak validation (nightly)
   - Calendar sync (configurable)
```

### 2.3 AI Processing Pipeline
```
Raw Task → 
  Claude API (prompt engineering) → 
    Parse response → 
      Extract: [category, energy_match, suggested_duration] → 
        Store in metadata → 
          Trigger UI updates via WebSocket/SSE
```

## 3. File Structure

```
apps/todo/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Progressive disclosure scaffold
│   │   ├── inbox/
│   │   ├── today/
│   │   ├── calendar/
│   │   └── analytics/
│   ├── api/
│   │   ├── auth/[...better-auth]/
│   │   ├── tasks/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   ├── capture/      # One-tap capture endpoint
│   │   │   └── ai-process/   # Background AI processing
│   │   ├── streaks/
│   │   ├── calendar/
│   │   └── ai/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # Radix UI wrappers
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Dialog.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx      # Chunked list (7±2)
│   │   ├── TaskItem.tsx      # Swipe gestures
│   │   ├── QuickCapture.tsx  # One-tap widget
│   │   ├── SubtaskHierarchy.tsx # 2-level max
│   │   └── PriorityBadge.tsx # Visual priority
│   ├── calendar/
│   │   ├── TimeBlock.tsx
│   │   └── EnergyIndicator.tsx
│   ├── gamification/
│   │   ├── StreakDisplay.tsx
│   │   ├── ProgressBar.tsx   # Endowed progress effect
│   │   └── RecoveryModal.tsx
│   └── ai/
│       ├── SuggestionCard.tsx
│       └── CategoryChip.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts          # Drizzle client
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── auth/
│   │   └── client.ts         # Better Auth client
│   ├── ai/
│   │   ├── claude.ts         # Claude API wrapper
│   │   ├── categorizer.ts
│   │   └── energy-scorer.ts
│   ├── algorithms/
│   │   ├── priority-calculator.ts
│   │   ├── chunk-manager.ts  # 7±2 logic
│   │   └── streak-logic.ts   # With recovery
│   ├── calendar/
│   │   └── integrator.ts     # Timeboxing engine
│   └── utils/
│       └── cognitive-load.ts # Progressive disclosure logic
├── hooks/
│   ├── useTasks.ts
│   ├── useOptimisticUpdate.ts
│   └── useKeyboardShortcut.ts # Cmd/Ctrl+N
├── types/
│   └── index.ts
├── middleware.ts
├── .env.local
└── package.json
```

## 4. Key Interfaces

### 4.1 Database Schema (Drizzle)
```typescript
// apps/todo/lib/db/schema.ts
import { pgTable, serial, varchar, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  preferences: jsonb('preferences').$type<{
    chunkSize: number;
    gamificationEnabled: boolean;
    energyPattern: 'morning' | 'afternoon' | 'evening';
    progressiveDisclosureLevel: 1 | 2 | 3;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: varchar('title', { length: 500 }).notNull(),
  priorityScore: integer('priority_score').default(0),
  energyLevel: integer('energy_level'), // 1-5
  status: varchar('status', { 
    enum: ['inbox', 'today', 'scheduled', 'completed', 'archived'] 
  }).default('inbox'),
  metadata: jsonb('metadata').$type<{
    aiCategory?: string;
    suggestedDuration?: number;
    dependencyChain?: number[];
    completionHistory?: Array<{date: string; duration: number}>;
  }>(),
});
```

### 4.2 AI Service Interface
```typescript
// apps/todo/lib/ai/claude.ts
interface AITaskAnalysis {
  category: 'work' | 'personal' | 'health' | 'learning';
  energyMatch: number; // 1-5
  suggestedDuration: number; // minutes
  urgencyScore: number; // 0-1
  possibleSubtasks?: string[];
}

class ClaudeService {
  async analyzeTask(task: string, context?: UserContext): Promise<AITaskAnalysis>;
  async suggestSchedule(tasks: Task[], userEnergy: EnergyPattern): Promise<ScheduleSuggestion>;
  async naturalLanguageCapture(text: string): Promise<PartialTask>;
}
```

### 4.3 API Routes
```typescript
// apps/todo/app/api/tasks/capture/route.ts
export async function POST(request: Request) {
  // One-tap capture endpoint
  const { text, quick = true } = await request.json();
  
  if (quick) {
    // Fast path: just save
    const task = await db.insert(tasks).values({
      title: text,
      status: 'inbox',
      userId: await getUserId()
    });
    
    // Queue AI processing
    queueMicrotask(() => processWithAI(task.id));
    
    return Response.json({ success: true, taskId: task.id });
  }
}
```

## 5. Testing Strategy

### 5.1 Test Pyramid
```
           E2E (10%)
        /           \
   Integration (20%)   
    /                 \
Unit Tests (70%)    AI Mock Tests
```

### 5.2 Unit Tests (70% coverage)
```typescript
// Priority calculator tests
describe('PriorityCalculator', () => {
  test('calculates score with deadline urgency', () => {
    const task = { dueDate: tomorrow, userPriority: 3 };
    expect(calculatePriority(task)).toBeGreaterThan(50);
  });
  
  test('respects cognitive load limit (7±2)', () => {
    const tasks = generateTasks(15);
    const chunked = chunkTasks(tasks, userPrefs);
    expect(chunked[0].length).toBeGreaterThan(4);
    expect(chunked[0].length).toBeLessThan(10);
  });
});

// Streak logic with recovery
describe('StreakLogic', () => {
  test('maintains streak with daily completion', () => {
    const streak = calculateStreak(completions);
    expect(streak.current).toBe(7);
  });
  
  test('allows recovery period', () => {
    const streak = calculateStreak(completionsWithGap);
    expect(streak.frozenUntil).toBeDefined();
    expect(streak.current).toBeGreaterThan(0);
  });
});
```

### 5.3 Integration Tests (20%)
```typescript
// Task creation flow
describe('Task Creation Flow', () => {
  test('quick capture creates task and queues AI', async () => {
    const response = await fetch('/api/tasks/capture', {
      method: 'POST',
      body: JSON.stringify({ text: 'Test task' })
    });
    
    expect(response.status).toBe(200);
    
    // Verify task exists
    const task = await db.query.tasks.findFirst();
    expect(task).toBeDefined();
    
    // Verify AI job queued
    expect(AIQueue).toHaveBeenCalled();
  });
  
  test('progressive disclosure shows advanced fields only on expand', async () => {
    render(<TaskItem task={simpleTask} />);
    expect(screen.queryByText('Energy Level')).toBeNull();
    
    await userEvent.click(screen.getByTestId('expand-task'));
    expect(screen.getByText('Energy Level')).toBeVisible();
  });
});
```

### 5.4 E2E Tests (10%)
```typescript
// Critical user flows
describe('Daily Workflow', () => {
  test('user can complete daily workflow', async () => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // 2. Quick capture
    await page.keyboard.press('Control+N');
    await page.fill('#quick-capture', 'New task from shortcut');
    await page.keyboard.press('Enter');
    
    // 3. Complete task with swipe
    const task = page.locator('[data-testid="task-item"]').first();
    await task.swipe('left'); // Custom swipe action
    
    // 4. Verify streak updated
    expect(page.locator('[data-testid="streak-count"]')).toHaveText('1');
    
    // 5. Verify chunked list
    const visibleTasks = page.locator('[data-testid="task-item"]');
    await expect(visibleTasks).toHaveCount({ max: 9 });
  });
});
```

### 5.5 AI Testing Strategy
```typescript
// Mock Claude API for deterministic testing
const mockClaudeResponse = {
  category: 'work',
  energyMatch: 3,
  suggestedDuration: 45
};

vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({
    messages: {
      create: vi.fn(() => Promise.resolve({
        content: [{ text: JSON.stringify(mockClaudeResponse) }]
      }))
    }
  }))
}));

// Test AI decision transparency
describe('AITransparency', () => {
  test('shows explanation for AI suggestions', async () => {
    render(<AISuggestion task={task} />);
    await userEvent.hover(screen.getByTestId('ai-suggestion'));
    expect(screen.getByText('Suggested because:')).toBeVisible();
  });
});
```

### 5.6 Performance Testing
```typescript
// Lighthouse audits automated
describe('Performance', () => {
  test('core web vitals thresholds', async () => {
    const metrics = await getLighthouseMetrics('/today');
    expect(metrics.LCP).toBeLessThan(2.5); // Largest Contentful Paint
    expect(metrics.FID).toBeLessThan(100); // First Input Delay
    expect(metrics.CLS).toBeLessThan(0.1); // Cumulative Layout Shift
  });
  
  test('database queries under 200ms', async () => {
    const start = Date.now();
    await db.query.tasks.findMany({ where: eq(tasks.userId, userId) });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

## 6. Critical Implementation Details

### 6.1 Cognitive Load Management
```typescript
// Progressive disclosure levels
const DISCLOSURE_LEVELS = {
  1: ['title', 'dueDate'],                    // Novice
  2: ['title', 'dueDate', 'priority', 'tags'], // Intermediate  
  3: ['title', 'dueDate', 'priority', 'tags',  // Advanced
      'energy', 'dependencies', 'subtasks']
};

// Component adapts based on user level
function TaskItem({ task, userLevel }) {
  const visibleFields = DISCLOSURE_LEVELS[userLevel];
  return (
    <div>
      {visibleFields.includes('title') && <Title />}
      {visibleFields.includes('energy') && userLevel === 3 && <EnergyIndicator />}
    </div>
  );
}
```

### 6.2 Gamification Safeguards
```typescript
// Streak with recovery logic
function updateStreak(userId, completedToday) {
  const streak = await getStreak(userId);
  
  if (completedToday) {
    streak.current++;
    streak.lastUpdated = new Date();
  } else if (daysSince(streak.lastUpdated) <= 2) {
    // Grace period: freeze streak
    streak.frozenUntil = addDays(new Date(), 1);
  } else {
    // Break streak but gently
    streak.current = 0;
    showRecoveryMessage(streak.highest);
  }
}
```

### 6.3 Energy-Aware Scheduling
```typescript
// Match tasks to energy patterns
function scheduleWithEnergy(tasks, userChronotype) {
  const energyMap = {
    morning: ['deep_work', 'creative', 'planning'],
    afternoon: ['meetings', 'collaboration', 'admin'],
    evening: ['review', 'learning', 'light_tasks']
  };
  
  return tasks.map(task => {
    const taskType = categorizeTask(task);
    const idealTime = energyMap[userChronotype].includes(taskType) 
      ? 'morning' 
      : 'afternoon';
    
    return { ...task, suggestedTime: idealTime };
  });
}
```

## 7. Deployment Configuration

```json
// apps/todo/vercel.json
{
  "buildCommand": "cd ../.. && pnpm build --filter=todo-app",
  "devCommand": "cd ../.. && pnpm dev --filter=todo-app -p 3007",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": "apps/todo/.next",
  "env": {
    "DATABASE_URL": "$NEON_DATABASE_URL",
    "CLAUDE_API_KEY": "$CLAUDE_API_KEY",
    "BETTER_AUTH_SECRET": "$BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL": "$VERCEL_URL"
  }
}
```

This technical design implements all 10 evidence-based principles through:
1. **Progressive disclosure** via user-level configuration
2. **One-tap capture** through global shortcut and API endpoint  
3. **Chunked lists** via algorithm enforcing 7±2 items
4. **Simplified priority** with transparent scoring
5. **Streak mechanics** with recovery periods
6. **Visual feedback** through Radix UI components
7. **2-level hierarchy** enforced in subtask component
8. **Lightweight dependencies** via metadata tracking
9. **Timeboxing** with calendar integration
10. **Energy-awareness** through chronotype matching

The architecture respects cognitive load theory while providing a path from novice to power user, all within the specified tech stack constraints.