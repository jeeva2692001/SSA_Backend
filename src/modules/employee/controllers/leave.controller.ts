import { NextRequest, NextResponse } from 'next/server';
import { LeaveService } from '../services/leave.service';

export class LeaveController {
  private leaveService: LeaveService;

  constructor() {
    this.leaveService = new LeaveService();
  }

  async get(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status') || undefined;

      const data = await this.leaveService.getLeaves(companyId, status);
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error('Error in LeaveController.get:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to fetch leave requests.' },
        { status: 500 }
      );
    }
  }

  async apply(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      const leave = await this.leaveService.applyLeave(companyId, body);
      return NextResponse.json(leave, { status: 201 });
    } catch (error: any) {
      console.error('Error in LeaveController.apply:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to submit leave request.' },
        { status: 400 }
      );
    }
  }

  async updateStatus(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      const { leaveId, status, rejectionReason } = body;
      if (!leaveId || !status) {
        return NextResponse.json({ message: 'leaveId and status (Approved/Rejected) are required.' }, { status: 400 });
      }

      const actionedBy = user.name || user.contactPerson || user.email || 'Admin';
      const updated = await this.leaveService.updateLeaveStatus(companyId, leaveId, status, actionedBy, rejectionReason);
      return NextResponse.json(updated, { status: 200 });
    } catch (error: any) {
      console.error('Error in LeaveController.updateStatus:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to update leave status.' },
        { status: 400 }
      );
    }
  }
}
