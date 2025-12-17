import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Get auth header to verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client to verify the requesting user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is admin using the security definer function
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("Role check error:", roleError, "isAdmin:", isAdmin);
      return new Response(JSON.stringify({ error: "Only admins can send invitations" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email }: InvitationRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email.toLowerCase());
    
    if (userExists) {
      return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from("user_invitations")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      return new Response(JSON.stringify({ error: "An invitation is already pending for this email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();

    // Create invitation record
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("user_invitations")
      .insert({
        email: email.toLowerCase(),
        invited_by: user.id,
        invitation_token: token,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send invitation email if Resend API key is configured
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      // Build invitation URL - use the origin from the request referer or a default
      const referer = req.headers.get("referer") || req.headers.get("origin");
      const baseUrl = referer ? new URL(referer).origin : "https://70595a20-824e-4880-9cfd-b121144f82a0.lovableproject.com";
      const invitationUrl = `${baseUrl}/auth?invite=${token}`;

      try {
        await resend.emails.send({
          from: "Smart Leads <onboarding@resend.dev>",
          to: [email],
          subject: "You've been invited to Smart Leads",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">You've Been Invited!</h1>
              <p>You've been invited to join Smart Leads, a lead enrichment platform.</p>
              <p>Click the button below to create your account:</p>
              <a href="${invitationUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Accept Invitation
              </a>
              <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
              <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          `,
        });
        console.log("Invitation email sent to:", email);
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't fail the request, invitation is still created
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email. Invitation URL token:", token);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        invited_at: invitation.invited_at,
        expires_at: invitation.expires_at,
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
