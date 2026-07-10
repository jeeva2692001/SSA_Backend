import { NextRequest, NextResponse } from 'next/server';
import { BranchEmployeeService } from '../services/branch-employee.service';

export class BranchEmployeeController {
  private branchEmployeeService: BranchEmployeeService;

  constructor() {
    this.branchEmployeeService = new BranchEmployeeService();
  }

  async getAll(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const branchId = searchParams.get('branchId') || undefined;

      const employees = await this.branchEmployeeService.getEmployees(companyId, branchId);
      return NextResponse.json(employees, { status: 200 });
    } catch (error: any) {
      console.error('Error in BranchEmployeeController.getAll:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to fetch branch employees.' },
        { status: 505 }
      );
    }
  }

  async register(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company Identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      const employee = await this.branchEmployeeService.addEmployee(companyId, body);
      return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
      console.error('Error in BranchEmployeeController.register:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to register branch employee.' },
        { status: 400 }
      );
    }
  }

  async update(req: NextRequest, user: any): Promise<NextResponse> {
    try {
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

      const employee = await this.branchEmployeeService.updateEmployee(employeeId, companyId, updateData);
      return NextResponse.json(employee, { status: 200 });
    } catch (error: any) {
      console.error('Error in BranchEmployeeController.update:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to update branch employee.' },
        { status: 400 }
      );
    }
  }

  async delete(req: NextRequest, user: any): Promise<NextResponse> {
    try {
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

      const deleted = await this.branchEmployeeService.deleteEmployee(employeeId, companyId);
      if (!deleted) {
        return NextResponse.json(
          { message: 'Branch employee not found or already deleted.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Branch employee deleted successfully.' }, { status: 200 });
    } catch (error: any) {
      console.error('Error in BranchEmployeeController.delete:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to delete branch employee.' },
        { status: 500 }
      );
    }
  }
}
