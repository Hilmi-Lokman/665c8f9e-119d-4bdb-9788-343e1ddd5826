import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnomalyRecord } from "@/types";
import { formatRelativeTime, calculateAnomalyRisk } from "@/utils/validation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { 
  AlertTriangle, 
  CheckCircle, 
  Flag,
  Shield,
  Clock,
  Wifi,
  RefreshCw
} from "lucide-react";

interface AnomalyPanelProps {
  anomalies: AnomalyRecord[];
  onReviewAnomaly: (id: string, action: 'normal' | 'confirmed') => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const AnomalyPanel = ({ anomalies, onReviewAnomaly, onRefresh, isLoading = false }: AnomalyPanelProps) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleReview = useCallback(async (id: string, action: 'normal' | 'confirmed') => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await onReviewAnomaly(id, action);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [onReviewAnomaly]);

  const getAnomalyIcon = useMemo(() => (type: string) => {
    switch (type.toLowerCase()) {
      case 'proxy_attempt':
      case 'spoofing':
        return Shield;
      case 'unusual_duration':
      case 'short_session':
        return Clock;
      case 'erratic_ap_switching':
        return Wifi;
      default:
        return AlertTriangle;
    }
  }, []);

  const getSeverityColor = useCallback((score: number) => {
    if (score >= 0.8) return "text-destructive";
    if (score >= 0.6) return "text-warning";
    return "text-success";
  }, []);

  const getSeverityBg = useCallback((score: number) => {
    if (score >= 0.8) return "border-l-destructive bg-destructive/5";
    if (score >= 0.6) return "border-l-warning bg-warning/5";
    return "border-l-success bg-success/5";
  }, []);

  const { pendingAnomalies, reviewedAnomalies } = useMemo(() => ({
    pendingAnomalies: anomalies.filter(a => a.status === 'pending'),
    reviewedAnomalies: anomalies.filter(a => a.status !== 'pending')
  }), [anomalies]);

  return (
    <Card className="dashboard-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span>Anomaly Detection Panel</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive" className="text-xs">
              {pendingAnomalies.length} pending
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          AI-powered anomaly detection with manual review capabilities
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-6 space-y-4">
            {/* Pending Anomalies */}
            {pendingAnomalies.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-3 text-destructive">
                  Pending Review ({pendingAnomalies.length})
                </h4>
                <div className="space-y-3">
                  {pendingAnomalies.map((anomaly) => {
                    const AnomalyIcon = getAnomalyIcon(anomaly.anomalyType);
                    const isProcessing = processingIds.has(anomaly.id);
                    
                    return (
                      <div
                        key={anomaly.id}
                        className={`border rounded-lg p-4 border-l-4 ${getSeverityBg(anomaly.anomalyScore)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <AnomalyIcon className={`h-4 w-4 ${getSeverityColor(anomaly.anomalyScore)}`} />
                            <div>
                              <div className="font-medium text-sm capitalize">
                                {anomaly.anomalyType.replace('_', ' ')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(anomaly.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {anomaly.autoDetected && (
                              <Badge variant="outline" className="text-xs">
                                AI Detected
                              </Badge>
                            )}
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getSeverityColor(anomaly.anomalyScore)}`}
                            >
                              {Math.round(anomaly.anomalyScore * 100)}%
                            </Badge>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="text-xs text-muted-foreground mb-1">Hashed MAC:</div>
                          <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                            {anomaly.hashedMac}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReview(anomaly.id, 'normal')}
                            disabled={isProcessing}
                            className="flex-1 h-8"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Normal
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReview(anomaly.id, 'confirmed')}
                            disabled={isProcessing}
                            className="flex-1 h-8"
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            Confirm Anomaly
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recently Reviewed */}
            {reviewedAnomalies.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-3 text-muted-foreground">
                  Recently Reviewed ({reviewedAnomalies.length})
                </h4>
                <div className="space-y-2">
                  {reviewedAnomalies.slice(0, 5).map((anomaly) => {
                    const AnomalyIcon = getAnomalyIcon(anomaly.anomalyType);
                    
                    return (
                      <div
                        key={anomaly.id}
                        className="border rounded-lg p-3 bg-muted/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AnomalyIcon className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div className="text-xs font-medium capitalize">
                                {anomaly.anomalyType.replace('_', ' ')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(anomaly.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={anomaly.status === 'flagged' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {anomaly.status === 'flagged' ? 'Confirmed' : 'Normal'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {anomalies.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <h4 className="font-medium text-success mb-1">All Clear!</h4>
                <p className="text-sm text-muted-foreground">
                  No anomalies detected in the current session
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AnomalyPanel;