import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { EmployeeController } from '../../../../src/modules/employee';

const employeeController = new EmployeeController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.getLeaves(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.applyLeave(req, user);
  });
}

export async function PATCH(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.updateLeaveStatus(req, user);
  });
}

export async function PUT(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.updateLeaveStatus(req, user);
  });
}
