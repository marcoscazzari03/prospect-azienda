
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"metadata": NonNullable<Json>,"target": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target"?: string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target"?: string
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "city": string,"contact_form_url": string,"country": string,"country_code": string | null,"domain": string,"email_missed_at": string | null,"first_seen_at": string,"id": string,"industry": string,"industry_checked_at": string | null,"last_verified_at": string,"name": string,"origin": string,"places": (string)[],"referente_missed_at": string | null,"site_checked_at": string | null,"site_email": string,"site_email_at": string | null,"size_hint": string,"tags": (string)[],"technologies": (string)[],"website": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string,"contact_form_url"?: string,"country"?: string,"country_code"?: string | null,"domain": string,"email_missed_at"?: string | null,"first_seen_at"?: string,"id"?: string,"industry"?: string,"industry_checked_at"?: string | null,"last_verified_at"?: string,"name": string,"origin"?: string,"places"?: (string)[],"referente_missed_at"?: string | null,"site_checked_at"?: string | null,"site_email"?: string,"site_email_at"?: string | null,"size_hint"?: string,"tags"?: (string)[],"technologies"?: (string)[],"website": string
                  }
                  Update: {
                    "city"?: string,"contact_form_url"?: string,"country"?: string,"country_code"?: string | null,"domain"?: string,"email_missed_at"?: string | null,"first_seen_at"?: string,"id"?: string,"industry"?: string,"industry_checked_at"?: string | null,"last_verified_at"?: string,"name"?: string,"origin"?: string,"places"?: (string)[],"referente_missed_at"?: string | null,"site_checked_at"?: string | null,"site_email"?: string,"site_email_at"?: string | null,"size_hint"?: string,"tags"?: (string)[],"technologies"?: (string)[],"website"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_checks": {
                  Row: {
                    "checked_at": string,"code": string,"company_id": string,"detail": string,"evidence": NonNullable<Json>,"source": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_at"?: string,"code": string,"company_id": string,"detail"?: string,"evidence"?: NonNullable<Json>,"source"?: string,"status": string
                  }
                  Update: {
                    "checked_at"?: string,"code"?: string,"company_id"?: string,"detail"?: string,"evidence"?: NonNullable<Json>,"source"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_checks_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_resolutions": {
                  Row: {
                    "attempts": number,"company_key": string,"company_name": string,"domain": string,"method": string,"status": string,"tried_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"company_key": string,"company_name": string,"domain"?: string,"method"?: string,"status": string,"tried_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"company_key"?: string,"company_name"?: string,"domain"?: string,"method"?: string,"status"?: string,"tried_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_signals": {
                  Row: {
                    "checked_at": string,"code": string,"company_id": string,"evidence": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_at"?: string,"code": string,"company_id": string,"evidence"?: NonNullable<Json>
                  }
                  Update: {
                    "checked_at"?: string,"code"?: string,"company_id"?: string,"evidence"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_signals_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"cost_rates": {
                  Row: {
                    "description": string,"provider": string,"unit": string,"unit_cost_eur": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"provider": string,"unit": string,"unit_cost_eur": number
                  }
                  Update: {
                    "description"?: string,"provider"?: string,"unit"?: string,"unit_cost_eur"?: number
                  }
                  Relationships: [
                    
                  ]
                },"credit_ledger": {
                  Row: {
                    "created_at": string,"created_by": string | null,"delta": number,"description": string,"expires_at": string | null,"external_ref": string | null,"id": number,"kind": string,"org_id": string,"search_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"delta": number,"description"?: string,"expires_at"?: string | null,"external_ref"?: string | null,"id"?: never,"kind": string,"org_id": string,"search_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"delta"?: number,"description"?: string,"expires_at"?: string | null,"external_ref"?: string | null,"id"?: never,"kind"?: string,"org_id"?: string,"search_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "credit_ledger_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"credit_prices": {
                  Row: {
                    "credits": number,"email_status": string,"email_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "credits": number,"email_status": string,"email_type": string
                  }
                  Update: {
                    "credits"?: number,"email_status"?: string,"email_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"deliveries": {
                  Row: {
                    "archived_at": string | null,"deleted_at": string | null,"company_domain": string,"credits": number,"data": NonNullable<Json>,"delivered_at": string,"email_address": string,"email_id": string | null,"email_status": string,"email_type": string,"id": string,"notes": string,"org_id": string,"person_id": string | null,"person_key": string,"quality_score": number,"run_id": string | null,"search_id": string,"source": string,"stage": string,"stage_changed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"deleted_at"?: string | null,"company_domain": string,"credits": number,"data": NonNullable<Json>,"delivered_at"?: string,"email_address": string,"email_id"?: string | null,"email_status": string,"email_type": string,"id"?: string,"notes"?: string,"org_id": string,"person_id"?: string | null,"person_key": string,"quality_score"?: number,"run_id"?: string | null,"search_id": string,"source"?: string,"stage"?: string,"stage_changed_at"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"deleted_at"?: string | null,"company_domain"?: string,"credits"?: number,"data"?: NonNullable<Json>,"delivered_at"?: string,"email_address"?: string,"email_id"?: string | null,"email_status"?: string,"email_type"?: string,"id"?: string,"notes"?: string,"org_id"?: string,"person_id"?: string | null,"person_key"?: string,"quality_score"?: number,"run_id"?: string | null,"search_id"?: string,"source"?: string,"stage"?: string,"stage_changed_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliveries_email_id_fkey"
      columns: ["email_id"]
isOneToOne: false
      referencedRelation: "emails"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "search_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_search_id_fkey"
      columns: ["search_id"]
isOneToOne: false
      referencedRelation: "searches"
      referencedColumns: ["id"]
    }
                  ]
                },"email_modes": {
                  Row: {
                    "description": string,"label": string,"max_credits": number,"mode": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"label": string,"max_credits": number,"mode": string,"sort"?: number
                  }
                  Update: {
                    "description"?: string,"label"?: string,"max_credits"?: number,"mode"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"emails": {
                  Row: {
                    "address": string,"bounce_reports": number,"company_id": string,"first_seen_at": string,"id": string,"person_id": string | null,"source": string,"source_url": string,"status": string,"type": string,"verified_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"bounce_reports"?: number,"company_id": string,"first_seen_at"?: string,"id"?: string,"person_id"?: string | null,"source": string,"source_url"?: string,"status": string,"type": string,"verified_at"?: string
                  }
                  Update: {
                    "address"?: string,"bounce_reports"?: number,"company_id"?: string,"first_seen_at"?: string,"id"?: string,"person_id"?: string | null,"source"?: string,"source_url"?: string,"status"?: string,"type"?: string,"verified_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "emails_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "emails_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"error_events": {
                  Row: {
                    "at": string,"digest": string | null,"emailed": boolean,"id": number,"message": string,"route": string,"signature": string,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"digest"?: string | null,"emailed"?: boolean,"id"?: never,"message": string,"route"?: string,"signature": string,"source": string
                  }
                  Update: {
                    "at"?: string,"digest"?: string | null,"emailed"?: boolean,"id"?: never,"message"?: string,"route"?: string,"signature"?: string,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"exports": {
                  Row: {
                    "created_at": string,"filters": NonNullable<Json>,"format": string,"id": number,"org_id": string,"rows": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"filters"?: NonNullable<Json>,"format": string,"id"?: never,"org_id": string,"rows": number,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"filters"?: NonNullable<Json>,"format"?: string,"id"?: never,"org_id"?: string,"rows"?: number,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exports_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"job_ads": {
                  Row: {
                    "city": string,"company_id": string | null,"company_key": string,"company_name": string,"contract": string,"country": string,"description": string,"external_id": string,"family": string,"first_seen_at": string,"id": string,"last_seen_at": string,"posted_at": string,"region": string,"source": string,"title": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string,"company_id"?: string | null,"company_key": string,"company_name": string,"contract"?: string,"country"?: string,"description"?: string,"external_id": string,"family": string,"first_seen_at"?: string,"id"?: string,"last_seen_at"?: string,"posted_at": string,"region"?: string,"source": string,"title": string,"url": string
                  }
                  Update: {
                    "city"?: string,"company_id"?: string | null,"company_key"?: string,"company_name"?: string,"contract"?: string,"country"?: string,"description"?: string,"external_id"?: string,"family"?: string,"first_seen_at"?: string,"id"?: string,"last_seen_at"?: string,"posted_at"?: string,"region"?: string,"source"?: string,"title"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_ads_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_list_items": {
                  Row: {
                    "added_at": string,"delivery_id": string,"list_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"delivery_id": string,"list_id": string
                  }
                  Update: {
                    "added_at"?: string,"delivery_id"?: string,"list_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_list_items_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_list_items_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "lead_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_lists": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"org_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"org_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"org_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_lists_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_reports": {
                  Row: {
                    "created_at": string,"created_by": string | null,"delivery_id": string,"id": string,"note": string,"org_id": string,"reason": string,"refund_credits": number,"resolved_at": string | null,"resolved_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"delivery_id": string,"id"?: string,"note"?: string,"org_id": string,"reason": string,"refund_credits"?: number,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"delivery_id"?: string,"id"?: string,"note"?: string,"org_id"?: string,"reason"?: string,"refund_credits"?: number,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_reports_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: true
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_reports_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "created_at": string,"org_id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"org_id": string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"org_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"optout_requests": {
                  Row: {
                    "confirmed_at": string | null,"created_at": string,"domain_hash": string | null,"email_hash": string,"id": string,"ip_hash": string | null,"status": string,"token_hash": string,"whole_domain": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"created_at"?: string,"domain_hash"?: string | null,"email_hash": string,"id"?: string,"ip_hash"?: string | null,"status"?: string,"token_hash": string,"whole_domain"?: boolean
                  }
                  Update: {
                    "confirmed_at"?: string | null,"created_at"?: string,"domain_hash"?: string | null,"email_hash"?: string,"id"?: string,"ip_hash"?: string | null,"status"?: string,"token_hash"?: string,"whole_domain"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"organizations": {
                  Row: {
                    "country": string,"created_at": string,"id": string,"name": string,"plan_id": string,"status": string,"stripe_customer_id": string | null,"vat_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "country"?: string,"created_at"?: string,"id"?: string,"name": string,"plan_id"?: string,"status"?: string,"stripe_customer_id"?: string | null,"vat_id"?: string | null
                  }
                  Update: {
                    "country"?: string,"created_at"?: string,"id"?: string,"name"?: string,"plan_id"?: string,"status"?: string,"stripe_customer_id"?: string | null,"vat_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizations_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"created_at": string,"currency": string,"id": string,"invoice_url": string | null,"kind": string,"org_id": string,"plan_id": string | null,"status": string,"stripe_ref": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"currency"?: string,"id"?: string,"invoice_url"?: string | null,"kind": string,"org_id": string,"plan_id"?: string | null,"status": string,"stripe_ref": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"currency"?: string,"id"?: string,"invoice_url"?: string | null,"kind"?: string,"org_id"?: string,"plan_id"?: string | null,"status"?: string,"stripe_ref"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"people": {
                  Row: {
                    "company_id": string,"discovery_url": string,"email_id": string | null,"first_name": string,"first_seen_at": string,"full_name": string,"id": string,"job_title": string,"last_name": string,"last_verified_at": string,"lead": Json | null,"linkedin_url": string,"person_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"discovery_url"?: string,"email_id"?: string | null,"first_name"?: string,"first_seen_at"?: string,"full_name": string,"id"?: string,"job_title"?: string,"last_name"?: string,"last_verified_at"?: string,"lead"?: Json | null,"linkedin_url"?: string,"person_key": string
                  }
                  Update: {
                    "company_id"?: string,"discovery_url"?: string,"email_id"?: string | null,"first_name"?: string,"first_seen_at"?: string,"full_name"?: string,"id"?: string,"job_title"?: string,"last_name"?: string,"last_verified_at"?: string,"lead"?: Json | null,"linkedin_url"?: string,"person_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "people_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "people_email_id_fkey"
      columns: ["email_id"]
isOneToOne: false
      referencedRelation: "emails"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "active": boolean,"credits": number,"credits_valid_months": number,"currency": string,"enrichment_per_run_max": number,"features": NonNullable<Json>,"highlighted": boolean,"id": string,"kind": string,"max_active_searches": number,"max_quantity_per_search": number,"max_users": number,"name": string,"price_cents": number,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"credits"?: number,"credits_valid_months"?: number,"currency"?: string,"enrichment_per_run_max"?: number,"features"?: NonNullable<Json>,"highlighted"?: boolean,"id": string,"kind": string,"max_active_searches"?: number,"max_quantity_per_search"?: number,"max_users"?: number,"name": string,"price_cents"?: number,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"credits"?: number,"credits_valid_months"?: number,"currency"?: string,"enrichment_per_run_max"?: number,"features"?: NonNullable<Json>,"highlighted"?: boolean,"id"?: string,"kind"?: string,"max_active_searches"?: number,"max_quantity_per_search"?: number,"max_users"?: number,"name"?: string,"price_cents"?: number,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"email_norm": string | null,"full_name": string,"is_admin": boolean,"seen_at": string | null,"signup_ip_hash": string | null,"since_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"email_norm"?: string | null,"full_name"?: string,"is_admin"?: boolean,"seen_at"?: string | null,"signup_ip_hash"?: string | null,"since_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"email_norm"?: string | null,"full_name"?: string,"is_admin"?: boolean,"seen_at"?: string | null,"signup_ip_hash"?: string | null,"since_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"run_costs": {
                  Row: {
                    "created_at": string,"id": number,"provider": string,"run_id": string,"total_eur": number,"unit_cost_eur": number,"units": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"provider": string,"run_id": string,"total_eur": number,"unit_cost_eur": number,"units": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"provider"?: string,"run_id"?: string,"total_eur"?: number,"unit_cost_eur"?: number,"units"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "run_costs_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "search_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"search_events": {
                  Row: {
                    "counters": NonNullable<Json>,"created_at": string,"id": number,"message": string,"run_id": string | null,"search_id": string,"stage": string
                  }
                  ComputedFields: never
                  Insert: {
                    "counters"?: NonNullable<Json>,"created_at"?: string,"id"?: never,"message"?: string,"run_id"?: string | null,"search_id": string,"stage": string
                  }
                  Update: {
                    "counters"?: NonNullable<Json>,"created_at"?: string,"id"?: never,"message"?: string,"run_id"?: string | null,"search_id"?: string,"stage"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "search_events_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "search_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "search_events_search_id_fkey"
      columns: ["search_id"]
isOneToOne: false
      referencedRelation: "searches"
      referencedColumns: ["id"]
    }
                  ]
                },"search_runs": {
                  Row: {
                    "attempt": number,"created_at": string,"enrichment_cap": number,"error": string | null,"finished_at": string | null,"id": string,"last_event_at": string,"n8n_execution_id": string | null,"requested": number,"run_token_hash": string,"search_id": string,"stats": Json | null,"status": string,"usage": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt": number,"created_at"?: string,"enrichment_cap"?: number,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"last_event_at"?: string,"n8n_execution_id"?: string | null,"requested": number,"run_token_hash": string,"search_id": string,"stats"?: Json | null,"status"?: string,"usage"?: Json | null
                  }
                  Update: {
                    "attempt"?: number,"created_at"?: string,"enrichment_cap"?: number,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"last_event_at"?: string,"n8n_execution_id"?: string | null,"requested"?: number,"run_token_hash"?: string,"search_id"?: string,"stats"?: Json | null,"status"?: string,"usage"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "search_runs_search_id_fkey"
      columns: ["search_id"]
isOneToOne: false
      referencedRelation: "searches"
      referencedColumns: ["id"]
    }
                  ]
                },"searches": {
                  Row: {
                    "archived_at": string | null,"deleted_at": string | null,"attempts": number,"contacts_per_company": number,"created_at": string,"created_by": string | null,"credits_charged": number,"credits_reserved": number,"delivered": number,"email_mode": string,"error": string | null,"finished_at": string | null,"id": string,"name": string,"next_repeat_at": string | null,"org_id": string,"quantity": number,"repeat": string,"repeat_of": string | null,"signal_prices": Json | null,"started_at": string | null,"status": string,"target": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"deleted_at"?: string | null,"attempts"?: number,"contacts_per_company"?: number,"created_at"?: string,"created_by"?: string | null,"credits_charged"?: number,"credits_reserved"?: number,"delivered"?: number,"email_mode": string,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"name": string,"next_repeat_at"?: string | null,"org_id": string,"quantity": number,"repeat"?: string,"repeat_of"?: string | null,"signal_prices"?: Json | null,"started_at"?: string | null,"status"?: string,"target": NonNullable<Json>
                  }
                  Update: {
                    "archived_at"?: string | null,"deleted_at"?: string | null,"attempts"?: number,"contacts_per_company"?: number,"created_at"?: string,"created_by"?: string | null,"credits_charged"?: number,"credits_reserved"?: number,"delivered"?: number,"email_mode"?: string,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"name"?: string,"next_repeat_at"?: string | null,"org_id"?: string,"quantity"?: number,"repeat"?: string,"repeat_of"?: string | null,"signal_prices"?: Json | null,"started_at"?: string | null,"status"?: string,"target"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "searches_email_mode_fkey"
      columns: ["email_mode"]
isOneToOne: false
      referencedRelation: "email_modes"
      referencedColumns: ["mode"]
    },{
      foreignKeyName: "searches_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "searches_repeat_of_fkey"
      columns: ["repeat_of"]
isOneToOne: false
      referencedRelation: "searches"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "id": string,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "cancel_at_period_end": boolean,"current_period_end": string | null,"org_id": string,"plan_id": string,"status": string,"stripe_subscription_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_at_period_end"?: boolean,"current_period_end"?: string | null,"org_id": string,"plan_id": string,"status": string,"stripe_subscription_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cancel_at_period_end"?: boolean,"current_period_end"?: string | null,"org_id"?: string,"plan_id"?: string,"status"?: string,"stripe_subscription_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_org_id_fkey"
      columns: ["org_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"support_tickets": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"org_id": string,"search_id": string | null,"status": string,"subject": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"org_id": string,"search_id"?: string | null,"status"?: string,"subject": string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"org_id"?: string,"search_id"?: string | null,"status"?: string,"subject"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_tickets_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "support_tickets_search_id_fkey"
      columns: ["search_id"]
isOneToOne: false
      referencedRelation: "searches"
      referencedColumns: ["id"]
    }
                  ]
                },"suppression_list": {
                  Row: {
                    "created_at": string,"domain_hash": string | null,"email_hash": string | null,"id": number,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain_hash"?: string | null,"email_hash"?: string | null,"id"?: never,"reason"?: string
                  }
                  Update: {
                    "created_at"?: string,"domain_hash"?: string | null,"email_hash"?: string | null,"id"?: never,"reason"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "org_balances": {
                  Row: {
                    "available": number | null,"org_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "credit_ledger_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "apply_engine_results":
{ Args: { "p_payload": Json,"p_run": string,"p_token_hash": string }; Returns: Json
                           },
"auto_refund_report":
{ Args: { "p_max_share": number,"p_report": string }; Returns: boolean
                           },
"check_run":
{ Args: { "p_run": string,"p_token_hash": string }; Returns: {
              "attempt": number,
"created_at": string,
"enrichment_cap": number,
"error": string | null,
"finished_at": string | null,
"id": string,
"last_event_at": string,
"n8n_execution_id": string | null,
"requested": number,
"run_token_hash": string,
"search_id": string,
"stats": Json | null,
"status": string,
"usage": Json | null
            }
                          SetofOptions: {
        from: "*"
        to: "search_runs"
        isOneToOne: true
        isSetofReturn: false
      } },
"company_name_key":
{ Args: { "p_name": string }; Returns: string
                           },
"create_search":
{ Args: { "p_contacts_per_company"?: number,"p_mode": string,"p_name": string,"p_org": string,"p_quantity": number,"p_target": Json,"p_user": string }; Returns: {
              "attempts": number,
"contacts_per_company": number,
"created_at": string,
"created_by": string | null,
"credits_charged": number,
"credits_reserved": number,
"delivered": number,
"email_mode": string,
"error": string | null,
"finished_at": string | null,
"id": string,
"name": string,
"next_repeat_at": string | null,
"org_id": string,
"quantity": number,
"repeat": string,
"repeat_of": string | null,
"signal_prices": Json | null,
"started_at": string | null,
"status": string,
"target": NonNullable<Json>
            }
                          SetofOptions: {
        from: "*"
        to: "searches"
        isOneToOne: true
        isSetofReturn: false
      } },
"credit_lots":
{ Args: { "p_org": string }; Returns: {
              "expired": number,"expires_at": string,"granted": number,"kind": string,"lot_id": number,"remaining": number
            }[]
                           },
"archive_search":
{ Args: { "p_archive": boolean,"p_org": string,"p_search": string }; Returns: number
                           },
"forget_deliveries":
{ Args: { "p_ids": string[],"p_org": string }; Returns: number
                           },
"rate_hit":
{ Args: { "p_key": string,"p_kind": string,"p_window": string,"p_max": number,"p_record"?: boolean }; Returns: boolean
                           },
"forget_search":
{ Args: { "p_org": string,"p_search": string }; Returns: number
                           },
"database_funnel":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"deliver_from_warehouse":
{ Args: { "p_max_age_days"?: number,"p_picks": Json,"p_search": string }; Returns: Json
                           },
"deliver_leads":
{ Args: { "p_leads": Json,"p_run": string,"p_search": string,"p_source": string }; Returns: Json
                           },
"enrichment_usage":
{ Args: { "p_search": string }; Returns: {
              "month_budget": number,"month_used": number,"search_used": number
            }[]
                           },
"expire_credits":
{ Args: { "p_org"?: string }; Returns: number
                           },
"fail_engine_run":
{ Args: { "p_error": string,"p_execution": string }; Returns: string
                           },
"finalize_search":
{ Args: { "p_error"?: string,"p_search": string }; Returns: {
              "attempts": number,
"contacts_per_company": number,
"created_at": string,
"created_by": string | null,
"credits_charged": number,
"credits_reserved": number,
"delivered": number,
"email_mode": string,
"error": string | null,
"finished_at": string | null,
"id": string,
"name": string,
"next_repeat_at": string | null,
"org_id": string,
"quantity": number,
"repeat": string,
"repeat_of": string | null,
"signal_prices": Json | null,
"started_at": string | null,
"status": string,
"target": NonNullable<Json>
            }
                          SetofOptions: {
        from: "*"
        to: "searches"
        isOneToOne: true
        isSetofReturn: false
      } },
"grant_credits":
{ Args: { "p_actor"?: string,"p_delta": number,"p_description": string,"p_expires_at"?: string,"p_external_ref"?: string,"p_kind": string,"p_org": string }; Returns: boolean
                           },
"industry_suggestions":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "companies": number,"industry": string
            }[]
                           },
"is_org_member":
{ Args: { "p_org": string }; Returns: boolean
                           },
"is_platform_domain":
{ Args: { "p_domain": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lead_credits":
{ Args: { "p_mode": string,"p_status": string,"p_type": string }; Returns: number
                           },
"normalize_email":
{ Args: { "p": string }; Returns: string
                           },
"opportunity_availability":
{ Args: { "p_contacts": number,"p_org": string,"p_target": Json }; Returns: number
                           },
"opportunity_pool":
{ Args: { "p_contacts": number,"p_exclude": (string)[],"p_org": string,"p_target": Json }; Returns: {
              "ad_url": string,"city": string,"country": string,"domain": string,"id": string,"industry": string,"latest": string,"name": string,"signals": Json,"size_hint": string,"technologies": (string)[],"website": string
            }[]
                           },
"opportunity_reserve":
{ Args: { "p_exclude": (string)[],"p_limit": number,"p_search": string }; Returns: Json
                           },
"org_available_credits":
{ Args: { "p_org": string }; Returns: number
                           },
"pending_ad_companies":
{ Args: { "p_limit": number }; Returns: {
              "ads": number,"city": string,"company_key": string,"company_name": string
            }[]
                           },
"pending_industry_companies":
{ Args: { "p_limit": number }; Returns: {
              "ads": number,"city": string,"company_id": string,"company_name": string,"website": string
            }[]
                           },
"pending_site_checks":
{ Args: { "p_limit": number }; Returns: {
              "company_id": string,"domain": string,"name": string,"website": string
            }[]
                           },
"purge_stale_warehouse":
{ Args: { "p_months"?: number }; Returns: Json
                           },
"purge_suppressed":
{ Args: { "p_domain_hash": string,"p_email_hash": string }; Returns: number
                           },
"record_company_checks":
{ Args: { "p_items": Json,"p_run": string,"p_token_hash": string }; Returns: number
                           },
"record_engine_progress":
{ Args: { "p_counters": Json,"p_message": string,"p_run": string,"p_stage": string,"p_token_hash": string }; Returns: boolean
                           },
"refund_report":
{ Args: { "p_actor"?: string,"p_approve": boolean,"p_report": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"delivery_id": string,
"id": string,
"note": string,
"org_id": string,
"reason": string,
"refund_credits": number,
"resolved_at": string | null,
"resolved_by": string | null,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "lead_reports"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_required_signals":
{ Args: { "p_target": Json }; Returns: (string)[]
                           },
"search_signal_codes":
{ Args: { "p_target": Json }; Returns: (string)[]
                           },
"sha256_hex":
{ Args: { "p": string }; Returns: string
                           },
"signal_extra":
{ Args: { "p_codes": (string)[],"p_prices": Json }; Returns: number
                           },
"signal_is_fresh":
{ Args: { "p_checked_at": string,"p_code": string,"p_evidence": Json }; Returns: boolean
                           },
"signal_prices":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"signals_satisfy":
{ Args: { "p_passed": (string)[],"p_target": Json }; Returns: boolean
                           },
"site_check_codes":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"start_run":
{ Args: { "p_requested": number,"p_search": string,"p_token_hash": string }; Returns: {
              "attempt": number,
"created_at": string,
"enrichment_cap": number,
"error": string | null,
"finished_at": string | null,
"id": string,
"last_event_at": string,
"n8n_execution_id": string | null,
"requested": number,
"run_token_hash": string,
"search_id": string,
"stats": Json | null,
"status": string,
"usage": Json | null
            }
                          SetofOptions: {
        from: "*"
        to: "search_runs"
        isOneToOne: true
        isSetofReturn: false
      } },
"stock_lead":
{ Args: { "p_lead": Json,"p_target": Json }; Returns: {
              "company_id": string,"email_id": string,"person_id": string
            }[]
                           },
"store_company_checks":
{ Args: { "p_items": Json,"p_origin": string,"p_target": Json }; Returns: number
                           },
"store_company_industries":
{ Args: { "p_items": Json }; Returns: Json
                           },
"store_company_resolutions":
{ Args: { "p_items": Json }; Returns: Json
                           },
"search_cost_eur":
{ Args: { "p_search": string }; Returns: number
                           },
"store_imported_companies":
{ Args: { "p_items": Json,"p_source": string }; Returns: Json
                           },
"store_job_ads":
{ Args: { "p_ads": Json,"p_source": string }; Returns: Json
                           },
"tag_company":
{ Args: { "p_company": string,"p_target": Json }; Returns: undefined
                           },
"target_availability":
{ Args: { "p_contacts": number,"p_org": string,"p_target": Json }; Returns: number
                           },
"target_is_simple":
{ Args: { "p_target": Json }; Returns: boolean
                           },
"target_pool":
{ Args: { "p_contacts": number,"p_exclude": (string)[],"p_org": string,"p_target": Json }; Returns: {
              "checked_at": string,"city": string,"country": string,"domain": string,"id": string,"industry": string,"name": string,"size_hint": string,"technologies": (string)[],"website": string
            }[]
                           },
"target_reserve":
{ Args: { "p_exclude": (string)[],"p_limit": number,"p_search": string }; Returns: Json
                           },
"term_stems":
{ Args: { "p": string }; Returns: (string)[]
                           },
"verified_signal_codes":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"warehouse_candidates":
{ Args: { "p_limit"?: number,"p_max_age_days"?: number,"p_only"?: (string)[],"p_search": string }; Returns: {
              "job_title": string,"lead": Json,"person_id": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
