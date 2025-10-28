import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Download, 
  FileText, 
  Calendar as CalendarIcon, 
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  Printer
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ExportConfig {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  includeFields: string[];
  statusFilter: 'all' | 'present' | 'flagged' | 'suspicious';
  anomalyThreshold: number;
  includeMetadata: boolean;
  groupBy: 'none' | 'class' | 'date' | 'student';
}

interface ExportManagerProps {
  onExport?: (config: ExportConfig) => void;
  className?: string;
}

const ExportManager = ({ onExport, className = "" }: ExportManagerProps) => {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    dateRange: {
      from: null,
      to: null
    },
    includeFields: ['studentName', 'matricNumber', 'timestamp', 'className', 'anomalyScore'],
    statusFilter: 'all',
    anomalyThreshold: 0.7,
    includeMetadata: true,
    groupBy: 'none'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string;
    timestamp: string;
    format: string;
    recordCount: number;
    filename: string;
  }>>([]);

  // Available fields for export
  const availableFields = [
    { id: 'studentName', label: 'Student Name', required: true },
    { id: 'matricNumber', label: 'Matric Number', required: true },
    { id: 'macAddress', label: 'MAC Address', required: false },
    { id: 'timestamp', label: 'Timestamp', required: true },
    { id: 'className', label: 'Class', required: false },
    { id: 'sessionDuration', label: 'Session Duration', required: false },
    { id: 'anomalyScore', label: 'Anomaly Score', required: false },
    { id: 'apSwitches', label: 'AP Switches', required: false },
    { id: 'rssi', label: 'Signal Strength', required: false },
    { id: 'status', label: 'Status', required: false }
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Comma-separated values for Excel/Sheets' },
    { value: 'json', label: 'JSON', icon: FileJson, description: 'Structured data for APIs' },
    { value: 'pdf', label: 'PDF', icon: FileText, description: 'Formatted report for printing' }
  ];

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (field?.required) return; // Can't toggle required fields

    setConfig(prev => ({
      ...prev,
      includeFields: checked 
        ? [...prev.includeFields, fieldId]
        : prev.includeFields.filter(id => id !== fieldId)
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      // Generate sample data for export
      const sampleData = generateExportData(config);
      
      if (config.format === 'csv') {
        downloadCSV(sampleData, config);
      } else if (config.format === 'json') {
        downloadJSON(sampleData, config);
      } else if (config.format === 'pdf') {
        generatePDFReport(sampleData, config);
      }
      
      // Add to export history
      const newExport = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        format: config.format.toUpperCase(),
        recordCount: sampleData.length,
        filename: generateFilename(config)
      };
      
      setExportHistory(prev => [newExport, ...prev.slice(0, 4)]); // Keep last 5 exports
      setIsExporting(false);
      
      onExport?.(config);
    }, 2000);
  };

  const generateExportData = (config: ExportConfig) => {
    // This would typically fetch real data from your API
    // For demo purposes, generating sample data
    const students = [
      { name: 'Ahmad Rahman', matric: 'A20CS1234' },
      { name: 'Siti Nurhaliza', matric: 'A20CS1235' },
      { name: 'Chen Wei Ming', matric: 'A20CS1236' },
      { name: 'Raj Kumar', matric: 'A20CS1237' },
      { name: 'Fatimah Zahra', matric: 'A20CS1238' }
    ];

    return Array.from({ length: 50 }, (_, i) => {
      const student = students[i % students.length];
      const anomalyScore = Math.random();
      const status = anomalyScore > config.anomalyThreshold ? 'flagged' : 'present';
      
      return {
        studentName: student.name,
        matricNumber: student.matric,
        macAddress: Array.from({length: 6}, () => 
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':').toUpperCase(),
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        className: `CS300${Math.floor(Math.random() * 3) + 1}`,
        sessionDuration: `${Math.floor(Math.random() * 120) + 10} min`,
        anomalyScore: anomalyScore.toFixed(3),
        apSwitches: Math.floor(Math.random() * 15) + 1,
        rssi: -(Math.floor(Math.random() * 40) + 30),
        status
      };
    }).filter(record => {
      if (config.statusFilter === 'all') return true;
      return record.status === config.statusFilter;
    });
  };

  const generateFilename = (config: ExportConfig) => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const statusSuffix = config.statusFilter !== 'all' ? `_${config.statusFilter}` : '';
    return `attendance_export_${timestamp}${statusSuffix}.${config.format}`;
  };

  const downloadCSV = (data: any[], config: ExportConfig) => {
    const headers = config.includeFields.map(field => 
      availableFields.find(f => f.id === field)?.label || field
    );
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        config.includeFields.map(field => row[field] || '').join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateFilename(config);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any[], config: ExportConfig) => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      config: {
        statusFilter: config.statusFilter,
        anomalyThreshold: config.anomalyThreshold,
        recordCount: data.length
      },
      data: data.map(row => {
        const filteredRow: any = {};
        config.includeFields.forEach(field => {
          filteredRow[field] = row[field];
        });
        return filteredRow;
      })
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateFilename(config);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePDFReport = (data: any[], config: ExportConfig) => {
    // In a real app, you'd use a PDF library like jsPDF or Puppeteer
    console.log('Generating PDF report with data:', data);
    alert(`PDF report generated with ${data.length} records. In a real implementation, this would download a formatted PDF.`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Present</Badge>;
      case 'suspicious':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground"><Clock className="h-3 w-3 mr-1" />Suspicious</Badge>;
      case 'flagged':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Flagged</Badge>;
      default:
        return <Badge variant="outline">All Records</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-primary" />
          <span>Export Manager</span>
        </CardTitle>
        <CardDescription>
          Configure and download attendance data in various formats
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Export Format */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Export Format</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setConfig(prev => ({ ...prev, format: option.value as any }))}
                className={cn(
                  "p-3 border rounded-lg text-left transition-colors hover:bg-accent",
                  config.format === option.value ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <option.icon className="h-4 w-4" />
                  <span className="font-medium">{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {config.dateRange.from ? format(config.dateRange.from, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={config.dateRange.from}
                  onSelect={(date) => setConfig(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, from: date } 
                  }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {config.dateRange.to ? format(config.dateRange.to, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={config.dateRange.to}
                  onSelect={(date) => setConfig(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, to: date } 
                  }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status Filter</label>
            <Select value={config.statusFilter} onValueChange={(value: any) => 
              setConfig(prev => ({ ...prev, statusFilter: value }))
            }>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="present">Present Only</SelectItem>
                <SelectItem value="suspicious">Suspicious Only</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Group By</label>
            <Select value={config.groupBy} onValueChange={(value: any) => 
              setConfig(prev => ({ ...prev, groupBy: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="class">By Class</SelectItem>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="student">By Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Include Fields */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Include Fields</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availableFields.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={config.includeFields.includes(field.id)}
                  onCheckedChange={(checked) => handleFieldToggle(field.id, !!checked)}
                  disabled={field.required}
                />
                <label htmlFor={field.id} className="text-sm">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Export Summary */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="font-medium text-foreground">Export Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Format:</span>
              <div className="font-medium">{config.format.toUpperCase()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Status Filter:</span>
              <div className="mt-1">{getStatusBadge(config.statusFilter)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Fields:</span>
              <div className="font-medium">{config.includeFields.length} selected</div>
            </div>
            <div>
              <span className="text-muted-foreground">Grouping:</span>
              <div className="font-medium capitalize">{config.groupBy.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExport} 
          disabled={isExporting || config.includeFields.length === 0}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </>
          )}
        </Button>

        {/* Export History */}
        {exportHistory.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Exports</h4>
            <div className="space-y-2">
              {exportHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.filename}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {item.recordCount} records • {item.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExportManager;