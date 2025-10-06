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
      clients: {
        Row: {
          id: string
          name: string
          address: string
          phone: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string
          phone?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      items: {
        Row: {
          id: string
          name: string
          photo_url: string
          description: string
          track_inventory: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          photo_url?: string
          description?: string
          track_inventory?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          photo_url?: string
          description?: string
          track_inventory?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      shades: {
        Row: {
          id: string
          item_id: string
          shade_number: string
          shade_name: string
          stock_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          shade_number: string
          shade_name?: string
          stock_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          shade_number?: string
          shade_name?: string
          stock_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          username: string
          password: string
          role: string
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          password: string
          role: string
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          role?: string
          full_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          created_by: string
          order_date: string
          status: string
          total_amount: number
          notes: string
          is_authorized: boolean
          created_at: string
          updated_at: string
          closed_by: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          order_number?: string
          client_id: string
          created_by: string
          order_date?: string
          status?: string
          total_amount?: number
          notes?: string
          is_authorized?: boolean
          created_at?: string
          updated_at?: string
          closed_by?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          client_id?: string
          created_by?: string
          order_date?: string
          status?: string
          total_amount?: number
          notes?: string
          is_authorized?: boolean
          created_at?: string
          updated_at?: string
          closed_by?: string | null
          closed_at?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          item_id: string
          shade_id: string
          quantity: number
          rate: number
          amount: number
          created_at: string
          is_fulfilled: boolean
          fulfilled_by: string | null
          fulfilled_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          item_id: string
          shade_id: string
          quantity: number
          rate?: number
          created_at?: string
          is_fulfilled?: boolean
          fulfilled_by?: string | null
          fulfilled_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          item_id?: string
          shade_id?: string
          quantity?: number
          rate?: number
          created_at?: string
          is_fulfilled?: boolean
          fulfilled_by?: string | null
          fulfilled_at?: string | null
        }
      }
    }
  }
}