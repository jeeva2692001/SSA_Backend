import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { EmployeeController } from '../../../../src/modules/employee';

const employeeController = new EmployeeController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.getPerformance(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.createPerformanceReview(req, user);
  });
}

export async function PUT(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.updatePerformanceReview(req, user);
  });
}

export async function DELETE(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await employeeController.deletePerformanceReview(req, user);
  });
}
