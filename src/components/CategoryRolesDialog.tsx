import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Default roles for each category
const DEFAULT_ROLES: Record<string, string[]> = {
  Vehicles: [
    "Fleet Manager",
    "Operations Manager",
    "Logistics Manager",
    "Transport Manager",
    "Safety Manager",
    "Owner / General Manager",
  ],
  Marketing: [
    "Marketing Manager",
    "CMO",
    "Marketing Director",
    "Brand Manager",
    "Digital Marketing Manager",
  ],
  Ecommerce: [
    "Ecommerce Manager",
    "Digital Commerce Director",
    "Online Store Manager",
    "Head of Ecommerce",
  ],
  Sales: [
    "Sales Manager",
    "VP Sales",
    "Sales Director",
    "Account Executive",
    "Business Development Manager",
  ],
  Operations: [
    "Operations Manager",
    "COO",
    "Operations Director",
    "Process Manager",
  ],
  Finance: [
    "CFO",
    "Finance Manager",
    "Financial Controller",
    "Accounting Manager",
  ],
  Security: [
    "Security Manager",
    "CISO",
    "Security Director",
    "IT Security Manager",
  ],
  Website: [
    "Web Manager",
    "Digital Manager",
    "IT Director",
    "Webmaster",
  ],
  Utilities: [
    "Facilities Manager",
    "Utility Manager",
    "Energy Manager",
  ],
  Offices: [
    "Office Manager",
    "Administrative Director",
    "Facilities Manager",
  ],
};

interface CategoryRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
}

export function CategoryRolesDialog({
  open,
  onOpenChange,
  category,
}: CategoryRolesDialogProps) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<{ id: string; role_name: string }[]>([]);
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRoles();
    }
  }, [open, category]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("category_roles")
        .select("id, role_name")
        .eq("user_id", user.id)
        .eq("category", category)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // If no roles exist, seed with defaults
      if (!data || data.length === 0) {
        const defaultRoles = DEFAULT_ROLES[category] || [];
        const rolesToInsert = defaultRoles.map((role_name) => ({
          user_id: user.id,
          category,
          role_name,
        }));

        if (rolesToInsert.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from("category_roles")
            .insert(rolesToInsert)
            .select("id, role_name");

          if (insertError) throw insertError;
          setRoles(inserted || []);
        } else {
          setRoles([]);
        }
      } else {
        setRoles(data);
      }
    } catch (error: any) {
      toast({
        title: "Error loading roles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.trim()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("category_roles")
        .insert({
          user_id: user.id,
          category,
          role_name: newRole.trim(),
        })
        .select("id, role_name")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Role already exists",
            description: "This role is already in the list.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        setRoles([...roles, data]);
        setNewRole("");
        toast({
          title: "Role added",
          description: `"${newRole.trim()}" has been added.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error adding role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (id: string, roleName: string) => {
    try {
      const { error } = await supabase
        .from("category_roles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRoles(roles.filter((r) => r.id !== id));
      toast({
        title: "Role removed",
        description: `"${roleName}" has been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Roles: {category}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Target roles for contact discovery. These job titles will be used when searching for company contacts.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                >
                  <span className="text-sm">{role.role_name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteRole(role.id, role.role_name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roles configured. Add some roles to target specific job titles.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Enter new role..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRole();
                }
              }}
            />
            <Button
              onClick={handleAddRole}
              disabled={!newRole.trim() || saving}
              size="icon"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}