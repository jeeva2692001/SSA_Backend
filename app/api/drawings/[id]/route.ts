import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { ProjectController } from '../../../../src/modules/project/controllers/project.controller';

const projectController = new ProjectController();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await projectController.getDrawingDetails(req, resolvedParams.id, user);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await projectController.updateDrawing(req, resolvedParams.id, user);
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await projectController.updateDrawing(req, resolvedParams.id, user);
  });
}
