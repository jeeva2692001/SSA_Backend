import { NextRequest } from 'next/server';
import { CompanyController, companyMiddleware } from '../../../src/modules/company';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';

const companyController = new CompanyController();

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return await authMiddleware(req, async (user: any) => {
      return await companyController.getAll(req, user);
    });
  }
  return await companyMiddleware(req, async () => {
    return await companyController.getAll(req);
  });
}

export async function POST(req: NextRequest) {
  return await companyMiddleware(req, async () => {
    return await companyController.register(req);
  });
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return await authMiddleware(req, async (user: any) => {
      return await companyController.update(req, user);
    });
  }
  return await companyMiddleware(req, async () => {
    return await companyController.update(req);
  });
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return await authMiddleware(req, async (user: any) => {
      return await companyController.update(req, user);
    });
  }
  return await companyMiddleware(req, async () => {
    return await companyController.update(req);
  });
}

export async function DELETE(req: NextRequest) {
  return await companyMiddleware(req, async () => {
    return await companyController.delete(req);
  });
}
