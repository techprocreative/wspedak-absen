import { format, addDays, isWeekend, isWithinInterval, parseISO, setHours, setMinutes, isAfter, isBefore, differenceInMinutes, differenceInHours } from 'date-fns';
import { AttendancePolicy, DailyAttendanceRecord } from '@/types';

export class AttendanceUtils {
  /**
   * Parse a time string in "HH:mm" format to a Date object
   */
  static parseTime(timeString: string, date = new Date()): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    return setMinutes(setHours(date, hours), minutes);
  }

  /**
   * Format a Date object to a time string in "HH:mm" format
   */
  static formatTime(date: Date): string {
    return format(date, 'HH:mm');
  }

  /**
   * Format a Date object to a date string in "yyyy-MM-dd" format
   */
  static formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  /**
   * Check if a given date is a holiday
   * In a real implementation, this would check against a holiday calendar
   */
  static isHoliday(date: Date, holidays: Date[] = []): boolean {
    return holidays.some(holiday => 
      format(holiday, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  }

  /**
   * Check if a given date is a working day
   */
  static isWorkingDay(date: Date, policy: AttendancePolicy, holidays: Date[] = []): boolean {
    if (isWeekend(date) && !policy.weekend_work_enabled) {
      return false;
    }
    return !this.isHoliday(date, holidays);
  }

  /**
   * Get the work start time for a given date based on the policy
   */
  static getWorkStartTime(date: Date, policy: AttendancePolicy): Date {
    return this.parseTime(policy.work_start_time, date);
  }

  /**
   * Get the work end time for a given date based on the policy
   */
  static getWorkEndTime(date: Date, policy: AttendancePolicy): Date {
    return this.parseTime(policy.work_end_time, date);
  }

  /**
   * Calculate if an employee is late based on clock-in time
   */
  static isLate(clockInTime: Date, policy: AttendancePolicy): boolean {
    const workStartTime = this.getWorkStartTime(clockInTime, policy);
    const lateThresholdMinutes = policy.late_threshold_minutes;
    const lateThresholdTime = addDays(workStartTime, lateThresholdMinutes / (24 * 60));
    
    return isAfter(clockInTime, lateThresholdTime);
  }

  /**
   * Calculate if an employee left early based on clock-out time
   */
  static isEarlyLeave(clockOutTime: Date, policy: AttendancePolicy): boolean {
    const workEndTime = this.getWorkEndTime(clockOutTime, policy);
    const earlyLeaveThresholdMinutes = policy.early_leave_threshold_minutes;
    const earlyLeaveThresholdTime = addDays(workEndTime, -earlyLeaveThresholdMinutes / (24 * 60));
    
    return isBefore(clockOutTime, earlyLeaveThresholdTime);
  }

  /**
   * Calculate overtime hours based on clock-out time
   */
  static calculateOvertime(clockOutTime: Date, policy: AttendancePolicy): number {
    if (!policy.overtime_enabled) {
      return 0;
    }
    
    const workEndTime = this.getWorkEndTime(clockOutTime, policy);
    
    if (isAfter(clockOutTime, workEndTime)) {
      return differenceInMinutes(clockOutTime, workEndTime) / 60;
    }
    
    return 0;
  }

  /**
   * Calculate total work hours between clock-in and clock-out times
   */
  static calculateWorkHours(clockInTime: Date, clockOutTime: Date): number {
    return differenceInMinutes(clockOutTime, clockInTime) / 60;
  }

  /**
   * Determine attendance status based on clock-in and clock-out times
   */
  static determineAttendanceStatus(
    clockInTime?: Date, 
    clockOutTime?: Date, 
    policy?: AttendancePolicy
  ): 'present' | 'absent' | 'late' | 'early_leave' {
    if (!clockInTime) {
      return 'absent';
    }
    
    if (!policy) {
      return 'present';
    }
    
    let status: 'present' | 'late' | 'early_leave' = 'present';
    
    if (this.isLate(clockInTime, policy)) {
      status = 'late';
    }
    
    if (clockOutTime && this.isEarlyLeave(clockOutTime, policy)) {
      status = 'early_leave';
    }
    
    return status;
  }

  /**
   * Calculate the number of working days in a date range
   */
  static calculateWorkingDays(startDate: Date, endDate: Date, policy: AttendancePolicy, holidays: Date[] = []): number {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (this.isWorkingDay(currentDate, policy, holidays)) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  }

  /**
   * Get the date range for a given period (week, month, etc.)
   */
  static getDateRange(period: 'today' | 'week' | 'month' | 'custom', customStartDate?: Date, customEndDate?: Date): { startDate: Date; endDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (period) {
      case 'today':
        return {
          startDate: today,
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
        };
      
      case 'week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return { startDate: startOfWeek, endDate: endOfWeek };
      
      case 'month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        return { startDate: startOfMonth, endDate: endOfMonth };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate),
            endDate: new Date(customEndDate)
          };
        }
        // Fallback to today if custom dates are not provided
        return {
          startDate: today,
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
        };
      
      default:
        return {
          startDate: today,
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
        };
    }
  }

  /**
   * Validate attendance record data
   */
  static validateAttendanceRecord(record: Partial<DailyAttendanceRecord>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!record.user_id) {
      errors.push('User ID is required');
    }
    
    if (!record.date) {
      errors.push('Date is required');
    } else {
      try {
        // Validate date format
        const parsedDate = parseISO(record.date);
        if (isNaN(parsedDate.getTime())) {
          errors.push('Invalid date format');
        }
      } catch (error) {
        errors.push('Invalid date format');
      }
    }
    
    if (record.clock_in) {
      try {
        const parsedClockIn = parseISO(record.clock_in);
        if (isNaN(parsedClockIn.getTime())) {
          errors.push('Invalid clock-in time format');
        }
      } catch (error) {
        errors.push('Invalid clock-in time format');
      }
    }
    
    if (record.clock_out) {
      try {
        const parsedClockOut = parseISO(record.clock_out);
        if (isNaN(parsedClockOut.getTime())) {
          errors.push('Invalid clock-out time format');
        }
      } catch (error) {
        errors.push('Invalid clock-out time format');
      }
    }
    
    if (record.clock_in && record.clock_out) {
      try {
        const clockInTime = parseISO(record.clock_in);
        const clockOutTime = parseISO(record.clock_out);
        
        if (isAfter(clockInTime, clockOutTime)) {
          errors.push('Clock-out time must be after clock-in time');
        }
      } catch (error) {
        // Error already caught above
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Enforce attendance policy rules
   */
  static enforcePolicy(
    record: DailyAttendanceRecord, 
    policy: AttendancePolicy,
    holidays: Date[] = []
  ): DailyAttendanceRecord {
    const updatedRecord = { ...record };
    
    // Check if the date is a working day
    const recordDate = parseISO(record.date);
    if (!this.isWorkingDay(recordDate, policy, holidays)) {
      // If weekend work is not enabled and it's a weekend, mark as absent
      if (isWeekend(recordDate) && !policy.weekend_work_enabled) {
        updatedRecord.status = 'absent';
        updatedRecord.absence_reason = 'Weekend';
      }
      
      // If it's a holiday, mark as absent
      if (this.isHoliday(recordDate, holidays)) {
        updatedRecord.status = 'absent';
        updatedRecord.absence_reason = 'Holiday';
      }
    }
    
    // Update status based on clock-in and clock-out times
    if (record.clock_in) {
      const clockInTime = parseISO(record.clock_in);
      let status: 'present' | 'late' | 'early_leave' = 'present';
      
      if (this.isLate(clockInTime, policy)) {
        status = 'late';
      }
      
      if (record.clock_out) {
        const clockOutTime = parseISO(record.clock_out);
        if (this.isEarlyLeave(clockOutTime, policy)) {
          status = 'early_leave';
        }
      }
      
      updatedRecord.status = status;
    }
    
    return updatedRecord;
  }

  /**
   * Calculate leave balance based on attendance records and policy
   */
  static calculateLeaveBalance(
    attendanceRecords: DailyAttendanceRecord[], 
    policy: AttendancePolicy,
    totalLeaveDays: number
  ): {
    usedLeaveDays: number;
    remainingLeaveDays: number;
    usedSickDays: number;
    remainingSickDays: number;
  } {
    // In a real implementation, this would be more complex and consider different types of leaves
    const absentRecords = attendanceRecords.filter(record => 
      record.status === 'absent' && 
      record.absence_reason !== 'Weekend' && 
      record.absence_reason !== 'Holiday'
    );
    
    const usedLeaveDays = absentRecords.length;
    const remainingLeaveDays = Math.max(0, totalLeaveDays - usedLeaveDays);
    
    // For now, we'll assume sick days are part of the total leave days
    // In a real implementation, this would be tracked separately
    const usedSickDays = absentRecords.filter(record => 
      record.absence_reason === 'Sick'
    ).length;
    const remainingSickDays = Math.max(0, Math.floor(totalLeaveDays / 2) - usedSickDays);
    
    return {
      usedLeaveDays,
      remainingLeaveDays,
      usedSickDays,
      remainingSickDays
    };
  }
}