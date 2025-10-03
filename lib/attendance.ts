import { supabase } from './supabase';
import { storageService } from './storage';
import { syncManager } from './sync-manager';
import { AttendanceRecord, AttendanceStats, AttendancePolicy, DailyAttendanceRecord } from '@/types';

export class AttendanceService {
  private static instance: AttendanceService;
  private policy: AttendancePolicy | null = null;

  private constructor() {
    this.loadPolicy();
  }

  static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  private async loadPolicy() {
    try {
      // Try to get policy from local storage first
      const localPolicy = await storageService.getSettings();
      if (localPolicy && localPolicy.attendancePolicy) {
        this.policy = localPolicy.attendancePolicy;
        return;
      }

      // If not in local storage, fetch from server
      const { data, error } = await supabase
        .from('attendance_policies')
        .select('*')
        .single();

      if (error) {
        console.error('Error loading attendance policy:', error);
        // Set default policy if none exists
        this.policy = {
          id: 'default',
          work_start_time: '08:00',
          work_end_time: '17:00',
          late_threshold_minutes: 15,
          early_leave_threshold_minutes: 15,
          overtime_enabled: true,
          weekend_work_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        this.policy = data;
        // Cache policy locally
        const settings = await storageService.getSettings() || { id: 'default', syncInterval: 5, maxRetries: 3, offlineMode: false, lastUpdated: new Date() };
        await storageService.saveSettings({
          ...settings,
          attendancePolicy: data,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      console.error('Error in loadPolicy:', error);
    }
  }

  async getPolicy(): Promise<AttendancePolicy | null> {
    if (!this.policy) {
      await this.loadPolicy();
    }
    return this.policy;
  }

  async updatePolicy(policy: Partial<AttendancePolicy>): Promise<AttendancePolicy | null> {
    try {
      const { data, error } = await supabase
        .from('attendance_policies')
        .upsert(policy)
        .select()
        .single();

      if (error) {
        console.error('Error updating attendance policy:', error);
        return null;
      }

      this.policy = data;
      // Cache policy locally
      const settings = await storageService.getSettings() || { id: 'default', syncInterval: 5, maxRetries: 3, offlineMode: false, lastUpdated: new Date() };
      await storageService.saveSettings({
        ...settings,
        attendancePolicy: data,
        lastUpdated: new Date(),
      });
      return data;
    } catch (error) {
      console.error('Error in updatePolicy:', error);
      return null;
    }
  }

  async clockIn(userId: string, location?: { latitude: number; longitude: number }, photoUrl?: string): Promise<DailyAttendanceRecord | null> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if already clocked in today
      const existingRecord = await this.getTodayAttendance(userId);
      if (existingRecord && existingRecord.clock_in) {
        throw new Error('Already clocked in today');
      }

      const record: Partial<DailyAttendanceRecord> = {
        user_id: userId,
        date: today,
        clock_in: now.toISOString(),
        clock_in_location: location,
        clock_in_photo: photoUrl,
        status: 'present',
        sync_status: 'pending',
      };

      // Save to local storage first
      const localRecords = await storageService.getAttendanceRecords() || [];
      const newRecord: DailyAttendanceRecord = {
        id: `local_${Date.now()}`,
        ...record,
      } as DailyAttendanceRecord;
      
      // Convert to AttendanceRecord format for storage
      const attendanceRecord: AttendanceRecord = {
        id: newRecord.id,
        userId: newRecord.user_id,
        timestamp: now,
        type: 'check-in',
        location: location,
        photo: photoUrl,
        synced: false,
        pendingSync: true,
        createdAt: now,
        updatedAt: now,
      };
      
      await storageService.saveAttendanceRecord(attendanceRecord);

      // Add to sync queue
      await syncManager.sync();

      return newRecord;
    } catch (error) {
      console.error('Error in clockIn:', error);
      throw error;
    }
  }

  async clockOut(userId: string, location?: { latitude: number; longitude: number }, photoUrl?: string): Promise<DailyAttendanceRecord | null> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Get today's attendance record
      const record = await this.getTodayAttendance(userId);
      if (!record || !record.clock_in) {
        throw new Error('No clock-in record found for today');
      }

      if (record.clock_out) {
        throw new Error('Already clocked out today');
      }

      const updatedRecord: Partial<DailyAttendanceRecord> = {
        clock_out: now.toISOString(),
        clock_out_location: location,
        clock_out_photo: photoUrl,
        sync_status: 'pending',
      };

      // Update local storage
      const localRecords = await storageService.getAttendanceRecords() || [];
      const clockInRecord = localRecords.find(r => r.userId === userId && r.type === 'check-in' && r.timestamp.toDateString() === now.toDateString());
      
      if (clockInRecord) {
        // Create a new check-out record
        const attendanceRecord: AttendanceRecord = {
          id: `local_${Date.now()}`,
          userId: userId,
          timestamp: now,
          type: 'check-out',
          location: location,
          photo: photoUrl,
          synced: false,
          pendingSync: true,
          createdAt: now,
          updatedAt: now,
        };
        
        await storageService.saveAttendanceRecord(attendanceRecord);
      }

      // Add to sync queue
      await syncManager.sync();

      return { ...record, ...updatedRecord };
    } catch (error) {
      console.error('Error in clockOut:', error);
      throw error;
    }
  }

  async getTodayAttendance(userId: string): Promise<DailyAttendanceRecord | null> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      // First check local storage
      const localRecords = await storageService.getAttendanceRecords({
        userId,
        startDate: startOfDay,
        endDate: endOfDay,
      }) || [];
      
      const checkInRecord = localRecords.find(r => r.type === 'check-in');
      const checkOutRecord = localRecords.find(r => r.type === 'check-out');
      
      if (checkInRecord) {
        const record: DailyAttendanceRecord = {
          id: checkInRecord.id,
          user_id: checkInRecord.userId,
          date: today.toISOString().split('T')[0],
          clock_in: checkInRecord.timestamp.toISOString(),
          clock_out: checkOutRecord?.timestamp.toISOString(),
          clock_in_location: checkInRecord.location,
          clock_out_location: checkOutRecord?.location,
          clock_in_photo: checkInRecord.photo,
          clock_out_photo: checkOutRecord?.photo,
          status: 'present',
          sync_status: checkInRecord.synced ? 'synced' : 'pending',
          created_at: checkInRecord.createdAt?.toISOString(),
          updated_at: checkInRecord.updatedAt?.toISOString(),
        };
        
        return record;
      }

      // If not found locally, try to fetch from server
      const { data, error } = await supabase
        .from('daily_attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today.toISOString().split('T')[0])
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No records found
          return null;
        }
        console.error('Error fetching today attendance:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTodayAttendance:', error);
      return null;
    }
  }

  async getAttendanceHistory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyAttendanceRecord[]> {
    try {
      // First check local storage
      const localRecords = await storageService.getAttendanceRecords({
        userId,
        startDate,
        endDate,
      }) || [];

      // Group records by date
      const recordsByDate: { [date: string]: { checkIn?: AttendanceRecord; checkOut?: AttendanceRecord } } = {};
      
      localRecords.forEach(record => {
        const date = record.timestamp.toISOString().split('T')[0];
        if (!recordsByDate[date]) {
          recordsByDate[date] = {};
        }
        
        if (record.type === 'check-in') {
          recordsByDate[date].checkIn = record;
        } else if (record.type === 'check-out') {
          recordsByDate[date].checkOut = record;
        }
      });

      // Convert to DailyAttendanceRecord format
      const dailyRecords: DailyAttendanceRecord[] = [];
      
      Object.entries(recordsByDate).forEach(([date, records]) => {
        if (records.checkIn) {
          dailyRecords.push({
            id: records.checkIn.id,
            user_id: records.checkIn.userId,
            date,
            clock_in: records.checkIn.timestamp.toISOString(),
            clock_out: records.checkOut?.timestamp.toISOString(),
            clock_in_location: records.checkIn.location,
            clock_out_location: records.checkOut?.location,
            clock_in_photo: records.checkIn.photo,
            clock_out_photo: records.checkOut?.photo,
            status: 'present',
            sync_status: records.checkIn.synced ? 'synced' : 'pending',
            created_at: records.checkIn.createdAt?.toISOString(),
            updated_at: records.checkIn.updatedAt?.toISOString(),
          });
        }
      });

      // Try to fetch from server
      const { data, error } = await supabase
        .from('daily_attendance_records')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance history:', error);
        return dailyRecords;
      }

      // Merge local and server records, prioritizing server records
      const mergedRecords = [...dailyRecords];
      data.forEach(serverRecord => {
        const localIndex = mergedRecords.findIndex(r => r.date === serverRecord.date);
        if (localIndex !== -1) {
          mergedRecords[localIndex] = serverRecord;
        } else {
          mergedRecords.push(serverRecord);
        }
      });

      return mergedRecords;
    } catch (error) {
      console.error('Error in getAttendanceHistory:', error);
      return [];
    }
  }

  async calculateAttendanceStats(userId: string, startDate: Date, endDate: Date): Promise<AttendanceStats> {
    try {
      const records = await this.getAttendanceHistory(userId, startDate, endDate);
      
      const stats: AttendanceStats = {
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        onTime: 0,
        late: 0,
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        early_leave_days: 0,
        total_work_hours: 0,
        overtime_hours: 0,
        average_work_hours: 0,
      };

      if (!records.length) {
        return stats;
      }

      const policy = await this.getPolicy();
      if (!policy) {
        return stats;
      }

      stats.total_days = records.length;

      for (const record of records) {
        if (record.clock_in && record.clock_out) {
          stats.present_days++;
          
          const clockInTime = new Date(record.clock_in);
          const clockOutTime = new Date(record.clock_out);
          
          // Calculate work hours
          const workHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          stats.total_work_hours += workHours;
          
          // Check if late
          const [workStartHour, workStartMinute] = policy.work_start_time.split(':').map(Number);
          const workStartTime = new Date(clockInTime);
          workStartTime.setHours(workStartHour, workStartMinute, 0, 0);
          
          if (clockInTime > workStartTime) {
            const lateMinutes = (clockInTime.getTime() - workStartTime.getTime()) / (1000 * 60);
            if (lateMinutes > policy.late_threshold_minutes) {
              stats.late_days++;
            }
          }
          
          // Check if early leave
          const [workEndHour, workEndMinute] = policy.work_end_time.split(':').map(Number);
          const workEndTime = new Date(clockOutTime);
          workEndTime.setHours(workEndHour, workEndMinute, 0, 0);
          
          if (clockOutTime < workEndTime) {
            const earlyLeaveMinutes = (workEndTime.getTime() - clockOutTime.getTime()) / (1000 * 60);
            if (earlyLeaveMinutes > policy.early_leave_threshold_minutes) {
              stats.early_leave_days++;
            }
          }
          
          // Calculate overtime
          if (policy.overtime_enabled && clockOutTime > workEndTime) {
            const overtimeMinutes = (clockOutTime.getTime() - workEndTime.getTime()) / (1000 * 60);
            stats.overtime_hours += overtimeMinutes / 60;
          }
        } else if (record.status === 'absent') {
          stats.absent_days++;
        }
      }

      stats.average_work_hours = stats.present_days > 0 
        ? stats.total_work_hours / stats.present_days 
        : 0;

      return stats;
    } catch (error) {
      console.error('Error in calculateAttendanceStats:', error);
      return {
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        onTime: 0,
        late: 0,
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        early_leave_days: 0,
        total_work_hours: 0,
        overtime_hours: 0,
        average_work_hours: 0,
      };
    }
  }

  async markAbsent(userId: string, date: string, reason?: string): Promise<DailyAttendanceRecord | null> {
    try {
      // Check if record already exists for this date
      const existingRecord = await this.getAttendanceByDate(userId, date);
      if (existingRecord) {
        throw new Error('Attendance record already exists for this date');
      }

      const record: Partial<DailyAttendanceRecord> = {
        user_id: userId,
        date,
        status: 'absent',
        absence_reason: reason,
        sync_status: 'pending',
      };

      // Save to local storage first
      const newRecord: DailyAttendanceRecord = {
        id: `local_${Date.now()}`,
        ...record,
      } as DailyAttendanceRecord;
      
      // Convert to AttendanceRecord format for storage
      const attendanceRecord: AttendanceRecord = {
        id: newRecord.id,
        userId: newRecord.user_id,
        timestamp: new Date(date),
        type: 'check-in', // Using check-in as a placeholder for absent records
        synced: false,
        pendingSync: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await storageService.saveAttendanceRecord(attendanceRecord);

      // Add to sync queue
      await syncManager.sync();

      return newRecord;
    } catch (error) {
      console.error('Error in markAbsent:', error);
      throw error;
    }
  }

  private async getAttendanceByDate(userId: string, date: string): Promise<DailyAttendanceRecord | null> {
    try {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      
      // First check local storage
      const localRecords = await storageService.getAttendanceRecords({
        userId,
        startDate: startOfDay,
        endDate: endOfDay,
      }) || [];
      
      const checkInRecord = localRecords.find(r => r.type === 'check-in');
      const checkOutRecord = localRecords.find(r => r.type === 'check-out');
      
      if (checkInRecord) {
        const record: DailyAttendanceRecord = {
          id: checkInRecord.id,
          user_id: checkInRecord.userId,
          date,
          clock_in: checkInRecord.timestamp.toISOString(),
          clock_out: checkOutRecord?.timestamp.toISOString(),
          clock_in_location: checkInRecord.location,
          clock_out_location: checkOutRecord?.location,
          clock_in_photo: checkInRecord.photo,
          clock_out_photo: checkOutRecord?.photo,
          status: 'present',
          sync_status: checkInRecord.synced ? 'synced' : 'pending',
          created_at: checkInRecord.createdAt?.toISOString(),
          updated_at: checkInRecord.updatedAt?.toISOString(),
        };
        
        return record;
      }

      // If not found locally, try to fetch from server
      const { data, error } = await supabase
        .from('daily_attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No records found
          return null;
        }
        console.error('Error fetching attendance by date:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getAttendanceByDate:', error);
      return null;
    }
  }

  async syncAttendanceRecords(): Promise<void> {
    try {
      // Trigger sync process
      await syncManager.sync();
    } catch (error) {
      console.error('Error in syncAttendanceRecords:', error);
    }
  }
}

export const attendanceService = AttendanceService.getInstance();