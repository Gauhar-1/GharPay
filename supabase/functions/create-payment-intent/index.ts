import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE', // <-- Added this to prevent strict browser blocks
};

serve(async (req : any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { reservation_id } = await req.json();

    if (!reservation_id) {
      throw new Error('reservation_id is required');
    }

    // Initialize Supabase admin client to read reservations table securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the reservation amount based on the soft lock and reservation logic
    const { data: reservation, error } = await supabaseAdmin
      .from('reservations')
      .select('reservation_fee, customer_name, customer_phone, customer_email')
      .eq('id', reservation_id)
      .single();

    if (error || !reservation) {
      throw new Error('Reservation not found');
    }
    
    // Convert to paise for Razorpay
    const amountInPaise = Math.round((reservation.reservation_fee || 1000) * 100);

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured');
    }

    const authHeaders = {
      'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      'Content-Type': 'application/json'
    };

    // Initialize the Order on Razorpay
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${reservation_id.substring(0, 8)}`,
      })
    });

    const orderData = await rzpResponse.json();
    
    if (!rzpResponse.ok) {
        throw new Error(orderData.error?.description || 'Failed to create Razorpay order');
    }

    // Structured logging for observability (Phase 2 requirement)
    console.log(JSON.stringify({ 
        event: 'payment_intent_created', 
        reservation_id, 
        order_id: orderData.id, 
        amount: amountInPaise,
        customer_phone: reservation.customer_phone
    }));

    // Return the required Razorpay checkout parameters
    return new Response(JSON.stringify({
        order_id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        key: razorpayKeyId,
        customer_name: reservation.customer_name,
        customer_email: reservation.customer_email || '',
        customer_phone: reservation.customer_phone || ''
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    // Structured error logging
    console.error(JSON.stringify({ event: 'payment_intent_error', error: error.message }));
    
    return new Response(JSON.stringify({ error: error.message }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
    });
  }
});
