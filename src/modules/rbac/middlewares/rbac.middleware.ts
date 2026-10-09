import { NextRequest, NextResponse } from 'next/server';
import { RbacService } from '../services/rbac.service';

const rbacService = new RbacService();

export function requirePermission(
  permission: 'Create' | 'Read' | 'Update' | 'Delete' | 'Approve' | 'Export'
) {
  return async (req: NextRequest, user: any, next: () => Promise<NextResponse>): Promise<NextResponse> => {
    const hasPermission = await rbacService.checkUserPermission(user, permission);
    if (!hasPermission) {
      return NextResponse.json(
        {
          message: `Access Denied: Your assigned role (${user?.role}) lacks required "${permission}" permission.`,
          requiredPermission: permission,
          userRole: user?.role,
        },
        { status: 403 }
      );
    }
    return await next();
  };
}
