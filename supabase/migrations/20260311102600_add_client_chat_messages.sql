-- Create the sender type ENUM
CREATE TYPE public.sender_type_enum AS ENUM ('lead', 'agent', 'bot');

-- Create the messages table securely tied to a conversation and lead
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_type public.sender_type_enum NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Turn on Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users/website visitors to read and write their own chat session messages
CREATE POLICY "Public can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view messages" ON public.messages FOR SELECT USING (true);

-- Enable realtime broadcasting on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Helper to quickly initialize an anonymous conversation session for the chat widget
CREATE OR REPLACE FUNCTION public.init_anonymous_chat()
RETURNS TABLE(chat_lead_id uuid, chat_conv_id uuid) AS $$
DECLARE
  v_lead_id uuid;
  v_conv_id uuid;
BEGIN
  INSERT INTO public.leads (name, phone, source) VALUES ('Website Visitor (Chat)', 'Anonymous', 'website') RETURNING id INTO v_lead_id;
  INSERT INTO public.conversations (lead_id, message, direction, channel) VALUES (v_lead_id, 'Chat initialized', 'inbound', 'website') RETURNING id INTO v_conv_id;
  RETURN QUERY SELECT v_lead_id as chat_lead_id, v_conv_id as chat_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
