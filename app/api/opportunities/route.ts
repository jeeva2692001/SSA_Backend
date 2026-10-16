import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { OpportunityService } from '../../../src/modules/lead/services/opportunity.service';

const opportunityService = new OpportunityService();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    try {
      const companyId = user.companyId || (user.role === 'Super Admin' ? undefined : user.id);
      const branchId = user.branchId;

      await opportunityService.ensureSeeded();

      const opportunities = await opportunityService.getAll(companyId, branchId);

      return NextResponse.json({
        success: true,
        data: opportunities
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error fetching opportunities:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to fetch opportunities.'
      }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    try {
      const body = await req.json();
      const companyId = user.companyId || (user.role === 'Super Admin' ? undefined : user.id);

      if (!body.name) {
        return NextResponse.json({
          success: false,
          message: 'Opportunity/Deal name is required.'
        }, { status: 400 });
      }

      const opportunity = await opportunityService.create({
        ...body,
        companyId: body.companyId || companyId,
        branchId: body.branchId || user.branchId
      });

      return NextResponse.json({
        success: true,
        data: opportunity
      }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating opportunity:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to create opportunity.'
      }, { status: 500 });
    }
  });
}
