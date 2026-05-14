export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string | null
          is_guest: boolean
          alias: string
          preferred_position: Database['public']['Enums']['player_position'] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          is_guest?: boolean
          alias: string
          preferred_position?: Database['public']['Enums']['player_position'] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          is_guest?: boolean
          alias?: string
          preferred_position?: Database['public']['Enums']['player_position'] | null
          created_at?: string
        }
      }
      communities: {
        Row: {
          id: string
          name: string
          primary_color: string
          secondary_color: string
          shield_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          primary_color?: string
          secondary_color?: string
          shield_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          primary_color?: string
          secondary_color?: string
          shield_url?: string | null
          created_at?: string
        }
      }
      community_members: {
        Row: {
          community_id: string
          profile_id: string
          role: Database['public']['Enums']['user_role']
          joined_at: string
        }
        Insert: {
          community_id: string
          profile_id: string
          role?: Database['public']['Enums']['user_role']
          joined_at?: string
        }
        Update: {
          community_id?: string
          profile_id?: string
          role?: Database['public']['Enums']['user_role']
          joined_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          community_id: string
          created_by: string | null
          date: string
          location: string
          type: Database['public']['Enums']['match_type']
          price: number
          status: Database['public']['Enums']['match_status']
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          created_by?: string | null
          date: string
          location: string
          type: Database['public']['Enums']['match_type']
          price?: number
          status?: Database['public']['Enums']['match_status']
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          created_by?: string | null
          date?: string
          location?: string
          type?: Database['public']['Enums']['match_type']
          price?: number
          status?: Database['public']['Enums']['match_status']
          created_at?: string
        }
      }
      match_participants: {
        Row: {
          match_id: string
          profile_id: string
          team: 'A' | 'B' | null
          has_paid: boolean
          attendance: Database['public']['Enums']['attendance_status']
        }
        Insert: {
          match_id: string
          profile_id: string
          team?: 'A' | 'B' | null
          has_paid?: boolean
          attendance?: Database['public']['Enums']['attendance_status']
        }
        Update: {
          match_id?: string
          profile_id?: string
          team?: 'A' | 'B' | null
          has_paid?: boolean
          attendance?: Database['public']['Enums']['attendance_status']
        }
      }
      evaluations: {
        Row: {
          id: string
          match_id: string
          evaluator_id: string
          evaluated_id: string
          score: number
          is_mvp_vote: boolean
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          evaluator_id: string
          evaluated_id: string
          score: number
          is_mvp_vote?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          evaluator_id?: string
          evaluated_id?: string
          score?: number
          is_mvp_vote?: boolean
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          community_id: string
          author_id: string
          title: string
          content: string
          category: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          author_id: string
          title: string
          content: string
          category?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          author_id?: string
          title?: string
          content?: string
          category?: string | null
          expires_at?: string
          created_at?: string
        }
      }
    }
    Enums: {
      user_role: 'ADMIN' | 'USER'
      match_type: '7' | '11' | 'Sala'
      match_status: 'OPEN' | 'EVALUATING' | 'CLOSED'
      player_position: 'GK' | 'DEF' | 'MID' | 'DEL'
      attendance_status: 'ON_TIME' | 'LATE' | 'ABSENT'
    }
  }
}