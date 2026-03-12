import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logger } from "../_shared/logger.ts";
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


// 1. FIX: Corrected wrapper syntax to prevent variable shadowing
Deno.serve(withSentry(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    logger.warn("Method Not Allowed accessed", { method: req.method });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { name, phone, email, source, budget, preferred_location, notes } = body;

    logger.info("Incoming lead payload received", { source, budget, phone_prefix: phone?.substring(0, 4) });

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      logger.warn("Validation failed: missing name", { body });
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!phone || typeof phone !== "string" || phone.trim().length < 5) {
      logger.warn("Validation failed: invalid phone", { body });
      return new Response(JSON.stringify({ error: "Valid phone number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate field lengths
    if (name.length > 200 || (email && email.length > 255) || (phone && phone.length > 30)) {
      logger.warn("Validation failed: field too long", { name_len: name.length });
      return new Response(JSON.stringify({ error: "Field too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validSources = ["whatsapp", "website", "instagram", "facebook", "phone", "landing_page"];
    const leadSource = validSources.includes(source) ? source : "website";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for duplicate by phone
    const { data: existing } = await supabase
      .from("leads")
      .select("id, name, status")
      .eq("phone", phone.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      logger.info("Duplicate lead prevented", { existing_id: existing[0].id });
      return new Response(
        JSON.stringify({
          error: "duplicate",
          message: `Lead already exists: ${existing[0].name} (${existing[0].status})`,
          existing_lead_id: existing[0].id,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Smart round-robin: find agent with fewest active leads
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name")
      .eq("is_active", true);

    let assignedAgentId: string | null = null;
    let assignedAgentName: string | null = null;

    if (agents && agents.length > 0) {
      const { data: leadCounts } = await supabase
        .from("leads")
        .select("assigned_agent_id")
        .not("status", "in", '("booked","lost")');

      const countMap: Record<string, number> = {};
      agents.forEach((a : any) => (countMap[a.id] = 0));
      (leadCounts || []).forEach((l : any
        
      ) => {
        if (l.assigned_agent_id && countMap[l.assigned_agent_id] !== undefined) {
          countMap[l.assigned_agent_id]++;
        }
      });

      const sorted = agents.sort((a : any, b : any) => (countMap[a.id] || 0) - (countMap[b.id] || 0));
      assignedAgentId = sorted[0].id;
      assignedAgentName = sorted[0].name;
    }

    // Insert lead
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name: name.trim().slice(0, 200),
        phone: phone.trim().slice(0, 30),
        email: email?.trim().slice(0, 255) || null,
        source: leadSource,
        budget: budget?.trim().slice(0, 100) || null,
        preferred_location: preferred_location?.trim().slice(0, 200) || null,
        notes: notes?.trim().slice(0, 2000) || null,
        assigned_agent_id: assignedAgentId,
        status: "new",
      })
      .select("id, name")
      .single();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           

    if (insertError) {
        logger.error("Failed inserting lead into database", { error: insertError });
        throw insertError; // Throws to the catch block below
    }

    // Create notification for assigned agent (if agent has a user_id)
    if (assignedAgentId) {
      const { data: agent } = await supabase
        .from("agents")
        .select("user_id")
        .eq("id", assignedAgentId)
        .single();

      if (agent?.user_id) {
        const { error: notifErr } = await supabase.from("notifications").insert({
          user_id: agent.user_id,
          type: "new_lead",
          title: "New Lead Assigned",
          body: `${lead.name} (${phone}) has been assigned to you`,
          link: "/leads",
        });
        if (notifErr) logger.error("Failed firing agent notification", { error: notifErr, agent_id: assignedAgentId });
      }
    }

    logger.info("Lead ingested and routed successfully", { new_lead_id: lead.id, assigned_to: assignedAgentId });

    return new Response(
      JSON.stringify({
        success: true,
        id: lead.id,
        name: lead.name,
        assigned_agent: assignedAgentName,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    logger.error("receive-lead internal execution crashed", { error_message: err.message, stack: err.stack });
    
    // 2. FIX: Return a proper 500 response WITH CORS headers so the frontend can read the error
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));