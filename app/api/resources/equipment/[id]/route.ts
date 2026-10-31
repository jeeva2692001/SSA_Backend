import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../../src/modules/auth/middlewares/auth.middleware';
import { ResourceController } from '../../../../../src/modules/resource/controllers/resource.controller';

const resourceController = new ResourceController();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (_user: any) => {
    return await resourceController.getEquipmentById(req, resolvedParams.id);
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await resourceController.updateEquipment(req, resolvedParams.id, user);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (_user: any) => {
    return await resourceController.deleteEquipment(req, resolvedParams.id);
  });
}
