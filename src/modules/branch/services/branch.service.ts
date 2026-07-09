import { BranchRepository } from '../repositories/branch.repository';
import { BranchModel } from '../models/branch.model';

export class BranchService {
  private branchRepository: BranchRepository;

  constructor() {
    this.branchRepository = new BranchRepository();
  }

  async getBranches(companyId: string): Promise<BranchModel[]> {
    return await this.branchRepository.findAllByCompanyId(companyId);
  }

  async addBranch(companyId: string, branchData: Partial<BranchModel>): Promise<BranchModel> {
    if (!branchData.name || !branchData.code || !branchData.manager || !branchData.address || !branchData.phone) {
      throw new Error('Missing required branch fields. (name, code, manager, address, phone are required)');
    }

    // Ensure branch code is unique within the company
    const existing = await this.branchRepository.findByCodeAndCompanyId(branchData.code, companyId);
    if (existing) {
      throw new Error('Branch code is already registered for this company.');
    }

    // Sequential BRN-XXX generation based on count
    const count = await this.branchRepository.countBranchesByCompanyId(companyId);
    const branchId = `BRN-${String(count + 1).padStart(3, '0')}`;

    branchData.branchId = branchId;
    branchData.companyId = companyId;

    return await this.branchRepository.createBranch(branchData);
  }

  async updateBranch(branchId: string, companyId: string, branchData: Partial<BranchModel>): Promise<BranchModel> {
    const branch = await this.branchRepository.findByBranchId(branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new Error('Branch not found.');
    }

    if (branchData.name) branch.name = branchData.name;
    if (branchData.manager) branch.manager = branchData.manager;
    if (branchData.address) branch.address = branchData.address;
    if (branchData.phone) branch.phone = branchData.phone;
    if (branchData.status) branch.status = branchData.status;

    if (branchData.code) {
      const existing = await this.branchRepository.findByCodeAndCompanyId(branchData.code, companyId);
      if (existing && existing.branchId !== branchId) {
        throw new Error('Branch code is already registered for this company.');
      }
      branch.code = branchData.code;
    }

    return await this.branchRepository.createBranch(branch);
  }

  async deleteBranch(branchId: string, companyId: string): Promise<boolean> {
    const branch = await this.branchRepository.findByBranchId(branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new Error('Branch not found.');
    }
    return await this.branchRepository.deleteByBranchId(branchId, companyId);
  }
}
