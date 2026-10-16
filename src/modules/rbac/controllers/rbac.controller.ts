import { NextRequest, NextResponse } from 'next/server';
import { RbacService, PERMISSIONS_CATALOGUE } from '../services/rbac.service';

export class RbacController {
  private rbacService: RbacService;

  constructor() {
    this.rbacService = new RbacService();
  }

  async getMatrix(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const matrix = await this.rbacService.getMatrix();
      return NextResponse.json(matrix, { status: 200 });
    } catch (error: any) {
      console.error('Error in RbacController.getMatrix:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to retrieve access matrix.' },
        { status: 500 }
      );
    }
  }

  async getRoles(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const roles = await this.rbacService.getRoles();
      return NextResponse.json(roles, { status: 200 });
    } catch (error: any) {
      console.error('Error in RbacController.getRoles:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to retrieve roles.' },
        { status: 500 }
      );
    }
  }

  async addRole(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      // Check if user is Super Admin or Company or Admin
      const isPrivileged = ['Super Admin', 'Super Administrator', 'Company', 'Admin'].includes(user?.role);
      if (!isPrivileged) {
        return NextResponse.json(
          { message: 'Forbidden: Insufficient privileges to define new roles.' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { role, permissions, description } = body;

      if (!role || !String(role).trim()) {
        return NextResponse.json(
          { message: 'Role title (role) is required.' },
          { status: 400 }
        );
      }

      const newRole = await this.rbacService.addRole(role, permissions, description);
      return NextResponse.json(newRole, { status: 201 });
    } catch (error: any) {
      console.error('Error in RbacController.addRole:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to create role.' },
        { status: 400 }
      );
    }
  }

  async togglePermission(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      // Check if user is Super Admin or Company or Admin
      const isPrivileged = ['Super Admin', 'Super Administrator', 'Company', 'Admin'].includes(user?.role);
      if (!isPrivileged) {
        return NextResponse.json(
          { message: 'Forbidden: Insufficient privileges to modify permissions matrix.' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { role, permission, value } = body;

      if (!role) {
        return NextResponse.json({ message: 'Role is required.' }, { status: 400 });
      }
      if (!permission) {
        return NextResponse.json({ message: 'Permission name is required.' }, { status: 400 });
      }

      const updated = await this.rbacService.togglePermission(role, permission, value);
      return NextResponse.json(updated, { status: 200 });
    } catch (error: any) {
      console.error('Error in RbacController.togglePermission:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to toggle permission.' },
        { status: 400 }
      );
    }
  }

  async deleteRole(req: NextRequest, user: any, roleName: string): Promise<NextResponse> {
    try {
      const isPrivileged = ['Super Admin', 'Super Administrator', 'Company', 'Admin'].includes(user?.role);
      if (!isPrivileged) {
        return NextResponse.json(
          { message: 'Forbidden: Insufficient privileges to delete roles.' },
          { status: 403 }
        );
      }

      if (!roleName) {
        return NextResponse.json({ message: 'Role name is required.' }, { status: 400 });
      }

      const decodedRole = decodeURIComponent(roleName);
      const deleted = await this.rbacService.deleteRole(decodedRole);
      if (!deleted) {
        return NextResponse.json({ message: 'Role not found or cannot be deleted.' }, { status: 404 });
      }

      return NextResponse.json({ message: `Role "${decodedRole}" deleted successfully.` }, { status: 200 });
    } catch (error: any) {
      console.error('Error in RbacController.deleteRole:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to delete role.' },
        { status: 400 }
      );
    }
  }

  async getCatalogue(req: NextRequest): Promise<NextResponse> {
    return NextResponse.json(PERMISSIONS_CATALOGUE, { status: 200 });
  }

  async getUserPermissions(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const permissions = await this.rbacService.getUserPermissions(user?.role);
      return NextResponse.json({
        role: user?.role,
        permissions,
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error in RbacController.getUserPermissions:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to get user permissions.' },
        { status: 500 }
      );
    }
  }
}
