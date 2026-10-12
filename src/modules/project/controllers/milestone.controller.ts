import { NextRequest, NextResponse } from 'next/server';
import { MilestoneService } from '../services/milestone.service';

export class MilestoneController {
  private milestoneService = new MilestoneService();

  private getCompanyId(user: any, searchParams?: URLSearchParams): string | undefined {
    if (user?.role === 'Super Admin') {
      return searchParams?.get('companyId') || undefined;
    }
    return user?.companyId || undefined;
  }

  async getMilestones(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const projectId = searchParams.get('projectId') || undefined;
      const companyId = this.getCompanyId(user, searchParams);
      const milestones = await this.milestoneService.getMilestones(projectId, companyId);
      return NextResponse.json({ success: true, data: milestones });
    } catch (err: any) {
      console.error('[MilestoneController] getMilestones error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createMilestone(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const companyId = user?.role === 'Super Admin'
        ? (body.companyId || user?.companyId)
        : user?.companyId;

      const created = await this.milestoneService.createMilestone({
        ...body,
        companyId
      });
      return NextResponse.json({ success: true, data: created, message: 'Milestone created successfully.' });
    } catch (err: any) {
      console.error('[MilestoneController] createMilestone error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async updateMilestone(req: NextRequest, milestoneId: string, user: any) {
    try {
      const body = await req.json();
      const updated = await this.milestoneService.updateMilestone(milestoneId, body);
      return NextResponse.json({ success: true, data: updated, message: 'Milestone updated successfully.' });
    } catch (err: any) {
      console.error('[MilestoneController] updateMilestone error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteMilestone(req: NextRequest, milestoneId: string, user: any) {
    try {
      const ok = await this.milestoneService.deleteMilestone(milestoneId);
      if (!ok) {
        return NextResponse.json({ success: false, message: 'Milestone not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Milestone deleted successfully.' });
    } catch (err: any) {
      console.error('[MilestoneController] deleteMilestone error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
}
