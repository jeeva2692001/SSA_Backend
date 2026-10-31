import { NextRequest, NextResponse } from 'next/server';
import { EmployeeService } from '../services/employee.service';
import { RbacService } from '../../rbac/services/rbac.service';

export class EmployeeController {
  private employeeService: EmployeeService;
  private rbacService: RbacService;

  constructor() {
    this.employeeService = new EmployeeService();
    this.rbacService = new RbacService();
  }

  async getAll(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const canRead = await this.rbacService.checkUserPermission(user, 'Read');
      if (!canRead) {
        return NextResponse.json(
          { message: 'Forbidden: You do not have "Read" permission for Employee directory.' },
          { status: 403 }
        );
      }
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }

      let employees;
      if (user.role === 'Branch') {
        employees = await this.employeeService.getEmployeesByBranch(user.branchId);
      } else {
        employees = await this.employeeService.getEmployees(companyId);
      }
      return NextResponse.json(employees, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.getAll:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to fetch employees.' },
        { status: 500 }
      );
    }
  }

  async register(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const canCreate = await this.rbacService.checkUserPermission(user, 'Create');
      if (!canCreate) {
        return NextResponse.json(
          { message: 'Forbidden: You do not have "Create" permission to add employees.' },
          { status: 403 }
        );
      }

      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      if (user.role === 'Branch') {
        body.branchId = user.branchId;
      }
      const employee = await this.employeeService.addEmployee(companyId, body);
      return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
      console.error('Error in EmployeeController.register:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to register employee.' },
        { status: 400 }
      );
    }
  }

  async update(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const canUpdate = await this.rbacService.checkUserPermission(user, 'Update');
      if (!canUpdate) {
        return NextResponse.json(
          { message: 'Forbidden: You do not have "Update" permission to edit employees.' },
          { status: 403 }
        );
      }

      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      const { employeeId, ...updateData } = body;

      if (!employeeId) {
        return NextResponse.json(
          { message: 'Employee ID (employeeId) is required for update.' },
          { status: 400 }
        );
      }

      if (user.role === 'Branch') {
        updateData.branchId = user.branchId;
        const employees = await this.employeeService.getEmployeesByBranch(user.branchId);
        const belongsToBranch = employees.some(emp => emp.employeeId === employeeId);
        if (!belongsToBranch) {
          return NextResponse.json(
            { message: 'Unauthorized: Employee does not belong to your branch.' },
            { status: 403 }
          );
        }
      }

      const employee = await this.employeeService.updateEmployee(employeeId, companyId, updateData);
      return NextResponse.json(employee, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.update:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to update employee.' },
        { status: 400 }
      );
    }
  }

  async delete(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const canDelete = await this.rbacService.checkUserPermission(user, 'Delete');
      if (!canDelete) {
        return NextResponse.json(
          { message: 'Forbidden: You do not have "Delete" permission to delete employees.' },
          { status: 403 }
        );
      }

      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const employeeId = searchParams.get('employeeId');

      if (!employeeId) {
        return NextResponse.json(
          { message: 'Employee ID (employeeId) is required for deletion.' },
          { status: 400 }
        );
      }

      if (user.role === 'Branch') {
        const employees = await this.employeeService.getEmployeesByBranch(user.branchId);
        const belongsToBranch = employees.some(emp => emp.employeeId === employeeId);
        if (!belongsToBranch) {
          return NextResponse.json(
            { message: 'Unauthorized: Employee does not belong to your branch.' },
            { status: 403 }
          );
        }
      }

      const deleted = await this.employeeService.deleteEmployee(employeeId, companyId);
      if (!deleted) {
        return NextResponse.json(
          { message: 'Employee not found or already deleted.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Employee deleted successfully.' }, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.delete:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to delete employee.' },
        { status: 500 }
      );
    }
  }

  // ==========================================
  // ATTENDANCE HANDLERS
  // ==========================================
  async getAttendance(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      let companyId = user.companyId;
      if (!companyId && user.email) {
        const emp = await this.employeeService.findEmployeeByEmailOrName(user.email, user.name || user.userId);
        if (emp) companyId = emp.companyId;
      }
      if (!companyId) {
        companyId = user.companyId || user.userId || user.id;
      }
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const { searchParams } = new URL(req.url);
      const month = searchParams.get('month') || undefined;
      const date = searchParams.get('date') || undefined;
      let employeeId = searchParams.get('employeeId') || undefined;

      const isCompanyAdmin = user.role === 'Company' || user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Branch';
      if (!isCompanyAdmin) {
        if (!user.employeeId && user.email) {
          const emp = await this.employeeService.findEmployeeByEmailOrName(user.email, user.name || user.userId);
          if (emp) user.employeeId = emp.employeeId;
        }
        employeeId = user.employeeId || user.userId;
      }

      const data = await this.employeeService.getAttendance(companyId, { month, date, employeeId });
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.getAttendance:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to fetch attendance.' }, { status: 500 });
    }
  }

  async punchAttendance(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      let companyId = user.companyId;
      let employeeId = user.employeeId;
      let employeeName = user.name;

      const body = await req.json().catch(() => ({}));
      if (body.employeeId) employeeId = body.employeeId;
      if (body.employeeName) employeeName = body.employeeName;

      // Always resolve canonical employee details if available
      const emp = await this.employeeService.findEmployeeByEmailOrName(user.email, user.name || user.userId || employeeId);
      if (emp) {
        companyId = emp.companyId || companyId;
        employeeId = emp.employeeId;
        employeeName = emp.name;
      }

      if (!companyId) {
        companyId = user.companyId || user.userId || user.id;
      }
      if (!employeeId) {
        employeeId = user.employeeId || user.userId || user.id;
      }
      if (!employeeName) {
        employeeName = user.name || 'Staff Member';
      }

      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      if (!employeeId) {
        return NextResponse.json({ message: 'Employee ID is required to punch in/out.' }, { status: 400 });
      }

      const explicitAction = body.action;
      const result = await this.employeeService.punchAttendance(companyId, employeeId, employeeName, explicitAction);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.punchAttendance:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to punch attendance.' }, { status: 400 });
    }
  }

  async manualAttendance(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const body = await req.json();
      const record = await this.employeeService.recordManualAttendance(companyId, body);
      return NextResponse.json(record, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.manualAttendance:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to log manual attendance.' }, { status: 400 });
    }
  }

  // ==========================================
  // LEAVE REQUESTS HANDLERS
  // ==========================================
  async getLeaves(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status') || undefined;
      let employeeId = searchParams.get('employeeId') || undefined;
      let employeeName: string | undefined = undefined;

      const isCompanyAdmin = user.role === 'Company' || user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Branch';
      if (!isCompanyAdmin) {
        const emp = await this.employeeService.findEmployeeByEmailOrName(user.email, user.name || user.userId || employeeId);
        if (emp) {
          employeeId = emp.employeeId;
          employeeName = emp.name;
        } else {
          employeeId = employeeId || user.employeeId || user.userId;
          employeeName = user.name;
        }
      }

      const leaves = await this.employeeService.getLeaveRequests(companyId, { status, employeeId, employeeName });
      return NextResponse.json(leaves, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.getLeaves:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to fetch leave requests.' }, { status: 500 });
    }
  }

  async applyLeave(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      let companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const body = await req.json();
      let employeeId = body.employeeId || user.employeeId || user.userId;
      let employeeName = body.employeeName || user.name;

      const emp = await this.employeeService.findEmployeeByEmailOrName(user.email, user.name || user.userId || employeeId);
      if (emp) {
        companyId = emp.companyId || companyId;
        employeeId = emp.employeeId;
        employeeName = emp.name;
      }

      body.employeeId = employeeId || 'EMP-SELF';
      body.employeeName = employeeName || 'Staff Member';

      const leave = await this.employeeService.createLeaveRequest(companyId, body);
      return NextResponse.json(leave, { status: 201 });
    } catch (error: any) {
      console.error('Error in EmployeeController.applyLeave:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to submit leave request.' }, { status: 400 });
    }
  }

  async updateLeaveStatus(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const body = await req.json();
      const { leaveId, status, rejectionReason } = body;
      if (!leaveId || !status) {
        return NextResponse.json({ message: 'leaveId and status are required.' }, { status: 400 });
      }

      const actionedBy = user.name || user.username || 'Management';
      const updated = await this.employeeService.updateLeaveStatus(companyId, leaveId, status, actionedBy, rejectionReason);
      return NextResponse.json(updated, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.updateLeaveStatus:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to update leave status.' }, { status: 400 });
    }
  }

  // ==========================================
  // PERFORMANCE REVIEW HANDLERS
  // ==========================================
  async getPerformance(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || undefined;
      let employeeId = searchParams.get('employeeId') || undefined;

      const isCompanyAdmin = user.role === 'Company' || user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Branch';
      let employeeName: string | undefined = undefined;
      if (!isCompanyAdmin) {
        const emp = await this.employeeService.findEmployeeByEmailOrName(user.email, user.name || user.userId || employeeId);
        if (emp) {
          employeeId = emp.employeeId;
          employeeName = emp.name;
        } else {
          employeeId = employeeId || user.employeeId || user.userId;
          employeeName = user.name;
        }
      }

      const data = await this.employeeService.getPerformanceData(companyId, { period, employeeId, employeeName });
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.getPerformance:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to fetch performance data.' }, { status: 500 });
    }
  }

  async createPerformanceReview(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const body = await req.json();
      if (!body.reviewerName) {
        body.reviewerName = user.name || 'System Admin';
      }

      const review = await this.employeeService.createPerformanceReview(companyId, body);
      return NextResponse.json(review, { status: 201 });
    } catch (error: any) {
      console.error('Error in EmployeeController.createPerformanceReview:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to create review.' }, { status: 400 });
    }
  }

  async updatePerformanceReview(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const body = await req.json();
      const { reviewId, ...updateData } = body;
      if (!reviewId) {
        return NextResponse.json({ message: 'reviewId is required.' }, { status: 400 });
      }

      const updated = await this.employeeService.updatePerformanceReview(companyId, reviewId, updateData);
      return NextResponse.json(updated, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.updatePerformanceReview:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to update review.' }, { status: 400 });
    }
  }

  async deletePerformanceReview(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId || user.id;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }
      const { searchParams } = new URL(req.url);
      const reviewId = searchParams.get('reviewId');
      if (!reviewId) {
        return NextResponse.json({ message: 'reviewId is required.' }, { status: 400 });
      }

      await this.employeeService.deletePerformanceReview(companyId, reviewId);
      return NextResponse.json({ message: 'Performance review deleted.' }, { status: 200 });
    } catch (error: any) {
      console.error('Error in EmployeeController.deletePerformanceReview:', error.message);
      return NextResponse.json({ message: error.message || 'Failed to delete review.' }, { status: 500 });
    }
  }
}
