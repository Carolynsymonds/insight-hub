import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          setRole(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Get user role
        const { data: userRole, error: roleError } = await supabase.rpc("get_user_role", {
          _user_id: user.id,
        });

        if (roleError) {
          console.error("Error getting user role:", roleError);
        } else {
          setRole(userRole as AppRole);
          setIsAdmin(userRole === "admin");
        }
      } catch (error) {
        console.error("Error in admin check:", error);
        setIsAdmin(false);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, loading, userId, role };
}
