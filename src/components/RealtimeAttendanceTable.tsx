import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  User,
  Wifi,
  Eye,
  Download,
  Settings,
  CheckSquare,
  Square,
  Trash2,
  Flag,
  Calendar,
  MoreHorizontal,
  Keyboard,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiService, AttendanceRecord } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

interface LiveCapture {
  device_id: string;
  ap_id: string;
  rssi: number;
  timestamp: string;
  first_seen: string;
}


interface RealtimeAttendanceTableProps {
  isLive?: boolean;
  onAnomalyClick?: (record: AttendanceRecord) => void;
  onExport?: () => void;
}

const RealtimeAttendanceTable = ({ 
  isLive = false, 
  onAnomalyClick, 
  onExport 
}: RealtimeAttendanceTableProps) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [liveCaptures, setLiveCaptures] = useState<Map<string, LiveCapture>>(new Map());
  const [registeredDevices, setRegisteredDevices] = useState<Map<string, { student_name: string; matric_number: string; class_name: string }>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.7);
  
  const { toast } = useToast();

  // Generate sample data
  const generateSampleRecord = (): AttendanceRecord => {
    const students = [
      { name: 'Ahmad Rahman', matric: 'A20CS1234' },
      { name: 'Siti Nurhaliza', matric: 'A20CS1235' },
      { name: 'Chen Wei Ming', matric: 'A20CS1236' },
      { name: 'Raj Kumar', matric: 'A20CS1237' },
      { name: 'Fatimah Zahra', matric: 'A20CS1238' },
      { name: 'Lim Jia Wei', matric: 'A20CS1239' },
      { name: 'Ibrahim Ali', matric: 'A20CS1240' },
      { name: 'Priya Sharma', matric: 'A20CS1241' },
    ];
    
    const classes = ['CS3001', 'CS3002', 'CS3003', 'IT2001', 'IT2002'];
    const student = students[Math.floor(Math.random() * students.length)];
    const anomalyScore = Math.random();
    const isAnomalous = anomalyScore > 0.7;
    
    return {
      id: Date.now().toString() + Math.random(),
      studentName: student.name,
      matricNumber: student.matric,
      macAddress: Array.from({length: 6}, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(':').toUpperCase(),
      timestamp: new Date().toLocaleString(),
      className: classes[Math.floor(Math.random() * classes.length)],
      anomalyFlag: isAnomalous,
      anomalyScore,
      sessionDuration: `${Math.floor(Math.random() * 120) + 10} min`,
      apSwitches: Math.floor(Math.random() * 15) + 1,
      rssi: -(Math.floor(Math.random() * 40) + 30),
      status: isAnomalous ? (anomalyScore > 0.85 ? 'flagged' : 'suspicious') : 'present'
    };
  };

  // Load initial data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load attendance records
        const data = await apiService.getAttendanceReport();
        setRecords(data);
        setFilteredRecords(data);
        setLastUpdateTime(new Date().toLocaleTimeString());
        
        // Load registered devices
        const { data: devices, error } = await supabase
          .from('registered_devices')
          .select('device_id, student_name, matric_number, class_name');
        
        if (!error && devices) {
          const deviceMap = new Map(
            devices.map(d => [d.device_id, {
              student_name: d.student_name,
              matric_number: d.matric_number,
              class_name: d.class_name || ''
            }])
          );
          setRegisteredDevices(deviceMap);
          console.log(`[RealtimeMonitor] Loaded ${devices.length} registered devices`);
        }
      } catch (error) {
        console.error('Failed to load attendance data:', error);
        // Fallback to sample data if backend not available
        const initialRecords = Array.from({ length: 8 }, generateSampleRecord);
        setRecords(initialRecords);
        setFilteredRecords(initialRecords);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    };
    loadData();
  }, []);

  // Real-time capture subscription when live
  useEffect(() => {
    if (!isLive) {
      console.log('[RealtimeMonitor] Not live, clearing captures');
      setLiveCaptures(new Map());
      return;
    }

    console.log('[RealtimeMonitor] Setting up realtime subscription for periodic_captures...');
    
    const channel = supabase
      .channel('periodic-captures-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'periodic_captures'
        },
        (payload) => {
          console.log('[RealtimeMonitor] New capture received:', payload.new);
          const capture = payload.new as any;
          
          setLiveCaptures(prev => {
            const updated = new Map(prev);
            const existing = updated.get(capture.device_id);
            
            if (!existing) {
              // New device
              updated.set(capture.device_id, {
                device_id: capture.device_id,
                ap_id: capture.ap_id,
                rssi: capture.rssi,
                timestamp: capture.timestamp,
                first_seen: capture.timestamp
              });
              
              toast({
                title: "New Device Detected",
                description: `Device: ${capture.device_id.substring(0, 17)}...`,
              });
            } else {
              // Update existing device
              updated.set(capture.device_id, {
                ...existing,
                rssi: capture.rssi,
                timestamp: capture.timestamp
              });
            }
            
            return updated;
          });
          
          setLastUpdateTime(new Date().toLocaleTimeString());
        }
      )
      .subscribe((status, err) => {
        console.log('[RealtimeMonitor] Subscription status:', status);
        if (err) {
          console.error('[RealtimeMonitor] Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeMonitor] ✅ Successfully subscribed to periodic_captures');
          console.log('[RealtimeMonitor] Waiting for data... Make sure:');
          console.log('[RealtimeMonitor] 1. Kali script is running and sending data');
          console.log('[RealtimeMonitor] 2. Real-time is enabled (run REALTIME_SETUP.sql)');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[RealtimeMonitor] ❌ Real-time may not be enabled! Run REALTIME_SETUP.sql');
          toast({
            title: "Real-time Setup Required",
            description: "Please enable real-time in Cloud → Database → SQL Editor. Check REALTIME_SETUP.sql file.",
            variant: "destructive",
          });
        }
      });

    return () => {
      console.log('[RealtimeMonitor] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [isLive, toast]);

  // Advanced filtering
  useEffect(() => {
    let filtered = records;

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.matricNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.className.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(record => record.className === classFilter);
    }

    // Anomaly threshold filter
    filtered = filtered.filter(record => record.anomalyScore >= anomalyThreshold);

    // Date filter (simulated)
    if (dateFilter === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(record => new Date(record.timestamp).toDateString() === today);
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, statusFilter, classFilter, dateFilter, anomalyThreshold]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await apiService.getAttendanceReport();
      setRecords(data);
      setLastUpdateTime(new Date().toLocaleTimeString());
      
      toast({
        title: "Data refreshed",
        description: `Updated with ${data.length} records`,
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to fetch latest data from backend",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  }, [selectedRecords.size, filteredRecords]);

  const handleSelectRecord = useCallback((recordId: string) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(recordId)) {
      newSelection.delete(recordId);
    } else {
      newSelection.add(recordId);
    }
    setSelectedRecords(newSelection);
  }, [selectedRecords]);

  // Bulk actions
  const handleBulkFlag = useCallback(() => {
    toast({
      title: "Records flagged",
      description: `Flagged ${selectedRecords.size} records for review`,
    });
    setSelectedRecords(new Set());
  }, [selectedRecords.size, toast]);

  const handleBulkDelete = useCallback(() => {
    setRecords(prev => prev.filter(record => !selectedRecords.has(record.id)));
    toast({
      title: "Records deleted",
      description: `Deleted ${selectedRecords.size} records`,
    });
    setSelectedRecords(new Set());
  }, [selectedRecords, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            handleRefresh();
            break;
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
          case 'f':
            e.preventDefault();
            setShowAdvancedFilters(!showAdvancedFilters);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh, handleSelectAll, showAdvancedFilters]);

  // Auto-refresh effect
  useEffect(() => {
    setShowBulkActions(selectedRecords.size > 0);
  }, [selectedRecords.size]);

  const getStatusBadge = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'present':
        return (
          <Badge variant="default" className="bg-success text-success-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Present
          </Badge>
        );
      case 'suspicious':
        return (
          <Badge variant="secondary" className="bg-warning text-warning-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Suspicious
          </Badge>
        );
      case 'flagged':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        );
    }
  };

  const getAnomalyScoreColor = (score: number) => {
    if (score < 0.3) return 'text-success';
    if (score < 0.7) return 'text-warning';
    return 'text-destructive';
  };

  // Render live captures view
  const renderLiveCapturesView = () => {
    const capturesArray = Array.from(liveCaptures.values());
    const now = new Date();
    
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Showing {capturesArray.length} unique device{capturesArray.length !== 1 ? 's' : ''} detected in current capture session
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Matric Number</TableHead>
              <TableHead>Access Point</TableHead>
              <TableHead>Signal (RSSI)</TableHead>
              <TableHead>First Seen</TableHead>
              <TableHead>Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capturesArray.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Wifi className="h-8 w-8 opacity-50" />
                    <p>Waiting for captures...</p>
                    <p className="text-xs">Devices will appear here as they are detected</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              capturesArray.map((capture) => {
                const timeSinceLastSeen = Math.floor((now.getTime() - new Date(capture.timestamp).getTime()) / 1000);
                const duration = Math.floor((new Date(capture.timestamp).getTime() - new Date(capture.first_seen).getTime()) / 1000);
                
                // Get student info from registered devices
                const deviceInfo = registeredDevices.get(capture.device_id);
                const studentName = deviceInfo?.student_name || 'Unknown Student';
                const matricNumber = deviceInfo?.matric_number || 'Not Registered';
                
                return (
                  <TableRow key={capture.device_id} className="animate-fade-in">
                    <TableCell className="font-medium">
                      {studentName}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {matricNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{capture.ap_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-medium",
                        capture.rssi > -60 ? "text-success" :
                        capture.rssi > -75 ? "text-warning" :
                        "text-destructive"
                      )}>
                        {capture.rssi} dBm
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(capture.first_seen).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {timeSinceLastSeen < 5 ? (
                        <span className="text-success flex items-center gap-1">
                          <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
                          Active
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {timeSinceLastSeen}s ago
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="w-full dashboard-card animate-fade-in">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="h-5 w-5 text-primary" />
              <span>Real-time Attendance Monitor</span>
              {isLive && (
                <div className="flex items-center space-x-1 ml-2">
                  <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-success font-medium">LIVE</span>
                </div>
              )}
              {!isLive && selectedRecords.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedRecords.size} selected
                </Badge>
              )}
              {isLive && liveCaptures.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {liveCaptures.size} devices
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {isLive ? `Live capturing • ${liveCaptures.size} unique devices • Last update: ${lastUpdateTime}` : `Historical records • ${filteredRecords.length} entries`}
              {!isLive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="p-1 h-auto"
                >
                  <Keyboard className="h-3 w-3" />
                </Button>
              )}
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            {!isLive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="button-bounce hover-glow"
                title="Ctrl+R to refresh"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span>Refresh</span>
              </Button>
            )}
            
            {!isLive && onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="button-bounce hover-glow"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            )}
            
            {!isLive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="button-bounce hover-glow"
                title="Ctrl+F to toggle filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Basic Filters - Only show when not live */}
        {!isLive && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, matric, MAC, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus-university"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] focus-university">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="suspicious">Suspicious</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Advanced Filters */}
        {!isLive && showAdvancedFilters && (
          <div className="space-y-4 animate-fade-in border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Class Filter</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="focus-university">
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="CS3001">CS3001</SelectItem>
                    <SelectItem value="CS3002">CS3002</SelectItem>
                    <SelectItem value="CS3003">CS3003</SelectItem>
                    <SelectItem value="IT2001">IT2001</SelectItem>
                    <SelectItem value="IT2002">IT2002</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="focus-university">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Anomaly Score: {anomalyThreshold.toFixed(2)}</label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={anomalyThreshold}
                  onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                  className="focus-university"
                />
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Keyboard shortcuts: Ctrl+R (Refresh), Ctrl+A (Select All), Ctrl+F (Toggle Filters)
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {!isLive && showBulkActions && (
          <div className="flex items-center gap-2 animate-fade-in bg-muted/50 p-3 rounded-lg border">
            <Badge variant="secondary">{selectedRecords.size} selected</Badge>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="outline" size="sm" onClick={handleBulkFlag} className="button-bounce">
              <Flag className="h-4 w-4 mr-1" />
              Flag for Review
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} className="button-bounce">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRecords(new Set())}>
              Clear Selection
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLive ? renderLiveCapturesView() : (
          <div className="rounded-md border overflow-hidden">
            <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="focus-university"
                  />
                </TableHead>
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">MAC Address</TableHead>
                <TableHead className="font-semibold">Class</TableHead>
                <TableHead className="font-semibold">Timestamp</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-center">Anomaly Score</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' ? 'No records match your filters' : 'No attendance records found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record, index) => (
                  <TableRow 
                    key={record.id} 
                    className={cn(
                      "hover:bg-muted/50 transition-colors cursor-pointer",
                      index === 0 && isLive && "bg-primary/5 border-l-4 border-l-primary animate-scale-in",
                      selectedRecords.has(record.id) && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                    onClick={() => handleSelectRecord(record.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRecords.has(record.id)}
                        onCheckedChange={() => handleSelectRecord(record.id)}
                        className="focus-university"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{record.studentName}</div>
                          <div className="text-xs text-muted-foreground">{record.matricNumber}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {record.macAddress}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {record.className}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.timestamp}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("font-mono font-medium", getAnomalyScoreColor(record.anomalyScore))}>
                        {record.anomalyScore.toFixed(3)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {record.anomalyFlag && onAnomalyClick && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnomalyClick(record);
                            }}
                            className="h-8 w-8 p-0 hover-scale"
                            title="View anomaly details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 p-0 hover-scale"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}

        {/* Summary Stats - Only show when not live */}
        {!isLive && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Present: {filteredRecords.filter(r => r.status === 'present').length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-warning" />
            <span>Suspicious: {filteredRecords.filter(r => r.status === 'suspicious').length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>Flagged: {filteredRecords.filter(r => r.status === 'flagged').length}</span>
          </div>
            <div>•</div>
            <div>Total: {filteredRecords.length}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeAttendanceTable;