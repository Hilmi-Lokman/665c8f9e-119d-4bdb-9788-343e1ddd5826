import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User,
  Shield,
  Settings,
  Bell,
  Database,
  Wifi,
  Save,
  Key,
  Mail,
  Phone,
  Upload,
  Brain,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const SettingsPage = () => {
  const { toast } = useToast();
  
  // Profile Settings State
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "Computer Science",
    role: "admin"
  });
  const [newPassword, setNewPassword] = useState("");

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    anomalyThreshold: 0.75,
    autoBlockSuspicious: true,
    emailNotifications: true,
    smsAlerts: false,
    sessionTimeout: 30
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    captureInterval: 5,
    maxSessionDuration: 120,
    apSwitchThreshold: 10,
    dataRetention: 30,
    backupFrequency: "daily"
  });

  // AI Model Upload State
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [scalerFile, setScalerFile] = useState<File | null>(null);
  const [modelVersion, setModelVersion] = useState("");
  const [modelNotes, setModelNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentModel, setCurrentModel] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setProfileData({
          fullName: profile.full_name || "",
          email: profile.email,
          phone: "",
          department: "Computer Science",
          role: profile.role
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCurrentModel();
  }, []);

  const handleProfileUpdate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (passwordError) throw passwordError;
        setNewPassword("");
      }

      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive"
      });
    }
  };

  const handleSecurityUpdate = () => {
    // API call would go here
    toast({
      title: "Security Settings Updated",
      description: "Security configuration has been successfully updated.",
    });
  };

  const handleSystemUpdate = () => {
    // API call would go here
    toast({
      title: "System Settings Updated", 
      description: "System configuration has been successfully updated.",
    });
  };

  const fetchCurrentModel = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_model_config')
        .select('*')
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentModel(data);
    } catch (error) {
      console.error('Error fetching current model:', error);
    }
  };


  const handleModelUpload = async () => {
    if (!modelFile || !scalerFile) {
      toast({
        title: "Missing Files",
        description: "Please select both model and scaler files.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const timestamp = new Date().getTime();
      const modelPath = `models/${timestamp}_${modelFile.name}`;
      const scalerPath = `scalers/${timestamp}_${scalerFile.name}`;

      // Upload model file
      const { error: modelUploadError } = await supabase.storage
        .from('ai-models')
        .upload(modelPath, modelFile);
      
      if (modelUploadError) throw modelUploadError;

      // Upload scaler file
      const { error: scalerUploadError } = await supabase.storage
        .from('ai-models')
        .upload(scalerPath, scalerFile);
      
      if (scalerUploadError) throw scalerUploadError;

      // Deactivate previous models
      await supabase
        .from('ai_model_config')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new model config
      const { error: configError } = await supabase
        .from('ai_model_config')
        .insert({
          model_file_path: modelPath,
          scaler_file_path: scalerPath,
          uploaded_by: user.id,
          version: modelVersion || `v${timestamp}`,
          notes: modelNotes,
          is_active: true
        });

      if (configError) throw configError;

      toast({
        title: "Model Updated Successfully",
        description: "Your AI model and scaler have been uploaded and activated.",
      });

      // Reset form
      setModelFile(null);
      setScalerFile(null);
      setModelVersion("");
      setModelNotes("");
      fetchCurrentModel();
    } catch (error: any) {
      console.error('Error uploading model:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload model files.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Manage your profile, security, and system configurations</p>
        </div>
        <Badge variant="outline" className="bg-primary-light text-primary">
          Administrator
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      className="pl-10"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={profileData.department} onValueChange={(value) => setProfileData(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Information Technology">Information Technology</SelectItem>
                      <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                      <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">Change Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (leave blank to keep current)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              
              <Button onClick={handleProfileUpdate} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Update Profile</span>
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Security & Notifications</span>
              </CardTitle>
              <CardDescription>
                Configure security thresholds and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email alerts for security events
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.emailNotifications}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive SMS for critical security alerts
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.smsAlerts}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, smsAlerts: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-block Suspicious Activity</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically block high-risk anomalies
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.autoBlockSuspicious}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, autoBlockSuspicious: checked }))}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="anomalyThreshold">Anomaly Detection Threshold</Label>
                  <Select 
                    value={securitySettings.anomalyThreshold.toString()} 
                    onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, anomalyThreshold: parseFloat(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5 (Low Sensitivity)</SelectItem>
                      <SelectItem value="0.75">0.75 (Medium Sensitivity)</SelectItem>
                      <SelectItem value="0.9">0.9 (High Sensitivity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Select 
                    value={securitySettings.sessionTimeout.toString()} 
                    onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleSecurityUpdate} className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Update Security Settings</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Configuration */}
        <div className="space-y-6">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>AI Model Management</span>
              </CardTitle>
              <CardDescription>
                Upload and manage anomaly detection models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentModel && (
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Model</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Version:</strong> {currentModel.version}</p>
                    <p><strong>Uploaded:</strong> {new Date(currentModel.uploaded_at).toLocaleDateString()}</p>
                    {currentModel.notes && <p><strong>Notes:</strong> {currentModel.notes}</p>}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="modelVersion">Model Version (Optional)</Label>
                <Input
                  id="modelVersion"
                  placeholder="e.g., v2.0 or 2024-01-15"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelFile">Upload ONNX Model File</Label>
                <Input
                  id="modelFile"
                  type="file"
                  accept=".onnx"
                  onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                />
                {modelFile && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {modelFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scalerFile">Upload Scaler PKL File</Label>
                <Input
                  id="scalerFile"
                  type="file"
                  accept=".pkl"
                  onChange={(e) => setScalerFile(e.target.files?.[0] || null)}
                />
                {scalerFile && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {scalerFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelNotes">Notes (Optional)</Label>
                <Input
                  id="modelNotes"
                  placeholder="e.g., Improved accuracy on edge cases"
                  value={modelNotes}
                  onChange={(e) => setModelNotes(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleModelUpload} 
                disabled={isUploading || !modelFile || !scalerFile}
                className="w-full flex items-center justify-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload & Activate Model</span>
                  </>
                )}
              </Button>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-600">
                    Note: After uploading, you'll need to restart your Python anomaly service and update the file paths to use the new model.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-primary" />
                <span>System Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure attendance system parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="captureInterval">Capture Interval (seconds)</Label>
                <Select 
                  value={systemSettings.captureInterval.toString()} 
                  onValueChange={(value) => setSystemSettings(prev => ({ ...prev, captureInterval: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 second</SelectItem>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxSessionDuration">Max Session Duration (minutes)</Label>
                <Input
                  id="maxSessionDuration"
                  type="number"
                  value={systemSettings.maxSessionDuration}
                  onChange={(e) => setSystemSettings(prev => ({ ...prev, maxSessionDuration: parseInt(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apSwitchThreshold">AP Switch Threshold</Label>
                <Input
                  id="apSwitchThreshold"
                  type="number"
                  value={systemSettings.apSwitchThreshold}
                  onChange={(e) => setSystemSettings(prev => ({ ...prev, apSwitchThreshold: parseInt(e.target.value) }))}
                />
              </div>
              
              <Button onClick={handleSystemUpdate} className="w-full flex items-center justify-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Save Configuration</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <span>Data Management</span>
              </CardTitle>
              <CardDescription>
                Configure data retention and backup settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Data Retention (days)</Label>
                <Select 
                  value={systemSettings.dataRetention.toString()} 
                  onValueChange={(value) => setSystemSettings(prev => ({ ...prev, dataRetention: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Backup Frequency</Label>
                <Select 
                  value={systemSettings.backupFrequency} 
                  onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backupFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-2 space-y-2">
                <Button variant="outline" className="w-full flex items-center justify-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Backup Now</span>
                </Button>
                <Button variant="outline" className="w-full flex items-center justify-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Export Keys</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;