import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { TaskController } from '../../../src/modules/task/controllers/task.controller';

const taskController = new TaskController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await taskController.getAllTasks(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await taskController.createTask(req, user);
  });
}
