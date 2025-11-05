import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle,
  Shield,
  Eye,
  CheckCircle2,
  X,
  Filter,
  Activity,
  Clock,
  TrendingUp,
  Download
} from "lucide-react";

interface AnomalyLog {
  id: string;
  studentId: string;
  deviceMac: string;
  timestamp: string;
  anomalyScore: number;
  anomalyType: string;
  status: 'pending' | 'reviewed' | 'false_positive' | 'confirmed';
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details?: {
    duration: string;
    apSwitches: number;
    suspiciousPatterns: string[];
  };
}

const AnomalyLogs = () => {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyLog | null>(null);
  const [anomalyLogs, setAnomalyLogs] = useState<AnomalyLog[]>([]);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        // Fetch records where status is 'suspicious' OR 'flagged'
        const { data: records, error } = await supabase
          .from('attendance_records')
          .select('*')
          .in('status', ['suspicious', 'flagged'])
          .order('created_at', { ascending: false });

        if (error) throw error;

        const transformedLogs: AnomalyLog[] = (records || []).map(record => {
          const score = record.anomaly_score || 0;
          let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
          
          if (score >= 0.8) riskLevel = 'critical';
          else if (score >= 0.6) riskLevel = 'high';
          else if (score >= 0.4) riskLevel = 'medium';

          let anomalyType = 'Signal Anomaly';
          if (record.ap_switches > 5) anomalyType = 'Erratic AP Switching';
          else if (record.duration_seconds < 300) anomalyType = 'Short Session';
          else if (record.duration_seconds > 14400) anomalyType = 'Unusual Session Duration';

          // Map database status to display status
          let displayStatus: 'pending' | 'reviewed' | 'false_positive' | 'confirmed';
          if (record.status === 'flagged') {
            displayStatus = 'confirmed';
          } else {
            displayStatus = 'pending';
          }

          return {
            id: record.id,
            studentId: record.matric_number || 'Unknown',
            deviceMac: record.device_id.substring(0, 17),
            timestamp: new Date(record.created_at).toLocaleString(),
            anomalyScore: score,
            anomalyType,
            status: displayStatus,
            description: `Anomaly score: ${(score * 100).toFixed(0)}% | AP switches: ${record.ap_switches} | Duration: ${Math.floor(record.duration_seconds / 60)}min`,
            riskLevel,
            details: {
              duration: `${Math.floor(record.duration_seconds / 60)} minutes`,
              apSwitches: record.ap_switches,
              suspiciousPatterns: [
                score > 0.7 ? 'High anomaly score detected' : 'Moderate anomaly score',
                record.ap_switches > 5 ? `Excessive AP switching (${record.ap_switches} times)` : 'Normal AP usage',
                record.avg_rssi < -80 ? 'Weak signal strength' : 'Normal signal strength'
              ]
            }
          };
        });

        setAnomalyLogs(transformedLogs);
      } catch (error) {
        console.error('Error fetching anomalies:', error);
      }
    };

    fetchAnomalies();

    // Set up real-time subscription
    const channel = supabase
      .channel('anomaly-logs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        },
        () => {
          fetchAnomalies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: AnomalyLog['status']) => {
    try {
      // Update the attendance record status
      let updates: Record<string, any> = {};
      
      if (newStatus === 'false_positive') {
        // Mark as Normal -> status = 'present'
        updates.status = 'present';
        updates.anomaly_flag = false;
      } else if (newStatus === 'confirmed') {
        // Confirm Threat -> status = 'flagged'
        updates.status = 'flagged';
        updates.anomaly_flag = true;
      }
      
      const { error } = await supabase
        .from('attendance_records')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      // Remove from local state since it's no longer in anomaly view
      if (newStatus === 'false_positive') {
        setAnomalyLogs(prev => prev.filter(log => log.id !== id));
      } else {
        setAnomalyLogs(prev => prev.map(log => 
          log.id === id ? { ...log, status: newStatus } : log
        ));
      }
      
      toast({
        title: "Status Updated",
        description: newStatus === 'false_positive' 
          ? "Marked as normal and moved to attendance records"
          : "Confirmed as threat and flagged in attendance records",
      });
    } catch (error) {
      console.error('Error updating anomaly status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update anomaly status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: AnomalyLog['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning-light text-warning">Pending</Badge>;
      case 'reviewed':
        return <Badge className="bg-primary-light text-primary">Reviewed</Badge>;
      case 'false_positive':
        return <Badge className="bg-success-light text-success">False Positive</Badge>;
      case 'confirmed':
        return <Badge variant="destructive">Confirmed Threat</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRiskBadge = (level: AnomalyLog['riskLevel']) => {
    switch (level) {
      case 'low':
        return <Badge variant="outline" className="bg-muted">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-warning-light text-warning">Medium</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-700">High</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatAnomalyScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const filteredLogs = anomalyLogs.filter(log => {
    if (selectedStatus && selectedStatus !== "all" && log.status !== selectedStatus) return false;
    if (selectedRisk && selectedRisk !== "all" && log.riskLevel !== selectedRisk) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Anomaly Logs</h1>
          <p className="text-muted-foreground">Monitor and analyze security anomalies detected by the AI system</p>
        </div>
        <Button variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Export Logs</span>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-warning">
                  {anomalyLogs.filter(log => log.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Confirmed Threats</p>
                <p className="text-2xl font-bold text-destructive">
                  {anomalyLogs.filter(log => log.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">False Positives</p>
                <p className="text-2xl font-bold text-success">
                  {anomalyLogs.filter(log => log.status === 'false_positive').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Detection Rate</p>
                <p className="text-2xl font-bold text-primary">87.3%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <span>Filter Logs</span>
          </CardTitle>
          <CardDescription>Filter anomaly logs by status and risk level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="confirmed">Confirmed Threat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Risk Level</label>
              <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                <SelectTrigger>
                  <SelectValue placeholder="All risk levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Logs Table */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Anomaly Detection Logs</span>
          </CardTitle>
          <CardDescription>
            {filteredLogs.length} anomalies found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Device MAC</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Anomaly Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium">{log.studentId}</TableCell>
                  <TableCell className="font-mono text-sm">{log.deviceMac}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{log.timestamp}</span>
                    </div>
                  </TableCell>
                  <TableCell>{log.anomalyType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {formatAnomalyScore(log.anomalyScore)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getRiskBadge(log.riskLevel)}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedAnomaly(log)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Anomaly Details</DialogTitle>
                            <DialogDescription>
                              Detailed analysis of the detected security anomaly
                            </DialogDescription>
                          </DialogHeader>
                          {selectedAnomaly && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Student ID</label>
                                  <p className="text-sm text-muted-foreground">{selectedAnomaly.studentId}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Device MAC</label>
                                  <p className="text-sm font-mono text-muted-foreground">{selectedAnomaly.deviceMac}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Anomaly Score</label>
                                  <p className="text-sm text-muted-foreground">{formatAnomalyScore(selectedAnomaly.anomalyScore)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Risk Level</label>
                                  <div className="mt-1">{getRiskBadge(selectedAnomaly.riskLevel)}</div>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Description</label>
                                <p className="text-sm text-muted-foreground">{selectedAnomaly.description}</p>
                              </div>
                              
                              {selectedAnomaly.details && (
                                <div>
                                  <label className="text-sm font-medium">Suspicious Patterns</label>
                                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                    {selectedAnomaly.details.suspiciousPatterns.map((pattern, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span className="text-destructive">•</span>
                                        <span>{pattern}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              <div className="flex space-x-2 pt-4">
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleStatusChange(selectedAnomaly.id, 'false_positive')}
                                  className="flex items-center space-x-1"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>False Positive</span>
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleStatusChange(selectedAnomaly.id, 'confirmed')}
                                  className="flex items-center space-x-1"
                                >
                                  <Shield className="h-4 w-4" />
                                  <span>Confirm Threat</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {log.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-success hover:text-success-foreground"
                            onClick={() => handleStatusChange(log.id, 'false_positive')}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleStatusChange(log.id, 'confirmed')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnomalyLogs;