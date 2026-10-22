import { LeaveRepository } from '../repositories/leave.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { LeaveRequestModel } from '../models/leave-request.model';

export class LeaveService {
  private leaveRepo: LeaveRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.leaveRepo = new LeaveRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  private calculateDays(start: string, end: string): number {
    try {
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) ? 1 : diffDays;
    } catch {
      return 1;
    }
  }

  async seedDefaultsIfNeeded(companyId: string) {
    const count = await this.leaveRepo.count(companyId);
    if (count > 0) return;

    const employees = await this.employeeRepo.findAllByCompanyId(companyId);
    const emp1 = employees[0] || { employeeId: 'EMP-001', name: 'Bhuvanasundar' };
    const emp2 = employees[1] || { employeeId: 'EMP-002', name: 'Ponshankar' };
    const emp3 = employees[2] || { employeeId: 'EMP-003', name: 'Poovarasan' };

    const initialData = [
      {
        leaveId: 'LV-401',
        employeeId: emp3.employeeId,
        employeeName: emp3.name,
        companyId,
        type: 'Casual',
        startDate: '2026-10-20',
        endDate: '2026-10-22',
        days: 3,
        reason: 'Personal family function at hometown.',
        status: 'Pending',
      },
      {
        leaveId: 'LV-402',
        employeeId: emp2.employeeId,
        employeeName: emp2.name,
        companyId,
        type: 'Sick',
        startDate: '2026-10-10',
        endDate: '2026-10-11',
        days: 2,
        reason: 'Viral fever and medical rest advised by doctor.',
        status: 'Approved',
        actionedBy: 'Sundar Sundram',
        actionedAt: new Date('2026-10-09'),
      },
      {
        leaveId: 'LV-403',
        employeeId: emp1.employeeId,
        employeeName: emp1.name,
        companyId,
        type: 'Privilege',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        days: 5,
        reason: 'Annual family vacation.',
        status: 'Pending',
      }
    ];

    for (const item of initialData) {
      await this.leaveRepo.save(item);
    }
  }

  async getLeaves(companyId: string, status?: string) {
    // Disabled auto-seeding dummy leaves
    // await this.seedDefaultsIfNeeded(companyId);

    // Single query for all company leaves
    const all = await this.leaveRepo.findAllByCompanyId(companyId);
    const pendingCount = all.filter(l => l.status === 'Pending').length;
    const approvedCount = all.filter(l => l.status === 'Approved').length;
    const rejectedCount = all.filter(l => l.status === 'Rejected').length;

    const leaves = (!status || status === 'All')
      ? all
      : all.filter(l => l.status === status);

    return {
      leaves,
      stats: {
        total: all.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }
    };
  }

  async applyLeave(companyId: string, data: {
    employeeId: string;
    employeeName?: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    if (!data.employeeId || !data.type || !data.startDate || !data.endDate) {
      throw new Error('Employee, leave type, start date, and end date are required.');
    }

    let employeeName = data.employeeName;
    if (!employeeName) {
      const emp = await this.employeeRepo.findByEmployeeId(data.employeeId);
      employeeName = emp ? emp.name : data.employeeId;
    }

    const days = this.calculateDays(data.startDate, data.endDate);
    const leaveId = await this.leaveRepo.getNextLeaveId();

    const newLeave: Partial<LeaveRequestModel> = {
      leaveId,
      employeeId: data.employeeId,
      employeeName,
      companyId,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      reason: data.reason || 'Leave requested via employee portal',
      status: 'Pending'
    };

    return await this.leaveRepo.save(newLeave);
  }

  async updateLeaveStatus(companyId: string, leaveId: string, status: 'Approved' | 'Rejected', actionedBy?: string, rejectionReason?: string) {
    const leave = await this.leaveRepo.findByLeaveId(leaveId, companyId);
    if (!leave) {
      throw new Error(`Leave request ${leaveId} not found.`);
    }

    leave.status = status;
    leave.actionedAt = new Date();
    if (actionedBy) leave.actionedBy = actionedBy;
    if (rejectionReason) leave.rejectionReason = rejectionReason;

    return await this.leaveRepo.save(leave);
  }
}
