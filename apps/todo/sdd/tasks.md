# SDD Implementation Tasks: todo-app

## Phase 1: Project Setup & Configuration
**Duration:** 1-2 days

### Task 1.1: Create project structure and dependencies
**File:** `apps/todo/package.json`
**Action:** Create package.json with exact dependencies from tech stack
**Verification:** `pnpm install` succeeds, all required packages are listed
```json
{
  "name": "todo-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3007",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "next": "latest",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@radix-ui/themes": "latest",
    "@neondatabase/serverless": "latest",
    "drizzle-orm": "latest",
    "better-auth": "latest",
    "@anthropic-ai/sdk": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "drizzle-kit": "latest",
    "typescript": "latest",
    "tailwindcss": "latest",
    "postcss": "latest",
    "autoprefixer": "latest"
  }
}
```

### Task 1.2: Configure Next.js with App Router
**File:** `apps/todo/next.config.js`
**Action:** Create Next.js configuration for port 3007 and Turbopack
**Verification:** `pnpm dev` starts on port 3007 with Turbopack enabled
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: true,
  },
};

module.exports = nextConfig;
```

### Task 1.3: Set up environment variables template
**File:** `apps/todo/.env.local.example`
**Action:** Create environment variable template with all required keys
**Verification:** All required environment variables are documented
```
DATABASE_URL="postgresql://..."
CLAUDE_API_KEY="sk-ant-..."
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3007"
```

### Task 1.4: Configure Radix UI theme
**File:** `apps/todo/app/globals.css`
**Action:** Import and configure Radix UI theme styles
**Verification:** Theme styles load without Tailwind classes
```css
@import '@radix-ui/themes/styles.css';

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}
```

### Task 1.5: Create root layout
**File:** `apps/todo/app/layout.tsx`
**Action:** Create root layout with Radix UI Theme provider
**Verification:** Layout renders with proper theme context
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Theme } from '@radix-ui/themes';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Evidence-Based Todo App',
  description: 'Task management with cognitive science principles',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Theme>
          {children}
        </Theme>
      </body>
    </html>
  );
}
```

## Phase 2: Database & Authentication Setup
**Duration:** 2-3 days

### Task 2.1: Create database schema with drizzle-orm
**File:** `apps/todo/lib/db/schema.ts`
**Action:** Implement all database tables from design document
**Verification:** Schema compiles without TypeScript errors
```typescript
import { pgTable, serial, varchar, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
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
  description: varchar('description', { length: 2000 }),
  priorityScore: integer('priority_score').default(0),
  energyLevel: integer('energy_level'),
  status: varchar('status', { 
    enum: ['inbox', 'today', 'scheduled', 'completed', 'archived'] 
  }).default('inbox'),
  dueDate: timestamp('due_date'),
  estimatedDuration: integer('estimated_duration'),
  actualDuration: integer('actual_duration'),
  metadata: jsonb('metadata').$type<{
    aiCategory?: string;
    suggestedDuration?: number;
    dependencyChain?: number[];
    completionHistory?: Array<{date: string; duration: number}>;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Task 2.2: Create database client
**File:** `apps/todo/lib/db/index.ts`
**Action:** Set up Neon PostgreSQL client with drizzle-orm
**Verification:** Database client can connect and execute queries
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Task 2.3: Set up Better Auth configuration
**File:** `apps/todo/lib/auth/client.ts`
**Action:** Configure Better Auth with email/password provider
**Verification:** Auth client exports properly typed functions
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
```

### Task 2.4: Create authentication middleware
**File:** `apps/todo/middleware.ts`
**Action:** Implement Next.js middleware for protected routes
**Verification:** Unauthenticated users redirected from protected routes
```typescript
import { authMiddleware } from 'better-auth/next';
import { NextResponse } from 'next/server';

export const middleware = authMiddleware({
  publicRoutes: ['/', '/login', '/register', '/api/public/*'],
  onError: (error) => {
    console.error('Auth error:', error);
    return NextResponse.redirect(new URL('/login', 'http://localhost:3007'));
  },
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Task 2.5: Create auth API route
**File:** `apps/todo/app/api/auth/[...better-auth]/route.ts`
**Action:** Implement Better Auth API route handler
**Verification:** Auth endpoints respond correctly
```typescript
import { auth } from '@/lib/auth/client';
import { toNextJsHandler } from 'better-auth/next';

export const { GET, POST } = toNextJsHandler(auth);
```

## Phase 3: Core Task Management Components
**Duration:** 3-4 days

### Task 3.1: Create TaskList component (chunked 7±2)
**File:** `apps/todo/components/tasks/TaskList.tsx`
**Action:** Implement chunked list with 5-9 items per view
**Verification:** List displays correct chunk size with pagination
```tsx
'use client';

import { useState } from 'react';
import { Box, Button, Flex } from '@radix-ui/themes';
import TaskItem from './TaskItem';
import { Task } from '@/types';

interface TaskListProps {
  tasks: Task[];
  chunkSize?: number;
}

export default function TaskList({ tasks, chunkSize = 7 }: TaskListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  
  const chunkedTasks = [];
  for (let i = 0; i < tasks.length; i += chunkSize) {
    chunkedTasks.push(tasks.slice(i, i + chunkSize));
  }
  
  const currentTasks = chunkedTasks[currentPage] || [];
  
  return (
    <Box>
      {currentTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
      
      {chunkedTasks.length > 1 && (
        <Flex gap="2" justify="center" mt="4">
          <Button
            variant="soft"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Previous
          </Button>
          <span>Page {currentPage + 1} of {chunkedTasks.length}</span>
          <Button
            variant="soft"
            disabled={currentPage === chunkedTasks.length - 1}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </Flex>
      )}
    </Box>
  );
}
```

### Task 3.2: Create TaskItem component with progressive disclosure
**File:** `apps/todo/components/tasks/TaskItem.tsx`
**Action:** Implement task item with expandable advanced fields
**Verification:** Basic info shows by default, advanced fields on expand
```tsx
'use client';

import { useState } from 'react';
import { Box, Card, Flex, Button, Text } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Task } from '@/types';
import PriorityBadge from './PriorityBadge';

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card>
      <Flex justify="between" align="center">
        <Flex gap="3" align="center">
          <Button
            variant="ghost"
            size="1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Button>
          <Text>{task.title}</Text>
          <PriorityBadge priority={task.priorityScore} />
        </Flex>
        
        <Button variant="soft" size="1">
          Complete
        </Button>
      </Flex>
      
      {expanded && (
        <Box mt="3" pl="6">
          <Text size="2" color="gray">
            {task.description}
          </Text>
          {/* Advanced fields for progressive disclosure level 2/3 */}
        </Box>
      )}
    </Card>
  );
}
```

### Task 3.3: Create QuickCapture component
**File:** `apps/todo/components/tasks/QuickCapture.tsx`
**Action:** Implement one-tap capture with keyboard shortcut
**Verification:** Cmd/Ctrl+N opens capture, Enter submits
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, TextField, Button, Flex } from '@radix-ui/themes';

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const handleSubmit = async () => {
    // Call capture API
    await fetch('/api/tasks/capture', {
      method: 'POST',
      body: JSON.stringify({ text: input, quick: true }),
    });
    
    setInput('');
    setOpen(false);
  };
  
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>Quick Add (Cmd/Ctrl+N)</Button>
      </Dialog.Trigger>
      
      <Dialog.Content>
        <Dialog.Title>Quick Capture</Dialog.Title>
        
        <Flex direction="column" gap="3">
          <TextField.Root>
            <TextField.Input
              placeholder="What needs to be done?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              autoFocus
            />
          </TextField.Root>
          
          <Flex gap="3" justify="end">
            <Button variant="soft" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Add Task
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
```

### Task 3.4: Create PriorityBadge component
**File:** `apps/todo/components/tasks/PriorityBadge.tsx`
**Action:** Implement visual priority indicator
**Verification:** Shows correct color based on priority score
```tsx
import { Badge } from '@radix-ui/themes';

interface PriorityBadgeProps {
  priority: number;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  let color: 'red' | 'orange' | 'green' | 'gray' = 'gray';
  let label = 'Low';
  
  if (priority > 75) {
    color = 'red';
    label = 'High';
  } else if (priority > 50) {
    color = 'orange';
    label = 'Medium';
  } else if (priority > 25) {
    color = 'green';
    label = 'Low';
  }
  
  return (
    <Badge color={color}>
      {label}
    </Badge>
  );
}
```

## Phase 4: API Routes & Data Layer
**Duration:** 2-3 days

### Task 4.1: Create task capture API endpoint
**File:** `apps/todo/app/api/tasks/capture/route.ts`
**Action:** Implement one-tap capture endpoint with AI queueing
**Verification:** POST request creates task and queues AI processing
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { getUserId } from '@/lib/auth/utils';

export async function POST(request: NextRequest) {
  try {
    const { text, quick = true } = await request.json();
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fast path for quick capture
    const [task] = await db.insert(tasks).values({
      title: text,
      status: 'inbox',
      userId,
    }).returning();
    
    // Queue AI processing in background
    if (process.env.CLAUDE_API_KEY) {
      fetch(`${request.nextUrl.origin}/api/tasks/ai-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      }).catch(console.error);
    }
    
    return NextResponse.json({ success: true, taskId: task.id });
  } catch (error) {
    console.error('Capture error:', error);
    return NextResponse.json(
      { error: 'Failed to capture task' },
      { status: 500 }
    );
  }
}
```

### Task 4.2: Create tasks CRUD API endpoint
**File:** `apps/todo/app/api/tasks/route.ts`
**Action:** Implement GET/POST endpoints for tasks
**Verification:** Can fetch and create tasks with proper auth
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserId } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.priorityScore);
    
    return NextResponse.json(userTasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const data = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [task] = await db
      .insert(tasks)
      .values({
        ...data,
        userId,
      })
      .returning();
    
    return NextResponse.json(task);
  } catch (error) {
   