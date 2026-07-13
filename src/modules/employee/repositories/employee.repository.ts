import { getDataSource } from '../../../shared/config/data-source';
import { EmployeeModel } from '../models/employee.model';
import { Repository } from 'typeorm';

export class EmployeeRepository {
  private async getRepository(): Promise<Repository<EmployeeModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository('EmployeeModel');
  }

  async findAllByCompanyId(companyId: string): Promise<EmployeeModel[]> {
    const repo = await this.getRepository();
    return await repo.find({ where: { companyId }, order: { id: 'ASC' } });
  }

  async findByEmployeeId(employeeId: string): Promise<EmployeeModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { employeeId } });
  }

  async findByEmailAndCompanyId(email: string, companyId: string): Promise<EmployeeModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { email, companyId } });
  }

  async createEmployee(employeeData: Partial<EmployeeModel>): Promise<EmployeeModel> {
    const repo = await this.getRepository();
    const employee = repo.create(employeeData);
    return await repo.save(employee);
  }

  async countEmployeesByCompanyId(companyId: string): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count({ where: { companyId } });
  }

  async deleteByEmployeeId(employeeId: string): Promise<boolean> {
    const repo = await this.getRepository();
    const result = await repo.delete({ employeeId });
    return (result.affected ?? 0) > 0;
  }

  async findAllByBranchId(branchId: string): Promise<EmployeeModel[]> {
    const repo = await this.getRepository();
    return await repo.find({ where: { branchId }, order: { id: 'ASC' } });
  }

  async countEmployeesByBranchId(branchId: string): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count({ where: { branchId } });
  }
}
