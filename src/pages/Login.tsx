import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "lecturer">("lecturer");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName, role);
        if (error) throw error;
        
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });
        setIsSignUp(false);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        // Navigation will be handled by the auth state change
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="relative hover-scale">
              <div className="absolute inset-0 bg-gradient-primary blur-2xl opacity-30 animate-pulse-glow rounded-full"></div>
              <div className="relative p-4 bg-gradient-primary rounded-3xl shadow-glow">
                <Wifi className="h-12 w-12 text-primary-foreground" />
                <Shield className="h-7 w-7 text-success-foreground bg-gradient-success rounded-full p-1 absolute -top-1 -right-1 shadow-button" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text tracking-tight">WiFi Attendance</h1>
          <p className="text-muted-foreground text-lg">University Attendance Management System</p>
        </div>

        <Card className="dashboard-card shadow-lg border-border/50">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold">{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
            <CardDescription className="text-base">
              {isSignUp ? "Register for admin or lecturer access" : "Sign in to your account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Sign Up Additional Fields */}
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={(value: "admin" | "lecturer") => setRole(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lecturer">Lecturer</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-primary text-primary-foreground shadow-button hover:shadow-lg hover:scale-[1.02] transition-all duration-300 font-bold text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    Please wait...
                  </span>
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>

            {/* Toggle Sign Up/Sign In */}
            <div className="mt-6 text-center border-t border-border/50 pt-6">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setEmail("");
                  setPassword("");
                  setFullName("");
                  setRole("lecturer");
                }}
                className="text-sm font-semibold hover-scale"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-6">
          <div className="glass-effect p-4 rounded-2xl space-y-2 hover-glow cursor-default group">
            <Badge className="w-full justify-center py-2.5 bg-gradient-success text-success-foreground font-semibold shadow-button group-hover:scale-105 transition-transform">
              Real-time Tracking
            </Badge>
            <p className="text-sm text-muted-foreground font-medium">Live attendance monitoring</p>
          </div>
          <div className="glass-effect p-4 rounded-2xl space-y-2 hover-glow cursor-default group">
            <Badge className="w-full justify-center py-2.5 bg-gradient-primary text-primary-foreground font-semibold shadow-button group-hover:scale-105 transition-transform">
              Privacy Secure
            </Badge>
            <p className="text-sm text-muted-foreground font-medium">Hashed MAC addresses</p>
          </div>
        </div>

        {/* Student Access Note */}
        <div className="glass-effect p-6 rounded-2xl text-center shadow-card">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-bold">Students:</strong> Please use the mobile app for attendance access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;