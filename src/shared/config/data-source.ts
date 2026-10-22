import "reflect-metadata";
import { DataSource } from "typeorm";
import { envConfig } from "./env.config";
import { TestModel } from "../../modules/test/models/test.model";
import { UserModel } from "../../modules/auth/models/user.model";
import { CompanyModel } from "../../modules/company/models/company.model";
import { DepartmentModel } from "../../modules/company/models/department.model";
import { 
  EmployeeModel,
  AttendanceModel,
  LeaveRequestModel,
  PerformanceReviewModel 
} from "../../modules/employee";
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
  ProjectFileModel,
  MilestoneModel
} from "../../modules/project";
import { RolePermissionModel } from "../../modules/rbac/models/role-permission.model";
import { InvoiceModel } from "../../modules/billing/models/invoice.model";
import { OpportunityModel } from "../../modules/lead/models/opportunity.model";
import {
  ClientBriefModel,
  MomModel,
  SiteReportModel,
  MaterialApprovalModel
} from "../../modules/document/models";

const entitiesList = [
  TestModel, 
  UserModel, 
  CompanyModel, 
  DepartmentModel,
  EmployeeModel, 
  AttendanceModel,
  LeaveRequestModel,
  PerformanceReviewModel,
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
  RolePermissionModel,
  InvoiceModel,
  OpportunityModel,
  MilestoneModel,
  ClientBriefModel,
  MomModel,
  SiteReportModel,
  MaterialApprovalModel
];

export function createDataSource(): DataSource {
  return new DataSource({
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
}

export function applyPatches(ds: DataSource) {
  if ((ds as any).__safeGetRepositoryPatched) return;

  const origFindMetadata = (ds as any).findMetadata?.bind(ds);
  (ds as any).findMetadata = function (target: any) {
    const found = origFindMetadata ? origFindMetadata(target) : undefined;
    if (found) return found;
    const targetName = typeof target === 'function' ? target.name : String(target);
    return ds.entityMetadatas.find(
      m => m.name === targetName || m.targetName === targetName || m.tableName === targetName || (typeof m.target === 'function' && m.target.name === targetName)
    );
  };

  const origHasMetadata = ds.hasMetadata.bind(ds);
  (ds as any).hasMetadata = function (target: any) {
    if (origHasMetadata(target)) return true;
    return !!(ds as any).findMetadata(target);
  };

  const origGetMetadata = ds.getMetadata.bind(ds);
  (ds as any).getMetadata = function (target: any) {
    try {
      return origGetMetadata(target);
    } catch {
      const meta = (ds as any).findMetadata(target);
      if (meta) return meta;
      throw new Error(`No metadata for "${typeof target === 'function' ? target.name : target}" was found.`);
    }
  };

  const origGetRepository = ds.getRepository.bind(ds);
  (ds as any).getRepository = function <Entity>(target: any) {
    try {
      return origGetRepository(target);
    } catch (err: any) {
      const meta = (ds as any).findMetadata(target);
      if (meta) {
        return origGetRepository(meta.target as any);
      }
      throw err;
    }
  };

  (ds as any).__safeGetRepositoryPatched = true;
}

const globalRef = global as unknown as { AppDataSource: DataSource | undefined };

if (globalRef.AppDataSource) {
  const entityNames = (globalRef.AppDataSource.options.entities as any[])?.map(
    e => (typeof e === 'function' ? e.name : (e as any)?.name)
  ) || [];
  const requiredEntities = [
    'RolePermissionModel',
    'DepartmentModel',
    'InvoiceModel',
    'OpportunityModel',
    'MilestoneModel',
    'ClientBriefModel',
    'MomModel',
    'SiteReportModel',
    'MaterialApprovalModel'
  ];
  const missing = requiredEntities.some(name => !entityNames.includes(name));
  if (missing) {
    console.log('[DataSource] Updating entities list on cached AppDataSource to include new models...');
    try {
      if (globalRef.AppDataSource.isInitialized) {
        globalRef.AppDataSource.destroy();
      }
    } catch {}
    globalRef.AppDataSource = createDataSource();
  }
}

export let AppDataSource: DataSource = globalRef.AppDataSource || createDataSource();
applyPatches(AppDataSource);

if (process.env.NODE_ENV !== "production") {
  globalRef.AppDataSource = AppDataSource;
}

export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    const hasRolePermission = AppDataSource.entityMetadatas.some(
      m => m.name === 'RolePermissionModel' || m.tableName === 'role_permissions'
    );
    const hasDepartment = AppDataSource.entityMetadatas.some(
      m => m.name === 'DepartmentModel' || m.tableName === 'departments'
    );
    const hasInvoice = AppDataSource.entityMetadatas.some(
      m => m.name === 'InvoiceModel' || m.tableName === 'invoices'
    );
    const hasOpportunity = AppDataSource.entityMetadatas.some(
      m => m.name === 'OpportunityModel' || m.tableName === 'opportunities'
    );
    const hasMilestone = AppDataSource.entityMetadatas.some(
      m => m.name === 'MilestoneModel' || m.tableName === 'milestones'
    );
    const hasMaterialApproval = AppDataSource.entityMetadatas.some(
      m => m.name === 'MaterialApprovalModel' || m.tableName === 'material_approvals'
    );
    if (!hasRolePermission || !hasDepartment || !hasInvoice || !hasOpportunity || !hasMilestone || !hasMaterialApproval) {
      console.log('[DataSource] Re-creating AppDataSource to load new entities (OpportunityModel / InvoiceModel / DepartmentModel / RolePermissionModel / MilestoneModel / MaterialApprovalModel)...');
      try {
        await AppDataSource.destroy();
      } catch {}
      AppDataSource = createDataSource();
      globalRef.AppDataSource = AppDataSource;
      await AppDataSource.initialize();
      applyPatches(AppDataSource);
    }
  }

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    applyPatches(AppDataSource);
    globalRef.AppDataSource = AppDataSource;

    // Ensure all entity metadata targetNames are set to unique tableName to prevent minification-induced cyclic dependency ("Cyclic dependency: 'c'")
    AppDataSource.entityMetadatas.forEach(m => {
      if (m.tableName) {
        (m as any).targetName = m.tableName;
      }
    });

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

    // Seed default Invoices / Billing records
    try {
      const { InvoiceService } = await import('../../modules/billing/services/invoice.service');
      const invoiceService = new InvoiceService();
      await invoiceService.ensureSeeded();
    } catch (err) {
      console.error('[Seed] Error seeding default invoices:', err);
    }

    // Seed default Opportunities / Deals
    try {
      const { OpportunityService } = await import('../../modules/lead/services/opportunity.service');
      const oppService = new OpportunityService();
      await oppService.ensureSeeded();
    } catch (err) {
      console.error('[Seed] Error seeding default opportunities:', err);
    }
  }

  // Auto-refresh DataSource if any newly added models are missing in the cached global instance
  const hasHrModels = AppDataSource.isInitialized &&
    AppDataSource.entityMetadatas.some(m => m.tableName === 'attendances') &&
    AppDataSource.entityMetadatas.some(m => m.tableName === 'leave_requests') &&
    AppDataSource.entityMetadatas.some(m => m.tableName === 'performance_reviews');

  if (AppDataSource.isInitialized && !hasHrModels) {
    console.log('[DataSource] Missing HR models in cached DataSource. Re-initializing clean DataSource...');
    try {
      await AppDataSource.destroy();
    } catch (e) {
      // ignore
    }
    AppDataSource = createDataSource();
    await AppDataSource.initialize();
    applyPatches(AppDataSource);
    globalRef.AppDataSource = AppDataSource;
    console.log('[DataSource] DataSource re-initialized with all models successfully.');
  }

  return AppDataSource;
}
