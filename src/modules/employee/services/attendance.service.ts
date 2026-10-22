import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { AttendanceModel } from '../models/attendance.model';

export interface EmployeeAttendanceSummary {
  employeeId: string;
  name: string;
  department: string;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  todayStatus?: {
    punchIn: string | null;
    punchOut: string | null;
    status: string;
    workHours: number | null;
    isClockedIn: boolean;
  };
}

export class AttendanceService {
  private attendanceRepo: AttendanceRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.attendanceRepo = new AttendanceRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  private getCurrentDateStr(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(d: Date): string {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  private calculateWorkHours(punchIn: string, punchOut: string): number {
    try {
      const parseTime = (timeStr: string) => {
        const [time, modifier] = timeStr.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      const inMins = parseTime(punchIn);
      const outMins = parseTime(punchOut);
      const diffMins = Math.max(0, outMins - inMins);
      return Math.round((diffMins / 60) * 10) / 10;
    } catch {
      return 8.0;
    }
  }

  async seedDefaultsIfNeeded(companyId: string) {
    const count = await this.attendanceRepo.count(companyId);
    if (count > 0) return;

    const employees = await this.employeeRepo.findAllByCompanyId(companyId);
    if (employees.length === 0) return;

    // Create 20 working days for this month for active employees
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const sampleEmployees = employees.slice(0, 10);
    for (const emp of sampleEmployees) {
      // Seed between 18 and 22 days of records
      const workingDays = 20;
      for (let day = 1; day <= workingDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isLate = day === 5 || day === 14;
        const isAbsent = day === 18 && emp.employeeId !== employees[0].employeeId;

        const attId = await this.attendanceRepo.getNextAttendanceId();
        await this.attendanceRepo.save({
          attendanceId: attId,
          employeeId: emp.employeeId,
          companyId,
          date: dateStr,
          punchIn: isAbsent ? undefined : (isLate ? '09:45 AM' : '09:05 AM'),
          punchOut: isAbsent ? undefined : '06:15 PM',
          workHours: isAbsent ? 0 : 8.5,
          status: isAbsent ? 'Absent' : (isLate ? 'Late' : 'Present'),
          source: 'Manual Log',
          notes: isAbsent ? 'Casual leave taken' : undefined
        });
      }
    }
  }

  async getAttendance(companyId: string, month?: string) {
    // Disabled auto-seeding dummy records so database only holds real attendance data
    // await this.seedDefaultsIfNeeded(companyId);

    const logs = await this.attendanceRepo.findAllByCompanyId(companyId, month);
    const employees = await this.employeeRepo.findAllByCompanyId(companyId);

    // Aggregate summary per employee
    const empMap = new Map<string, { present: number; absent: number; late: number; total: number }>();

    for (const emp of employees) {
      empMap.set(emp.employeeId, { present: 0, absent: 0, late: 0, total: 0 });
    }

    for (const log of logs) {
      let stats = empMap.get(log.employeeId);
      if (!stats) {
        stats = { present: 0, absent: 0, late: 0, total: 0 };
        empMap.set(log.employeeId, stats);
      }
      stats.total += 1;
      if (log.status === 'Present') stats.present += 1;
      else if (log.status === 'Late') {
        stats.present += 1;
        stats.late += 1;
      } else if (log.status === 'Absent') {
        stats.absent += 1;
      } else if (log.status === 'Half Day') {
        stats.present += 0.5;
      }
    }

    const todayDate = this.getCurrentDateStr();

    const summary: EmployeeAttendanceSummary[] = employees.map(emp => {
      const stats = empMap.get(emp.employeeId) || { present: 0, absent: 0, late: 0, total: 0 };
      const totalWorkDays = Math.max(stats.total, stats.present + stats.absent, 1);
      const percentage = Math.min(100, Math.round((stats.present / totalWorkDays) * 100));

      const todayRecord = logs.find(l => l.employeeId === emp.employeeId && l.date === todayDate);

      const todayStatus = todayRecord
        ? {
            punchIn: todayRecord.punchIn || null,
            punchOut: todayRecord.punchOut || null,
            status: todayRecord.status || 'Present',
            workHours: todayRecord.workHours ?? null,
            isClockedIn: Boolean(todayRecord.punchIn && !todayRecord.punchOut)
          }
        : {
            punchIn: null,
            punchOut: null,
            status: 'Not Marked',
            workHours: null,
            isClockedIn: false
          };

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        present: Math.round(stats.present),
        absent: stats.absent,
        late: stats.late,
        percentage: stats.total === 0 ? 0 : percentage,
        todayStatus
      };
    });

    // Calculate overall average attendance
    const overallAvg = summary.length > 0
      ? Math.round(summary.reduce((acc, s) => acc + s.percentage, 0) / summary.length * 10) / 10
      : 0;

    return {
      records: logs,
      summary,
      overallAvg
    };
  }

  async punch(companyId: string, payload: { employeeId: string; type: 'in' | 'out'; notes?: string; time?: string; date?: string }) {
    const { employeeId, type, notes } = payload;
    const date = payload.date || this.getCurrentDateStr();
    const timeNow = payload.time || this.formatTime(new Date());

    let existing = await this.attendanceRepo.findByEmployeeAndDate(employeeId, companyId, date);

    if (type === 'in') {
      // Check if late (after 09:30 AM)
      const isLate = timeNow.includes('AM') && parseInt(timeNow.split(':')[0], 10) >= 9 && parseInt(timeNow.split(':')[1], 10) > 30;

      if (!existing) {
        const attendanceId = await this.attendanceRepo.getNextAttendanceId();
        existing = await this.attendanceRepo.save({
          attendanceId,
          employeeId,
          companyId,
          date,
          punchIn: timeNow,
          punchOut: null as any,
          workHours: 0,
          status: isLate ? 'Late' : 'Present',
          source: 'Web Punch',
          notes
        });
      } else {
        // When checking in, clear punchOut and reset workHours so isClockedIn is true
        existing.punchIn = timeNow;
        existing.punchOut = null as any;
        existing.workHours = 0;
        existing.status = isLate ? 'Late' : 'Present';
        existing.source = 'Web Punch';
        if (notes) existing.notes = notes;
        existing = await this.attendanceRepo.save(existing);
      }
      return existing;
    } else {
      // Punch Out
      if (!existing) {
        const attendanceId = await this.attendanceRepo.getNextAttendanceId();
        existing = await this.attendanceRepo.save({
          attendanceId,
          employeeId,
          companyId,
          date,
          punchIn: timeNow,
          punchOut: timeNow,
          workHours: 0,
          status: 'Present',
          source: 'Web Punch',
          notes
        });
      } else {
        existing.punchOut = timeNow;
        const punchInTime = existing.punchIn || timeNow;
        if (!existing.punchIn) {
          existing.punchIn = punchInTime;
        }
        existing.workHours = this.calculateWorkHours(punchInTime, timeNow);
        existing.source = 'Web Punch';
        if (notes) existing.notes = notes;
        existing = await this.attendanceRepo.save(existing);
      }
      return existing;
    }
  }

  async logAttendance(companyId: string, data: Partial<AttendanceModel>) {
    if (!data.employeeId || !data.date) {
      throw new Error('Employee ID and Date are required.');
    }

    let existing = await this.attendanceRepo.findByEmployeeAndDate(data.employeeId, companyId, data.date);
    if (!existing) {
      const attendanceId = await this.attendanceRepo.getNextAttendanceId();
      data.attendanceId = attendanceId;
      data.companyId = companyId;
      return await this.attendanceRepo.save(data);
    } else {
      Object.assign(existing, data);
      return await this.attendanceRepo.save(existing);
    }
  }
}
