import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptRequest {
  token: string;
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { token, user_id }: AcceptRequest = await req.json();

    if (!token || !user_id) {
      return new Response(JSON.stringify({ error: "Token and user_id are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find and validate the invitation
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("user_invitations")
      .select("*")
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid or already used invitation" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from("user_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ error: "This invitation has expired" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update invitation status
    const { error: updateError } = await supabaseAdmin
      .from("user_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return new Response(JSON.stringify({ error: "Failed to accept invitation" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Assign user role from invitation (default to "user" if not specified)
    const assignedRole = invitation.role || "user";
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: user_id,
        role: assignedRole,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Don't fail - the user is created, role can be fixed manually
    }

    // Log activity
    const { error: activityError } = await supabaseAdmin
      .from("user_activity")
      .insert({
        user_id: user_id,
        action: "signup",
        metadata: { invitation_id: invitation.id },
      });

    if (activityError) {
      console.error("Error logging activity:", activityError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in accept-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
