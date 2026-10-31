import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { TaskController } from '../../../../src/modules/task/controllers/task.controller';

const taskController = new TaskController();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (_user: any) => {
    return await taskController.getTaskById(req, resolvedParams.id);
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await taskController.updateTask(req, resolvedParams.id, user);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await taskController.deleteTask(req, resolvedParams.id, user);
  });
}
