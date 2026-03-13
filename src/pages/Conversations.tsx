import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import ConversationChat from '@/components/ConversationChat'; // External Lead Chat
import { useConversationThreads } from '@/hooks/useConversationThreads';
import { useChatRooms, useChatMessages, useSendMessage, useCreateChatRoom, useMarkRoomRead, useChatableUsers } from '@/hooks/useChatSystem'; // Internal Team Chat
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Search, ArrowLeft, MoreVertical, Phone, MapPin, Users, User, Plus, Hash, Send, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow, isToday, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return isToday(date) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formatDistanceToNow(date, { addSuffix: true }).replace('about ', '');
};

const Conversations = () => {
  const { user } = useAuth();
  
  // --- LEADS STATE (External) ---
  const { data: leadThreads, isLoading: leadsLoading } = useConversationThreads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  // --- TEAM STATE (Internal) ---
  const { data: teamRooms, isLoading: teamLoading } = useChatRooms();
  const { data: chatableUsers } = useChatableUsers();
  const [activeTeamRoomId, setActiveTeamRoomId] = useState<string | null>(null);
  const [newTeamMessage, setNewTeamMessage] = useState('');
  
  const { data: teamMessages, isLoading: teamMessagesLoading } = useChatMessages(activeTeamRoomId);
  const sendTeamMessage = useSendMessage();
  const createTeamRoom = useCreateChatRoom();
  const markTeamRead = useMarkRoomRead();
  const teamMessagesEndRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'team'>('leads');

  // --- LEADS LOGIC ---
  const selectedLeadThread = leadThreads?.find(t => t.leadId === selectedLeadId);
  const filteredLeads = leadThreads?.filter(t => t.leadName.toLowerCase().includes(search.toLowerCase()) || t.leadPhone.includes(search)) || [];

  // --- TEAM LOGIC ---
  useEffect(() => {
    teamMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [teamMessages]);

  useEffect(() => {
    if (activeTeamRoomId) markTeamRead.mutate(activeTeamRoomId);
  }, [activeTeamRoomId, teamMessages]);

  const activeTeamRoom = teamRooms?.find(r => r.id === activeTeamRoomId);
  const directTeamRooms = teamRooms?.filter(r => r.room_type === 'direct') || [];
  const groupTeamRooms = teamRooms?.filter(r => r.room_type === 'group') || [];
  const availableTeamUsers = chatableUsers?.filter(u => u.user_id !== user?.id) || [];

  const handleSendTeamMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamMessage.trim() || !activeTeamRoomId) return;
    try {
      await sendTeamMessage.mutateAsync({ roomId: activeTeamRoomId, content: newTeamMessage.trim() });
      setNewTeamMessage('');
    } catch (err: any) {
      toast.error('Failed to transmit message.');
    }
  };

  const handleStartTeamDM = async (targetUserId: string) => {
    try {
      const room = await createTeamRoom.mutateAsync({ roomType: 'direct', memberUserIds: [targetUserId] });
      setActiveTeamRoomId(room.id);
      toast.success('Secure channel established.');
    } catch (err: any) {
      toast.error('Failed to open channel.');
    }
  };

  // --- MOBILE VIEW LOGIC ---
  const showChatMobile = (activeTab === 'leads' && selectedLeadId !== null) || (activeTab === 'team' && activeTeamRoomId !== null);

  if (leadsLoading || teamLoading) {
    return (
      <AppLayout title="Communications" subtitle="Omnichannel messaging hub">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          <div className="w-full md:w-[360px] space-y-3">
            <Skeleton className="h-14 rounded-2xl" />
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="hidden md:block flex-1 rounded-[2rem]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Communications" subtitle="Omnichannel messaging hub">
      <div className="flex gap-6 h-[calc(100vh-140px)]">
        
        {/* Left Sidebar: Inbox List */}
        <motion.div
          className={`w-full md:w-[360px] md:shrink-0 flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden shadow-sm ${showChatMobile ? 'hidden md:flex' : 'flex'}`}
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-border/50 bg-background/50">
              <TabsList className="w-full grid grid-cols-2 bg-secondary/50 rounded-xl p-1 mb-4">
                <TabsTrigger value="leads" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Sales / Leads</TabsTrigger>
                <TabsTrigger value="team" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Internal Team</TabsTrigger>
              </TabsList>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-info/20 rounded-[1rem] blur opacity-50 group-focus-within:opacity-100 transition duration-500" />
                <div className="relative flex items-center gap-3 bg-background border border-border/50 rounded-xl px-4 py-2.5 shadow-sm">
                  <Search size={14} className="text-muted-foreground" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                    className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <AnimatePresence mode="wait">
                
                {/* TAB 1: LEADS INBOX */}
                <TabsContent value="leads" className="m-0 space-y-1">
                  {filteredLeads.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                      <MessageCircle size={32} className="mb-3" />
                      <p className="text-sm font-bold uppercase tracking-widest">Inbox Zero</p>
                    </div>
                  ) : (
                    filteredLeads.map(t => {
                      const isActive = selectedLeadId === t.leadId;
                      const isUnread = Math.random() > 0.8 && !isActive; 
                      return (
                        <motion.button key={t.leadId} onClick={() => setSelectedLeadId(t.leadId)} className={`w-full text-left p-3 rounded-xl transition-all duration-300 group flex items-start gap-3 ${isActive ? 'bg-accent/10 text-accent-foreground shadow-sm' : 'hover:bg-secondary/80'}`}>
                          <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-inner ${isActive ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground group-hover:bg-background'}`}>
                              {t.leadName.charAt(0)}
                            </div>
                            {isUnread && <div className="absolute top-0 right-0 w-3 h-3 bg-warning rounded-full border-2 border-card" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-bold truncate ${isActive ? 'text-accent' : 'text-foreground'}`}>{t.leadName}</p>
                              <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ml-2 text-muted-foreground">{formatTime(t.lastMessageAt)}</span>
                            </div>
                            <p className={`text-xs font-medium line-clamp-1 mb-1.5 ${isActive ? 'text-accent-foreground' : isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>{t.lastMessage}</p>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[8px] uppercase tracking-widest font-black border-none bg-background/50 text-muted-foreground">{t.channel}</Badge>
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </TabsContent>

                {/* TAB 2: INTERNAL TEAM INBOX */}
                <TabsContent value="team" className="m-0 space-y-4">
                  <div className="px-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm">
                          <Plus size={14} className="mr-2" /> New Direct Message
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px] p-0 rounded-2xl border-border bg-card">
                        <div className="p-4 border-b border-border bg-secondary/30">
                          <DialogTitle className="font-bold text-lg">Initialize Secure Channel</DialogTitle>
                        </div>
                        <div className="p-2 max-h-[50vh] overflow-y-auto">
                          {availableTeamUsers.map(u => (
                            <div key={u.user_id} onClick={() => handleStartTeamDM(u.user_id)} className="flex items-center justify-between p-3 hover:bg-secondary/80 rounded-xl cursor-pointer transition-colors">
                              <div>
                                <p className="text-sm font-bold text-foreground">{u.display_name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{u.role}</p>
                              </div>
                              <MessageCircle size={16} className="text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {directTeamRooms.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 mb-2 flex items-center gap-2"><User size={12} /> Direct Messages</p>
                      <div className="space-y-1">
                        {directTeamRooms.map(room => {
                          const otherMember = room.chat_room_members?.find((m: any) => m.user_id !== user?.id);
                          const isActive = activeTeamRoomId === room.id;
                          return (
                            <button key={room.id} onClick={() => setActiveTeamRoomId(room.id)} className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-secondary/80'}`}>
                              <div className="relative shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                  {otherMember?.display_name?.charAt(0) || '?'}
                                </div>
                                {(room.unreadCount || 0) > 0 && <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-destructive text-white rounded-full border-2 border-card text-[8px]">{room.unreadCount}</Badge>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-sm font-bold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{otherMember?.display_name || 'Unknown'}</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{room.lastMessage?.content || 'No messages yet'}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {groupTeamRooms.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 mb-2 flex items-center gap-2"><Users size={12} /> Squads</p>
                      <div className="space-y-1">
                        {groupTeamRooms.map(room => {
                          const isActive = activeTeamRoomId === room.id;
                          return (
                            <button key={room.id} onClick={() => setActiveTeamRoomId(room.id)} className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-secondary/80'}`}>
                              <div className="relative shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                  <Hash size={16} />
                                </div>
                                {(room.unreadCount || 0) > 0 && <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-destructive text-white rounded-full border-2 border-card text-[8px]">{room.unreadCount}</Badge>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-sm font-bold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{room.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{room.lastMessage?.content || 'No messages yet'}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

              </AnimatePresence>
            </div>
          </Tabs>
        </motion.div>

        {/* Right Area: Chat Window */}
        <motion.div
          className={`flex-1 bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden shadow-sm ${showChatMobile ? 'flex flex-col' : 'hidden md:flex md:flex-col'}`}
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
        >
          
          {/* ======================================================= */}
          {/* LEADS CHAT RENDER */}
          {/* ======================================================= */}
          {activeTab === 'leads' ? (
            selectedLeadId ? (
              <>
                <div className="px-6 py-4 border-b border-border/40 bg-background/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {showChatMobile && (
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLeadId(null)} className="md:hidden h-8 w-8 rounded-xl shrink-0"><ArrowLeft size={16} /></Button>
                    )}
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-lg shrink-0">
                      {selectedLeadThread?.leadName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-0.5">
                        <h2 className="text-lg font-extrabold tracking-tight text-foreground">{selectedLeadThread?.leadName}</h2>
                        {selectedLeadThread?.leadStatus && (
                          <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black border-accent/30 text-accent bg-accent/5">
                            {selectedLeadThread.leadStatus.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-semibold text-muted-foreground">
                        {selectedLeadThread?.leadLocation && <span className="flex items-center gap-1"><MapPin size={12}/> {selectedLeadThread.leadLocation}</span>}
                        {selectedLeadThread?.leadBudget && <span className="flex items-center gap-1 text-foreground">₹{selectedLeadThread.leadBudget}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-transparent to-background/50">
                  <ConversationChat leadId={selectedLeadId} leadName={selectedLeadThread?.leadName || ''} leadBudget={selectedLeadThread?.leadBudget} leadLocation={selectedLeadThread?.leadLocation} leadStatus={selectedLeadThread?.leadStatus} />
                </div>
              </>
            ) : <EmptyState message="Select a lead to continue the sales dialogue." />
          ) : (

          /* ======================================================= */
          /* TEAM CHAT RENDER */
          /* ======================================================= */
            activeTeamRoomId ? (
              <>
                <div className="px-6 py-4 border-b border-border/40 bg-background/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {showChatMobile && (
                      <Button variant="ghost" size="icon" onClick={() => setActiveTeamRoomId(null)} className="md:hidden h-8 w-8 rounded-xl shrink-0"><ArrowLeft size={16} /></Button>
                    )}
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        {activeTeamRoom?.room_type === 'group' && <Hash size={18} className="text-muted-foreground" />}
                        {activeTeamRoom?.room_type === 'group' ? activeTeamRoom.name : activeTeamRoom?.chat_room_members?.find((m: any) => m.user_id !== user?.id)?.display_name}
                      </h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-0.5">Secure Internal Uplink</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-gradient-to-b from-transparent to-background/50">
                  {teamMessagesLoading ? (
                     <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-primary" /></div>
                  ) : (
                    teamMessages?.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      if (msg.message_type === 'system') {
                        return (
                          <div key={msg.id} className="text-center my-4">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-secondary px-3 py-1 rounded-full">{msg.content}</span>
                          </div>
                        );
                      }
                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-[10px] font-bold text-muted-foreground">{isMe ? 'You' : msg.sender_name}</span>
                            <span className="text-[9px] font-mono text-muted-foreground/60">{format(new Date(msg.created_at), 'HH:mm')}</span>
                          </div>
                          <div className={`px-4 py-2.5 max-w-[75%] text-sm font-medium ${isMe ? 'bg-primary text-primary-foreground rounded-l-2xl rounded-br-2xl shadow-sm' : 'bg-card border border-border shadow-sm text-foreground rounded-r-2xl rounded-bl-2xl'}`}>
                            {msg.content}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={teamMessagesEndRef} />
                </div>

                <form onSubmit={handleSendTeamMessage} className="p-4 bg-background/50 border-t border-border/40 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea 
                      value={newTeamMessage} onChange={e => setNewTeamMessage(e.target.value)} placeholder="Type a message..." rows={1}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendTeamMessage(e as any); } }}
                      className="flex-1 resize-none bg-card rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                    />
                    <Button type="submit" disabled={!newTeamMessage.trim() || sendTeamMessage.isPending} className="h-11 w-11 p-0 shrink-0 rounded-2xl shadow-md">
                      {sendTeamMessage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </Button>
                  </div>
                </form>
              </>
            ) : <EmptyState message="Select a team member or squad to establish comms." />
          )}

        </motion.div>
      </div>
    </AppLayout>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8 relative">
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />
    <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-6 shadow-inner relative z-10 border border-border/50">
      <MessageCircle size={40} className="text-muted-foreground/50" />
    </div>
    <h3 className="text-2xl font-extrabold tracking-tight mb-2 relative z-10">Select a conversation</h3>
    <p className="text-muted-foreground font-medium max-w-sm relative z-10">{message}</p>
  </div>
);

export default Conversations;