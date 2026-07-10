import { getDataSource } from '../../../shared/config/data-source';
import { BranchEmployeeModel } from '../models/branch-employee.model';
import { Repository } from 'typeorm';

export class BranchEmployeeRepository {
  private async getRepository(): Promise<Repository<BranchEmployeeModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository('BranchEmployeeModel');
  }

  async findAllByCompanyId(companyId: string): Promise<BranchEmployeeModel[]> {
    const repo = await this.getRepository();
    return await repo.find({ where: { companyId }, order: { id: 'ASC' } });
  }

  async findAllByBranchId(branchId: string, companyId: string): Promise<BranchEmployeeModel[]> {
    const repo = await this.getRepository();
    return await repo.find({ where: { branchId, companyId }, order: { id: 'ASC' } });
  }

  async findByEmployeeId(employeeId: string): Promise<BranchEmployeeModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { employeeId } });
  }

  async findByEmailAndCompanyId(email: string, companyId: string): Promise<BranchEmployeeModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { email, companyId } });
  }

  async createEmployee(employeeData: Partial<BranchEmployeeModel>): Promise<BranchEmployeeModel> {
    const repo = await this.getRepository();
    const employee = repo.create(employeeData);
    return await repo.save(employee);
  }

  async countEmployeesByCompanyId(companyId: string): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count({ where: { companyId } });
  }

  async deleteByEmployeeId(employeeId: string, companyId: string): Promise<boolean> {
    const repo = await this.getRepository();
    const result = await repo.delete({ employeeId, companyId });
    return (result.affected ?? 0) > 0;
  }
}
