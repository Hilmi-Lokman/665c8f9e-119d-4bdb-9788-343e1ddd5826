import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Flag, 
  Clock, 
  Wifi, 
  Signal,
  MapPin,
  TrendingUp,
  User,
  Activity,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  studentName: string;
  matricNumber: string;
  macAddress: string;
  timestamp: string;
  className: string;
  anomalyFlag: boolean;
  anomalyScore: number;
  sessionDuration: string;
  apSwitches: number;
  rssi: number;
  status: 'present' | 'flagged' | 'suspicious';
}

interface AnomalyDetails {
  sessionId: string;
  totalDuration: number; // minutes
  averageRSSI: number;
  signalVariance: number;
  apSwitchPattern: Array<{ time: string; fromAP: string; toAP: string; rssi: number }>;
  suspiciousPatterns: string[];
  riskFactors: Array<{ factor: string; score: number; description: string }>;
  geolocationData: Array<{ time: string; building: string; floor: string; room: string }>;
  comparisonData: {
    normalSessionAvg: number;
    userHistoricalAvg: number;
    classAverage: number;
  };
}

interface AnomalyDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onMarkFalsePositive: (recordId: string, reason: string) => void;
  onSendForReview: (recordId: string, notes: string) => void;
}

const AnomalyDrilldownModal = ({
  isOpen,
  onClose,
  record,
  onMarkFalsePositive,
  onSendForReview
}: AnomalyDrilldownModalProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'location' | 'comparison'>('overview');
  const [reviewNotes, setReviewNotes] = useState('');
  const [falsePositiveReason, setFalsePositiveReason] = useState('');

  if (!record) return null;

  // Generate detailed anomaly data based on the record
  const anomalyDetails: AnomalyDetails = {
    sessionId: record.id,
    totalDuration: parseInt(record.sessionDuration.split(' ')[0]),
    averageRSSI: record.rssi,
    signalVariance: Math.abs(record.rssi) * 0.3,
    apSwitchPattern: Array.from({ length: record.apSwitches }, (_, i) => ({
      time: new Date(Date.now() - (record.apSwitches - i) * 300000).toLocaleTimeString(),
      fromAP: `AP-${Math.floor(Math.random() * 20) + 1}`,
      toAP: `AP-${Math.floor(Math.random() * 20) + 1}`,
      rssi: record.rssi + Math.floor(Math.random() * 20) - 10
    })),
    suspiciousPatterns: [
      record.apSwitches > 10 ? "Excessive AP switching detected" : null,
      record.anomalyScore > 0.8 ? "Unusual connection timing patterns" : null,
      Math.abs(record.rssi) > 70 ? "Inconsistent signal strength" : null,
      "Rapid disconnection/reconnection cycles"
    ].filter(Boolean) as string[],
    riskFactors: [
      {
        factor: "AP Switch Frequency",
        score: Math.min(record.apSwitches / 15 * 100, 100),
        description: `${record.apSwitches} switches in ${record.sessionDuration}`
      },
      {
        factor: "Signal Consistency",
        score: Math.abs(record.rssi) > 60 ? 85 : 25,
        description: `RSSI variance of ${Math.abs(record.rssi) * 0.3}dBm`
      },
      {
        factor: "Temporal Pattern",
        score: record.anomalyScore * 100,
        description: "Connection pattern deviates from normal behavior"
      },
      {
        factor: "Device Behavior",
        score: record.anomalyScore > 0.7 ? 90 : 40,
        description: "MAC address behavior analysis"
      }
    ],
    geolocationData: [
      { time: "09:15", building: "Engineering Block", floor: "3rd Floor", room: "Lab 301" },
      { time: "09:18", building: "Engineering Block", floor: "3rd Floor", room: "Lab 302" },
      { time: "09:22", building: "Engineering Block", floor: "2nd Floor", room: "Corridor" },
      { time: "09:25", building: "Engineering Block", floor: "3rd Floor", room: "Lab 301" }
    ],
    comparisonData: {
      normalSessionAvg: 0.15,
      userHistoricalAvg: 0.22,
      classAverage: 0.18
    }
  };

  const getSeverityColor = (score: number) => {
    if (score < 30) return "text-success";
    if (score < 70) return "text-warning";
    return "text-destructive";
  };

  const getSeverityBg = (score: number) => {
    if (score < 30) return "bg-success/10 border-success/20";
    if (score < 70) return "bg-warning/10 border-warning/20";
    return "bg-destructive/10 border-destructive/20";
  };

  const handleMarkFalsePositive = () => {
    if (falsePositiveReason.trim()) {
      onMarkFalsePositive(record.id, falsePositiveReason);
      setFalsePositiveReason('');
      onClose();
    }
  };

  const handleSendForReview = () => {
    if (reviewNotes.trim()) {
      onSendForReview(record.id, reviewNotes);
      setReviewNotes('');
      onClose();
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'patterns', label: 'Patterns', icon: TrendingUp },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'comparison', label: 'Comparison', icon: Signal }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg">Anomaly Analysis</DialogTitle>
                <DialogDescription>
                  Detailed analysis for {record.studentName} ({record.matricNumber})
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Student Info Header */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{record.studentName}</div>
                  <div className="text-xs text-muted-foreground">{record.matricNumber}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">MAC Address</div>
                <code className="text-xs bg-muted px-2 py-1 rounded">{record.macAddress}</code>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Class</div>
                <Badge variant="outline">{record.className}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Anomaly Score</div>
                <div className={cn("text-lg font-bold", getSeverityColor(record.anomalyScore * 100))}>
                  {record.anomalyScore.toFixed(3)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk Factor Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {anomalyDetails.riskFactors.map((factor, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{factor.factor}</span>
                        <span className={cn("text-sm font-bold", getSeverityColor(factor.score))}>
                          {factor.score.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={factor.score} className="h-2 mb-1" />
                      <p className="text-xs text-muted-foreground">{factor.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Suspicious Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detected Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {anomalyDetails.suspiciousPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-warning/5 border border-warning/20 rounded">
                        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                        <span className="text-sm">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'patterns' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AP Switch Pattern</CardTitle>
                <CardDescription>
                  Chronological sequence of access point transitions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {anomalyDetails.apSwitchPattern.map((switch_, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-mono text-muted-foreground">
                          {switch_.time}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{switch_.fromAP}</span>
                          <span className="mx-2 text-muted-foreground">→</span>
                          <span className="font-medium">{switch_.toAP}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {switch_.rssi} dBm
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'location' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location Timeline</CardTitle>
                <CardDescription>
                  Estimated locations based on AP connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {anomalyDetails.geolocationData.map((location, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div className="text-sm font-mono text-muted-foreground">
                        {location.time}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{location.building}</span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span>{location.floor}</span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span>{location.room}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'comparison' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparative Analysis</CardTitle>
                <CardDescription>
                  How this session compares to normal patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground mb-1">Normal Sessions</div>
                    <div className="text-lg font-bold text-success">
                      {anomalyDetails.comparisonData.normalSessionAvg.toFixed(3)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground mb-1">User Average</div>
                    <div className="text-lg font-bold text-warning">
                      {anomalyDetails.comparisonData.userHistoricalAvg.toFixed(3)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground mb-1">Class Average</div>
                    <div className="text-lg font-bold text-primary">
                      {anomalyDetails.comparisonData.classAverage.toFixed(3)}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded">
                  <h4 className="font-medium text-destructive mb-2">Current Session</h4>
                  <div className="text-2xl font-bold text-destructive">
                    {record.anomalyScore.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {((record.anomalyScore - anomalyDetails.comparisonData.normalSessionAvg) / anomalyDetails.comparisonData.normalSessionAvg * 100).toFixed(0)}% above normal
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mark as False Positive</label>
              <div className="space-y-2">
                <Textarea
                  placeholder="Reason for marking as false positive..."
                  value={falsePositiveReason}
                  onChange={(e) => setFalsePositiveReason(e.target.value)}
                  className="h-20"
                />
                <Button
                  onClick={handleMarkFalsePositive}
                  variant="outline"
                  disabled={!falsePositiveReason.trim()}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as False Positive
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Send for Human Review</label>
              <div className="space-y-2">
                <Textarea
                  placeholder="Additional notes for reviewer..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="h-20"
                />
                <Button
                  onClick={handleSendForReview}
                  variant="default"
                  disabled={!reviewNotes.trim()}
                  className="w-full"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Send for Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnomalyDrilldownModal;