import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../../src/modules/auth/middlewares/auth.middleware';
import { AttendanceController } from '../../../../../src/modules/employee';

const attendanceController = new AttendanceController();

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await attendanceController.punch(req, user);
  });
}
