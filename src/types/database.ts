export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          created_at?: string
        }
      }
      leagues: {
        Row: {
          id: string
          name: string
          description: string | null
          creator_id: string
          start_date: string
          number_of_rounds: number
          upvotes_per_user: number
          downvotes_per_user: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          creator_id: string
          start_date: string
          number_of_rounds: number
          upvotes_per_user: number
          downvotes_per_user: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          creator_id?: string
          start_date?: string
          number_of_rounds?: number
          upvotes_per_user?: number
          downvotes_per_user?: number
          is_active?: boolean
          created_at?: string
        }
      }
      league_members: {
        Row: {
          id: string
          user_id: string
          league_id: string
          total_points: number
          joined_at: string
        }
        Insert: {
          id?: string
          user_id: string
          league_id: string
          total_points?: number
          joined_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          league_id?: string
          total_points?: number
          joined_at?: string
        }
      }
      league_rounds: {
        Row: {
          id: string
          league_id: string
          round_number: number
          theme: string
          submission_deadline: string
          voting_deadline: string
          is_submission_open: boolean
          is_voting_open: boolean
        }
        Insert: {
          id?: string
          league_id: string
          round_number: number
          theme: string
          submission_deadline: string
          voting_deadline: string
          is_submission_open?: boolean
          is_voting_open?: boolean
        }
        Update: {
          id?: string
          league_id?: string
          round_number?: number
          theme?: string
          submission_deadline?: string
          voting_deadline?: string
          is_submission_open?: boolean
          is_voting_open?: boolean
        }
      }
      submissions: {
        Row: {
          id: string
          league_round_id: string
          user_id: string
          content: string
          content_type: 'URL' | 'TEXT' | 'IMAGE'
          submitted_at: string
        }
        Insert: {
          id?: string
          league_round_id: string
          user_id: string
          content: string
          content_type: 'URL' | 'TEXT' | 'IMAGE'
          submitted_at?: string
        }
        Update: {
          id?: string
          league_round_id?: string
          user_id?: string
          content?: string
          content_type?: 'URL' | 'TEXT' | 'IMAGE'
          submitted_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          submission_id: string
          user_id: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          user_id: string
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          user_id?: string
          value?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 