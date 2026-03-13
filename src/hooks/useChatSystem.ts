import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatRoom {
  id: string;
  name: string | null;
  room_type: 'direct' | 'group';
  description: string | null;
  property_id: string | null;
  created_by: string | null;
  avatar_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  members?: ChatRoomMember[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  role: 'admin' | 'member';
  last_read_at: string;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_name: string;
  content: string;
  message_type: 'text' | 'system' | 'file' | 'image';
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Fetches all chat rooms the current user is a member of */
export function useChatRooms() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Realtime: refresh when rooms or members change
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('chat-rooms-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_members' }, () => {
        qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ['chat-rooms', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get rooms the user belongs to
      const { data: membershipData, error: membershipError } = await (supabase
        .from('chat_room_members' as any)
        .select('room_id, last_read_at, role, display_name')
        .eq('user_id', user!.id) as any);

      if (membershipError) throw membershipError;
      if (!membershipData?.length) return [];

      const roomIds = membershipData.map(m => m.room_id);

      // Get room details with member list
      const { data: rooms, error: roomsError } = await (supabase
        .from('chat_rooms' as any)
        .select('*, chat_room_members(id, user_id, display_name, role, last_read_at)')
        .in('id', roomIds)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false }) as any);

      if (roomsError) throw roomsError;

      // Get last message per room
      const roomsWithMeta = await Promise.all((rooms || []).map(async (room: any) => {
        const { data: messages } = await supabase
          .from('chat_messages' as any)
          .select('*')
          .eq('room_id', room.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);

        const myMembership = membershipData.find(m => m.room_id === room.id);
        const lastMessage = messages?.[0] || null;

        // Count unread messages
        const { count: unreadCount } = await (supabase
          .from('chat_messages' as any)
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_deleted', false)
          .neq('sender_id', user!.id)
          .gt('created_at', myMembership?.last_read_at || '1970-01-01') as any);

        return {
          ...room,
          lastMessage,
          unreadCount: unreadCount || 0,
          myRole: myMembership?.role,
          myLastRead: myMembership?.last_read_at,
        };
      }));

      return roomsWithMeta;
    },
  });
}

/** Fetches messages for a specific room, with realtime subscription */
export function useChatMessages(roomId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`chat-messages-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['chat-messages', roomId] });
        qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, qc]);

  return useQuery({
    queryKey: ['chat-messages', roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('chat_messages'as any)
        .select('*')
        .eq('room_id', roomId!)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)as any);
      if (error) throw error;
      return data as ChatMessage[];
    },
  });
}

/** Sends a message to a room */
export function useSendMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, content, messageType = 'text', replyToId }: {
      roomId: string;
      content: string;
      messageType?: ChatMessage['message_type'];
      replyToId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const senderName = user.user_metadata?.full_name || user.email || 'Unknown';
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .insert({
          room_id: roomId,
          sender_id: user.id,
          sender_name: senderName,
          content,
          message_type: messageType,
          reply_to_id: replyToId || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Update room's updated_at so it floats to top
      await supabase.from('chat_rooms'as any).update({ updated_at: new Date().toISOString() }).eq('id', roomId);
      return data;
    },
    onSuccess: (_, { roomId }) => {
      qc.invalidateQueries({ queryKey: ['chat-messages', roomId] });
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

/** Creates a new DM or group chat room */
export function useCreateChatRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, roomType, memberUserIds, description, propertyId }: {
      name?: string;
      roomType: 'direct' | 'group';
      memberUserIds: string[];
      description?: string;
      propertyId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // For DMs: check if one already exists between these two users
      if (roomType === 'direct' && memberUserIds.length === 1) {
        const otherUserId = memberUserIds[0];
        const { data: existingRooms } = await supabase
          .from('chat_room_members'as any)
          .select('room_id')
          .eq('user_id', user.id);

        const { data: otherRooms } = await supabase
          .from('chat_room_members'as any)
          .select('room_id')
          .eq('user_id', otherUserId);

        // Find rooms both users share that are direct type
        if (existingRooms && otherRooms) {
          const myRoomIds = existingRooms.map((r: any) => r.room_id);
          const sharedRoomIds = otherRooms
            .filter((r: any) => myRoomIds.includes(r.room_id))
            .map((r: any) => r.room_id);

          if (sharedRoomIds.length > 0) {
            const { data: existingDm } = await (supabase
              .from('chat_rooms'as any)
              .select('*')
              .in('id', sharedRoomIds)
              .eq('room_type', 'direct')
              .single() as any);
            if (existingDm) return existingDm;
          }
        }
      }

      // Create the room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms' as any)
        .insert({
          name: roomType === 'group' ? (name || 'New Group') : null,
          room_type: roomType,
          created_by: user.id,
          description: description || null,
          property_id: propertyId || null,
        })
        .select()
        .single() as any;
      if (roomError) throw roomError;

      // Add creator + all members
      const allMembers = [user.id, ...memberUserIds];
      const senderName = user.user_metadata?.full_name || user.email || 'Unknown';

      const membersToInsert = allMembers.map((uid, idx) => ({
        room_id: room.id,
        user_id: uid,
        role: idx === 0 ? 'admin' : 'member',
        display_name: idx === 0 ? senderName : null,
      }));

      const { error: memberError } = await supabase
        .from('chat_room_members' as any)
        .insert(membersToInsert);
      if (memberError) throw memberError;

      // System message
      await supabase.from('chat_messages' as any).insert({
        room_id: room.id,
        sender_id: null,
        sender_name: 'System',
        content: roomType === 'group'
          ? `${senderName} created the group "${name}"`
          : `Conversation started`,
        message_type: 'system',
      });

      return room;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

/** Marks all messages in a room as read by the current user */
export function useMarkRoomRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!user) return;
      await (supabase
        .from('chat_room_members'as any)
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id)as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

/** Fetches all users (admins, managers, agents, owners) for member picker */
export function useChatableUsers() {
  return useQuery({
    queryKey: ['chatable-users'],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;

      // Get auth user details (name/email) from profiles or owners table
      const userIds = (data || []).map(u => u.user_id);
      if (!userIds.length) return [];

      // Try getting names from owners table
      const { data: owners } = await supabase
        .from('owners')
        .select('user_id, name, email')
        .in('user_id', userIds);

      return (data || []).map(ur => {
        const owner = owners?.find(o => o.user_id === ur.user_id);
        return {
          user_id: ur.user_id,
          role: ur.role,
          display_name: owner?.name || owner?.email || ur.user_id.slice(0, 8),
          email: owner?.email,
        };
      });
    },
  });
}
