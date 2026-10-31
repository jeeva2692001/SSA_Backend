import { EquipmentRepository, EquipmentFilterOptions } from '../repositories/equipment.repository';
import { ResourceAllocationRepository, AllocationFilterOptions } from '../repositories/resource-allocation.repository';
import { EquipmentModel } from '../models/equipment.model';
import { ResourceAllocationModel } from '../models/resource-allocation.model';
import { getDataSource } from '../../../shared/config/data-source';
import { EmployeeModel } from '../../employee/models/employee.model';

export interface AvailabilityMemberSummary {
  employeeId: string;
  name: string;
  department?: string;
  designation?: string;
  avatar?: string;
  totalAllocatedHours: number;
  totalAllocationPercentage: number;
  availablePercentage: number;
  availableHours: number;
  status: 'Available' | 'Optimal' | 'Overloaded';
  currentAllocations: {
    allocationId: string;
    projectId?: string;
    projectCode?: string;
    projectName: string;
    percentage: number;
    hours: number;
  }[];
}

export interface EquipmentAvailabilitySummary {
  id: string;
  equipmentCode: string;
  name: string;
  category: string;
  status: string;
  condition: string;
  assignedProjectCode?: string;
  assignedProjectName?: string;
  location?: string;
  dailyCostRate: number;
}

export interface AvailabilityReport {
  overview: {
    totalEmployees: number;
    availableEmployeesCount: number;
    partiallyAllocatedEmployeesCount: number;
    fullyAllocatedEmployeesCount: number;
    overloadedEmployeesCount: number;
    averageLoadFactor: number;
    totalAllocatedHours: number;
    totalCapacityHours: number;
    totalEquipment: number;
    availableEquipmentCount: number;
    inUseEquipmentCount: number;
    maintenanceEquipmentCount: number;
  };
  teamAvailability: AvailabilityMemberSummary[];
  equipmentAvailability: EquipmentAvailabilitySummary[];
}

export class ResourceService {
  private equipmentRepo: EquipmentRepository;
  private allocRepo: ResourceAllocationRepository;

  constructor() {
    this.equipmentRepo = new EquipmentRepository();
    this.allocRepo = new ResourceAllocationRepository();
  }

  // ==========================================
  // EQUIPMENT TRACKING OPERATIONS
  // ==========================================

  async getAllEquipment(
    context: { companyId?: string; branchId?: string | null; role?: string },
    options: { search?: string; category?: string; status?: string; assignedProjectId?: string } = {}
  ): Promise<EquipmentModel[]> {
    const companyId = context.companyId || 'COM-001';
    const filterOptions: EquipmentFilterOptions = {
      companyId: context.role === 'Super Admin' ? undefined : companyId,
      branchId: context.branchId ? context.branchId : undefined,
      search: options.search,
      category: options.category,
      status: options.status,
      assignedProjectId: options.assignedProjectId
    };

    return await this.equipmentRepo.findAll(filterOptions);
  }

  async getEquipmentById(idOrCode: string): Promise<EquipmentModel | null> {
    return await this.equipmentRepo.findByIdOrCode(idOrCode);
  }

  async createEquipment(
    data: Partial<EquipmentModel>,
    context: { companyId?: string; branchId?: string | null }
  ): Promise<EquipmentModel> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Equipment name is required.');
    }

    const companyId = context.companyId || 'COM-001';
    const equipmentCode = data.equipmentCode?.trim() || (await this.equipmentRepo.getNextEquipmentCode(companyId));

    return await this.equipmentRepo.create({
      ...data,
      equipmentCode,
      companyId,
      branchId: data.branchId ?? context.branchId ?? null,
      status: data.status || 'Available',
      condition: data.condition || 'Excellent',
      dailyCostRate: Number(data.dailyCostRate) || 0
    });
  }

  async updateEquipment(
    idOrCode: string,
    data: Partial<EquipmentModel>,
    _context: { companyId?: string }
  ): Promise<EquipmentModel | null> {
    return await this.equipmentRepo.update(idOrCode, data);
  }

  async deleteEquipment(idOrCode: string): Promise<boolean> {
    return await this.equipmentRepo.delete(idOrCode);
  }

  // ==========================================
  // RESOURCE ALLOCATION OPERATIONS
  // ==========================================

  async getAllAllocations(
    context: { companyId?: string; branchId?: string | null; role?: string },
    options: {
      search?: string;
      resourceType?: string;
      projectId?: string;
      projectCode?: string;
      resourceId?: string;
      status?: string;
    } = {}
  ): Promise<ResourceAllocationModel[]> {
    const companyId = context.companyId || 'COM-001';
    const filterOptions: AllocationFilterOptions = {
      companyId: context.role === 'Super Admin' ? undefined : companyId,
      branchId: context.branchId ? context.branchId : undefined,
      search: options.search,
      resourceType: options.resourceType,
      projectId: options.projectId,
      projectCode: options.projectCode,
      resourceId: options.resourceId,
      status: options.status
    };

    return await this.allocRepo.findAll(filterOptions);
  }

  async getAllocationById(idOrCode: string): Promise<ResourceAllocationModel | null> {
    return await this.allocRepo.findByIdOrCode(idOrCode);
  }

  async createAllocation(
    data: Partial<ResourceAllocationModel>,
    context: { companyId?: string; branchId?: string | null; userId?: string }
  ): Promise<ResourceAllocationModel> {
    if (!data.resourceName || !data.resourceName.trim()) {
      throw new Error('Resource name is required.');
    }
    if (!data.projectName || !data.projectName.trim()) {
      throw new Error('Project name is required.');
    }

    const companyId = context.companyId || 'COM-001';
    const allocationCode = data.allocationCode?.trim() || (await this.allocRepo.getNextAllocationCode(companyId));

    const allocation = await this.allocRepo.create({
      ...data,
      allocationCode,
      companyId,
      branchId: data.branchId ?? context.branchId ?? null,
      allocationPercentage: Number(data.allocationPercentage) || 100,
      weeklyHours: Number(data.weeklyHours) || 40,
      budgetAllocation: Number(data.budgetAllocation) || 0,
      costRate: Number(data.costRate) || 0,
      status: data.status || 'Active',
      createdBy: context.userId
    });

    // If allocating equipment, auto-sync equipment status to 'In Use'
    if (data.resourceType === 'Equipment' && data.resourceId) {
      try {
        await this.equipmentRepo.update(data.resourceId, {
          status: 'In Use',
          assignedProjectId: data.projectId,
          assignedProjectCode: data.projectCode,
          assignedProjectName: data.projectName
        });
      } catch (err) {
        console.warn('[ResourceService] Could not sync equipment status:', err);
      }
    }

    return allocation;
  }

  async updateAllocation(
    idOrCode: string,
    data: Partial<ResourceAllocationModel>,
    _context: { companyId?: string }
  ): Promise<ResourceAllocationModel | null> {
    const updated = await this.allocRepo.update(idOrCode, data);

    // If equipment allocation changed status to Completed, release equipment
    if (updated && updated.resourceType === 'Equipment' && data.status === 'Completed' && updated.resourceId) {
      try {
        await this.equipmentRepo.update(updated.resourceId, {
          status: 'Available',
          assignedProjectId: undefined,
          assignedProjectCode: undefined,
          assignedProjectName: undefined
        });
      } catch (err) {
        console.warn('[ResourceService] Could not release equipment:', err);
      }
    }

    return updated;
  }

  async deleteAllocation(idOrCode: string): Promise<boolean> {
    const alloc = await this.allocRepo.findByIdOrCode(idOrCode);
    if (!alloc) return false;

    // Release equipment if it was assigned
    if (alloc.resourceType === 'Equipment' && alloc.resourceId) {
      try {
        await this.equipmentRepo.update(alloc.resourceId, {
          status: 'Available',
          assignedProjectId: undefined,
          assignedProjectCode: undefined,
          assignedProjectName: undefined
        });
      } catch (err) {
        console.warn('[ResourceService] Could not release equipment on delete:', err);
      }
    }

    return await this.allocRepo.delete(idOrCode);
  }

  // ==========================================
  // AVAILABILITY TRACKING & INSIGHTS
  // ==========================================

  async getAvailabilityReport(
    context: { companyId?: string; branchId?: string | null; role?: string }
  ): Promise<AvailabilityReport> {
    const companyId = context.companyId || 'COM-001';

    // 1. Fetch active employees
    const dataSource = await getDataSource();
    let employees: EmployeeModel[] = [];
    try {
      const empRepo = dataSource.getRepository(EmployeeModel);
      employees = await empRepo.find({
        where: context.role === 'Super Admin' ? {} : { companyId },
        order: { name: 'ASC' }
      });
    } catch (err) {
      console.warn('[ResourceService] Failed to load employees for availability:', err);
    }

    // 2. Fetch active allocations
    const activeAllocations = await this.allocRepo.findAll({
      companyId: context.role === 'Super Admin' ? undefined : companyId,
      status: 'Active'
    });

    // 3. Fetch equipment
    const allEquipment = await this.equipmentRepo.findAll({
      companyId: context.role === 'Super Admin' ? undefined : companyId
    });

    // 4. Map employee availability
    const teamAvailability: AvailabilityMemberSummary[] = employees.map((emp) => {
      // Find allocations matching this employee by ID or name
      const empAllocations = activeAllocations.filter(
        (a) =>
          a.resourceType === 'Human' &&
          (a.resourceId === emp.employeeId ||
           a.resourceId === String(emp.id) ||
           a.resourceName.toLowerCase().trim() === emp.name.toLowerCase().trim())
      );

      const totalAllocatedHours = empAllocations.reduce((sum, a) => sum + (Number(a.weeklyHours) || 0), 0);
      const totalAllocationPercentage = empAllocations.reduce(
        (sum, a) => sum + (Number(a.allocationPercentage) || 0),
        0
      );

      const availablePercentage = Math.max(0, 100 - totalAllocationPercentage);
      const availableHours = Math.max(0, 40 - totalAllocatedHours);

      let status: 'Available' | 'Optimal' | 'Overloaded' = 'Available';
      if (totalAllocationPercentage > 100 || totalAllocatedHours > 40) {
        status = 'Overloaded';
      } else if (totalAllocationPercentage >= 80) {
        status = 'Optimal';
      } else {
        status = 'Available';
      }

      return {
        employeeId: emp.employeeId || String(emp.id),
        name: emp.name,
        department: emp.department || 'General',
        designation: emp.designation || 'Staff',
        totalAllocatedHours,
        totalAllocationPercentage,
        availablePercentage,
        availableHours,
        status,
        currentAllocations: empAllocations.map((a) => ({
          allocationId: a.allocationCode || a.id,
          projectId: a.projectId,
          projectCode: a.projectCode,
          projectName: a.projectName,
          percentage: Number(a.allocationPercentage) || 0,
          hours: Number(a.weeklyHours) || 0
        }))
      };
    });

    // 5. Map equipment availability
    const equipmentAvailability: EquipmentAvailabilitySummary[] = allEquipment.map((eq) => ({
      id: eq.id,
      equipmentCode: eq.equipmentCode,
      name: eq.name,
      category: eq.category,
      status: eq.status,
      condition: eq.condition,
      assignedProjectCode: eq.assignedProjectCode,
      assignedProjectName: eq.assignedProjectName,
      location: eq.location,
      dailyCostRate: Number(eq.dailyCostRate) || 0
    }));

    // 6. Aggregate metrics
    const totalEmployees = teamAvailability.length;
    const availableEmployeesCount = teamAvailability.filter((m) => m.status === 'Available').length;
    const fullyAllocatedEmployeesCount = teamAvailability.filter((m) => m.status === 'Optimal').length;
    const overloadedEmployeesCount = teamAvailability.filter((m) => m.status === 'Overloaded').length;
    const partiallyAllocatedEmployeesCount = teamAvailability.filter(
      (m) => m.status === 'Available' && m.totalAllocationPercentage > 0
    ).length;

    const totalAllocatedHours = teamAvailability.reduce((sum, m) => sum + m.totalAllocatedHours, 0);
    const totalCapacityHours = totalEmployees * 40;
    const averageLoadFactor = totalEmployees > 0
      ? Math.round(teamAvailability.reduce((sum, m) => sum + m.totalAllocationPercentage, 0) / totalEmployees)
      : 0;

    const totalEquipment = equipmentAvailability.length;
    const availableEquipmentCount = equipmentAvailability.filter((e) => e.status === 'Available').length;
    const inUseEquipmentCount = equipmentAvailability.filter((e) => e.status === 'In Use').length;
    const maintenanceEquipmentCount = equipmentAvailability.filter((e) => e.status === 'Under Maintenance').length;

    return {
      overview: {
        totalEmployees,
        availableEmployeesCount,
        partiallyAllocatedEmployeesCount,
        fullyAllocatedEmployeesCount,
        overloadedEmployeesCount,
        averageLoadFactor,
        totalAllocatedHours,
        totalCapacityHours,
        totalEquipment,
        availableEquipmentCount,
        inUseEquipmentCount,
        maintenanceEquipmentCount
      },
      teamAvailability,
      equipmentAvailability
    };
  }
}
