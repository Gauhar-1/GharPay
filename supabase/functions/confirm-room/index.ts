import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. Fixed the wrapper syntax to avoid variable shadowing
serve(withSentry(async (req: Request) => {
  // Handle CORS Preflight immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { room_id, status, rent, confirmed_by } = body;

    logger.info("Confirm room request received", { room_id, status });

    if (!room_id || !status) {
      logger.warn("Missing required fields", { body });
      return new Response(JSON.stringify({ error: "room_id and status required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 2. Fixed the falsy check to allow "0" as a valid rent
    const isRentProvided = rent !== undefined && rent !== null;

    const { error: logErr } = await supabase.from("room_status_log").insert({
      room_id,
      status,
      confirmed_by: confirmed_by || null,
      rent_updated: isRentProvided,
      notes: isRentProvided ? `Rent updated to ₹${rent}` : null,
    });

    if (logErr) throw logErr; // Pass to catch block

    if (isRentProvided) {
      const { error: rentErr } = await supabase.from("rooms").update({ expected_rent: rent }).eq("id", room_id);
      if (rentErr) throw rentErr; // Pass to catch block
    }

    logger.info("Room successfully confirmed", { room_id });
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    logger.error("confirm-room error execution failed", { error_message: e.message, stack: e.stack });
    
    // 3. Prevent CORS masking by returning the 500 error directly with headers
    return new Response(JSON.stringify({ error: e.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));