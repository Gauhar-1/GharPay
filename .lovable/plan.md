

# Implementation Plan: Phases 4, 2, 5, 6, 7

This is a comprehensive build across all remaining phases. Due to the scope, I'll execute in batches.

---

## Batch 1: Database Migration

Single SQL migration creating 3 tables + 3 triggers + realtime:

**Tables:**
- `notifications` (id uuid, user_id uuid, type text, title text, body text, link text nullable, is_read bool default false, created_at timestamptz default now()) -- RLS: authenticated users read/update WHERE user_id = auth.uid()
- `activity_log` (id uuid, lead_id uuid FK leads on delete cascade, agent_id uuid nullable, action text, metadata jsonb default '{}', created_at timestamptz default now()) -- RLS: authenticated read all, insert all
- `message_templates` (id uuid, name text, body text, channel text default 'whatsapp', created_at timestamptz default now()) -- RLS: authenticated full CRUD

**Triggers (SECURITY DEFINER functions):**
- `log_lead_status_change`: AFTER UPDATE on leads, when OLD.status != NEW.status, inserts into activity_log
- `log_lead_agent_change`: AFTER UPDATE on leads, when OLD.assigned_agent_id != NEW.assigned_agent_id, inserts into activity_log
- `log_visit_change`: AFTER INSERT OR UPDATE on visits, inserts into activity_log

**Realtime:** Enable on leads, notifications, activity_log, conversations

---

## Batch 2: Notifications System (Phase 4)

**New files:**
- `src/hooks/useNotifications.ts` -- query notifications for current user + realtime subscription + mark-as-read mutation
- `src/hooks/useActivityLog.ts` -- query activity_log by lead_id
- `src/components/NotificationBell.tsx` -- bell icon with unread count popover, grouped by Today/Yesterday/Earlier, click marks read

**Modified:**
- `src/components/AppLayout.tsx` -- add NotificationBell next to search button
- `src/components/LeadDetailDrawer.tsx` -- replace static timeline tab with activity_log data

---

## Batch 3: Conversations Hub (Phase 2)

**Full rebuild of `src/pages/Conversations.tsx`:**
- Split-pane: left = thread list (conversations grouped by lead_id with lead name, last message preview, unread count, channel badge), right = chat view with message bubbles + composer
- Template quick-reply picker from message_templates table

**New files:**
- `src/hooks/useConversationThreads.ts` -- fetch all conversations with lead join, group by lead_id client-side
- `src/components/ConversationChat.tsx` -- chat bubbles + message composer + template picker

---

## Batch 4: Advanced Analytics (Phase 5)

**Full rebuild of `src/pages/Analytics.tsx`** with 5 sections:
1. Conversion funnel -- custom horizontal bars showing count + drop-off % per pipeline stage
2. Lead source ROI -- grouped bar chart (leads vs bookings per source)
3. Agent leaderboard -- ranked table with conversion rate, avg response time, active leads
4. Time-to-close -- bar chart, avg days from creation to "booked" by source
5. Weekly trends -- line chart for lead volume over last 8 weeks

All computed client-side from existing leads/agents queries.

---

## Batch 5: Settings & Historical (Phase 6)

**Full rebuild of `src/pages/SettingsPage.tsx`** with tabs:
- Team: list agents, add/edit/delete agent
- Properties: CRUD for properties table
- Profile: update name, change password via supabase.auth.updateUser

**Full rebuild of `src/pages/Historical.tsx`:**
- CSV file upload, client-side parse, column mapping UI, preview table, bulk insert into leads
- Searchable/sortable table of all leads (oldest first)

---

## Batch 6: Realtime & Smart Features (Phase 7)

- `src/pages/Dashboard.tsx` -- add realtime subscription to leads table, invalidate queries on changes
- `src/components/AddLeadDialog.tsx` -- before insert, check phone for duplicates, show warning if match
- `src/pages/Pipeline.tsx` -- add "Stale" badge on cards where last_activity_at > 7 days, add quick action icons (call tel:, WhatsApp wa.me)
- `src/components/LeadCard.tsx` -- accept optional `stale` and `quickActions` props

---

## File Summary

| Action | File |
|--------|------|
| Migration | 3 tables + 3 triggers + realtime |
| Create | `src/hooks/useNotifications.ts` |
| Create | `src/hooks/useActivityLog.ts` |
| Create | `src/hooks/useConversationThreads.ts` |
| Create | `src/components/NotificationBell.tsx` |
| Create | `src/components/ConversationChat.tsx` |
| Create | `src/components/CsvImport.tsx` |
| Modify | `src/components/AppLayout.tsx` |
| Modify | `src/components/LeadDetailDrawer.tsx` |
| Modify | `src/components/LeadCard.tsx` |
| Modify | `src/components/AddLeadDialog.tsx` |
| Modify | `src/pages/Conversations.tsx` |
| Modify | `src/pages/Analytics.tsx` |
| Modify | `src/pages/SettingsPage.tsx` |
| Modify | `src/pages/Historical.tsx` |
| Modify | `src/pages/Dashboard.tsx` |
| Modify | `src/pages/Pipeline.tsx` |

