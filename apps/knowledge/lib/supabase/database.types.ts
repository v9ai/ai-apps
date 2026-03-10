export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_category: string
          event_name: string
          id: string
          paper_id: string | null
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_category: string
          event_name: string
          id?: string
          paper_id?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_category?: string
          event_name?: string
          id?: string
          paper_id?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "analytics_events_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string
          gradient_from: string
          gradient_to: string
          icon: string
          id: number
          name: string
          paper_range_hi: number
          paper_range_lo: number
          slug: string
          sort_order: number
        }
        Insert: {
          description: string
          gradient_from: string
          gradient_to: string
          icon: string
          id?: number
          name: string
          paper_range_hi: number
          paper_range_lo: number
          slug: string
          sort_order: number
        }
        Update: {
          description?: string
          gradient_from?: string
          gradient_to?: string
          icon?: string
          id?: number
          name?: string
          paper_range_hi?: number
          paper_range_lo?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      citations: {
        Row: {
          authors: string | null
          fts: unknown
          id: string
          normalized_title: string
          title: string
          url: string
          venue: string | null
          year: number | null
        }
        Insert: {
          authors?: string | null
          fts?: unknown
          id?: string
          normalized_title: string
          title: string
          url: string
          venue?: string | null
          year?: number | null
        }
        Update: {
          authors?: string | null
          fts?: unknown
          id?: string
          normalized_title?: string
          title?: string
          url?: string
          venue?: string | null
          year?: number | null
        }
        Relationships: []
      }
      concept_edges: {
        Row: {
          created_at: string
          edge_type: Database["public"]["Enums"]["edge_type"]
          id: string
          metadata: Json
          source_id: string
          target_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          edge_type: Database["public"]["Enums"]["edge_type"]
          id?: string
          metadata?: Json
          source_id: string
          target_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          edge_type?: Database["public"]["Enums"]["edge_type"]
          id?: string
          metadata?: Json
          source_id?: string
          target_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "concept_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_embeddings: {
        Row: {
          concept_id: string
          content: string
          created_at: string
          embedding: string
          id: string
        }
        Insert: {
          concept_id: string
          content: string
          created_at?: string
          embedding: string
          id?: string
        }
        Update: {
          concept_id?: string
          content?: string
          created_at?: string
          embedding?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_embeddings_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: true
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          concept_type: Database["public"]["Enums"]["concept_type"]
          created_at: string
          description: string | null
          fts: unknown
          id: string
          metadata: Json
          name: string
        }
        Insert: {
          concept_type?: Database["public"]["Enums"]["concept_type"]
          created_at?: string
          description?: string | null
          fts?: unknown
          id?: string
          metadata?: Json
          name: string
        }
        Update: {
          concept_type?: Database["public"]["Enums"]["concept_type"]
          created_at?: string
          description?: string | null
          fts?: unknown
          id?: string
          metadata?: Json
          name?: string
        }
        Relationships: []
      }
      interaction_events: {
        Row: {
          concept_id: string | null
          created_at: string
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          is_correct: boolean | null
          metadata: Json
          paper_id: string | null
          response_time_ms: number | null
          section_id: string | null
          user_id: string
        }
        Insert: {
          concept_id?: string | null
          created_at?: string
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          is_correct?: boolean | null
          metadata?: Json
          paper_id?: string | null
          response_time_ms?: number | null
          section_id?: string | null
          user_id: string
        }
        Update: {
          concept_id?: string | null
          created_at?: string
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          is_correct?: boolean | null
          metadata?: Json
          paper_id?: string | null
          response_time_ms?: number | null
          section_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_events_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_events_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "interaction_events_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_events_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "paper_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_states: {
        Row: {
          concept_id: string
          correct_interactions: number
          id: string
          last_interaction_at: string | null
          mastery_level: Database["public"]["Enums"]["mastery_level"]
          p_guess: number
          p_mastery: number
          p_slip: number
          p_transit: number
          total_interactions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_id: string
          correct_interactions?: number
          id?: string
          last_interaction_at?: string | null
          mastery_level?: Database["public"]["Enums"]["mastery_level"]
          p_guess?: number
          p_mastery?: number
          p_slip?: number
          p_transit?: number
          total_interactions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          concept_id?: string
          correct_interactions?: number
          id?: string
          last_interaction_at?: string | null
          mastery_level?: Database["public"]["Enums"]["mastery_level"]
          p_guess?: number
          p_mastery?: number
          p_slip?: number
          p_transit?: number
          total_interactions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_states_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_citations: {
        Row: {
          citation_id: string
          paper_id: string
        }
        Insert: {
          citation_id: string
          paper_id: string
        }
        Update: {
          citation_id?: string
          paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_citations_citation_id_fkey"
            columns: ["citation_id"]
            isOneToOne: false
            referencedRelation: "citations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_citations_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "paper_citations_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_concepts: {
        Row: {
          concept_id: string
          paper_id: string
          relevance: number
        }
        Insert: {
          concept_id: string
          paper_id: string
          relevance?: number
        }
        Update: {
          concept_id?: string
          paper_id?: string
          relevance?: number
        }
        Relationships: [
          {
            foreignKeyName: "paper_concepts_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_concepts_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "paper_concepts_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_embeddings: {
        Row: {
          content: string
          created_at: string
          embedding: string
          id: string
          paper_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding: string
          id?: string
          paper_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_embeddings_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: true
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "paper_embeddings_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: true
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_sections: {
        Row: {
          content: string
          fts: unknown
          heading: string
          heading_level: number
          id: string
          paper_id: string
          section_order: number
          word_count: number
        }
        Insert: {
          content: string
          fts?: unknown
          heading: string
          heading_level?: number
          id?: string
          paper_id: string
          section_order: number
          word_count?: number
        }
        Update: {
          content?: string
          fts?: unknown
          heading?: string
          heading_level?: number
          id?: string
          paper_id?: string
          section_order?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "paper_sections_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "paper_sections_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          category_id: number
          content: string
          created_at: string
          fts: unknown
          id: string
          number: number
          reading_time_min: number
          slug: string
          summary: string | null
          title: string
          updated_at: string
          word_count: number
        }
        Insert: {
          category_id: number
          content: string
          created_at?: string
          fts?: unknown
          id?: string
          number: number
          reading_time_min?: number
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          category_id?: number
          content?: string
          created_at?: string
          fts?: unknown
          id?: string
          number?: number
          reading_time_min?: number
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "papers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mv_category_engagement"
            referencedColumns: ["category_id"]
          },
        ]
      }
      section_embeddings: {
        Row: {
          content: string
          created_at: string
          embedding: string
          id: string
          paper_id: string
          section_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding: string
          id?: string
          paper_id: string
          section_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          paper_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_embeddings_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "section_embeddings_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_embeddings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "paper_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_paper_interactions: {
        Row: {
          bookmarked: boolean
          first_viewed_at: string
          id: string
          last_viewed_at: string
          paper_id: string
          rating: number | null
          read_progress: number
          time_spent_sec: number
          user_id: string
        }
        Insert: {
          bookmarked?: boolean
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          paper_id: string
          rating?: number | null
          read_progress?: number
          time_spent_sec?: number
          user_id: string
        }
        Update: {
          bookmarked?: boolean
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          paper_id?: string
          rating?: number | null
          read_progress?: number
          time_spent_sec?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_paper_interactions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mv_paper_engagement"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "user_paper_interactions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_category_engagement: {
        Row: {
          avg_duration_ms: number | null
          category_id: number | null
          category_name: string | null
          total_events: number | null
          unique_readers: number | null
        }
        Relationships: []
      }
      mv_daily_activity: {
        Row: {
          activity_date: string | null
          event_count: number | null
          event_name: string | null
          papers_touched: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      mv_paper_engagement: {
        Row: {
          avg_duration_ms: number | null
          completion_rate: number | null
          completions: number | null
          last_activity: string | null
          paper_id: string | null
          slug: string | null
          title: string | null
          total_views: number | null
          unique_readers: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      find_similar_papers: {
        Args: {
          exclude_paper_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category_name: string
          paper_id: string
          similarity: number
          slug: string
          title: string
        }[]
      }
      find_similar_sections: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          heading: string
          paper_id: string
          paper_slug: string
          paper_title: string
          section_id: string
          similarity: number
        }[]
      }
      get_concept_neighborhood: {
        Args: { center_concept_id: string; max_hops?: number }
        Returns: {
          concept_id: string
          concept_name: string
          concept_type: Database["public"]["Enums"]["concept_type"]
          hop: number
        }[]
      }
      get_dependents: {
        Args: { max_depth?: number; source_concept_id: string }
        Returns: {
          concept_id: string
          concept_name: string
          depth: number
          path: string[]
        }[]
      }
      get_interaction_sequence: {
        Args: { seq_length?: number; target_user_id: string }
        Returns: {
          concept_id: string
          concept_name: string
          created_at: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          is_correct: boolean
          response_time_ms: number
        }[]
      }
      get_prerequisites: {
        Args: { max_depth?: number; target_concept_id: string }
        Returns: {
          concept_id: string
          concept_name: string
          depth: number
          path: string[]
        }[]
      }
      get_reading_velocity: {
        Args: { target_user_id: string; window_days?: number }
        Returns: {
          papers_read: number
          running_avg_papers: number
          total_time_min: number
          week_start: string
        }[]
      }
      get_user_engagement_summary: {
        Args: { target_user_id: string }
        Returns: {
          categories_explored: number
          current_streak_days: number
          favorite_category: string
          papers_completed: number
          papers_started: number
          total_time_spent_min: number
        }[]
      }
      get_user_knowledge_map: {
        Args: { target_user_id: string }
        Returns: {
          concept_id: string
          concept_name: string
          concept_type: Database["public"]["Enums"]["concept_type"]
          mastery_level: Database["public"]["Enums"]["mastery_level"]
          p_mastery: number
          prereq_mastery_avg: number
          total_interactions: number
        }[]
      }
      hybrid_search_papers: {
        Args: {
          fts_weight?: number
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
          vector_weight?: number
        }
        Returns: {
          category_name: string
          combined_score: number
          fts_rank: number
          paper_id: string
          slug: string
          title: string
          vector_similarity: number
        }[]
      }
      recommend_papers_collaborative: {
        Args: { rec_count?: number; target_user_id: string }
        Returns: {
          paper_id: string
          score: number
          slug: string
          title: string
        }[]
      }
      refresh_analytics_views: { Args: never; Returns: undefined }
      search_content: {
        Args: { query_text: string; result_limit?: number }
        Returns: {
          paper_slug: string
          paper_title: string
          rank: number
          result_id: string
          result_type: string
          snippet: string
          title: string
        }[]
      }
    }
    Enums: {
      concept_type:
        | "topic"
        | "skill"
        | "competency"
        | "technique"
        | "theory"
        | "tool"
      edge_type:
        | "prerequisite"
        | "related"
        | "part_of"
        | "builds_on"
        | "contrasts_with"
        | "applies_to"
      interaction_type:
        | "view"
        | "read_start"
        | "read_complete"
        | "bookmark"
        | "highlight"
        | "search"
        | "concept_click"
        | "citation_click"
        | "nav_next"
        | "nav_prev"
      mastery_level:
        | "novice"
        | "beginner"
        | "intermediate"
        | "proficient"
        | "expert"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      concept_type: [
        "topic",
        "skill",
        "competency",
        "technique",
        "theory",
        "tool",
      ],
      edge_type: [
        "prerequisite",
        "related",
        "part_of",
        "builds_on",
        "contrasts_with",
        "applies_to",
      ],
      interaction_type: [
        "view",
        "read_start",
        "read_complete",
        "bookmark",
        "highlight",
        "search",
        "concept_click",
        "citation_click",
        "nav_next",
        "nav_prev",
      ],
      mastery_level: [
        "novice",
        "beginner",
        "intermediate",
        "proficient",
        "expert",
      ],
    },
  },
} as const
