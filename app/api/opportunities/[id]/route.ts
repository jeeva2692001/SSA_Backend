import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { OpportunityService } from '../../../../src/modules/lead/services/opportunity.service';

const opportunityService = new OpportunityService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return await authMiddleware(req, async () => {
    try {
      const { id } = await params;
      const opp = await opportunityService.getById(id);
      if (!opp) {
        return NextResponse.json({ success: false, message: 'Opportunity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: opp }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return await authMiddleware(req, async () => {
    try {
      const { id } = await params;
      const body = await req.json();
      const opp = await opportunityService.update(id, body);
      if (!opp) {
        return NextResponse.json({ success: false, message: 'Opportunity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: opp }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return await authMiddleware(req, async () => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { stage, probability } = body;

      if (!stage) {
        return NextResponse.json({ success: false, message: 'Stage is required to progress opportunity' }, { status: 400 });
      }

      const opp = await opportunityService.updateStage(id, stage, probability);
      if (!opp) {
        return NextResponse.json({ success: false, message: 'Opportunity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: opp }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return await authMiddleware(req, async () => {
    try {
      const { id } = await params;
      const success = await opportunityService.delete(id);
      return NextResponse.json({ success }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  });
}
