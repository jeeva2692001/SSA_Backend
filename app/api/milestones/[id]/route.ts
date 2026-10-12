import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { MilestoneController } from '../../../../src/modules/project/controllers/milestone.controller';

const milestoneController = new MilestoneController();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await milestoneController.updateMilestone(req, resolvedParams.id, user);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await milestoneController.updateMilestone(req, resolvedParams.id, user);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await milestoneController.deleteMilestone(req, resolvedParams.id, user);
  });
}
