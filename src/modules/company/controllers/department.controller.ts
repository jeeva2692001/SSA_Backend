import { NextRequest, NextResponse } from 'next/server';
import { DepartmentService } from '../services/department.service';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor() {
    this.departmentService = new DepartmentService();
  }

  async getAll(req: NextRequest, user?: any): Promise<NextResponse> {
    try {
      const companyId = user?.companyId || 'COM-001';
      const departments = await this.departmentService.getAllDepartments(companyId);
      return NextResponse.json(departments, { status: 200 });
    } catch (error: any) {
      console.error('Error in DepartmentController.getAll:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to fetch departments.' },
        { status: 500 }
      );
    }
  }

  async create(req: NextRequest, user?: any): Promise<NextResponse> {
    try {
      const body = await req.json();
      const companyId = user?.companyId || 'COM-001';
      const department = await this.departmentService.createDepartment(body, companyId);
      return NextResponse.json(department, { status: 201 });
    } catch (error: any) {
      console.error('Error in DepartmentController.create:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to create department.' },
        { status: 400 }
      );
    }
  }

  async update(req: NextRequest, user?: any): Promise<NextResponse> {
    try {
      const body = await req.json();
      const { searchParams } = new URL(req.url);
      const departmentId = body.departmentId || body.id || searchParams.get('departmentId') || searchParams.get('id');

      if (!departmentId) {
        return NextResponse.json(
          { message: 'Department ID is required for update.' },
          { status: 400 }
        );
      }

      const updated = await this.departmentService.updateDepartment(departmentId, body);
      return NextResponse.json(updated, { status: 200 });
    } catch (error: any) {
      console.error('Error in DepartmentController.update:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to update department.' },
        { status: 400 }
      );
    }
  }

  async delete(req: NextRequest, user?: any): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(req.url);
      const departmentId = searchParams.get('departmentId') || searchParams.get('id');

      if (!departmentId) {
        return NextResponse.json(
          { message: 'Department ID is required for deletion.' },
          { status: 400 }
        );
      }

      const deleted = await this.departmentService.deleteDepartment(departmentId);
      if (!deleted) {
        return NextResponse.json(
          { message: 'Department not found or already deleted.' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { message: 'Department deleted successfully.' },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Error in DepartmentController.delete:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to delete department.' },
        { status: 400 }
      );
    }
  }
}
