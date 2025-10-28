import { supabase } from "@/integrations/supabase/client";

export interface CaptureResponse {
  status?: 'success' | 'error';
  message: string;
  anomaly?: number;
  score?: number;
  device_id?: string;
  records?: number;
}

export interface StatusResponse {
  running: boolean;
  pending_captures?: number;
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  matricNumber: string;
  macAddress: string;
  timestamp: string;
  timeOut?: string;
  className: string;
  anomalyFlag: boolean;
  anomalyScore: number;
  sessionDuration: string;
  apSwitches: number;
  rssi: number;
  status: 'present' | 'flagged' | 'suspicious';
}

export interface CaptureData {
  device_id?: string;
  ap_id?: string;
  rssi?: number;
  // Feature test fields
  duration_total?: number;
  ap_switches?: number;
  rssi_mean?: number;
  rssi_std?: number;
  invalid_rssi_count?: number;
  login_hour?: number;
  weekday?: number;
}

class ApiService {
  private async callEdgeFunction<T>(
    functionName: string,
    endpoint?: string,
    body?: any,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T> {
    try {
      const url = `https://zecylmrmutyhibqwnjps.supabase.co/functions/v1/${functionName}${endpoint ? `/${endpoint}` : ''}`;
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA'}`,
        },
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Edge function error: ${functionName}`, errorText);
        throw new Error(`Edge function returned status ${response.status}`);
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`Edge function failed: ${functionName}`, error);
      throw error;
    }
  }

  // Check backend connection status
  async checkConnection(): Promise<boolean> {
    try {
      await this.callEdgeFunction<StatusResponse>('wifi-capture', 'status', undefined, 'GET');
      return true;
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  }

  // Get capture status
  async getStatus(): Promise<StatusResponse> {
    try {
      // Get edge function status for pending captures
      const edgeStatus = await this.callEdgeFunction<StatusResponse>('wifi-capture', 'status', undefined, 'GET');
      
      // Get database control status directly
      const response = await fetch(`https://zecylmrmutyhibqwnjps.supabase.co/rest/v1/rpc/get_capture_control_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA'}`
        }
      });
      
      const controlData = await response.json();
      
      return {
        running: controlData?.[0]?.should_capture || false,
        pending_captures: edgeStatus.pending_captures || 0
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return { running: false, pending_captures: 0 };
    }
  }

  // Start WiFi capture (signals Kali script via database)
  async startCapture(): Promise<CaptureResponse> {
    const response = await fetch(`https://zecylmrmutyhibqwnjps.supabase.co/rest/v1/rpc/set_capture_control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA'}`
      },
      body: JSON.stringify({ start_capture: true })
    });
    
    if (!response.ok) {
      throw new Error('Failed to start capture');
    }
    
    return { status: 'success', message: 'Capture started. Kali script will begin capturing WiFi packets.', records: 0 };
  }

  // Stop WiFi capture (signals Kali script via database)
  async stopCapture(): Promise<CaptureResponse> {
    const response = await fetch(`https://zecylmrmutyhibqwnjps.supabase.co/rest/v1/rpc/set_capture_control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA'}`
      },
      body: JSON.stringify({ start_capture: false })
    });
    
    if (!response.ok) {
      throw new Error('Failed to stop capture');
    }
    
    return { status: 'success', message: 'Capture stopped. Processing final data...', records: 0 };
  }

  // Cancel capture and clear temp data
  async cancelProcess(): Promise<CaptureResponse> {
    // Stop capture first
    await fetch(`https://zecylmrmutyhibqwnjps.supabase.co/rest/v1/rpc/set_capture_control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA'}`
      },
      body: JSON.stringify({ start_capture: false })
    });
    
    // Clear periodic_captures table - skip for now (types not ready)
    try {
      await fetch(`https://hekwirthgpuialimtvxl.supabase.co/rest/v1/periodic_captures?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
    } catch (error) {
      console.warn('Could not clear captures:', error);
    }
    
    return { status: 'success', message: 'Capture cancelled and data cleared.', records: 0 };
  }

  // Finish capture and process data
  async finishCapture(): Promise<CaptureResponse> {
    return this.processCaptures();
  }

  // Send WiFi capture data
  async sendCapture(data: CaptureData): Promise<CaptureResponse> {
    return this.callEdgeFunction<CaptureResponse>('wifi-capture', 'capture', data);
  }

  // Test AI model with features
  async testModel(features: CaptureData): Promise<CaptureResponse> {
    return this.callEdgeFunction<CaptureResponse>('wifi-capture', 'capture', features);
  }

  // Process accumulated captures
  async processCaptures(): Promise<CaptureResponse> {
    return this.callEdgeFunction<CaptureResponse>('wifi-capture', 'process', {});
  }

  // Get attendance report data
  async getAttendanceReport(): Promise<AttendanceRecord[]> {
    const response = await this.callEdgeFunction<{ data: AttendanceRecord[] }>('attendance-report', undefined, undefined, 'GET');
    return response.data || [];
  }
}

export const apiService = new ApiService();
