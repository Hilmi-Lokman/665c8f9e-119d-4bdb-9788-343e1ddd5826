import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Edit2,
  Trash2,
  Save
} from "lucide-react";

interface Schedule {
  id: string;
  class_code: string;
  subject_name: string;
  day_of_week: number;
  time_start: string;
  time_end: string;
  location: string | null;
  instructor: string | null;
  is_active: boolean | null;
}

const ScheduleManagement = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    classCode: "",
    subjectName: "",
    day: "",
    timeStart: "",
    timeEnd: "",
    location: "",
    instructor: ""
  });
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Map day name to day_of_week number (0=Sunday, 1=Monday, etc.)
  const dayToDayOfWeek = (day: string): number => days.indexOf(day);
  const dayOfWeekToDay = (dayOfWeek: number): string => days[dayOfWeek] || "Unknown";

  // Fetch schedules from Supabase
  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('time_start', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load schedules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.classCode || !formData.subjectName || !formData.day || !formData.timeStart || !formData.timeEnd) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .insert({
          class_code: formData.classCode,
          subject_name: formData.subjectName,
          day_of_week: dayToDayOfWeek(formData.day),
          time_start: formData.timeStart,
          time_end: formData.timeEnd,
          location: formData.location || null,
          instructor: formData.instructor || null,
          is_active: true
        });

      if (error) throw error;

      await fetchSchedules();
      setFormData({
        classCode: "",
        subjectName: "",
        day: "",
        timeStart: "",
        timeEnd: "",
        location: "",
        instructor: ""
      });
      setIsDialogOpen(false);
      
      toast({
        title: "Schedule Added",
        description: `${formData.subjectName} has been added to the schedule.`,
      });
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast({
        title: "Error",
        description: "Failed to add schedule.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      classCode: schedule.class_code,
      subjectName: schedule.subject_name,
      day: dayOfWeekToDay(schedule.day_of_week),
      timeStart: schedule.time_start,
      timeEnd: schedule.time_end,
      location: schedule.location || "",
      instructor: schedule.instructor || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;
    
    if (!formData.classCode || !formData.subjectName || !formData.day || !formData.timeStart || !formData.timeEnd) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          class_code: formData.classCode,
          subject_name: formData.subjectName,
          day_of_week: dayToDayOfWeek(formData.day),
          time_start: formData.timeStart,
          time_end: formData.timeEnd,
          location: formData.location || null,
          instructor: formData.instructor || null
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      await fetchSchedules();
      setFormData({
        classCode: "",
        subjectName: "",
        day: "",
        timeStart: "",
        timeEnd: "",
        location: "",
        instructor: ""
      });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      
      toast({
        title: "Schedule Updated",
        description: `${formData.subjectName} has been updated.`,
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSchedules();
      toast({
        title: "Schedule Deleted",
        description: "The schedule has been removed.",
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete schedule.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (isActive: boolean | null) => {
    if (isActive) {
      return <Badge className="bg-success-light text-success">Active</Badge>;
    }
    return <Badge variant="outline">Inactive</Badge>;
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Schedule Management</h1>
          <p className="text-muted-foreground">Manage class schedules and timetables</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="university" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add New Subject</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>
                Create a new class schedule entry. Fill in all the required information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="classCode" className="text-right">
                  Class Code*
                </Label>
                <Input
                  id="classCode"
                  placeholder="e.g., CSE301"
                  className="col-span-3"
                  value={formData.classCode}
                  onChange={(e) => handleInputChange('classCode', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subjectName" className="text-right">
                  Subject Name*
                </Label>
                <Input
                  id="subjectName"
                  placeholder="e.g., Software Engineering"
                  className="col-span-3"
                  value={formData.subjectName}
                  onChange={(e) => handleInputChange('subjectName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="day" className="text-right">
                  Day*
                </Label>
                <Select value={formData.day} onValueChange={(value) => handleInputChange('day', value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="timeStart" className="text-right">
                  Start Time*
                </Label>
                <Input
                  id="timeStart"
                  type="time"
                  className="col-span-3"
                  value={formData.timeStart}
                  onChange={(e) => handleInputChange('timeStart', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="timeEnd" className="text-right">
                  End Time*
                </Label>
                <Input
                  id="timeEnd"
                  type="time"
                  className="col-span-3"
                  value={formData.timeEnd}
                  onChange={(e) => handleInputChange('timeEnd', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location*
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Lab 1"
                  className="col-span-3"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="instructor" className="text-right">
                  Instructor
                </Label>
                <Input
                  id="instructor"
                  placeholder="e.g., Dr. Ahmad Rahman"
                  className="col-span-3"
                  value={formData.instructor}
                  onChange={(e) => handleInputChange('instructor', e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                Save Subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Subjects</p>
                <p className="text-2xl font-bold text-primary">{schedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Active Classes</p>
                <p className="text-2xl font-bold text-success">
                  {schedules.filter(s => s.is_active).length}
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
                <p className="text-sm font-medium">This Week</p>
                <p className="text-2xl font-bold text-warning">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Locations</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {new Set(schedules.map(s => s.location).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Table */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Class Schedule</span>
          </CardTitle>
          <CardDescription>
            Manage and view all class schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No schedules found. Add your first schedule above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id} className="hover:bg-accent/50">
                    <TableCell className="font-medium">{schedule.class_code}</TableCell>
                    <TableCell>{schedule.subject_name}</TableCell>
                    <TableCell>{dayOfWeekToDay(schedule.day_of_week)}</TableCell>
                    <TableCell>
                      {formatTime(schedule.time_start)} - {formatTime(schedule.time_end)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{schedule.location || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{schedule.instructor || 'TBA'}</TableCell>
                    <TableCell>{getStatusBadge(schedule.is_active)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update the class schedule information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-classCode" className="text-right">
                Class Code*
              </Label>
              <Input
                id="edit-classCode"
                placeholder="e.g., CSE301"
                className="col-span-3"
                value={formData.classCode}
                onChange={(e) => handleInputChange('classCode', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-subjectName" className="text-right">
                Subject Name*
              </Label>
              <Input
                id="edit-subjectName"
                placeholder="e.g., Software Engineering"
                className="col-span-3"
                value={formData.subjectName}
                onChange={(e) => handleInputChange('subjectName', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-day" className="text-right">
                Day*
              </Label>
              <Select value={formData.day} onValueChange={(value) => handleInputChange('day', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-timeStart" className="text-right">
                Start Time*
              </Label>
              <Input
                id="edit-timeStart"
                type="time"
                className="col-span-3"
                value={formData.timeStart}
                onChange={(e) => handleInputChange('timeStart', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-timeEnd" className="text-right">
                End Time*
              </Label>
              <Input
                id="edit-timeEnd"
                type="time"
                className="col-span-3"
                value={formData.timeEnd}
                onChange={(e) => handleInputChange('timeEnd', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-location" className="text-right">
                Location
              </Label>
              <Input
                id="edit-location"
                placeholder="e.g., Lab 1"
                className="col-span-3"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-instructor" className="text-right">
                Instructor
              </Label>
              <Input
                id="edit-instructor"
                placeholder="e.g., Dr. Ahmad Rahman"
                className="col-span-3"
                value={formData.instructor}
                onChange={(e) => handleInputChange('instructor', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdate}>
              <Save className="h-4 w-4 mr-2" />
              Update Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleManagement;