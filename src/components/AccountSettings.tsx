import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Calendar, Clock, Shield } from "lucide-react";
import { format } from "date-fns";

interface UserData {
  email: string;
  id: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export function AccountSettings() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserData({
            email: user.email || "",
            id: user.id,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
          });

          // Fetch user role
          const { data: roleData } = await supabase.rpc("get_user_role", {
            _user_id: user.id,
          });
          
          setRole(roleData || "user");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "client":
        return "secondary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Unable to load account information.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Settings
          </CardTitle>
          <CardDescription>
            View your account information and details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{userData.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant={getRoleBadgeVariant(role || "user")} className="capitalize">
                {role || "user"}
              </Badge>
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="font-medium">
                {format(new Date(userData.created_at), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Last Sign In */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last sign in</p>
              <p className="font-medium">
                {userData.last_sign_in_at
                  ? format(new Date(userData.last_sign_in_at), "MMMM d, yyyy 'at' h:mm a")
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* User ID */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">User ID</p>
            <p className="text-xs font-mono text-muted-foreground">{userData.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
