import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../../src/modules/auth/middlewares/auth.middleware';
import { InventoryController } from '../../../../../src/modules/inventory/controllers/inventory.controller';

const controller = new InventoryController();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (_user: any) => {
    return await controller.getAssetById(req, resolvedParams.id);
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await controller.updateAsset(req, resolvedParams.id, user);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await controller.deleteAsset(req, resolvedParams.id, user);
  });
}
