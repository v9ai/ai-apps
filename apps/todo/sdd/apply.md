I'll complete the implementation of the todo-app, addressing all issues from the previous verify failure. Let me continue from where the previous implementation left off and complete all missing phases.

## Phase 4: API Routes & Data Layer (Continued)

### Task 4.2: Create tasks CRUD API endpoint (Complete)
**File:** `apps/todo/app/api/tasks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    let query = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId));
    
    if (status) {
      query = query.where(eq(tasks.status, status));
    }
    
    const userTasks = await query.orderBy(tasks.priorityScore);
    
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
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

### Task 4.3: Create AI processing service
**File:** `apps/todo/lib/ai/claude.ts`

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

export interface AITaskAnalysis {
  category: 'work' | 'personal' | 'health' | 'learning' | 'other';
  energyMatch: number; // 1-5
  suggestedDuration: number; // minutes
  urgencyScore: number; // 0-100
  possibleSubtasks?: string[];
  prioritySuggestion: 'high' | 'medium' | 'low';
}

export class ClaudeService {
  private anthropic: Anthropic;

  constructor() {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
  }

  async analyzeTask(taskText: string, context?: {
    timeOfDay?: string;
    userEnergyPattern?: 'morning' | 'afternoon' | 'evening';
  }): Promise<AITaskAnalysis> {
    const prompt = `Analyze this task for a todo application: "${taskText}"

Context:
- Time of day: ${context?.timeOfDay || 'not specified'}
- User energy pattern: ${context?.userEnergyPattern || 'not specified'}

Please provide analysis in this JSON format:
{
  "category": "work|personal|health|learning|other",
  "energyMatch": 1-5 (how energy-intensive this task is, 1=low, 5=high),
  "suggestedDuration": number in minutes,
  "urgencyScore": 0-100,
  "possibleSubtasks": ["optional", "subtasks"],
  "prioritySuggestion": "high|medium|low"
}

Consider:
1. Category based on content
2. Energy match based on task type and time of day
3. Realistic duration estimation
4. Urgency based on keywords (tomorrow, urgent, ASAP, etc.)
5. Break down complex tasks into 2-3 subtasks if needed
6. Priority based on urgency and importance`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as AITaskAnalysis;
        }
      }

      // Fallback analysis
      return {
        category: 'other',
        energyMatch: 3,
        suggestedDuration: 30,
        urgencyScore: 50,
        prioritySuggestion: 'medium'
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  async suggestSchedule(tasks: Array<{id: number, title: string, analysis: AITaskAnalysis}>, 
                       userEnergy: 'morning' | 'afternoon' | 'evening'): Promise<Array<{
    taskId: number;
    suggestedTime: string;
    explanation: string;
  }>> {
    const energyMap = {
      morning: ['deep_work', 'creative', 'planning', 'complex'],
      afternoon: ['meetings', 'collaboration', 'admin', 'communication'],
      evening: ['review', 'learning', 'light_tasks', 'routine']
    };

    const suggestions = tasks.map(task => {
      const taskType = this.inferTaskType(task.title, task.analysis);
      const idealSlot = energyMap[userEnergy].includes(taskType) ? userEnergy : 
                       task.analysis.energyMatch <= 2 ? 'evening' : 'afternoon';
      
      return {
        taskId: task.id,
        suggestedTime: idealSlot,
        explanation: `Suggested for ${idealSlot} based on ${taskType} task type and energy level ${task.analysis.energyMatch}/5`
      };
    });

    return suggestions;
  }

  private inferTaskType(title: string, analysis: AITaskAnalysis): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('meeting') || titleLower.includes('call') || titleLower.includes('discuss')) {
      return 'meetings';
    }
    if (titleLower.includes('report') || titleLower.includes('analyze') || titleLower.includes('research')) {
      return 'deep_work';
    }
    if (titleLower.includes('email') || titleLower.includes('reply') || titleLower.includes('organize')) {
      return 'admin';
    }
    if (titleLower.includes('learn') || titleLower.includes('read') || titleLower.includes('study')) {
      return 'learning';
    }
    
    return analysis.energyMatch <= 2 ? 'light_tasks' : 'complex';
  }
}
```

### Task 4.4: Create AI processing API endpoint
**File:** `apps/todo/app/api/tasks/ai-process/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ClaudeService } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // Get the task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Analyze with Claude
    const claudeService = new ClaudeService();
    const analysis = await claudeService.analyzeTask(task.title);
    
    // Update task with AI analysis
    const updatedMetadata = {
      ...(task.metadata || {}),
      aiCategory: analysis.category,
      suggestedDuration: analysis.suggestedDuration,
      urgencyScore: analysis.urgencyScore,
      possibleSubtasks: analysis.possibleSubtasks
    };
    
    // Calculate priority score based on AI analysis
    const priorityScore = Math.min(100, Math.max(0, 
      analysis.urgencyScore * 0.7 + 
      (analysis.prioritySuggestion === 'high' ? 80 : 
       analysis.prioritySuggestion === 'medium' ? 50 : 20)
    ));
    
    await db
      .update(tasks)
      .set({
        metadata: updatedMetadata,
        priorityScore: Math.round(priorityScore),
        energyLevel: analysis.energyMatch,
        estimatedDuration: analysis.suggestedDuration
      })
      .where(eq(tasks.id, taskId));
    
    return NextResponse.json({ 
      success: true, 
      analysis,
      priorityScore: Math.round(priorityScore)
    });
    
  } catch (error) {
    console.error('AI processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process task with AI' },
      { status: 500 }
    );
  }
}
```

## Phase 5: Gamification & Streak System

### Task 5.1: Create streak logic service
**File:** `apps/todo/lib/algorithms/streak-logic.ts`

```typescript
import { db } from '@/lib/db';
import { streaks } from '@/lib/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';

export class StreakLogic {
  static async updateStreak(userId: number, streakType: string, completed: boolean) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get current streak
    const [currentStreak] = await db
      .select()
      .from(streaks)
      .where(
        and(
          eq(streaks.userId, userId),
          eq(streaks.streakType, streakType)
        )
      );
    
    if (!currentStreak) {
      // Create new streak
      if (completed) {
        await db.insert(streaks).values({
          userId,
          streakType,
          currentCount: 1,
          lastUpdated: today,
          highestCount: 1
        });
        return { current: 1, frozen: false, message: 'New streak started!' };
      }
      return { current: 0, frozen: false, message: '' };
    }
    
    const lastUpdated = new Date(currentStreak.lastUpdated);
    const daysSince = Math.floor((today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    
    if (completed) {
      if (daysSince === 0) {
        // Already updated today
        return { 
          current: currentStreak.currentCount, 
          frozen: !!currentStreak.frozenUntil,
          message: 'Already counted today'
        };
      } else if (daysSince === 1) {
        // Consecutive day
        const newCount = currentStreak.currentCount + 1;
        await db
          .update(streaks)
          .set({
            currentCount: newCount,
            lastUpdated: today,
            highestCount: Math.max(currentStreak.highestCount, newCount),
            frozenUntil: null
          })
          .where(eq(streaks.id, currentStreak.id));
        
        return { 
          current: newCount, 
          frozen: false,
          message: `Streak extended to ${newCount} days!`
        };
      } else if (daysSince <= 3 && currentStreak.frozenUntil) {
        // Within recovery period
        const freezeDate = new Date(currentStreak.frozenUntil);
        if (today <= freezeDate) {
          // Still frozen, maintain streak
          await db
            .update(streaks)
            .set({
              lastUpdated: today,
              frozenUntil: null // Unfreeze since they completed
            })
            .where(eq(streaks.id, currentStreak.id));
          
          return { 
            current: currentStreak.currentCount, 
            frozen: false,
            message: 'Streak recovered!'
          };
        }
      } else if (daysSince <= 2) {
        // Grace period (1-2 days missed)
        // Freeze streak for recovery
        const freezeUntil = new Date(today);
        freezeUntil.setDate(freezeUntil.getDate() + 1);
        
        await db
          .update(streaks)
          .set({
            frozenUntil: freezeUntil
          })
          .where(eq(streaks.id, currentStreak.id));
        
        return { 
          current: currentStreak.currentCount, 
          frozen: true,
          message: 'Streak frozen for recovery'
        };
      } else {
        // Streak broken, start over
        await db
          .update(streaks)
          .set({
            currentCount: 1,
            lastUpdated: today,
            frozenUntil: null
          })
          .where(eq(streaks.id, currentStreak.id));
        
        return { 
          current: 1, 
          frozen: false,
          message: 'New streak started'
        };
      }
    } else {
      // Not completed today
      if (daysSince >= 3 && !currentStreak.frozenUntil) {
        // Streak broken due to inactivity
        await db
          .update(streaks)
          .set({
            currentCount: 0
          })
          .where(eq(streaks.id, currentStreak.id));
        
        return { 
          current: 0, 
          frozen: false,
          message: 'Streak reset due to inactivity'
        };
      }
    }
    
    return { 
      current: currentStreak.currentCount, 
      frozen: !!currentStreak.frozenUntil,
      message: ''
    };
  }
  
  static async getUserStreaks(userId: number) {
    const userStreaks = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId));
    
    return userStreaks.reduce((acc, streak) => {
      acc[streak.streakType] = {
        current: streak.currentCount,
        highest: streak.highestCount,
        frozen: streak.frozenUntil ? new Date(streak.frozenUntil) > new Date() : false,
        frozenUntil: streak.frozenUntil
      };
      return acc;
    }, {} as Record<string, any>);
  }
}
```

### Task 5.2: Create StreakDisplay component
**File:** `apps/todo/components/gamification/StreakDisplay.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Box, Flex, Text, Badge, Tooltip } from '@radix-ui/themes';
import { FlameIcon, SnowflakeIcon } from '@radix-ui/react-icons';

interface StreakData {
  current: number;
  highest: number;
  frozen: boolean;
  frozenUntil?: string;
}

export default function StreakDisplay() {
  const [streaks, setStreaks] = useState<Record<string, StreakData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreaks();
  }, []);

  const fetchStreaks = async () => {
    try {
      const response = await fetch('/api/streaks');
      if (response.ok) {
        const data = await response.json();
        setStreaks(data);
      }
    } catch (error) {
      console.error('Failed to fetch streaks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p="3">
        <Text size="2" color="gray">Loading streaks...</Text>
      </Box>
    );
  }

  const dailyStreak = streaks['daily'] || { current: 0, highest: 0, frozen: false };

  return (
    <Box p="3" style={{ border: '1px solid var(--gray-5)', borderRadius: 'var(--radius-3)' }}>
      <Flex direction="column" gap="2">
        <Flex align="center" gap="2">
          {dailyStreak.frozen ? (
            <SnowflakeIcon color="var(--blue-9)" />
          ) : (
            <FlameIcon color="var(--orange-9)" />
          )}
          <Text size="3" weight="bold">
            {dailyStreak.frozen ? 'Frozen Streak' : 'Current Streak'}
          </Text>
          <Badge color={dailyStreak.current > 0 ? 'orange' : 'gray'}>
            {dailyStreak.current} days
          </Badge>
        </Flex>
        
        {dailyStreak.frozen && dailyStreak.frozenUntil && (
          <Tooltip content={`Recovery available until ${new Date(dailyStreak.frozenUntil).toLocaleDateString()}`}>
            <Text size="2" color="blue">
              ⚡ Streak frozen - complete a task to recover!
            </Text>
          </Tooltip>
        )}
        
        <Flex justify="between">
          <Text size="2" color="gray">
            Highest: {dailyStreak.highest} days
          </Text>
          {dailyStreak.current > 0 && dailyStreak.current === dailyStreak.highest && (
            <Badge color="green" size="1">
              Personal Best! 🎉
            </Badge>
          )}
        </Flex>
        
        {/* Progress bar with endowed progress effect */}
        <Box mt="2">
          <Flex justify="between" mb="1">
            <Text size="1">Progress</Text>
            <Text size="1">{dailyStreak.current}/7 days</Text>
          </Flex>
          <Box 
            style={{ 
              height: '6px', 
              backgroundColor: 'var(--gray-4)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
         