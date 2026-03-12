import { useState, useRef, useEffect } from 'react';
import { X, Send, Cpu, User, Loader2, TerminalSquare, ShieldCheck, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender_type: 'lead' | 'bot' | 'agent';
  content: string;
  created_at: string;
}

const FAQ_RESPONSES: Record<string, string> = {
  food: 'Standard operations include daily rations (breakfast + dinner). Premium dietary add-ons are available upon clearance.',
  rent: 'Yield targets vary by structural capacity. Refer to the "Available Cells" registry for precise per-unit calculations. Maintenance is included.',
  wifi: 'Affirmative. High-bandwidth encrypted networks (50+ Mbps) are standard across all verified assets.',
  deposit: 'Security hold is strictly 1-2 months yield, released upon asset evacuation. Exact figures provided during final clearance.',
  'move-in': 'Deployment can commence 24 hours post-clearance. Specify your target entry date during the authorization protocol.',
  laundry: 'Sanitation protocols vary. Base units include machine access; automated laundry service requires premium clearance.',
  security: 'All assets feature Tier-1 security: 24/7 CCTV surveillance, biometric locks, and stationed physical operatives.',
  cleaning: 'Asset maintenance is executed 2-3 times weekly. Common sectors are sterilized daily.',
  rules: 'Standard curfews and acoustic limits apply. Detailed operational directives are attached to the asset dossier.',
  available: 'Live capacity is displayed in the sector matrix above. Emerald units are cleared for immediate acquisition.',
};

const getAutoResponse = (message: string): string | null => {
  const lower = message.toLowerCase();
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('charge')) return FAQ_RESPONSES.rent;
  if (lower.includes('internet') || lower.includes('broadband')) return FAQ_RESPONSES.wifi;
  if (lower.includes('safe') || lower.includes('guard')) return FAQ_RESPONSES.security;
  return null;
};

interface PropertyChatProps {
  propertyName: string;
  isOpen: boolean;
  onClose: () => void;
}

// TanStack Query Hooks for Chat
export function useChatSession() {
  const [session, setSession] = useState<{ lead_id: string; conv_id: string } | null>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem('gharpayy_chat_session');
    if (stored) setSession(JSON.parse(stored));
  }, []);

  const createSession = useMutation({
    mutationFn: async () => {
      const { data , error } = await supabase.rpc('init_anonymous_chat' as any);
      if (error) throw error;
      const newSession = { lead_id: data[0].chat_lead_id, conv_id: data[0].chat_conv_id };
      localStorage.setItem('gharpayy_chat_session', JSON.stringify(newSession));
      setSession(newSession);
      return newSession;
    }
  });

  return { session, createSession };
}

export function useChatMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['chat-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    }
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { conversation_id: string; lead_id: string; sender_type: 'lead' | 'bot' | 'agent'; content: string }) => {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: msg.conversation_id,
        lead_id: msg.lead_id,
        sender_type: msg.sender_type,
        content: msg.content
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.conversation_id] });
    }
  });
}

export default function PropertyChat({ propertyName, isOpen, onClose }: PropertyChatProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const { session, createSession } = useChatSession();
  const { data: messages = [] } = useChatMessages(session?.conv_id);
  const sendMessage = useSendChatMessage();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  // Set up Realtime Subscription
  useEffect(() => {
    if (!session?.conv_id) return;
    const channel = supabase.channel(`public:messages:conversation_id=eq.${session.conv_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${session.conv_id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', session.conv_id] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.conv_id, queryClient]);

  const quickQuestions = ['FOOD & RATIONS?', 'WIFI BANDWIDTH?', 'SECURITY CLEARANCE?', 'DEPLOYMENT PROCESS?'];

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setInput('');
    setIsTyping(true);

    try {
      let activeSession = session;
      if (!activeSession) {
        activeSession = await createSession.mutateAsync();
      }

      // Insert User Message
      await sendMessage.mutateAsync({
        conversation_id: activeSession.conv_id,
        lead_id: activeSession.lead_id,
        sender_type: 'lead',
        content: text.trim()
      });

      // Handle Bot Auto Response
      setTimeout(async () => {
        const auto = getAutoResponse(text);
        await sendMessage.mutateAsync({
          conversation_id: activeSession!.conv_id,
          lead_id: activeSession!.lead_id,
          sender_type: 'bot',
          content: auto || "Transmission received. Rerouting your query to a clearance operative. Standby for human connection within 120 seconds. An encrypted WhatsApp link will also be dispatched."
        });
        setIsTyping(false);
      }, 800 + Math.random() * 600);

    } catch (e) {
      toast.error('Transmission failed.');
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0, y: 20, scale: 0.98 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: 20, scale: 0.98 }}
           transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
           className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] bg-[#0A0A0C] border-2 border-[#D4AF37] flex flex-col overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
           style={{ height: 560 }}
         >
          {/* Subtle Grain */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#121215]">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 border border-[#D4AF37] bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                 <ShieldCheck size={16} className="text-[#D4AF37]" />
               </div>
               <div>
                 <p className="font-serif text-lg italic text-white leading-none tracking-tight">Secure Uplink</p>
                 <p className="text-[8px] font-mono tracking-[0.2em] text-[#D4AF37] uppercase flex items-center gap-1.5 mt-1">
                   <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse" /> Active Connection
                 </p>
               </div>
             </div>
             <button onClick={onClose} className="p-2 rounded-none border border-white/10 hover:bg-white/10 text-white/50 transition-colors">
               <X size={14} />
             </button>
           </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-6">
             {messages.length === 0 && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                 <div className="max-w-[90%]">
                   <div className="flex items-end gap-2 mb-1">
                     <Cpu size={12} className="text-[#D4AF37]" />
                     <span className="text-[8px] font-mono tracking-widest text-[#D4AF37] uppercase">System Construct</span>
                   </div>
                   <div className="p-4 border-l-2 border-[#D4AF37] bg-[#121215] text-[13px] leading-relaxed text-white font-sans">
                     {`Connection established. I am the intelligence operative assigned to ${propertyName}. State your operational requirements (rations, bandwidth, clearance rules).`}
                   </div>
                   <p className="text-[8px] font-mono text-white/30 mt-1 ml-1 tracking-widest">
                     {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                   </p>
                 </div>
               </motion.div>
             )}
             
             {messages.map((msg, i) => (
               <motion.div 
                 key={msg.id} 
                 initial={{ opacity: 0, y: 5 }} 
                 animate={{ opacity: 1, y: 0 }}
                 className={`flex ${msg.sender_type === 'lead' ? 'justify-end' : 'justify-start'}`}
               >
                 <div className="max-w-[90%]">
                   {/* Sender Tag */}
                   <div className={`flex items-end gap-2 mb-1 ${msg.sender_type === 'lead' ? 'justify-end' : 'justify-start'}`}>
                     {msg.sender_type !== 'lead' && <Cpu size={10} className="text-[#D4AF37]" />}
                     <span className={`text-[8px] font-mono tracking-widest uppercase ${msg.sender_type === 'lead' ? 'text-white/50' : 'text-[#D4AF37]'}`}>
                       {msg.sender_type === 'lead' ? 'Subject' : 'System'}
                     </span>
                     {msg.sender_type === 'lead' && <Fingerprint size={10} className="text-white/50" />}
                   </div>

                   {/* Message Body */}
                   <div className={`p-3.5 text-[13px] leading-relaxed font-sans ${
                     msg.sender_type === 'lead'
                       ? 'bg-white/5 border border-white/10 border-r-2 border-r-white/50 text-white'
                       : 'bg-[#121215] border border-white/5 border-l-2 border-l-[#D4AF37] text-white/90'
                   }`}>
                     {msg.content}
                   </div>
                   
                   {/* Timestamp */}
                   <p className={`text-[8px] font-mono text-white/30 mt-1 tracking-widest ${msg.sender_type === 'lead' ? 'text-right mr-1' : 'ml-1'}`}>
                     {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                   </p>
                 </div>
               </motion.div>
             ))}

             {isTyping && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                 <div className="max-w-[85%]">
                   <div className="flex items-end gap-2 mb-1">
                     <Cpu size={10} className="text-[#D4AF37]" />
                     <span className="text-[8px] font-mono tracking-widest text-[#D4AF37] uppercase">System Construct</span>
                   </div>
                   <div className="p-3.5 border-l-2 border-[#D4AF37] bg-[#121215] flex gap-1.5 items-center">
                     <span className="w-1.5 h-1.5 bg-[#D4AF37] animate-bounce" style={{ animationDelay: '0ms' }} />
                     <span className="w-1.5 h-1.5 bg-[#D4AF37] animate-bounce" style={{ animationDelay: '150ms' }} />
                     <span className="w-1.5 h-1.5 bg-[#D4AF37] animate-bounce" style={{ animationDelay: '300ms' }} />
                     <span className="text-[9px] font-mono tracking-widest text-[#D4AF37] uppercase ml-2">Decrypting...</span>
                   </div>
                 </div>
               </motion.div>
             )}
           </div>

          {/* Quick Action Protocols */}
          <div className="relative z-10 px-5 pb-3 flex gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
             {messages.length < 2 && quickQuestions.map(q => (
               <button
                 key={q}
                 onClick={() => handleSendMessage(q)}
                 className="text-[9px] font-mono tracking-widest px-3 py-1.5 bg-[#121215] border border-white/10 text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all shrink-0 uppercase"
               >
                 [{q}]
               </button>
             ))}
           </div>

          {/* Input Terminal */}
          <div className="relative z-10 px-5 py-4 border-t border-white/10 bg-[#0A0A0C] flex gap-3">
             <Input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
               placeholder="TRANSMIT QUERY..."
               className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-[10px] tracking-widest placeholder:text-white/20 focus:border-[#D4AF37] transition-all"
               disabled={isTyping}
             />
             <Button 
                className="h-12 w-14 rounded-none bg-[#D4AF37] hover:bg-white text-black transition-all disabled:opacity-50 flex items-center justify-center shrink-0" 
                onClick={() => handleSendMessage(input)} 
                disabled={isTyping || !input.trim()}
             >
               <TerminalSquare size={16} />
             </Button>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}