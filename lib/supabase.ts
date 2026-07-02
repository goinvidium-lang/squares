import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Board = {
  id: string
  code: string
  admin_id: string
  home_team: string
  away_team: string
  game_date: string | null
  price_cents: number
  game_type: 'classic' | 'reverse' | 'cardinal' | 'fullneighbor'
  privacy: 'public' | 'private'
  payout_q1_pct: number
  payout_q2_pct: number
  payout_q3_pct: number
  payout_final_pct: number
  status: 'open' | 'locked' | 'in_progress' | 'complete' | 'cancelled'
  numbers_drawn: boolean
  home_numbers: number[] | null
  away_numbers: number[] | null
  created_at: string
}

export type Square = {
  id: string
  board_id: string
  player_id: string
  row: number
  col: number
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_method: 'card' | 'venmo' | 'zelle' | 'cash'
  amount_cents: number
  fee_cents: number
  claimed_at: string
  paid_at: string | null
}

export type User = {
  id: string
  name: string
  email: string
  stripe_customer_id: string | null
  created_at: string
}

export type QuarterResult = {
  id: string
  board_id: string
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Final'
  home_score: number
  away_score: number
  home_digit: number
  away_digit: number
  announced_at: string
}

export type FeedEvent = {
  id: string
  board_id: string
  user_id: string | null
  event_type: string
  message: string
  created_at: string
}