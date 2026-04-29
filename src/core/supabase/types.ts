export type UserRole = 'customer' | 'professional'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type RequestStatus = 'pending' | 'receiving_offers' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
export type UrgencyLevel = 'normal' | 'urgent'
export type OfferStatus = 'active' | 'accepted' | 'rejected' | 'expired'
export type JobStage = 'in_progress' | 'awaiting_parts' | 'awaiting_customer' | 'ready' | 'completed'
export type PaymentStatus = 'pending' | 'completed' | 'failed'
export type PaymentMethod = 'card' | 'iban'
export type MessageType = 'text' | 'offer_action'

export interface Database {
  public: {
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          phone: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
        }
      }
      professional_profiles: {
        Row: {
          id: string
          approval_status: ApprovalStatus
          kyc_status: KycStatus
          hourly_rate: number | null
          min_job_amount: number | null
          company_name: string | null
          tax_id: string | null
          bio: string | null
          service_area: Record<string, unknown> | null
          working_hours: Record<string, unknown> | null
          is_online: boolean
          rating: number
          review_count: number
          skills: string[] | null
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id: string
          approval_status?: ApprovalStatus
          kyc_status?: KycStatus
          hourly_rate?: number | null
          min_job_amount?: number | null
          company_name?: string | null
          tax_id?: string | null
          bio?: string | null
          service_area?: Record<string, unknown> | null
          working_hours?: Record<string, unknown> | null
          is_online?: boolean
          skills?: string[] | null
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          approval_status?: ApprovalStatus
          kyc_status?: KycStatus
          hourly_rate?: number | null
          min_job_amount?: number | null
          company_name?: string | null
          tax_id?: string | null
          bio?: string | null
          service_area?: Record<string, unknown> | null
          working_hours?: Record<string, unknown> | null
          is_online?: boolean
          skills?: string[] | null
          latitude?: number | null
          longitude?: number | null
        }
      }
      vehicles: {
        Row: {
          id: string
          owner_id: string
          plate: string
          brand: string
          model: string
          year: number | null
          created_at: string
        }
        Insert: {
          owner_id: string
          plate: string
          brand: string
          model: string
          year?: number | null
        }
        Update: {
          plate?: string
          brand?: string
          model?: string
          year?: number | null
        }
      }
      sanayis: {
        Row: {
          id: string
          name: string
          district: string
          side: 'Avrupa' | 'Anadolu'
        }
        Insert: {
          name: string
          district: string
          side: 'Avrupa' | 'Anadolu'
        }
        Update: {
          name?: string
          district?: string
          side?: 'Avrupa' | 'Anadolu'
        }
      }
      professional_sanayis: {
        Row: {
          professional_id: string
          sanayi_id: string
        }
        Insert: {
          professional_id: string
          sanayi_id: string
        }
        Update: Record<string, never>
      }
      categories: {
        Row: {
          id: string
          name: string
          icon_url: string | null
          slug: string
        }
        Insert: {
          name: string
          slug: string
          icon_url?: string | null
        }
        Update: {
          name?: string
          icon_url?: string | null
        }
      }
      service_requests: {
        Row: {
          id: string
          customer_id: string
          category_id: string | null
          title: string
          description: string | null
          status: RequestStatus
          urgency: UrgencyLevel
          budget_min: number | null
          budget_max: number | null
          address: Record<string, unknown> | null
          vehicle_id: string | null
          photos: string[]
          offer_count: number
          created_at: string
        }
        Insert: {
          customer_id: string
          category_id?: string | null
          title: string
          description?: string | null
          status?: RequestStatus
          urgency?: UrgencyLevel
          budget_min?: number | null
          budget_max?: number | null
          address?: Record<string, unknown> | null
          vehicle_id?: string | null
          photos?: string[]
        }
        Update: {
          title?: string
          description?: string | null
          status?: RequestStatus
          urgency?: UrgencyLevel
          budget_min?: number | null
          budget_max?: number | null
          address?: Record<string, unknown> | null
          vehicle_id?: string | null
          photos?: string[]
        }
      }
      offers: {
        Row: {
          id: string
          request_id: string
          professional_id: string
          price: number
          duration_days: number | null
          message: string | null
          status: OfferStatus
          created_at: string
        }
        Insert: {
          request_id: string
          professional_id: string
          price: number
          duration_days?: number | null
          message?: string | null
          status?: OfferStatus
        }
        Update: {
          price?: number
          duration_days?: number | null
          message?: string | null
          status?: OfferStatus
        }
      }
      jobs: {
        Row: {
          id: string
          offer_id: string
          request_id: string
          customer_id: string
          professional_id: string
          stage: JobStage
          created_at: string
        }
        Insert: {
          offer_id: string
          request_id: string
          customer_id: string
          professional_id: string
          stage?: JobStage
        }
        Update: {
          stage?: JobStage
        }
      }
      payments: {
        Row: {
          id: string
          offer_id: string
          customer_id: string
          amount: number
          status: PaymentStatus
          method: PaymentMethod | null
          created_at: string
        }
        Insert: {
          offer_id: string
          customer_id: string
          amount: number
          status?: PaymentStatus
          method?: PaymentMethod | null
        }
        Update: {
          status?: PaymentStatus
          method?: PaymentMethod | null
        }
      }
      chats: {
        Row: {
          id: string
          job_id: string
          customer_id: string
          professional_id: string
          created_at: string
        }
        Insert: {
          job_id: string
          customer_id: string
          professional_id: string
        }
        Update: {
          job_id?: string
          customer_id?: string
          professional_id?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          content: string
          type: MessageType
          is_read: boolean
          created_at: string
        }
        Insert: {
          chat_id: string
          sender_id: string
          content: string
          type?: MessageType
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
      portfolio_items: {
        Row: {
          id: string
          professional_id: string
          image_url: string
          title: string | null
          created_at: string
        }
        Insert: {
          professional_id: string
          image_url: string
          title?: string | null
        }
        Update: {
          image_url?: string
          title?: string | null
        }
      }
      reviews: {
        Row: {
          id: string
          job_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          job_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
        }
        Update: {
          rating?: number
          comment?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          type: string | null
          action_url: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          title: string
          body?: string | null
          type?: string | null
          action_url?: string | null
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
    }
    Functions: {
      accept_offer: {
        Args: { p_offer_id: string }
        Returns: string
      }
    }
  }
}
