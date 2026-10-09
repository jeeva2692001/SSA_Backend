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
}
