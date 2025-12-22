import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";
import logo from "@/assets/smart-leads-logo.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  useEffect(() => {
    // Listen FIRST so we don't miss auth events during initialization
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Defer side-effects; never block the auth callback
        setTimeout(() => {
          supabase.functions
            .invoke("log-activity", {
              body: { action: "login" },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            })
            .catch((error) => console.error("Failed to log activity:", error));
        }, 0);

        navigate("/");
      }
    });

    // THEN check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Validate invitation token if present
  useEffect(() => {
    const validateInvitation = async () => {
      if (!inviteToken) return;

      setValidatingInvite(true);
      setActiveTab("signup");
      
      try {
        const response = await supabase.functions.invoke("validate-invitation", {
          body: { token: inviteToken },
        });

        if (response.error) {
          setInvitationValid(false);
          setInvitationError(response.error.message || "Invalid invitation");
          return;
        }

        if (response.data.error) {
          setInvitationValid(false);
          setInvitationError(response.data.error);
          return;
        }

        if (response.data.valid) {
          setInvitationValid(true);
          setInvitationEmail(response.data.email);
          setEmail(response.data.email);
        } else {
          setInvitationValid(false);
          setInvitationError("Invalid invitation");
        }
      } catch (error: any) {
        setInvitationValid(false);
        setInvitationError(error.message);
      } finally {
        setValidatingInvite(false);
      }
    };

    validateInvitation();
  }, [inviteToken]);

  const logActivity = async (action: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke("log-activity", {
          body: { action },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteToken || !invitationValid) {
      toast({
        title: "Invalid Invitation",
        description: "You need a valid invitation to create an account.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitationEmail!,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Accept the invitation (this assigns the role and logs activity)
        const { error: acceptError } = await supabase.functions.invoke("accept-invitation", {
          body: { 
            token: inviteToken,
            user_id: signUpData.user.id,
          },
        });

        if (acceptError) {
          console.error("Failed to accept invitation:", acceptError);
        }
      }

      toast({
        title: "Account Created!",
        description: "Your account has been created successfully. You can now log in.",
      });

      // Reset form and switch to login
      setPassword("");
      setConfirmPassword("");
      setActiveTab("login");
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="LeadFlow" className="h-12" />
          </div>
          <CardTitle className="text-2xl text-center">
            {activeTab === "login" ? "Welcome back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-center">
            {activeTab === "login" 
              ? "Enter your email to sign in to your account"
              : inviteToken 
                ? "Complete your registration to get started"
                : "You need an invitation to create an account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validatingInvite ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Validating invitation...</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup" disabled={!inviteToken}>Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                {inviteToken && invitationValid === false && (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Invalid Invitation</p>
                      <p className="text-sm text-muted-foreground mt-1">{invitationError}</p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("login")}>
                      Go to Login
                    </Button>
                  </div>
                )}
                
                {inviteToken && invitationValid === true && (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-600">Valid Invitation</p>
                        <p className="text-xs text-muted-foreground">Creating account for {invitationEmail}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={invitationEmail || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                )}
                
                {!inviteToken && (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <Mail className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Invitation Required</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Contact an administrator to receive an invitation.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
