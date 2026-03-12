import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ConversationChat from '@/components/ConversationChat';
import { useConversationThreads } from '@/hooks/useConversationThreads';
import { MessageCircle, Search, ArrowLeft, MoreVertical, Phone, Star, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return isToday(date) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formatDistanceToNow(date, { addSuffix: true }).replace('about ', '');
};

const Conversations = () => {
  const { data: threads, isLoading } = useConversationThreads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const selectedThread = threads?.find(t => t.leadId === selectedLeadId);

  const filtered = threads?.filter(t =>
    t.leadName.toLowerCase().includes(search.toLowerCase()) ||
    t.leadPhone.includes(search)
  ) || [];

  if (isLoading) {
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

  // Mobile: show chat view when a thread is selected
  const showChatMobile = selectedLeadId !== null;

  return (
    <AppLayout title="Communications" subtitle="Omnichannel messaging hub">
      <div className="flex gap-6 h-[calc(100vh-140px)]">
        
        {/* The Inbox Sidebar */}
        <motion.div
          className={`w-full md:w-[360px] md:shrink-0 flex flex-col gap-4 ${showChatMobile ? 'hidden md:flex' : 'flex'}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Global Search */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-info/20 rounded-[1.5rem] blur opacity-50 group-focus-within:opacity-100 transition duration-500" />
            <div className="relative flex items-center gap-3 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
              <Search size={16} className="text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search leads, numbers..."
                className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filtered.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <MessageCircle size={32} className="mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">Inbox Zero</p>
              </div>
            )}
            <AnimatePresence>
              {filtered.map(t => {
                const isActive = selectedLeadId === t.leadId;
                // Simulating an unread state for visual texture
                const isUnread = Math.random() > 0.8 && !isActive; 
                
                return (
                  <motion.button
                    key={t.leadId}
                    layout
                    onClick={() => setSelectedLeadId(t.leadId)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group ${
                      isActive 
                        ? 'bg-accent text-accent-foreground border-accent shadow-lg shadow-accent/20' 
                        : 'bg-card/40 backdrop-blur-sm border-border/50 hover:bg-secondary/80 hover:border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar / Unread Indicator */}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-inner ${
                          isActive ? 'bg-background/20 text-background' : 'bg-secondary text-muted-foreground group-hover:bg-background'
                        }`}>
                          {t.leadName.charAt(0)}
                        </div>
                        {isUnread && <div className="absolute top-0 right-0 w-3 h-3 bg-warning rounded-full border-2 border-card" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-extrabold truncate ${isActive ? 'text-accent-foreground' : 'text-foreground'}`}>
                            {t.leadName}
                          </p>
                          <span className={`text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ml-2 ${isActive ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                            {formatTime(t.lastMessageAt)}
                          </span>
                        </div>
                        
                        <p className={`text-xs font-medium line-clamp-1 mb-2 ${isActive ? 'text-accent-foreground/90' : isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {t.lastMessage}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`px-2 py-0.5 text-[9px] uppercase tracking-widest font-black border-none ${
                            isActive ? 'bg-background/20 text-background' : 'bg-background/50 text-muted-foreground'
                          }`}>
                            {t.channel}
                          </Badge>
                          <span className={`text-[10px] font-semibold truncate ${isActive ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                            {t.leadPhone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          className={`flex-1 bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-sm ${
            showChatMobile ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
        >
          {selectedLeadId ? (
            <>
              {/* Dynamic Chat Header */}
              <div className="px-6 py-4 border-b border-border/40 bg-background/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {showChatMobile && (
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLeadId(null)} className="md:hidden h-8 w-8 rounded-xl shrink-0">
                      <ArrowLeft size={16} />
                    </Button>
                  )}
                  
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-lg shrink-0">
                    {selectedThread?.leadName.charAt(0)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-0.5">
                      <h2 className="text-lg font-extrabold tracking-tight text-foreground">{selectedThread?.leadName}</h2>
                      {selectedThread?.leadStatus && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black border-accent/30 text-accent bg-accent/5">
                          {selectedThread.leadStatus.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] font-semibold text-muted-foreground">
                      {selectedThread?.leadLocation && <span className="flex items-center gap-1"><MapPin size={12}/> {selectedThread.leadLocation}</span>}
                      {selectedThread?.leadBudget && <span className="flex items-center gap-1 text-foreground">₹{selectedThread.leadBudget}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/50 bg-background/50 hover:bg-success hover:text-success-foreground hover:border-success transition-all shadow-sm">
                    <Phone size={16} />
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/50 bg-background/50 hover:bg-secondary transition-all shadow-sm">
                    <MoreVertical size={16} />
                  </Button>
                </div>
              </div>

              {/* Chat Engine Container */}
              <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-transparent to-background/50">
                <ConversationChat leadId={selectedLeadId} leadName={selectedThread?.leadName || ''} leadBudget={selectedThread?.leadBudget} leadLocation={selectedThread?.leadLocation} leadStatus={selectedThread?.leadStatus} />
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-8 relative">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />
              <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-6 shadow-inner relative z-10 border border-border/50">
                <MessageCircle size={40} className="text-muted-foreground/50" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight mb-2 relative z-10">Select a conversation</h3>
              <p className="text-muted-foreground font-medium max-w-sm relative z-10">Choose a lead from the inbox to view their messaging history and continue the dialogue.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Conversations;