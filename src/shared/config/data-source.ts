import "reflect-metadata";
import { DataSource } from "typeorm";
import { envConfig } from "./env.config";
import { TestModel } from "../../modules/test/models/test.model";
import { UserModel } from "../../modules/auth/models/user.model";
import { CompanyModel } from "../../modules/company/models/company.model";
import { DepartmentModel } from "../../modules/company/models/department.model";
import { EmployeeModel } from "../../modules/employee/models/employee.model";
import { BranchModel } from "../../modules/branch/models/branch.model";
import { ProjectCategoryModel } from "../../modules/lead/models/project-category.model";
import { CategoryTaglineModel } from "../../modules/lead/models/category-tagline.model";
import { CategoryTemplateFieldModel } from "../../modules/lead/models/category-template-field.model";
import { LeadModel } from "../../modules/lead/models/lead.model";
import { LeadRequirementValueModel } from "../../modules/lead/models/lead-requirement-value.model";
import { DeliverableTemplateModel } from "../../modules/lead/models/deliverable-template.model";
import { LeadDeliverableModel } from "../../modules/lead/models/lead-deliverable.model";
import { ClientModel } from "../../modules/client/models/client.model";
import {
  ProjectModel,
  DisciplineModel,
  ProjectDisciplineModel,
  DrawingTypeModel,
  DrawingModel,
  DrawingRevisionModel,
  DrawingFileModel,
  FolderModel,
  ProjectFileModel
} from "../../modules/project";
import { RolePermissionModel } from "../../modules/rbac/models/role-permission.model";


const globalRef = global as unknown as { AppDataSource: DataSource | undefined };

const entitiesList = [
  TestModel, 
  UserModel, 
  CompanyModel, 
  DepartmentModel,
  EmployeeModel, 
  BranchModel,
  ClientModel,
  ProjectCategoryModel,
  CategoryTaglineModel,
  CategoryTemplateFieldModel,
  LeadModel,
  LeadRequirementValueModel,
  DeliverableTemplateModel,
  LeadDeliverableModel,
  ProjectModel,
  DisciplineModel,
  ProjectDisciplineModel,
  DrawingTypeModel,
  DrawingModel,
  DrawingRevisionModel,
  DrawingFileModel,
  FolderModel,
  ProjectFileModel,
  RolePermissionModel
];

const createDataSource = () => new DataSource({
  type: "postgres",
  ...(envConfig.database.url
    ? { url: envConfig.database.url }
    : {
        host: envConfig.database.host,
        port: envConfig.database.port,
        username: envConfig.database.username,
        password: envConfig.database.password,
        database: envConfig.database.database,
      }),
  ssl: envConfig.database.ssl,
  synchronize: true,
  logging: true,
  entities: entitiesList,
  migrations: [],
  subscribers: [],
});

if (globalRef.AppDataSource) {
  const hasRolePermission = (globalRef.AppDataSource.options.entities as any[])?.some(
    e => (typeof e === 'function' && e.name === 'RolePermissionModel') || (e && (e as any).name === 'RolePermissionModel')
  );
  const hasDepartment = (globalRef.AppDataSource.options.entities as any[])?.some(
    e => (typeof e === 'function' && e.name === 'DepartmentModel') || (e && (e as any).name === 'DepartmentModel')
  );
  if (!hasRolePermission || !hasDepartment) {
    console.log('[DataSource] Updating entities list on cached AppDataSource to include new models (DepartmentModel)...');
    try {
      if (globalRef.AppDataSource.isInitialized) {
        globalRef.AppDataSource.destroy();
      }
    } catch {}
    globalRef.AppDataSource = createDataSource();
  }
}

export let AppDataSource = globalRef.AppDataSource || createDataSource();

// Safe getMetadata & getRepository wrapper to handle Next.js / Turbopack HMR class identity changes
if (!(AppDataSource as any).__safeGetRepositoryPatched) {
  const origFindMetadata = (AppDataSource as any).findMetadata?.bind(AppDataSource);
  (AppDataSource as any).findMetadata = function (target: any) {
    const found = origFindMetadata ? origFindMetadata(target) : undefined;
    if (found) return found;
    const targetName = typeof target === 'function' ? target.name : String(target);
    return AppDataSource.entityMetadatas.find(
      m => m.name === targetName || m.targetName === targetName || m.tableName === targetName || (typeof m.target === 'function' && m.target.name === targetName)
    );
  };

  const origHasMetadata = AppDataSource.hasMetadata.bind(AppDataSource);
  (AppDataSource as any).hasMetadata = function (target: any) {
    if (origHasMetadata(target)) return true;
    return !!(AppDataSource as any).findMetadata(target);
  };

  const origGetMetadata = AppDataSource.getMetadata.bind(AppDataSource);
  (AppDataSource as any).getMetadata = function (target: any) {
    try {
      return origGetMetadata(target);
    } catch {
      const meta = (AppDataSource as any).findMetadata(target);
      if (meta) return meta;
      throw new Error(`No metadata for "${typeof target === 'function' ? target.name : target}" was found.`);
    }
  };

  const origGetRepository = AppDataSource.getRepository.bind(AppDataSource);
  (AppDataSource as any).getRepository = function <Entity>(target: any) {
    try {
      return origGetRepository(target);
    } catch (err: any) {
      const meta = (AppDataSource as any).findMetadata(target);
      if (meta) {
        return origGetRepository(meta.target as any);
      }
      throw err;
    }
  };

  (AppDataSource as any).__safeGetRepositoryPatched = true;
}

if (process.env.NODE_ENV !== "production") {
  globalRef.AppDataSource = AppDataSource;
}

export async function getDataSource() {
  if (AppDataSource.isInitialized) {
    const hasRolePermission = AppDataSource.entityMetadatas.some(
      m => m.name === 'RolePermissionModel' || m.tableName === 'role_permissions'
    );
    const hasDepartment = AppDataSource.entityMetadatas.some(
      m => m.name === 'DepartmentModel' || m.tableName === 'departments'
    );
    if (!hasRolePermission || !hasDepartment) {
      console.log('[DataSource] Re-creating AppDataSource to load new entities (DepartmentModel / RolePermissionModel)...');
      try {
        await AppDataSource.destroy();
      } catch {}
      AppDataSource = createDataSource();
      globalRef.AppDataSource = AppDataSource;
      await AppDataSource.initialize();
    }
  }

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    
    // Seed default superadmin user if database is empty
    try {
      const userRepo = AppDataSource.getRepository(UserModel);
      const count = await userRepo.count();
      if (count === 0) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        const adminUser = userRepo.create({
          userId: 'superadmin',
          name: 'Sundar Sundram',
          email: 'sundar@sundramarchitects.com',
          role: 'Super Admin',
          password: hashedPassword,
        });
        await userRepo.save(adminUser);
        console.log('[Seed] Default superadmin user seeded successfully.');
      }
    } catch (err) {
      console.error('[Seed] Error seeding default admin user:', err);
    }

    // Seed default company if database has no companies
    try {
      const companyRepo = AppDataSource.getRepository(CompanyModel);
      const companyCount = await companyRepo.count();
      if (companyCount === 0) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        const defaultCompany = companyRepo.create({
          companyId: 'COM-001',
          name: 'Sundram Architects',
          status: 'Active',
          address: 'Chennai, Tamil Nadu, India',
          email: 'sundar@sundramarchitects.com',
          contactPerson: 'Sundar Sundram',
          mobileNumber: '9876543210',
          designation: 'Proprietor',
          gstNo: '33ABCDE1234F1Z0',
          panNo: 'ABCDE1234F',
          password: hashedPassword,
        });
        await companyRepo.save(defaultCompany);
        console.log('[Seed] Default company seeded successfully.');
      }
    } catch (err) {
      console.error('[Seed] Error seeding default company:', err);
    }

    // Seed default RBAC permissions matrix
    try {
      const { RbacService } = await import('../../modules/rbac/services/rbac.service');
      const rbacService = new RbacService();
      await rbacService.ensureSeeded();
    } catch (err) {
      console.error('[Seed] Error seeding default RBAC roles and permissions:', err);
    }

    // Seed default Departments
    try {
      const { DepartmentService } = await import('../../modules/company/services/department.service');
      const departmentService = new DepartmentService();
      await departmentService.ensureSeeded();
    } catch (err) {
      console.error('[Seed] Error seeding default departments:', err);
    }
  }
  return AppDataSource;
}
