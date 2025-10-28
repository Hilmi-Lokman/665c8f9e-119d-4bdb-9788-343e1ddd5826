import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  Wifi,
  CheckCircle,
  X,
  Flag
} from "lucide-react";

interface AnomalyData {
  id: string;
  studentMacHash: string;
  anomalyScore: number;
  anomalyType: string;
  timestamp: string;
  explanation: string;
  details: {
    duration?: string;
    apSwitches?: number;
    suspiciousPatterns?: string[];
  };
}

interface AnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: AnomalyData | null;
  onAction: (action: 'acknowledge' | 'mark_normal' | 'flag_review', anomalyId: string) => void;
}

const AnomalyModal = ({ isOpen, onClose, anomaly, onAction }: AnomalyModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!anomaly) return null;

  const getSeverityColor = (score: number) => {
    if (score >= 0.8) return "text-destructive";
    if (score >= 0.6) return "text-warning";
    return "text-success";
  };

  const getSeverityBg = (score: number) => {
    if (score >= 0.8) return "bg-destructive/10 border-destructive/20";
    if (score >= 0.6) return "bg-warning/10 border-warning/20";
    return "bg-success/10 border-success/20";
  };

  const getSeverityLabel = (score: number) => {
    if (score >= 0.8) return "HIGH RISK";
    if (score >= 0.6) return "MODERATE";
    return "LOW RISK";
  };

  const handleAction = async (action: 'acknowledge' | 'mark_normal' | 'flag_review') => {
    setIsProcessing(true);
    try {
      await onAction(action, anomaly.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'proxy_attempt':
      case 'spoofing':
        return Shield;
      case 'unusual_duration':
      case 'short_session':
        return Clock;
      case 'erratic_ap_switching':
      case 'ap_transitions':
        return Wifi;
      default:
        return AlertTriangle;
    }
  };

  const AnomalyIcon = getAnomalyIcon(anomaly.anomalyType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <span>Anomaly Detection Alert</span>
          </DialogTitle>
          <DialogDescription>
            AI-powered behavior analysis has detected unusual patterns requiring review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Severity Indicator */}
          <Card className={`border-2 ${getSeverityBg(anomaly.anomalyScore)}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AnomalyIcon className={`h-8 w-8 ${getSeverityColor(anomaly.anomalyScore)}`} />
                  <div>
                    <h3 className="font-semibold text-lg capitalize">
                      {anomaly.anomalyType.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Detected at {new Date(anomaly.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant="secondary" 
                    className={`${getSeverityColor(anomaly.anomalyScore)} border-current`}
                  >
                    {getSeverityLabel(anomaly.anomalyScore)}
                  </Badge>
                  <div className={`text-2xl font-bold ${getSeverityColor(anomaly.anomalyScore)}`}>
                    {Math.round(anomaly.anomalyScore * 100)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Student Identity</span>
                </div>
                <p className="text-sm text-muted-foreground">Hashed MAC Address</p>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  {anomaly.studentMacHash}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">Session Details</span>
                </div>
                {anomaly.details.duration && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Duration:</span> {anomaly.details.duration}
                  </p>
                )}
                {anomaly.details.apSwitches && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">AP Switches:</span> {anomaly.details.apSwitches}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Anomaly Explanation */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>Analysis Report</span>
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {anomaly.explanation}
              </p>
              
              {anomaly.details.suspiciousPatterns && anomaly.details.suspiciousPatterns.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">Detected Patterns:</p>
                  <ul className="text-sm space-y-1">
                    {anomaly.details.suspiciousPatterns.map((pattern, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-warning rounded-full flex-shrink-0" />
                        <span>{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleAction('acknowledge')}
              disabled={isProcessing}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => handleAction('mark_normal')}
              disabled={isProcessing}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Mark as Normal
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => handleAction('flag_review')}
              disabled={isProcessing}
              className="flex-1"
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag for Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnomalyModal;