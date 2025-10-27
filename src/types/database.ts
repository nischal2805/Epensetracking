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
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          description: string
          amount: number
          category: string
          date: string
          paid_by: string
          receipt_url: string | null
          input_method: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          description: string
          amount: number
          category?: string
          date?: string
          paid_by: string
          receipt_url?: string | null
          input_method?: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          description?: string
          amount?: number
          category?: string
          date?: string
          paid_by?: string
          receipt_url?: string | null
          input_method?: string
          created_at?: string
        }
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          share_amount: number
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          share_amount: number
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          share_amount?: number
        }
      }
    }
    Views: {
      user_balances: {
        Row: {
          group_id: string
          from_user: string
          to_user: string
          owes: number
        }
      }
    }
  }
}
