import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { MilestoneController } from '../../../src/modules/project/controllers/milestone.controller';

const milestoneController = new MilestoneController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await milestoneController.getMilestones(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await milestoneController.createMilestone(req, user);
  });
}
