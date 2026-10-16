import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { DocumentController } from '../../../../src/modules/document/controllers/document.controller';

const documentController = new DocumentController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await documentController.getMaterialApprovals(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await documentController.createMaterialApproval(req, user);
  });
}
