import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { RolePermissionModel, PermissionsMap } from '../models/role-permission.model';

export const PERMISSIONS_CATALOGUE = [
  { name: 'Create', desc: 'Allows the user to register new items, including new employees, drawing details, material inventory logs, and CRM leads.' },
  { name: 'Read', desc: 'Allows viewing of dashboards, reports, registers, drawings database, and general tables. Minimum baseline permission.' },
  { name: 'Update', desc: 'Enables updating files, editing company settings, modifying Kanban card columns, and adjusting project stages.' },
  { name: 'Delete', desc: 'Allows deletion of entries from database. Restricted to Super Admin access profile.' },
  { name: 'Approve', desc: 'Enables formal approval of drawings, leave requests, vendor ratings, and contract changes.' },
  { name: 'Export', desc: 'Allows generating PDF blueprints, summary lists, and exporting accounting registers to Excel files.' },
];

export const INITIAL_DEFAULT_MATRIX: Array<{
  role: string;
  isSystem: boolean;
  permissions: PermissionsMap;
  description?: string;
}> = [
  {
    role: 'Super Admin',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: true, Approve: true, Export: true },
    description: 'System-wide super administrator with unrestricted full access across all modules.',
  },
  {
    role: 'Company',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: true, Approve: true, Export: true },
    description: 'Company proprietor / administrator with full organizational management rights.',
  },
  {
    role: 'Branch',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: true, Export: true },
    description: 'Branch division manager with operational authority over local employees and CRM.',
  },
  {
    role: 'Admin',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: true, Approve: true, Export: true },
    description: 'Administrative executive with company-wide administrative permissions.',
  },
  {
    role: 'Project Manager',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: true, Export: true },
    description: 'Oversees project workflows, lead pipelines, assignments, and approvals.',
  },
  {
    role: 'Principle Architect',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: true, Export: true },
    description: 'Senior architectural leader responsible for high-level design vision and approvals.',
  },
  {
    role: 'Chief Architect',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: true, Export: true },
    description: 'Head of architectural drafting and technical drawing compliance.',
  },
  {
    role: '3D Design Architect',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Focuses on 3D spatial modeling, renderings, and concept designs.',
  },
  {
    role: 'Architect',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Architect responsible for site schemes, building plans, and drawings.',
  },
  {
    role: 'Junior Architect',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Junior level architect focused on day-to-day drafting assistance.',
  },
  {
    role: '3D Draftsman',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Drafting specialist responsible for 3D computer models and CAD geometry.',
  },
  {
    role: 'Design Coordination Engineer',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: true, Export: true },
    description: 'Coordinates structural, MEP, and architectural models between teams.',
  },
  {
    role: 'Design Engineer',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Technical engineer executing design calculations and drawing revisions.',
  },
  {
    role: 'Senior 2D Draftsman',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Experienced 2D drafting operator managing plan sets and elevations.',
  },
  {
    role: '2D Draftsman',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'CAD technician developing 2D technical drawings and sections.',
  },
  {
    role: '2D Interior Draftsman',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Detailing specialist for interior floor patterns, cabinetry, and joinery.',
  },
  {
    role: 'Senior 3D Visualizer',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Expert visualizer creating photorealistic perspective renders.',
  },
  {
    role: 'Junior 3D Visualizer',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Junior 3D visual artist handling lighting passes and material setup.',
  },
  {
    role: '3D Visualizer',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Renders exterior and interior walk-through animations and still imagery.',
  },
  {
    role: 'Junior Interior Designer',
    isSystem: false,
    permissions: { Create: false, Read: true, Update: true, Delete: false, Approve: false, Export: false },
    description: 'Assists with material swatches, mood boards, and furniture selection.',
  },
  {
    role: 'Interior Designer',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Designs interior concepts, finishes schedules, and interior architecture.',
  },
  {
    role: 'Landscape Architect',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Designs external landscapes, plant palettes, hardscaping, and site layouts.',
  },
  {
    role: 'HR',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Human resources personnel handling staffing, attendance, and onboarding.',
  },
  {
    role: 'Accountant',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Handles bookkeeping, invoices, vendor balances, and financial exports.',
  },
  {
    role: 'Procurement Specialist',
    isSystem: false,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'Manages vendor orders, materials catalog, and purchase requisitions.',
  },
  {
    role: 'Designer',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: false, Export: true },
    description: 'General design staff assigned to drafting and updating drawings.',
  },
  {
    role: 'Checker',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: true, Export: true },
    description: 'Quality assurance checker authorized to review and approve drawing revisions.',
  },
  {
    role: 'Manager',
    isSystem: true,
    permissions: { Create: true, Read: true, Update: true, Delete: false, Approve: true, Export: true },
    description: 'General management level with supervisory permissions.',
  },
  {
    role: 'Employee',
    isSystem: true,
    permissions: { Create: false, Read: true, Update: false, Delete: false, Approve: false, Export: false },
    description: 'Standard employee account with read-only baseline access.',
  },
  {
    role: 'Client',
    isSystem: true,
    permissions: { Create: false, Read: true, Update: false, Delete: false, Approve: false, Export: false },
    description: 'External client account with restricted portal access to designated drawings.',
  },
];

export class RbacService {
  private repository: RolePermissionRepository;

  constructor() {
    this.repository = new RolePermissionRepository();
  }

  async ensureSeeded(): Promise<void> {
    const count = await this.repository.count();
    if (count === 0) {
      console.log('[RBAC Seed] No roles found in database. Seeding default access matrix...');
      for (const item of INITIAL_DEFAULT_MATRIX) {
        await this.repository.create({
          role: item.role,
          isSystem: item.isSystem,
          description: item.description,
          permissions: item.permissions,
        });
      }
      console.log(`[RBAC Seed] Successfully seeded ${INITIAL_DEFAULT_MATRIX.length} roles and permissions.`);
    } else {
      // Check if essential system roles exist, seed any missing ones
      for (const item of INITIAL_DEFAULT_MATRIX) {
        const existing = await this.repository.findByRole(item.role);
        if (!existing) {
          await this.repository.create({
            role: item.role,
            isSystem: item.isSystem,
            description: item.description,
            permissions: item.permissions,
          });
          console.log(`[RBAC Seed] Seeded missing role: ${item.role}`);
        }
      }
    }
  }

  async getMatrix(): Promise<RolePermissionModel[]> {
    await this.ensureSeeded();
    return await this.repository.findAll();
  }

  async getRoles(): Promise<string[]> {
    await this.ensureSeeded();
    const rows = await this.repository.findAll();
    return rows.map((r) => r.role);
  }

  async addRole(
    roleName: string,
    permissions?: Partial<PermissionsMap>,
    description?: string
  ): Promise<RolePermissionModel> {
    const trimmed = (roleName || '').trim();
    if (!trimmed) {
      throw new Error('Role name is required.');
    }

    await this.ensureSeeded();
    const existing = await this.repository.findByRole(trimmed);
    if (existing) {
      throw new Error(`Role "${trimmed}" already exists.`);
    }

    const defaultPerms: PermissionsMap = {
      Create: false,
      Read: true,
      Update: false,
      Delete: false,
      Approve: false,
      Export: false,
      ...(permissions || {}),
    };

    return await this.repository.create({
      role: trimmed,
      isSystem: false,
      description: description || `Custom user role: ${trimmed}`,
      permissions: defaultPerms,
    });
  }

  async togglePermission(
    roleName: string,
    permission: string,
    explicitValue?: boolean
  ): Promise<RolePermissionModel> {
    const trimmed = (roleName || '').trim();
    if (!trimmed) {
      throw new Error('Role name is required.');
    }
    if (!permission) {
      throw new Error('Permission name is required.');
    }

    await this.ensureSeeded();
    const record = await this.repository.findByRole(trimmed);
    if (!record) {
      throw new Error(`Role "${trimmed}" not found in database.`);
    }

    // Protect Super Admin from losing critical permissions
    if (record.role === 'Super Admin') {
      record.permissions = {
        Create: true,
        Read: true,
        Update: true,
        Delete: true,
        Approve: true,
        Export: true,
      };
      return await this.repository.save(record);
    }

    const currentValue = !!record.permissions[permission];
    const newValue = explicitValue !== undefined ? explicitValue : !currentValue;

    record.permissions = {
      ...record.permissions,
      [permission]: newValue,
    };

    return await this.repository.save(record);
  }

  async updateRolePermissions(
    roleName: string,
    permissions: PermissionsMap
  ): Promise<RolePermissionModel> {
    const trimmed = (roleName || '').trim();
    await this.ensureSeeded();
    const record = await this.repository.findByRole(trimmed);
    if (!record) {
      throw new Error(`Role "${trimmed}" not found.`);
    }

    if (record.role === 'Super Admin') {
      record.permissions = {
        Create: true,
        Read: true,
        Update: true,
        Delete: true,
        Approve: true,
        Export: true,
      };
    } else {
      record.permissions = {
        ...record.permissions,
        ...permissions,
      };
    }

    return await this.repository.save(record);
  }

  async deleteRole(roleName: string): Promise<boolean> {
    const trimmed = (roleName || '').trim();
    await this.ensureSeeded();
    const record = await this.repository.findByRole(trimmed);
    if (!record) {
      throw new Error(`Role "${trimmed}" does not exist.`);
    }
    if (record.isSystem) {
      throw new Error(`System role "${trimmed}" cannot be deleted.`);
    }

    return await this.repository.deleteByRole(record.role);
  }

  async getUserPermissions(roleName?: string): Promise<PermissionsMap> {
    if (!roleName) {
      return { Create: false, Read: true, Update: false, Delete: false, Approve: false, Export: false };
    }

    const trimmed = roleName.trim();

    // Super Admin & Company always have all permissions
    if (trimmed === 'Super Admin' || trimmed === 'Super Administrator' || trimmed === 'Company') {
      return { Create: true, Read: true, Update: true, Delete: true, Approve: true, Export: true };
    }

    await this.ensureSeeded();
    const record = await this.repository.findByRole(trimmed);
    if (record && record.permissions) {
      return record.permissions;
    }

    // Default fallback
    return { Create: false, Read: true, Update: false, Delete: false, Approve: false, Export: false };
  }

  async checkUserPermission(
    user: any,
    requiredPermission: 'Create' | 'Read' | 'Update' | 'Delete' | 'Approve' | 'Export'
  ): Promise<boolean> {
    if (!user) return false;
    const role = user.role || '';
    if (role === 'Super Admin' || role === 'Super Administrator' || role === 'Company') {
      return true;
    }
    const permissions = await this.getUserPermissions(role);
    return !!permissions[requiredPermission];
  }
}
