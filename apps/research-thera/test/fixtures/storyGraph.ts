/**
 * Shared mock data for story generation tests.
 */

export const mockGoal = {
  id: 1,
  title: "Reduce anxiety at bedtime",
  description: "Help child manage anxiety before sleep",
  slug: "reduce-anxiety",
  familyMemberId: 2,
  createdBy: "user@test.com",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const mockFamilyMember = {
  id: 2,
  userId: "user_123",
  firstName: "Alex",
  name: "Alex Smith",
  ageYears: 8,
  relationship: "child",
  dateOfBirth: null,
  bio: null,
  email: null,
  phone: null,
  location: null,
  occupation: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const mockCharacteristic = {
  id: 3,
  userId: "user_123",
  familyMemberId: 2,
  title: "Separation Anxiety",
  externalizedName: "The Worry Monster",
  category: "SUPPORT_NEED",
  description: "Significant distress when separated from parents",
  strengths: "Very empathetic and creative",
  riskTier: "LOW",
  severityLevel: "MODERATE",
  impairmentDomains: '["SOCIAL","ACADEMIC"]',
  durationWeeks: 12,
  tags: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const mockUniqueOutcomes = [
  {
    id: 1,
    characteristicId: 3,
    userId: "user_123",
    description: "Stayed at sleepover for the first time",
    observedAt: "2024-02-15",
    createdAt: "2024-02-16T00:00:00Z",
  },
];

export const mockResearchPaper = {
  id: 10,
  goalId: 1,
  title: "CBT for childhood anxiety: A meta-analysis",
  authors: '["Smith, J.", "Lee, K."]',
  year: 2023,
  source: "pubmed",
  doi: "10.1000/test",
  abstract: "CBT is effective for childhood anxiety disorders.",
  keyFindings: [
    "CBT reduces anxiety symptoms by 60%",
    "Effects are durable at 12-month follow-up",
  ],
  therapeuticTechniques: [
    "Gradual exposure",
    "Cognitive restructuring",
    "Relaxation training",
  ],
  relevanceScore: 0.92,
  createdAt: "2024-01-01T00:00:00Z",
};

export const mockDeepSeekResponse = {
  choices: [
    {
      message: {
        content:
          "Welcome. I'm glad you're here... [pause] Today, we're going to work on managing bedtime anxiety...",
      },
    },
  ],
};

export const mockStory = {
  id: 42,
  goalId: 1,
  language: "English",
  minutes: 10,
  text: "Welcome. I'm glad you're here...",
  createdAt: "2024-01-01T00:00:00Z",
};
