import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '../services/attendance.service';

export class AttendanceController {
  private attendanceService: AttendanceService;

  constructor() {
    this.attendanceService = new AttendanceService();
  }

  async get(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const month = searchParams.get('month') || undefined;

      const data = await this.attendanceService.getAttendance(companyId, month);
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error('Error in AttendanceController.get:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to fetch attendance records.' },
        { status: 500 }
      );
    }
  }

  async punch(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      if (!body.employeeId || !body.type) {
        return NextResponse.json({ message: 'employeeId and type (in/out) are required.' }, { status: 400 });
      }

      const result = await this.attendanceService.punch(companyId, body);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error in AttendanceController.punch:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to record punch.' },
        { status: 400 }
      );
    }
  }

  async log(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      const result = await this.attendanceService.logAttendance(companyId, body);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error in AttendanceController.log:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to log attendance.' },
        { status: 400 }
      );
    }
  }
}
