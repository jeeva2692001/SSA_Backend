import { EmployeeRepository } from '../repositories/employee.repository';
import { EmployeeModel } from '../models/employee.model';
import { BranchRepository } from '../../branch/repositories/branch.repository';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { AttendanceModel } from '../models/attendance.model';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveRequestModel } from '../models/leave-request.model';
import { PerformanceReviewRepository } from '../repositories/performance-review.repository';
import { PerformanceReviewModel } from '../models/performance-review.model';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../../auth/repositories/user.repository';
import { CompanyRepository } from '../../company/repositories/company.repository';
import { emailService } from '../../../shared/services/email.service';

function formatCurrentTime(d = new Date()): string {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const meridian = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${meridian}`;
}

function getTodayDateStr(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateWorkHours(punchIn?: string, punchOut?: string): number {
  if (!punchIn || !punchOut) return 0;
  try {
    const parseTime = (t: string) => {
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridian = match[3]?.toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    const inMins = parseTime(punchIn);
    const outMins = parseTime(punchOut);
    if (inMins !== null && outMins !== null) {
      if (outMins >= inMins) {
        return parseFloat(((outMins - inMins) / 60).toFixed(1));
      }
      return parseFloat(((1440 - inMins + outMins) / 60).toFixed(1));
    }
  } catch {}
  return 0;
}

export class EmployeeService {
  private employeeRepository: EmployeeRepository;
  private branchRepository: BranchRepository;
  private attendanceRepository: AttendanceRepository;
  private leaveRequestRepository: LeaveRequestRepository;
  private performanceReviewRepository: PerformanceReviewRepository;
  private userRepository: UserRepository;
  private companyRepository: CompanyRepository;

  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.branchRepository = new BranchRepository();
    this.attendanceRepository = new AttendanceRepository();
    this.leaveRequestRepository = new LeaveRequestRepository();
    this.performanceReviewRepository = new PerformanceReviewRepository();
    this.userRepository = new UserRepository();
    this.companyRepository = new CompanyRepository();
  }

  // ==========================================
  // EMPLOYEE DIRECTORY
  // ==========================================
  async getEmployees(companyId: string): Promise<EmployeeModel[]> {
    return await this.employeeRepository.findAllByCompanyId(companyId);
  }

  async findEmployeeByEmailOrName(email?: string, name?: string): Promise<EmployeeModel | null> {
    if (email) {
      const emp = await this.employeeRepository.findByEmail(email);
      if (emp) return emp;
    }
    if (name) {
      const emp = await this.employeeRepository.findByName(name);
      if (emp) return emp;
    }
    return null;
  }

  async addEmployee(companyId: string, employeeData: Partial<EmployeeModel>): Promise<EmployeeModel> {
    if (!employeeData.name || !employeeData.email || !employeeData.phone || !employeeData.department || !employeeData.designation || !employeeData.joiningDate) {
      throw new Error('Missing required employee fields.');
    }

    // Check if employee name (which serves as login username) is already in use
    const trimmedName = employeeData.name.trim();
    const existingName = await this.employeeRepository.findByName(trimmedName);
    if (existingName) {
      throw new Error(`Username "${trimmedName}" is already registered by another employee. Please choose a different name.`);
    }

    // Check if username is already registered in UserRepository
    const existingUser = await this.userRepository.findByUserId(trimmedName);
    const existingUserByName = await this.userRepository.findByName(trimmedName);
    if (existingUser || existingUserByName) {
      throw new Error(`Username "${trimmedName}" is already in use by an existing user account. Please choose a different name.`);
    }

    // Check if name conflicts with a company contact person
    const existingCompany = await this.companyRepository.findByContactPerson(trimmedName);
    if (existingCompany) {
      throw new Error(`Username "${trimmedName}" is already registered as a company contact person. Please choose a different name.`);
    }

    const trimmedEmail = employeeData.email.trim().toLowerCase();
    const existing = await this.employeeRepository.findByEmailAndCompanyId(trimmedEmail, companyId);
    if (existing) {
      throw new Error(`Employee email "${trimmedEmail}" is already registered.`);
    }

    const existingUserEmail = await this.userRepository.findByEmail(trimmedEmail);
    if (existingUserEmail) {
      throw new Error(`Email "${trimmedEmail}" is already registered to another user account.`);
    }

    if (employeeData.branchId) {
      const branch = await this.branchRepository.findByBranchId(employeeData.branchId);
      if (!branch || (branch.companyId && companyId && branch.companyId.toLowerCase() !== companyId.toLowerCase())) {
        throw new Error('Invalid branch specified.');
      }
    }

    const employeeId = await this.employeeRepository.getNextEmployeeId();
    employeeData.employeeId = employeeId;
    employeeData.companyId = companyId;
    
    const savedEmployee = await this.employeeRepository.createEmployee(employeeData);

    // 1. Create or sync User Account with Employee Name as username and temporary password Pass@1234
    const temporaryPassword = 'Pass@1234';
    const employeeUsername = savedEmployee.name.trim();
    try {
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Map designation to appropriate RBAC role if recognized, or default to Employee
      let userRole = 'Employee';
      const validRoles = ['Manager', 'Designer', 'Checker', 'Project Manager', 'Admin'];
      if (validRoles.includes(savedEmployee.designation)) {
        userRole = savedEmployee.designation;
      }

      let existingUser = await this.userRepository.findByEmail(savedEmployee.email);
      if (!existingUser) {
        existingUser = await this.userRepository.findByName(employeeUsername);
      }
      if (!existingUser) {
        existingUser = await this.userRepository.findByUserId(employeeUsername);
      }
      if (!existingUser) {
        existingUser = await this.userRepository.findByUserId(savedEmployee.employeeId);
      }

      if (existingUser) {
        existingUser.userId = employeeUsername;
        existingUser.email = savedEmployee.email;
        existingUser.name = savedEmployee.name;
        existingUser.password = hashedPassword;
        existingUser.role = userRole;
        existingUser.isFirstLogin = true;
        await this.userRepository.saveUser(existingUser);
      } else {
        await this.userRepository.createUser({
          userId: employeeUsername,
          name: savedEmployee.name,
          email: savedEmployee.email,
          role: userRole,
          password: hashedPassword,
          isFirstLogin: true,
        });
      }
    } catch (userErr: any) {
      console.error('Error generating user login account for new employee:', userErr.message);
    }

    // 2. Dispatch welcome credentials email in background with Employee Name as username
    this.companyRepository.findByCompanyId(companyId).then((company) => {
      return emailService.sendEmployeeWelcomeCredentialsEmail({
        employeeEmail: savedEmployee.email,
        employeeName: savedEmployee.name,
        employeeId: savedEmployee.employeeId,
        username: employeeUsername,
        password: temporaryPassword,
        designation: savedEmployee.designation,
        department: savedEmployee.department,
        companyName: company?.name || 'Sundar Sundram Architects',
      });
    }).catch((mailErr: any) => {
      console.error('Error sending welcome credentials email to new employee:', mailErr.message);
    });

    return savedEmployee;
  }

  async updateEmployee(employeeId: string, companyId: string, employeeData: Partial<EmployeeModel>): Promise<EmployeeModel> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error('Employee not found.');
    }

    if (employeeData.name) {
      const trimmedName = employeeData.name.trim();
      const existingName = await this.employeeRepository.findByName(trimmedName);
      if (existingName && existingName.employeeId !== employeeId) {
        throw new Error(`Username "${trimmedName}" is already registered by another employee.`);
      }
      employee.name = trimmedName;
    }
    if (employeeData.phone) employee.phone = employeeData.phone;
    if (employeeData.department) employee.department = employeeData.department;
    if (employeeData.designation) employee.designation = employeeData.designation;
    if (employeeData.manager !== undefined) employee.manager = employeeData.manager;
    if (employeeData.joiningDate) employee.joiningDate = employeeData.joiningDate;
    if (employeeData.status) employee.status = employeeData.status;

    if (employeeData.branchId !== undefined) {
      if (employeeData.branchId) {
        const branch = await this.branchRepository.findByBranchId(employeeData.branchId);
        if (!branch || branch.companyId !== companyId) {
          throw new Error('Invalid branch specified.');
        }
        employee.branchId = employeeData.branchId;
      } else {
        employee.branchId = undefined;
      }
    }

    if (employeeData.email) {
      const trimmedEmail = employeeData.email.trim().toLowerCase();
      const existing = await this.employeeRepository.findByEmailAndCompanyId(trimmedEmail, companyId);
      if (existing && existing.employeeId !== employeeId) {
        throw new Error('Employee email is already registered.');
      }
      employee.email = trimmedEmail;
    }

    return await this.employeeRepository.createEmployee(employee);
  }

  async deleteEmployee(employeeId: string, companyId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error('Employee not found.');
    }
    return await this.employeeRepository.deleteByEmployeeId(employeeId);
  }

  async getEmployeesByBranch(branchId: string): Promise<EmployeeModel[]> {
    return await this.employeeRepository.findAllByBranchId(branchId);
  }

  // ==========================================
  // ATTENDANCE MODULE
  // ==========================================
  async seedInitialAttendance(companyId: string): Promise<void> {
    const count = await this.attendanceRepository.count(companyId);
    if (count > 0) return;

    const employees = await this.employeeRepository.findAllByCompanyId(companyId);
    if (employees.length === 0) return;

    console.log('[EmployeeService] Seeding initial attendance records...');
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const daysInMonth = Math.min(now.getDate(), 20); // up to 20 recent working days

    // Create varied realistic records
    const sampleEmployees = employees.slice(0, 10);
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${currentMonth}-${dayStr}`;
      const d = new Date(currentYear, now.getMonth(), day);
      if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends

      for (let i = 0; i < sampleEmployees.length; i++) {
        const emp = sampleEmployees[i];
        const isLate = (day + i) % 7 === 0;
        const isAbsent = (day + i) % 19 === 0;
        const isOnLeave = (day + i) % 23 === 0;

        let status = 'Present';
        let punchIn: string | undefined = isLate ? '09:42 AM' : '09:05 AM';
        let punchOut: string | undefined = '06:15 PM';
        let workHours = 8.5;

        if (isAbsent) {
          status = 'Absent';
          punchIn = undefined;
          punchOut = undefined;
          workHours = 0;
        } else if (isOnLeave) {
          status = 'On Leave';
          punchIn = undefined;
          punchOut = undefined;
          workHours = 0;
        } else if (isLate) {
          status = 'Late';
          workHours = 7.8;
        }

        const attendanceId = `ATT-${emp.employeeId}-${dateStr}`;
        await this.attendanceRepository.save({
          attendanceId,
          companyId,
          branchId: emp.branchId,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          date: dateStr,
          punchIn,
          punchOut,
          status,
          workHours,
          notes: status === 'Late' ? 'Traffic delay reported' : undefined
        });
      }
    }
  }

  async getAttendance(companyId: string, filters: { month?: string; date?: string; employeeId?: string; branchId?: string }): Promise<any> {
    await this.seedInitialAttendance(companyId);

    const now = new Date();
    const currentMonth = filters.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const logs = await this.attendanceRepository.findByCompanyId(companyId, currentMonth, filters.employeeId);
    let employees = await this.employeeRepository.findAllByCompanyId(companyId);
    if (filters.employeeId) {
      employees = employees.filter(e => e.employeeId.toLowerCase() === filters.employeeId!.toLowerCase());
      if (employees.length === 0) {
        const singleEmp = await this.employeeRepository.findByEmployeeId(filters.employeeId);
        if (singleEmp) employees = [singleEmp];
      }
    }

    // Compute monthly summary per employee
    const summaryMap: Record<string, {
      employeeId: string;
      name: string;
      department: string;
      designation: string;
      present: number;
      absent: number;
      late: number;
      onLeave: number;
      totalDays: number;
      percentage: number;
      todayPunchedIn: boolean;
      todayPunchedOut: boolean;
      todayPunchIn?: string;
      todayPunchOut?: string;
      todayStatus?: string;
      todayWorkHours?: number;
    }> = {};

    employees.forEach(emp => {
      summaryMap[emp.employeeId] = {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        totalDays: 0,
        percentage: 100,
        todayPunchedIn: false,
        todayPunchedOut: false
      };
    });

    const todayStr = getTodayDateStr();

    logs.forEach(log => {
      if (!summaryMap[log.employeeId]) {
        summaryMap[log.employeeId] = {
          employeeId: log.employeeId,
          name: log.employeeName,
          department: 'General',
          designation: 'Staff',
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          totalDays: 0,
          percentage: 100,
          todayPunchedIn: false,
          todayPunchedOut: false
        };
      }
      const item = summaryMap[log.employeeId];
      item.totalDays += 1;
      if (log.status === 'Present') item.present += 1;
      else if (log.status === 'Late') {
        item.late += 1;
        item.present += 1; // Late still counts towards attended
      } else if (log.status === 'Absent') {
        item.absent += 1;
      } else if (log.status === 'On Leave') {
        item.onLeave += 1;
      }

      if (log.date === todayStr) {
        item.todayPunchedIn = !!log.punchIn;
        item.todayPunchedOut = !!log.punchOut;
        item.todayPunchIn = log.punchIn;
        item.todayPunchOut = log.punchOut;
        item.todayStatus = log.status;
        item.todayWorkHours = log.workHours;
      }
    });

    // Calculate percentage
    const summaryList = Object.values(summaryMap).map(item => {
      if (item.totalDays > 0) {
        const attended = item.present;
        const total = item.present + item.absent + item.onLeave;
        item.percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
      } else {
        // default fallback if employee had no records yet in month
        item.present = 18;
        item.absent = 1;
        item.late = 1;
        item.percentage = 95;
      }
      return item;
    });

    const avgAttendance = summaryList.length > 0
      ? Math.round(summaryList.reduce((acc, curr) => acc + curr.percentage, 0) / summaryList.length)
      : 92;

    return {
      month: currentMonth,
      avgAttendance,
      summary: summaryList,
      logs
    };
  }

  async punchAttendance(companyId: string, employeeId: string, employeeName?: string, explicitAction?: 'punch_in' | 'punch_out' | 'resume_shift'): Promise<any> {
    const todayStr = getTodayDateStr();
    const nowTimeStr = formatCurrentTime();

    let empName = employeeName;
    if (!empName) {
      const emp = await this.employeeRepository.findByEmployeeId(employeeId);
      empName = emp?.name || 'Staff Member';
    }

    let existingRecord = await this.attendanceRepository.findTodayByEmployeeId(companyId, employeeId, todayStr, empName);

    // 1. Explicit or auto Punch In
    if (explicitAction === 'punch_in' || explicitAction === 'resume_shift' || (!existingRecord && !explicitAction)) {
      if (!existingRecord) {
        const attendanceId = `ATT-${employeeId}-${todayStr}`;
        const isLateCheck = new Date().getHours() >= 10;
        const newRecord = await this.attendanceRepository.save({
          attendanceId,
          companyId,
          employeeId,
          employeeName: empName,
          date: todayStr,
          punchIn: nowTimeStr,
          status: isLateCheck ? 'Late' : 'Present',
          workHours: 0,
          notes: isLateCheck ? 'Checked in after 10:00 AM' : 'Regular on-time check-in'
        });
        return {
          action: 'punch_in',
          message: `Successfully punched in at ${nowTimeStr}. Shift started!`,
          record: newRecord
        };
      } else {
        // Resuming shift: explicitly clear punchOut in database and reset workHours
        await this.attendanceRepository.clearPunchOut(existingRecord.id);
        existingRecord.punchOut = undefined;
        existingRecord.workHours = 0;
        return {
          action: 'resume_shift',
          message: `Shift resumed at ${nowTimeStr}. Status active.`,
          record: existingRecord
        };
      }
    }

    // 2. Explicit or auto Punch Out
    if (explicitAction === 'punch_out' || (!explicitAction && existingRecord && existingRecord.punchIn && !existingRecord.punchOut)) {
      if (!existingRecord || !existingRecord.punchIn) {
        throw new Error('No check-in record found for today. Please punch in first.');
      }
      const workHours = calculateWorkHours(existingRecord.punchIn, nowTimeStr);
      await this.attendanceRepository.update(existingRecord.id, {
        punchOut: nowTimeStr,
        workHours
      });
      existingRecord.punchOut = nowTimeStr;
      existingRecord.workHours = workHours;
      return {
        action: 'punch_out',
        message: `Successfully punched out at ${nowTimeStr} (${workHours} hrs logged). Shift completed!`,
        record: existingRecord
      };
    }

    // 3. Fallback: Update Punch Out
    if (!existingRecord) {
      throw new Error('No attendance record found for today. Please punch in first.');
    }
    const workHours = calculateWorkHours(existingRecord.punchIn, nowTimeStr);
    await this.attendanceRepository.update(existingRecord.id, {
      punchOut: nowTimeStr,
      workHours
    });
    existingRecord.punchOut = nowTimeStr;
    existingRecord.workHours = workHours;
    return {
      action: 'punch_out_updated',
      message: `Punch out time updated to ${nowTimeStr} (${workHours} hrs logged)`,
      record: existingRecord
    };
  }

  async recordManualAttendance(companyId: string, data: Partial<AttendanceModel>): Promise<AttendanceModel> {
    if (!data.employeeId || !data.date) {
      throw new Error('Employee ID and Date are required.');
    }

    let empName = data.employeeName;
    if (!empName) {
      const emp = await this.employeeRepository.findByEmployeeId(data.employeeId);
      empName = emp?.name || 'Staff Member';
    }

    const attendanceId = data.attendanceId || `ATT-${data.employeeId}-${data.date}`;
    const existing = await this.attendanceRepository.findByAttendanceId(attendanceId) ||
      await this.attendanceRepository.findTodayByEmployeeId(companyId, data.employeeId, data.date);

    const workHours = data.workHours !== undefined ? Number(data.workHours) : calculateWorkHours(data.punchIn, data.punchOut);

    const recordData: Partial<AttendanceModel> = {
      ...(existing || {}),
      attendanceId: existing?.attendanceId || attendanceId,
      companyId,
      employeeId: data.employeeId,
      employeeName: empName,
      date: data.date,
      punchIn: data.punchIn || (data.status === 'Absent' ? undefined : '09:00 AM'),
      punchOut: data.punchOut || (data.status === 'Absent' ? undefined : '06:00 PM'),
      status: data.status || 'Present',
      workHours: data.status === 'Absent' ? 0 : workHours,
      notes: data.notes
    };

    return await this.attendanceRepository.save(recordData);
  }

  // ==========================================
  // LEAVE REQUESTS MODULE
  // ==========================================
  async seedInitialLeaves(companyId: string): Promise<void> {
    const count = await this.leaveRequestRepository.count(companyId);
    if (count > 0) return;

    console.log('[EmployeeService] Seeding initial leave requests...');
    const defaultLeaves = [
      { leaveId: 'LV-401', employeeId: 'EMP-005', employeeName: 'Poovarasan', leaveType: 'Casual', startDate: '2026-06-19', endDate: '2026-06-22', days: 3, reason: 'Family function in native village', status: 'Pending', companyId },
      { leaveId: 'LV-402', employeeId: 'EMP-015', employeeName: 'Raahiba', leaveType: 'Sick', startDate: '2026-06-15', endDate: '2026-06-16', days: 2, reason: 'Viral fever and prescribed medical rest', status: 'Approved', actionedBy: 'Umamageshwari', actionedAt: '2026-06-15', companyId },
      { leaveId: 'LV-403', employeeId: 'EMP-024', employeeName: 'Karthick', leaveType: 'Casual', startDate: '2026-06-25', endDate: '2026-06-26', days: 2, reason: 'Personal documentation and banking work', status: 'Pending', companyId },
      { leaveId: 'LV-404', employeeId: 'EMP-019', employeeName: 'Rani', leaveType: 'Privilege', startDate: '2026-07-01', endDate: '2026-07-08', days: 7, reason: 'Annual family pilgrimage trip', status: 'Approved', actionedBy: 'Suresh Kumar K', actionedAt: '2026-06-28', companyId },
    ];

    for (const item of defaultLeaves) {
      await this.leaveRequestRepository.save(item);
    }
  }

  async getLeaveRequests(companyId: string, filters: { employeeId?: string; status?: string; employeeName?: string }): Promise<LeaveRequestModel[]> {
    await this.seedInitialLeaves(companyId);
    return await this.leaveRequestRepository.findByCompanyId(companyId, filters.status, filters.employeeId, filters.employeeName);
  }

  async createLeaveRequest(companyId: string, data: Partial<LeaveRequestModel>): Promise<LeaveRequestModel> {
    if (!data.employeeId || !data.startDate || !data.endDate) {
      throw new Error('Employee ID, Start Date, and End Date are required.');
    }

    let empName = data.employeeName;
    if (!empName) {
      const emp = await this.employeeRepository.findByEmployeeId(data.employeeId);
      empName = emp?.name || 'Staff Member';
    }

    // Calculate days if not provided
    let calculatedDays = data.days;
    if (!calculatedDays) {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      const diffTime = Math.abs(end - start);
      calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    const leaveId = await this.leaveRequestRepository.getNextLeaveId();

    return await this.leaveRequestRepository.save({
      ...data,
      leaveId,
      companyId,
      employeeName: empName,
      days: calculatedDays,
      status: 'Pending',
      leaveType: data.leaveType || 'Casual'
    });
  }

  async updateLeaveStatus(companyId: string, leaveId: string, status: 'Approved' | 'Rejected', actionedBy: string, rejectionReason?: string): Promise<LeaveRequestModel> {
    const leave = await this.leaveRequestRepository.findByLeaveId(leaveId);
    if (!leave || leave.companyId !== companyId) {
      throw new Error('Leave request not found.');
    }

    leave.status = status;
    leave.actionedBy = actionedBy;
    leave.actionedAt = getTodayDateStr();
    if (rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }

    return await this.leaveRequestRepository.save(leave);
  }

  // ==========================================
  // PERFORMANCE EVALUATION MODULE
  // ==========================================
  async seedInitialPerformance(companyId: string): Promise<void> {
    const count = await this.performanceReviewRepository.count(companyId);
    if (count > 0) return;

    console.log('[EmployeeService] Seeding initial performance reviews...');
    const defaultReviews = [
      {
        reviewId: 'REV-101',
        companyId,
        employeeId: 'EMP-004',
        employeeName: 'Ananya Deshmukh',
        employeeRole: 'Project Architect',
        reviewerName: 'Bhuvanasundar',
        reviewPeriod: 'Q3 2026',
        rating: 4.8,
        qualityScore: 98,
        timelinessScore: 95,
        communicationScore: 96,
        technicalScore: 96,
        projectsCompleted: 8,
        feedback: 'Consistently exceptional CAD detailing, client presentation quality, and BIM coordination across luxury villas.',
        goals: 'Lead BIM coordination across commercial campus developments.',
        certifications: 'Revit BIM Coordination Master, BREEAM Sustainable Design Certification',
        status: 'Completed',
        reviewDate: '2026-09-30'
      },
      {
        reviewId: 'REV-102',
        companyId,
        employeeId: 'EMP-003',
        employeeName: 'Siddharth Sen',
        employeeRole: 'BIM Modeler & 3D Architect',
        reviewerName: 'Ponshankar',
        reviewPeriod: 'Q3 2026',
        rating: 4.6,
        qualityScore: 94,
        timelinessScore: 92,
        communicationScore: 90,
        technicalScore: 95,
        projectsCompleted: 12,
        feedback: 'Outstanding parametric 3D visualization and fast turnaround for client revisions with zero structural clashes.',
        goals: 'Conduct internal workshop on advanced V-Ray photorealism rendering.',
        certifications: 'Revit BIM Coordination Master, V-Ray Architectural Photorealism Masterclass',
        status: 'Completed',
        reviewDate: '2026-09-28'
      },
      {
        reviewId: 'REV-103',
        companyId,
        employeeId: 'EMP-009',
        employeeName: 'Priya Ranganathan',
        employeeRole: 'Technical Director',
        reviewerName: 'Bhuvanasundar',
        reviewPeriod: 'Q3 2026',
        rating: 4.5,
        qualityScore: 92,
        timelinessScore: 89,
        communicationScore: 93,
        technicalScore: 91,
        projectsCompleted: 6,
        feedback: 'Meticulous municipal regulatory review and flawless compliance management with local planning authorities.',
        goals: 'Standardize municipal drawing templates and checklists across regional branches.',
        certifications: 'Local Fire & Municipal Bylaws Review, NBC 2016 Structural Compliance',
        status: 'Completed',
        reviewDate: '2026-09-25'
      },
      {
        reviewId: 'REV-104',
        companyId,
        employeeId: 'EMP-022',
        employeeName: 'Suresh Kumar M',
        employeeRole: 'Project Management Engineer',
        reviewerName: 'Bhuvanasundar',
        reviewPeriod: 'Q3 2026',
        rating: 4.7,
        qualityScore: 95,
        timelinessScore: 96,
        communicationScore: 94,
        technicalScore: 92,
        projectsCompleted: 10,
        feedback: 'Excellent site schedule management, contractor alignment, and proactive milestone tracking.',
        goals: 'Implement automated mobile site inspection reports.',
        certifications: 'PMP Construction Project Management, OSHA Site Safety Certification',
        status: 'Completed',
        reviewDate: '2026-09-22'
      }
    ];

    for (const item of defaultReviews) {
      await this.performanceReviewRepository.save(item);
    }
  }

  async getPerformanceData(companyId: string, filters: { employeeId?: string; period?: string; employeeName?: string }): Promise<any> {
    await this.seedInitialPerformance(companyId);

    const reviews = await this.performanceReviewRepository.findByCompanyId(companyId, filters.employeeId, filters.period, filters.employeeName);

    // Calculate aggregated metrics
    const totalReviews = reviews.length;
    const avgScore = totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : '4.8';
    const totalProjects = reviews.reduce((acc, r) => acc + (r.projectsCompleted || 0), 0);

    // Dynamic Top Performers sorted by rating
    const topPerformers = [...reviews]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map(r => ({
        reviewId: r.reviewId,
        employeeId: r.employeeId,
        name: r.employeeName,
        role: r.employeeRole || 'Architect',
        score: Math.round(((r.rating || 4.5) / 5) * 100),
        rating: r.rating,
        count: r.projectsCompleted || 0,
        feedback: r.feedback,
        certifications: r.certifications
      }));

    // Dynamic training & certifications summary
    const certMap: Record<string, { count: number; level: string; title: string }> = {
      'Revit BIM Coordination Master': { count: 0, level: 'Advanced', title: 'Revit BIM Coordination Master' },
      'Local Fire & Municipal Bylaws Review': { count: 0, level: 'Compliance', title: 'Local Fire & Municipal Bylaws Review' },
      'BREEAM Sustainable Design Certification': { count: 0, level: 'Green Design', title: 'BREEAM Sustainable Design Certification' },
      'PMP Construction Project Management': { count: 0, level: 'Leadership', title: 'PMP Construction Project Management' },
    };

    reviews.forEach(r => {
      if (r.certifications) {
        const certs = r.certifications.split(',').map(s => s.trim());
        certs.forEach(c => {
          if (!certMap[c]) {
            certMap[c] = { count: 1, level: 'Professional', title: c };
          } else {
            certMap[c].count += 1;
          }
        });
      }
    });

    // Provide default counts if low
    if (certMap['Revit BIM Coordination Master'].count === 0) certMap['Revit BIM Coordination Master'].count = 12;
    if (certMap['Local Fire & Municipal Bylaws Review'].count === 0) certMap['Local Fire & Municipal Bylaws Review'].count = 8;
    if (certMap['BREEAM Sustainable Design Certification'].count === 0) certMap['BREEAM Sustainable Design Certification'].count = 4;

    const certificationsList = Object.values(certMap).map(c => ({
      title: c.title,
      completed: `${c.count} Staff Certified`,
      level: c.level
    }));

    return {
      reviews,
      topPerformers,
      certifications: certificationsList,
      metrics: {
        avgScore: Number(avgScore),
        avgPercentage: Math.round((Number(avgScore) / 5) * 100),
        totalReviews,
        totalProjects
      }
    };
  }

  async createPerformanceReview(companyId: string, data: Partial<PerformanceReviewModel>): Promise<PerformanceReviewModel> {
    if (!data.employeeId || !data.reviewPeriod) {
      throw new Error('Employee ID and Review Period are required.');
    }

    let empName = data.employeeName;
    let empRole = data.employeeRole;
    if (!empName || !empRole) {
      const emp = await this.employeeRepository.findByEmployeeId(data.employeeId);
      if (emp) {
        empName = empName || emp.name;
        empRole = empRole || emp.designation;
      }
    }

    const reviewId = await this.performanceReviewRepository.getNextReviewId();

    return await this.performanceReviewRepository.save({
      ...data,
      reviewId,
      companyId,
      employeeName: empName || 'Staff Member',
      employeeRole: empRole || 'Architect',
      reviewDate: data.reviewDate || getTodayDateStr(),
      status: data.status || 'Completed'
    });
  }

  async updatePerformanceReview(companyId: string, reviewId: string, data: Partial<PerformanceReviewModel>): Promise<PerformanceReviewModel> {
    const review = await this.performanceReviewRepository.findByReviewId(reviewId);
    if (!review || review.companyId !== companyId) {
      throw new Error('Performance review not found.');
    }

    Object.assign(review, data);
    return await this.performanceReviewRepository.save(review);
  }

  async deletePerformanceReview(companyId: string, reviewId: string): Promise<boolean> {
    const review = await this.performanceReviewRepository.findByReviewId(reviewId);
    if (!review || review.companyId !== companyId) {
      throw new Error('Performance review not found.');
    }
    return await this.performanceReviewRepository.deleteByReviewId(reviewId);
  }
}
