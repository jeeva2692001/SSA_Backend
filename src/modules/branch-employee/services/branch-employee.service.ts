import { BranchEmployeeRepository } from '../repositories/branch-employee.repository';
import { BranchEmployeeModel } from '../models/branch-employee.model';
import { BranchRepository } from '../../branch/repositories/branch.repository';

export class BranchEmployeeService {
  private branchEmployeeRepository: BranchEmployeeRepository;
  private branchRepository: BranchRepository;

  constructor() {
    this.branchEmployeeRepository = new BranchEmployeeRepository();
    this.branchRepository = new BranchRepository();
  }

  async getEmployees(companyId: string, branchId?: string): Promise<BranchEmployeeModel[]> {
    if (branchId) {
      return await this.branchEmployeeRepository.findAllByBranchId(branchId, companyId);
    }
    return await this.branchEmployeeRepository.findAllByCompanyId(companyId);
  }

  async addEmployee(companyId: string, employeeData: Partial<BranchEmployeeModel>): Promise<BranchEmployeeModel> {
    if (!employeeData.name || !employeeData.email || !employeeData.phone || !employeeData.department || !employeeData.designation || !employeeData.joiningDate || !employeeData.branchId) {
      throw new Error('Missing required branch employee fields. (name, email, phone, department, designation, joiningDate, and branchId are required)');
    }

    // Verify branch exists and belongs to this company
    const branch = await this.branchRepository.findByBranchId(employeeData.branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new Error('Invalid branch specified. The branch does not exist or does not belong to your company.');
    }

    // Ensure email is unique within the company
    const existing = await this.branchEmployeeRepository.findByEmailAndCompanyId(employeeData.email, companyId);
    if (existing) {
      throw new Error('Employee email is already registered for this company.');
    }

    // Sequential BEMP-XXX generation based on count
    const count = await this.branchEmployeeRepository.countEmployeesByCompanyId(companyId);
    const employeeId = `BEMP-${String(count + 1).padStart(3, '0')}`;

    employeeData.employeeId = employeeId;
    employeeData.companyId = companyId;

    return await this.branchEmployeeRepository.createEmployee(employeeData);
  }

  async updateEmployee(employeeId: string, companyId: string, employeeData: Partial<BranchEmployeeModel>): Promise<BranchEmployeeModel> {
    const employee = await this.branchEmployeeRepository.findByEmployeeId(employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error('Branch employee not found.');
    }

    if (employeeData.name) employee.name = employeeData.name;
    if (employeeData.phone) employee.phone = employeeData.phone;
    if (employeeData.department) employee.department = employeeData.department;
    if (employeeData.designation) employee.designation = employeeData.designation;
    if (employeeData.manager !== undefined) employee.manager = employeeData.manager;
    if (employeeData.joiningDate) employee.joiningDate = employeeData.joiningDate;
    if (employeeData.status) employee.status = employeeData.status;

    if (employeeData.branchId) {
      // Verify new branch exists and belongs to this company
      const branch = await this.branchRepository.findByBranchId(employeeData.branchId);
      if (!branch || branch.companyId !== companyId) {
        throw new Error('Invalid branch specified. The branch does not exist or does not belong to your company.');
      }
      employee.branchId = employeeData.branchId;
    }

    if (employeeData.email) {
      const existing = await this.branchEmployeeRepository.findByEmailAndCompanyId(employeeData.email, companyId);
      if (existing && existing.employeeId !== employeeId) {
        throw new Error('Employee email is already registered for this company.');
      }
      employee.email = employeeData.email;
    }

    return await this.branchEmployeeRepository.createEmployee(employee);
  }

  async deleteEmployee(employeeId: string, companyId: string): Promise<boolean> {
    const employee = await this.branchEmployeeRepository.findByEmployeeId(employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error('Branch employee not found.');
    }
    return await this.branchEmployeeRepository.deleteByEmployeeId(employeeId, companyId);
  }
}
