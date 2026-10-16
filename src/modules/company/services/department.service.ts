import { DepartmentRepository } from '../repositories/department.repository';
import { DepartmentModel } from '../models/department.model';
import { getDataSource } from '../../../shared/config/data-source';
import { EmployeeModel } from '../../employee/models/employee.model';
import { ILike } from 'typeorm';

export const INITIAL_DEPARTMENTS = [
  {
    departmentId: 'DEPT-001',
    name: 'Architectural Design',
    code: 'ARCH',
    head: 'Bhuvanasundar / Ponshankar',
    description: 'Architectural design, scheme development, 3D modeling, and conceptual drafting.',
    status: 'Active',
    companyId: 'COM-001',
  },
  {
    departmentId: 'DEPT-002',
    name: 'Design & Drafting',
    code: 'DND',
    head: 'Duraisamy / Umamageshwari',
    description: 'Detailed CAD drafting, drawing revisions, coordinated plans, and documentation.',
    status: 'Active',
    companyId: 'COM-001',
  },
  {
    departmentId: 'DEPT-003',
    name: 'Structural Design',
    code: 'STR',
    head: 'Suresh Kumar K',
    description: 'Structural engineering, load calculations, framing plans, and RCC detailing.',
    status: 'Active',
    companyId: 'COM-001',
  },
  {
    departmentId: 'DEPT-004',
    name: 'Project Management',
    code: 'PM',
    head: 'Suresh Kumar M / Pranesa Raja',
    description: 'Project management, scheduling, lead transitions, site coordination, and deliverables.',
    status: 'Active',
    companyId: 'COM-001',
  },
];

export class DepartmentService {
  private departmentRepository: DepartmentRepository;

  constructor() {
    this.departmentRepository = new DepartmentRepository();
  }

  async ensureSeeded(): Promise<void> {
    const count = await this.departmentRepository.count();
    if (count === 0) {
      console.log('[Department Seed] No departments found. Seeding initial departments...');
      for (const d of INITIAL_DEPARTMENTS) {
        await this.departmentRepository.create(d);
      }
      console.log(`[Department Seed] Successfully seeded ${INITIAL_DEPARTMENTS.length} departments.`);
    }
  }

  async getAllDepartments(companyId?: string): Promise<any[]> {
    await this.ensureSeeded();
    const depts = await this.departmentRepository.findAll(companyId);

    // Calculate dynamic employee count for each department
    try {
      const dataSource = await getDataSource();
      const employeeRepo = dataSource.getRepository(EmployeeModel);

      const result = await Promise.all(
        depts.map(async (dept) => {
          const empCount = await employeeRepo.count({
            where: { department: ILike(dept.name.trim()) },
          });
          return {
            id: dept.departmentId,
            departmentId: dept.departmentId,
            name: dept.name,
            code: dept.code,
            head: dept.head || 'Unassigned',
            description: dept.description || '',
            status: dept.status,
            companyId: dept.companyId,
            count: empCount,
            createdAt: dept.createdAt,
            updatedAt: dept.updatedAt,
          };
        })
      );
      return result;
    } catch {
      return depts.map((dept) => ({
        id: dept.departmentId,
        departmentId: dept.departmentId,
        name: dept.name,
        code: dept.code,
        head: dept.head || 'Unassigned',
        description: dept.description || '',
        status: dept.status,
        companyId: dept.companyId,
        count: 0,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt,
      }));
    }
  }

  async createDepartment(data: any, companyId: string = 'COM-001'): Promise<DepartmentModel> {
    const trimmedName = (data.name || '').trim();
    const trimmedCode = (data.code || '').trim().toUpperCase();

    if (!trimmedName) throw new Error('Department name is required.');
    if (!trimmedCode) throw new Error('Department code is required.');

    await this.ensureSeeded();

    const existingName = await this.departmentRepository.findByName(trimmedName, companyId);
    if (existingName) {
      throw new Error(`Department with name "${trimmedName}" already exists.`);
    }

    const existingCode = await this.departmentRepository.findByCode(trimmedCode, companyId);
    if (existingCode) {
      throw new Error(`Department with code "${trimmedCode}" already exists.`);
    }

    const departmentId = await this.departmentRepository.getNextDepartmentId();

    return await this.departmentRepository.create({
      departmentId,
      name: trimmedName,
      code: trimmedCode,
      head: (data.head || '').trim(),
      description: (data.description || '').trim(),
      status: data.status || 'Active',
      companyId: companyId || 'COM-001',
    });
  }

  async updateDepartment(departmentId: string, data: any): Promise<DepartmentModel> {
    if (!departmentId) throw new Error('Department ID is required.');
    await this.ensureSeeded();

    const dept = await this.departmentRepository.findByDepartmentId(departmentId);
    if (!dept) {
      throw new Error(`Department "${departmentId}" not found.`);
    }

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) throw new Error('Department name cannot be empty.');
      const existing = await this.departmentRepository.findByName(trimmedName, dept.companyId);
      if (existing && existing.departmentId !== dept.departmentId) {
        throw new Error(`Another department with name "${trimmedName}" already exists.`);
      }
      dept.name = trimmedName;
    }

    if (data.code !== undefined) {
      const trimmedCode = data.code.trim().toUpperCase();
      if (!trimmedCode) throw new Error('Department code cannot be empty.');
      const existing = await this.departmentRepository.findByCode(trimmedCode, dept.companyId);
      if (existing && existing.departmentId !== dept.departmentId) {
        throw new Error(`Another department with code "${trimmedCode}" already exists.`);
      }
      dept.code = trimmedCode;
    }

    if (data.head !== undefined) dept.head = data.head.trim();
    if (data.description !== undefined) dept.description = data.description.trim();
    if (data.status !== undefined) dept.status = data.status;

    return await this.departmentRepository.save(dept);
  }

  async deleteDepartment(departmentId: string): Promise<boolean> {
    if (!departmentId) throw new Error('Department ID is required.');
    await this.ensureSeeded();

    const dept = await this.departmentRepository.findByDepartmentId(departmentId);
    if (!dept) {
      throw new Error(`Department "${departmentId}" not found.`);
    }

    // Check if any active employee is using this department
    try {
      const dataSource = await getDataSource();
      const employeeRepo = dataSource.getRepository(EmployeeModel);
      const activeEmps = await employeeRepo.count({
        where: { department: ILike(dept.name.trim()), status: 'Active' },
      });
      if (activeEmps > 0) {
        throw new Error(
          `Cannot delete department "${dept.name}". There are ${activeEmps} active employee(s) assigned to this department.`
        );
      }
    } catch (err: any) {
      if (err.message.includes('Cannot delete department')) throw err;
    }

    return await this.departmentRepository.delete(dept.departmentId);
  }
}
