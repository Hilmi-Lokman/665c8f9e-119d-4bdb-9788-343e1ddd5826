import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Filter,
  Download,
  Search,
  Calendar,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AttendanceRecord {
  id: string;
  matricNo: string;
  studentName: string;
  className: string;
  timeIn: string;
  timeOut: string | null;
  status: 'present' | 'late' | 'absent' | 'flagged' | 'suspicious';
  duration?: string;
}

interface BackendAttendanceRecord {
  id: string;
  matricNumber: string;
  studentName: string;
  className: string;
  timestamp: string;
  timeOut?: string;
  status: 'present' | 'late' | 'absent' | 'flagged' | 'suspicious';
  sessionDuration: string;
}

const AttendanceReport = () => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchId, setSearchId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const { toast } = useToast();

  // Fetch class sessions
  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .order('start_time', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch sessions:', error);
      } else {
        setSessions(data || []);
      }
    };
    
    fetchSessions();
  }, []);

  // Load attendance data from backend
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getAttendanceReport();
        // Map backend data to component format
        const mappedData: AttendanceRecord[] = data.map((record, index) => ({
          id: record.id || index.toString(),
          matricNo: record.matricNumber,
          studentName: record.studentName,
          className: record.className,
          timeIn: new Date(record.timestamp).toLocaleTimeString(),
          timeOut: record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : null,
          status: record.status,
          duration: record.sessionDuration
        }));
        
        // Deduplicate by matric number - keep only the latest record for each student
        const uniqueRecords = Array.from(
          mappedData.reduce((map, record) => {
            const existing = map.get(record.matricNo);
            // Keep the record with the later timestamp or if no existing record
            if (!existing || record.timeIn > existing.timeIn) {
              map.set(record.matricNo, record);
            }
            return map;
          }, new Map<string, AttendanceRecord>()).values()
        );
        
        setAttendanceRecords(uniqueRecords);
        console.log(`[AttendanceReport] Loaded ${uniqueRecords.length} unique students from ${mappedData.length} total records`);
      } catch (error) {
        console.error('Failed to load attendance data:', error);
        toast({
          title: "Failed to load data",
          description: "Unable to fetch attendance report from backend",
          variant: "destructive",
        });
        // Fallback to dummy data
        setAttendanceRecords(dummyData);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();

    // Set up real-time subscription for attendance record updates
    const channel = supabase
      .channel('attendance-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        console.log('[AttendanceReport] Real-time update detected, reloading data...');
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Dummy attendance data as fallback
  const dummyData: AttendanceRecord[] = [
    {
      id: "1",
      matricNo: "A19EC0001",
      studentName: "Ahmad Rahman",
      className: "Software Engineering",
      timeIn: "08:15 AM",
      timeOut: "10:00 AM",
      status: "present",
      duration: "1h 45m"
    },
    {
      id: "2",
      matricNo: "A19EC0023",
      studentName: "Sarah Lee",
      className: "Software Engineering",
      timeIn: "08:25 AM",
      timeOut: "10:00 AM",
      status: "late",
      duration: "1h 35m"
    },
    {
      id: "3",
      matricNo: "A19EC0045",
      studentName: "David Chen",
      className: "Software Engineering",
      timeIn: "08:12 AM",
      timeOut: null,
      status: "flagged",
      duration: "Ongoing"
    },
    {
      id: "4",
      matricNo: "A19EC0067",
      studentName: "Maria Santos",
      className: "Database Systems",
      timeIn: "10:15 AM",
      timeOut: "12:00 PM",
      status: "present",
      duration: "1h 45m"
    },
    {
      id: "5",
      matricNo: "A19EC0089",
      studentName: "John Smith",
      className: "Database Systems",
      timeIn: "-",
      timeOut: "-",
      status: "absent",
      duration: "-"
    }
  ];

  const handleExport = () => {
    toast({
      title: "Export started",
      description: "Preparing attendance report for download",
    });
    // Export logic can be added here
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success-light text-success">Present</Badge>;
      case 'late':
        return <Badge variant="outline" className="bg-warning-light text-warning">Late</Badge>;
      case 'absent':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive">Absent</Badge>;
      case 'flagged':
        return <Badge variant="destructive">Flagged</Badge>;
      case 'suspicious':
        return <Badge variant="outline" className="bg-warning-light text-warning">Suspicious</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'late':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'absent':
        return <Users className="h-4 w-4 text-muted-foreground" />;
      case 'flagged':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'suspicious':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (selectedClass && selectedClass !== "all" && record.className !== selectedClass) return false;
    if (searchId && !record.matricNo.toLowerCase().includes(searchId.toLowerCase())) return false;
    // Add session filter if needed (would need to add session_id to AttendanceRecord interface)
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Attendance Report</h1>
          <p className="text-muted-foreground">Track and analyze student attendance patterns</p>
        </div>
        <Button variant="university" className="flex items-center space-x-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <span>Filter Options</span>
          </CardTitle>
          <CardDescription>Customize your attendance report view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class Session</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.subject_name} - {new Date(session.start_time).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                  <SelectItem value="Database Systems">Database Systems</SelectItem>
                  <SelectItem value="Network Security">Network Security</SelectItem>
                  <SelectItem value="Mobile Development">Mobile Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Student ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by matric number" 
                  className="pl-10"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Custom Date
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Present</p>
                <p className="text-2xl font-bold text-success">
                  {filteredRecords.filter(r => r.status === 'present').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium">Late</p>
                <p className="text-2xl font-bold text-warning">
                  {filteredRecords.filter(r => r.status === 'late').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Absent</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {filteredRecords.filter(r => r.status === 'absent').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Flagged</p>
                <p className="text-2xl font-bold text-destructive">
                  {filteredRecords.filter(r => r.status === 'flagged').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Attendance Records</span>
          </CardTitle>
          <CardDescription>
            {filteredRecords.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matric No.</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading attendance data...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium">{record.matricNo}</TableCell>
                  <TableCell>{record.studentName}</TableCell>
                  <TableCell>{record.className}</TableCell>
                  <TableCell>{record.timeIn}</TableCell>
                  <TableCell>{record.timeOut || "-"}</TableCell>
                  <TableCell>{record.duration}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.status)}
                      {getStatusBadge(record.status)}
                    </div>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceReport;