import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Play, Square, StopCircle, Clock, Wifi, WifiOff, Activity, Settings, Bell, BellOff, Zap, CheckCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

interface CaptureControlsProps {
  onCaptureStateChange?: (state: 'running' | 'stopped' | 'cancelled') => void;
}

const CaptureControls = ({ onCaptureStateChange }: CaptureControlsProps) => {
  const [captureState, setCaptureState] = useState<'running' | 'stopped' | 'cancelled'>('stopped');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastCycleTime, setLastCycleTime] = useState<string>('--:--');
  const [captureStats, setCaptureStats] = useState({
    packetsCollected: 0,
    activeDevices: 0,
    cycleCount: 0,
    anomaliesDetected: 0,
    dataRate: 0
  });
  const [notifications, setNotifications] = useState(true);
  const [captureMode, setCaptureMode] = useState<'standard' | 'high-precision' | 'power-save'>('standard');
  const [autoStop, setAutoStop] = useState<number>(0); // 0 = disabled, minutes
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Fetch schedules from Supabase
  useEffect(() => {
    const fetchSchedules = async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('is_active', true)
        .order('subject_name');
      
      if (error) {
        console.error('Failed to fetch schedules:', error);
      } else {
        setSchedules(data || []);
      }
    };
    
    fetchSchedules();
  }, []);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await apiService.checkConnection();
      setIsConnected(connected);
      if (!connected) {
        toast({
          title: "Backend Connection Failed",
          description: "Cannot reach Flask server at http://192.168.1.40:5000. Please ensure:\n1. Backend is running\n2. CORS is enabled\n3. Firewall allows connection",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Backend Connected",
          description: "Successfully connected to Flask server",
        });
      }
    };
    checkConnection();
  }, []);

  // Timer effect for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (captureState === 'running') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        
        // Simulate capture cycles based on mode
        const cycleInterval = captureMode === 'high-precision' ? 15 : captureMode === 'power-save' ? 60 : 30;
        
        if (elapsedTime % cycleInterval === 0) {
          setLastCycleTime(new Date().toLocaleTimeString());
          const newPackets = Math.floor(Math.random() * (captureMode === 'high-precision' ? 100 : 50)) + 10;
          const newDevices = Math.floor(Math.random() * 15) + 5;
          const newAnomalies = Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0;
          
          setCaptureStats(prev => ({
            ...prev,
            cycleCount: prev.cycleCount + 1,
            packetsCollected: prev.packetsCollected + newPackets,
            activeDevices: newDevices,
            anomaliesDetected: prev.anomaliesDetected + newAnomalies,
            dataRate: newPackets / (cycleInterval / 60) // packets per minute
          }));

          // Notify about anomalies
          if (newAnomalies > 0 && notifications) {
            toast({
              title: "Anomalies detected during capture",
              description: `${newAnomalies} suspicious patterns found`,
              variant: "default",
            });
          }
        }
        
        // Auto-stop functionality
        if (autoStop > 0 && elapsedTime >= autoStop * 60) {
          handleStop();
          if (notifications) {
            toast({
              title: "Capture auto-stopped",
              description: `Completed ${autoStop} minute capture session`,
            });
          }
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [captureState, elapsedTime]);

  const handleStart = async () => {
    if (!selectedScheduleId) {
      toast({
        title: "No class selected",
        description: "Please select a class before starting the session",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get selected schedule details
      const schedule = schedules.find(s => s.id === selectedScheduleId);
      if (!schedule) {
        throw new Error('Selected schedule not found');
      }

      // Create a new class session
      const { data: sessionData, error: sessionError } = await supabase
        .from('class_sessions')
        .insert({
          schedule_id: schedule.id,
          class_code: schedule.class_code,
          subject_name: schedule.subject_name,
          is_active: true,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setCurrentSessionId(sessionData.id);

      // Start capture with session_id (this will update capture_control via RPC)
      const response = await apiService.startCapture(sessionData.id);
      
      if (response.status === 'success') {
        setCaptureState('running');
        setElapsedTime(0);
        setLastCycleTime('--:--');
        setCaptureStats({ 
          packetsCollected: 0, 
          activeDevices: 0, 
          cycleCount: 0, 
          anomaliesDetected: 0,
          dataRate: 0 
        });
        setIsConnected(true);
        onCaptureStateChange?.('running');
        
        toast({
          title: "Class session started",
          description: `${schedule.subject_name} (${schedule.class_code})`,
        });
      } else {
        throw new Error(response.message || 'Failed to start capture');
      }
    } catch (error) {
      setIsConnected(false);
      toast({
        title: "Failed to start session",
        description: error instanceof Error ? error.message : 'Unable to start class session',
        variant: "destructive",
      });
    }
  };

  const handleStop = async () => {
    try {
      // Stop capture first (this will clear active_session_id via RPC)
      const response = await apiService.stopCapture(currentSessionId);
      
      // Close the class session
      if (currentSessionId) {
        await supabase
          .from('class_sessions')
          .update({ 
            end_time: new Date().toISOString(),
            is_active: false
          })
          .eq('id', currentSessionId);
      }
      
      if (response.status === 'success') {
        setCaptureState('stopped');
        onCaptureStateChange?.('stopped');
        setCurrentSessionId(null);
        
        toast({
          title: "Class session stopped",
          description: response.message || `Session completed in ${formatTime(elapsedTime)}`,
        });
      } else {
        throw new Error(response.message || 'Failed to stop capture');
      }
    } catch (error) {
      toast({
        title: "Failed to stop session",
        description: error instanceof Error ? error.message : 'Unable to stop class session',
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    try {
      const response = await apiService.cancelProcess(currentSessionId);
      
      if (response.status === 'success') {
        setCaptureState('cancelled');
        setElapsedTime(0);
        setLastCycleTime('--:--');
        setCaptureStats({ 
          packetsCollected: 0, 
          activeDevices: 0, 
          cycleCount: 0, 
          anomaliesDetected: 0,
          dataRate: 0 
        });
        onCaptureStateChange?.('cancelled');
        
        toast({
          title: "Capture session cancelled",
          description: response.message || "All data from this session has been discarded",
          variant: "destructive",
        });
      } else {
        throw new Error(response.message || 'Failed to cancel process');
      }
    } catch (error) {
      toast({
        title: "Failed to cancel process",
        description: error instanceof Error ? error.message : 'Unable to connect to backend',
        variant: "destructive",
      });
    }
  };

  const handleFinish = async () => {
    try {
      const response = await apiService.finishCapture();
      
      if (response.status === 'success') {
        setCaptureState('stopped');
        onCaptureStateChange?.('stopped');
        
        toast({
          title: "Capture finalized successfully",
          description: response.message || "Data has been processed and pushed to attendance report",
        });
      } else {
        throw new Error(response.message || 'Failed to finalize capture');
      }
    } catch (error) {
      toast({
        title: "Failed to finalize capture",
        description: error instanceof Error ? error.message : 'Unable to connect to backend',
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateColor = () => {
    switch (captureState) {
      case 'running': return 'success';
      case 'stopped': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStateIcon = () => {
    switch (captureState) {
      case 'running': return <Activity className="h-4 w-4 animate-pulse" />;
      case 'stopped': return <Square className="h-4 w-4" />;
      case 'cancelled': return <StopCircle className="h-4 w-4" />;
      default: return <Square className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full dashboard-card-interactive">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="h-5 w-5 text-primary" />
              <span>WiFi Capture Control</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {captureMode}
              </Badge>
            </CardTitle>
            <CardDescription>
              Advanced WiFi packet capture with real-time monitoring and anomaly detection
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications(!notifications)}
              className="button-bounce"
            >
              {notifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            
            {isConnected === false && (
              <Badge 
                variant="destructive"
                className="flex items-center space-x-1 px-3 py-1"
              >
                <WifiOff className="h-4 w-4" />
                <span className="font-medium">Backend Offline</span>
              </Badge>
            )}
            
            <Badge 
              variant={getStateColor() as any}
              className="flex items-center space-x-1 px-3 py-1 pulse-live"
            >
              {getStateIcon()}
              <span className="capitalize font-medium">{captureState}</span>
            </Badge>
          </div>
        </div>

        {/* Capture Settings */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Select Class
            </label>
            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId} disabled={captureState === 'running'}>
              <SelectTrigger className="focus-university">
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.subject_name} ({schedule.class_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Capture Mode</label>
            <Select value={captureMode} onValueChange={(value: any) => setCaptureMode(value)} disabled={captureState === 'running'}>
              <SelectTrigger className="focus-university">
                <Zap className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="power-save">Power Save (60s cycles)</SelectItem>
                <SelectItem value="standard">Standard (30s cycles)</SelectItem>
                <SelectItem value="high-precision">High Precision (15s cycles)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Auto-Stop (minutes)</label>
            <Select value={autoStop.toString()} onValueChange={(value) => setAutoStop(Number(value))} disabled={captureState === 'running'}>
              <SelectTrigger className="focus-university">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Disabled</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Session Progress</label>
            {autoStop > 0 && captureState === 'running' ? (
              <div className="space-y-1">
                <Progress value={(elapsedTime / (autoStop * 60)) * 100} className="h-3" />
                <div className="text-xs text-muted-foreground">
                  {Math.max(0, Math.ceil((autoStop * 60 - elapsedTime) / 60))} minutes remaining
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground pt-2">
                {captureState === 'running' ? 'Running indefinitely' : 'Not active'}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {/* Elapsed Time */}
          <div className="text-center p-3 bg-gradient-secondary rounded-lg hover-glow">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Elapsed Time</span>
            </div>
            <div className="text-2xl font-mono font-bold gradient-text">
              {formatTime(elapsedTime)}
            </div>
          </div>

          {/* Last Cycle */}
          <div className="text-center p-3 bg-muted/50 rounded-lg hover-glow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Last Cycle</div>
            <div className="text-lg font-mono font-semibold text-foreground">
              {lastCycleTime}
            </div>
          </div>

          {/* Packets Collected */}
          <div className="text-center p-3 bg-muted/50 rounded-lg hover-glow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Packets</div>
            <div className="text-lg font-bold text-primary">
              {captureStats.packetsCollected.toLocaleString()}
            </div>
          </div>

          {/* Active Devices */}
          <div className="text-center p-3 bg-muted/50 rounded-lg hover-glow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Devices</div>
            <div className="text-lg font-bold text-success">
              {captureStats.activeDevices}
            </div>
          </div>

          {/* Anomalies Detected */}
          <div className="text-center p-3 bg-muted/50 rounded-lg hover-glow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Anomalies</div>
            <div className="text-lg font-bold text-warning">
              {captureStats.anomaliesDetected}
            </div>
          </div>

          {/* Data Rate */}
          <div className="text-center p-3 bg-muted/50 rounded-lg hover-glow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Rate/min</div>
            <div className="text-lg font-bold text-primary">
              {Math.round(captureStats.dataRate)}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap justify-center gap-3 max-w-full">
          <Button
            onClick={handleStart}
            disabled={captureState === 'running'}
            variant="university"
            size="default"
            className={cn(
              "flex items-center space-x-2 px-6 flex-shrink-0 button-bounce",
              captureState === 'running' && "opacity-50 cursor-not-allowed"
            )}
          >
            <Play className="h-4 w-4" />
            <span>Start Capture</span>
          </Button>

          <Button
            onClick={handleStop}
            disabled={captureState !== 'running'}
            variant="outline"
            size="default"
            className={cn(
              "flex items-center space-x-2 px-6 flex-shrink-0 button-bounce hover-glow",
              captureState !== 'running' && "opacity-50 cursor-not-allowed"
            )}
          >
            <Square className="h-4 w-4" />
            <span>Stop</span>
          </Button>

          <Button
            onClick={handleCancel}
            disabled={captureState === 'stopped'}
            variant="destructive"
            size="default"
            className={cn(
              "flex items-center space-x-2 px-6 flex-shrink-0 button-bounce",
              captureState === 'stopped' && "opacity-50 cursor-not-allowed"
            )}
          >
            <StopCircle className="h-4 w-4" />
            <span>Cancel</span>
          </Button>

          <Button
            onClick={handleFinish}
            disabled={captureState !== 'stopped'}
            variant="default"
            size="default"
            className={cn(
              "flex items-center space-x-2 px-6 flex-shrink-0 button-bounce hover-glow",
              captureState !== 'stopped' && "opacity-50 cursor-not-allowed"
            )}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Finish</span>
          </Button>
        </div>

        {/* Capture Cycles Info */}
        {captureState === 'running' && captureStats.cycleCount > 0 && (
          <div className="mt-4 p-4 bg-gradient-secondary border border-primary/20 rounded-lg animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <div className="text-primary font-medium">
                Completed {captureStats.cycleCount} cycle{captureStats.cycleCount > 1 ? 's' : ''} 
                {captureStats.anomaliesDetected > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {captureStats.anomaliesDetected} anomalies
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                Next cycle in {(captureMode === 'high-precision' ? 15 : captureMode === 'power-save' ? 60 : 30) - (elapsedTime % (captureMode === 'high-precision' ? 15 : captureMode === 'power-save' ? 60 : 30))}s
              </div>
            </div>
            <Progress 
              value={((elapsedTime % (captureMode === 'high-precision' ? 15 : captureMode === 'power-save' ? 60 : 30)) / (captureMode === 'high-precision' ? 15 : captureMode === 'power-save' ? 60 : 30)) * 100} 
              className="mt-2 h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CaptureControls;