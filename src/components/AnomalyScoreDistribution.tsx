import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { TrendingUp, Settings, RefreshCw, AlertTriangle } from "lucide-react";

interface ScoreData {
  range: string;
  count: number;
  percentage: number;
  flagged: number;
  normal: number;
}

interface AnomalyScoreDistributionProps {
  threshold?: number;
  onThresholdChange?: (threshold: number) => void;
  className?: string;
}

const AnomalyScoreDistribution = ({ 
  threshold = 0.7, 
  onThresholdChange,
  className = ""
}: AnomalyScoreDistributionProps) => {
  const [currentThreshold, setCurrentThreshold] = useState(threshold);
  const [isUpdating, setIsUpdating] = useState(false);

  // Generate sample anomaly score data
  const generateScoreData = (): ScoreData[] => {
    const ranges = [
      '0.0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5',
      '0.5-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-1.0'
    ];

    return ranges.map((range, index) => {
      const min = index * 0.1;
      const max = (index + 1) * 0.1;
      
      // Simulate a distribution where most scores are low (normal behavior)
      // with some higher scores (anomalies)
      let count: number;
      if (index <= 3) count = Math.floor(Math.random() * 50) + 80; // 0.0-0.4: high count (normal)
      else if (index <= 6) count = Math.floor(Math.random() * 30) + 20; // 0.4-0.7: medium count
      else count = Math.floor(Math.random() * 20) + 5; // 0.7-1.0: low count (anomalies)
      
      const flagged = max > currentThreshold ? count : 0;
      const normal = max <= currentThreshold ? count : 0;
      
      return {
        range,
        count,
        percentage: 0, // Will be calculated after all counts are generated
        flagged,
        normal
      };
    });
  };

  const [scoreData, setScoreData] = useState<ScoreData[]>([]);

  // Initialize and calculate percentages
  useEffect(() => {
    const data = generateScoreData();
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    
    const dataWithPercentages = data.map(item => ({
      ...item,
      percentage: (item.count / totalCount) * 100
    }));
    
    setScoreData(dataWithPercentages);
  }, [currentThreshold]);

  // Statistics calculations
  const statistics = useMemo(() => {
    const total = scoreData.reduce((sum, item) => sum + item.count, 0);
    const flagged = scoreData.reduce((sum, item) => sum + item.flagged, 0);
    const normal = total - flagged;
    const flaggedPercentage = total > 0 ? (flagged / total) * 100 : 0;
    
    return {
      total,
      flagged,
      normal,
      flaggedPercentage,
      normalPercentage: 100 - flaggedPercentage
    };
  }, [scoreData]);

  const handleThresholdChange = (values: number[]) => {
    const newThreshold = values[0];
    setCurrentThreshold(newThreshold);
    onThresholdChange?.(newThreshold);
  };

  const handleRefreshData = () => {
    setIsUpdating(true);
    setTimeout(() => {
      const newData = generateScoreData();
      const totalCount = newData.reduce((sum, item) => sum + item.count, 0);
      
      const dataWithPercentages = newData.map(item => ({
        ...item,
        percentage: (item.count / totalCount) * 100
      }));
      
      setScoreData(dataWithPercentages);
      setIsUpdating(false);
    }, 800);
  };

  const getThresholdColor = () => {
    if (currentThreshold < 0.5) return "hsl(var(--success))";
    if (currentThreshold < 0.7) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">Score Range: {label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Sessions: <span className="font-medium text-foreground">{data.count}</span>
            </p>
            <p className="text-muted-foreground">
              Percentage: <span className="font-medium text-foreground">{data.percentage.toFixed(1)}%</span>
            </p>
            {data.flagged > 0 && (
              <p className="text-destructive">
                Flagged: <span className="font-medium">{data.flagged}</span>
              </p>
            )}
            {data.normal > 0 && (
              <p className="text-success">
                Normal: <span className="font-medium">{data.normal}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Anomaly Score Distribution</span>
            </CardTitle>
            <CardDescription>
              Distribution of anomaly scores with adjustable detection threshold
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isUpdating}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{statistics.total}</div>
            <div className="text-sm text-muted-foreground">Total Sessions</div>
          </div>
          <div className="text-center p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="text-2xl font-bold text-success">{statistics.normal}</div>
            <div className="text-sm text-muted-foreground">Normal ({statistics.normalPercentage.toFixed(1)}%)</div>
          </div>
          <div className="text-center p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{statistics.flagged}</div>
            <div className="text-sm text-muted-foreground">Flagged ({statistics.flaggedPercentage.toFixed(1)}%)</div>
          </div>
          <div className="text-center p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="text-2xl font-bold text-primary">{currentThreshold.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Threshold</div>
          </div>
        </div>

        {/* Threshold Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Detection Threshold</span>
            </div>
            <Badge variant="outline" style={{ color: getThresholdColor() }}>
              {currentThreshold.toFixed(3)}
            </Badge>
          </div>
          
          <div className="px-3">
            <Slider
              value={[currentThreshold]}
              onValueChange={handleThresholdChange}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0.0 (Sensitive)</span>
              <span>1.0 (Strict)</span>
            </div>
          </div>

          {/* Impact Preview */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Impact Preview:</span>
                <span className="text-muted-foreground ml-1">
                  At threshold {currentThreshold.toFixed(2)}, approximately{' '}
                  <span className="font-medium text-destructive">{statistics.flagged} sessions</span>
                  {' '}({statistics.flaggedPercentage.toFixed(1)}%) would be flagged for review.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="rect"
              />
              
              {/* Reference line for threshold */}
              <ReferenceLine 
                x={`${Math.floor(currentThreshold * 10) * 0.1}-${Math.ceil(currentThreshold * 10) * 0.1}`}
                stroke={getThresholdColor()}
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ value: "Threshold", position: "top" }}
              />
              
              <Bar 
                dataKey="normal" 
                name="Normal Sessions"
                fill="hsl(var(--success))" 
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
              <Bar 
                dataKey="flagged" 
                name="Flagged Sessions"
                fill="hsl(var(--destructive))" 
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendations */}
        <div className="space-y-2 text-sm">
          <h4 className="font-medium text-foreground">Recommendations:</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-start space-x-2">
              <span className="text-primary">•</span>
              <span>Threshold 0.3-0.5: High sensitivity, more false positives but catches subtle anomalies</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary">•</span>
              <span>Threshold 0.6-0.8: Balanced approach, recommended for most use cases</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary">•</span>
              <span>Threshold 0.8+: Conservative, focuses on clear anomalies only</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnomalyScoreDistribution;