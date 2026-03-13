-- =====================================================
-- CHAT SYSTEM — internal comms for 30 admins + 50 owners
-- =====================================================

-- chat_rooms: DM or group conversation container
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT, -- NULL for DMs (name computed from members), required for groups
  room_type   TEXT NOT NULL DEFAULT 'direct' CHECK (room_type IN ('direct','group')),
  description TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES auth.users(id),
  avatar_url  TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- chat_room_members: who is in each room
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id         UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name    TEXT, -- cached from user metadata
  role            TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
  last_read_at    TIMESTAMPTZ DEFAULT NOW(),
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  is_muted        BOOLEAN DEFAULT FALSE,
  UNIQUE(room_id, user_id)
);

-- chat_messages: individual messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id       UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name   TEXT NOT NULL, -- cached for display even if user deleted
  content       TEXT NOT NULL,
  message_type  TEXT DEFAULT 'text' CHECK (message_type IN ('text','system','file','image')),
  reply_to_id   UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_edited     BOOLEAN DEFAULT FALSE,
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat rooms: user can see rooms they are a member of
CREATE POLICY "chat_rooms_member_select" ON public.chat_rooms FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = chat_rooms.id AND user_id = auth.uid())
);

CREATE POLICY "chat_rooms_insert" ON public.chat_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "chat_rooms_update_admin" ON public.chat_rooms FOR UPDATE TO authenticated USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.chat_room_members
    WHERE room_id = chat_rooms.id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- Chat members: users can see members of rooms they belong to
CREATE POLICY "chat_room_members_select" ON public.chat_room_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_room_members m2 WHERE m2.room_id = chat_room_members.room_id AND m2.user_id = auth.uid())
);

CREATE POLICY "chat_room_members_insert" ON public.chat_room_members FOR INSERT TO authenticated WITH CHECK (
  -- room creator or admin can add members
  EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_room_members WHERE room_id = chat_room_members.room_id AND user_id = auth.uid() AND role = 'admin'
  )
  -- OR a user can add themselves (joining public group)
  OR auth.uid() = user_id
);

CREATE POLICY "chat_room_members_update_self" ON public.chat_room_members FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
);

-- Chat messages: members of the room can read/write
CREATE POLICY "chat_messages_member_select" ON public.chat_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
);

CREATE POLICY "chat_messages_member_insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
);

CREATE POLICY "chat_messages_sender_update" ON public.chat_messages FOR UPDATE TO authenticated USING (
  sender_id = auth.uid()
);

-- Triggers for updated_at
CREATE TRIGGER chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime on all chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Index for fast message retrieval per room
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON public.chat_messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON public.chat_room_members (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room ON public.chat_room_members (room_id);
