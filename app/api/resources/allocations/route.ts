import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { ResourceController } from '../../../../src/modules/resource/controllers/resource.controller';

const resourceController = new ResourceController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await resourceController.getAllAllocations(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await resourceController.createAllocation(req, user);
  });
}
