import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Trash2, Search, Zap } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RegisteredDevice {
  id: string;
  device_id: string;
  student_name: string;
  matric_number: string;
  class_name: string | null;
  created_at: string;
}

interface UnregisteredDevice {
  device_id: string;
  count: number;
}

export function DeviceRegistration() {
  const [registeredDevices, setRegisteredDevices] = useState<RegisteredDevice[]>([]);
  const [unregisteredDevices, setUnregisteredDevices] = useState<UnregisteredDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRegistering, setAutoRegistering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [formData, setFormData] = useState({
    student_name: '',
    matric_number: '',
    class_name: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch registered devices
      const { data: registered, error: regError } = await supabase
        .from('registered_devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (regError) throw regError;
      setRegisteredDevices(registered || []);

      // Fetch all device_ids seen in attendance (we'll compute unregistered by diffing against registered list)
      const { data: attendanceDevices, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('device_id');

      if (attendanceError) throw attendanceError;

      // Count occurrences of each device across all attendance (normalize to avoid casing/whitespace mismatches)
      const normalize = (id: string) => id?.trim().toLowerCase();
      const deviceCounts = new Map<string, number>();
      attendanceDevices?.forEach((record) => {
        const raw = record.device_id as string;
        const id = normalize(raw);
        if (!id) return;
        const count = deviceCounts.get(id) || 0;
        deviceCounts.set(id, count + 1);
      });

      // Any device_id present in attendance but missing from registered_devices is considered unregistered
      const registeredSet = new Set((registered || []).map((r) => normalize(r.device_id)));
      const unregList = Array.from(deviceCounts.entries())
        .filter(([device_id]) => !registeredSet.has(device_id))
        .map(([device_id, count]) => ({ device_id, count }));

      console.info('[DeviceRegistration] Registered:', (registered || []).length, 'Attendance unique:', deviceCounts.size, 'Unregistered computed:', unregList.length);

      setUnregisteredDevices(unregList);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch device data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedDevice || !formData.student_name || !formData.matric_number) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Register the device
      const { error: regError } = await supabase.from('registered_devices').insert({
        device_id: selectedDevice,
        student_name: formData.student_name,
        matric_number: formData.matric_number,
        class_name: formData.class_name || null,
      });

      if (regError) throw regError;

      // Update existing attendance records with this device_id
      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          student_name: formData.student_name,
          matric_number: formData.matric_number,
          class_name: formData.class_name || null,
        })
        .eq('device_id', selectedDevice);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Device registered and attendance records updated',
      });

      setIsDialogOpen(false);
      setFormData({ student_name: '', matric_number: '', class_name: '' });
      setSelectedDevice('');
      fetchData();
    } catch (error) {
      console.error('Error registering device:', error);
      toast({
        title: 'Error',
        description: 'Failed to register device',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('registered_devices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Device unregistered successfully',
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast({
        title: 'Error',
        description: 'Failed to unregister device',
        variant: 'destructive',
      });
    }
  };

  const handleAutoRegister = async () => {
    setAutoRegistering(true);
    try {
      console.log('[DeviceRegistration] Starting auto-registration...');
      const { data, error } = await supabase.functions.invoke('auto-register-devices');

      if (error) {
        console.error('[DeviceRegistration] Edge function error:', error);
        throw error;
      }

      console.log('[DeviceRegistration] Auto-registration response:', data);

      toast({
        title: 'Success',
        description: data.message || 'Devices registered successfully',
      });

      // Wait a bit for database to propagate changes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error auto-registering devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to auto-register devices. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setAutoRegistering(false);
    }
  };

  const filteredRegistered = registeredDevices.filter(
    (device) =>
      device.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.matric_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.device_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Device Registration</CardTitle>
          <CardDescription>
            Register MAC addresses with student information for attendance tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, matric number, or MAC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button 
              onClick={handleAutoRegister} 
              disabled={autoRegistering}
            >
              {autoRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Register All
                </>
              )}
            </Button>
            <Button onClick={fetchData} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {unregisteredDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unregistered Devices</CardTitle>
            <CardDescription>
              {unregisteredDevices.length} device(s) detected without registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>Capture Count</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unregisteredDevices.map((device) => (
                  <TableRow key={device.device_id}>
                    <TableCell className="font-mono text-sm">
                      {device.device_id}
                    </TableCell>
                    <TableCell>{device.count}</TableCell>
                    <TableCell>
                      <Dialog open={isDialogOpen && selectedDevice === device.device_id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setSelectedDevice('');
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => setSelectedDevice(device.device_id)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Register Device</DialogTitle>
                            <DialogDescription>
                              Register student information for MAC: {device.device_id}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="student_name">Student Name *</Label>
                              <Input
                                id="student_name"
                                value={formData.student_name}
                                onChange={(e) =>
                                  setFormData({ ...formData, student_name: e.target.value })
                                }
                                placeholder="Enter student name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="matric_number">Matric Number *</Label>
                              <Input
                                id="matric_number"
                                value={formData.matric_number}
                                onChange={(e) =>
                                  setFormData({ ...formData, matric_number: e.target.value })
                                }
                                placeholder="Enter matric number"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="class_name">Class Name</Label>
                              <Input
                                id="class_name"
                                value={formData.class_name}
                                onChange={(e) =>
                                  setFormData({ ...formData, class_name: e.target.value })
                                }
                                placeholder="Enter class name (optional)"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleRegister}>Register</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
          <CardDescription>
            {filteredRegistered.length} device(s) registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Matric Number</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistered.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.student_name}</TableCell>
                  <TableCell>{device.matric_number}</TableCell>
                  <TableCell>{device.class_name || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{device.device_id}</TableCell>
                  <TableCell>
                    {new Date(device.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(device.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRegistered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No registered devices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
