import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Wifi,
  MoreHorizontal,
  Users
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  hashedMac: string;
  connectionTime: string;
  sessionDuration: string;
  apTransitions: number;
  status: 'present' | 'abnormal' | 'flagged';
  anomalyScore?: number;
  lastSeen: string;
}

interface AttendanceTableProps {
  data: AttendanceRecord[];
  onViewDetails?: (record: AttendanceRecord) => void;
  isLive?: boolean;
}

const AttendanceTable = ({ data, onViewDetails, isLive = false }: AttendanceTableProps) => {
  const getStatusBadge = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'present':
        return (
          <Badge className="status-present">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Present
          </Badge>
        );
      case 'flagged':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        );
      default:
        return (
          <Badge className="status-abnormal">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Abnormal
          </Badge>
        );
    }
  };

  const getAnomalyScoreBadge = (score?: number) => {
    if (!score) return null;
    
    const percentage = Math.round(score * 100);
    let variant: "secondary" | "destructive" | "outline" = "secondary";
    
    if (percentage >= 80) variant = "destructive";
    else if (percentage >= 60) variant = "outline";
    
    return (
      <Badge variant={variant} className="text-xs">
        {percentage}% risk
      </Badge>
    );
  };

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>{isLive ? 'Live Attendance Monitor' : 'Attendance Records'}</span>
            {isLive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm text-success font-medium">LIVE</span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {data.length} connected
          </Badge>
        </CardTitle>
        <CardDescription>
          {isLive 
            ? 'Real-time monitoring of connected devices with anomaly detection' 
            : 'Historical attendance data with anomaly analysis'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Hashed MAC Address</TableHead>
                <TableHead>Connection Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-center">AP Transitions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isLive ? 'No active connections detected' : 'No attendance records found'}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((record) => (
                  <TableRow 
                    key={record.id} 
                    className={record.status === 'flagged' ? 'bg-destructive/5 border-l-4 border-l-destructive' : ''}
                  >
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{record.hashedMac}</div>
                        {isLive && (
                          <div className="text-xs text-muted-foreground flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            Last seen: {record.lastSeen}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{record.connectionTime}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{record.sessionDuration}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{record.apTransitions}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record)}
                    </TableCell>
                    <TableCell>
                      {getAnomalyScoreBadge(record.anomalyScore)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails?.(record)}
                        className="h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {isLive && data.length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-success">{data.filter(r => r.status === 'present').length}</div>
                <div className="text-muted-foreground">Normal</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-warning">{data.filter(r => r.status === 'abnormal').length}</div>
                <div className="text-muted-foreground">Abnormal</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-destructive">{data.filter(r => r.status === 'flagged').length}</div>
                <div className="text-muted-foreground">Flagged</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-primary">{data.reduce((sum, r) => sum + r.apTransitions, 0)}</div>
                <div className="text-muted-foreground">Total AP Switches</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceTable;