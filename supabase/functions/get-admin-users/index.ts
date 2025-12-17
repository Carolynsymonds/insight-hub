import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client to verify the requesting user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can view users" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all users from auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("Error fetching users:", authError);
      return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all roles
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("*");

    // Get all invitations
    const { data: invitations } = await supabaseAdmin
      .from("user_invitations")
      .select("*")
      .order("invited_at", { ascending: false });

    // Get activity logs for last login
    const { data: activities } = await supabaseAdmin
      .from("user_activity")
      .select("*")
      .eq("action", "login")
      .order("created_at", { ascending: false });

    // Build user list with all info
    const users = authUsers.users.map(authUser => {
      const userRole = roles?.find(r => r.user_id === authUser.id);
      const userInvitation = invitations?.find(i => i.email === authUser.email);
      const lastLogin = activities?.find(a => a.user_id === authUser.id);

      return {
        id: authUser.id,
        email: authUser.email,
        role: userRole?.role || "user",
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        invited_by: userInvitation?.invited_by || null,
        invited_at: userInvitation?.invited_at || null,
        invitation_status: userInvitation?.status || null,
        last_activity: lastLogin?.created_at || authUser.last_sign_in_at,
      };
    });

    // Get pending invitations (not yet signed up)
    const pendingInvitations = invitations?.filter(inv => 
      inv.status === "pending" && 
      !authUsers.users.some(u => u.email === inv.email)
    ) || [];

    return new Response(JSON.stringify({
      users,
      pendingInvitations,
      totalUsers: users.length,
      totalPending: pendingInvitations.length,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in get-admin-users:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
