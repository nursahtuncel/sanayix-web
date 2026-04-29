import { create } from 'zustand'
import { supabase } from '@/core/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { UserRole } from '@/core/supabase/types'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  initialize: () => Promise<void>
  signOut: () => Promise<void>
  setSession: (session: Session | null) => void
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  session: null,
  role: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true })
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const role = session.user.user_metadata?.role as UserRole | null
      set({ user: session.user, session, role, loading: false, initialized: true })
    } else {
      set({ user: null, session: null, role: null, loading: false, initialized: true })
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user?.user_metadata?.role as UserRole | null
      set({ user: session?.user ?? null, session, role })
    })
  },

  setSession: (session) => {
    const role = session?.user?.user_metadata?.role as UserRole | null
    set({ user: session?.user ?? null, session, role })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, role: null })
  },
}))
