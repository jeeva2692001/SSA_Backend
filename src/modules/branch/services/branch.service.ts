import { BranchRepository } from '../repositories/branch.repository';
import { BranchModel } from '../models/branch.model';
import bcrypt from 'bcryptjs';

export class BranchService {
  private branchRepository: BranchRepository;

  constructor() {
    this.branchRepository = new BranchRepository();
  }

  async getBranches(companyId: string): Promise<BranchModel[]> {
    const branches = await this.branchRepository.findAllByCompanyId(companyId);
    branches.forEach(b => delete b.password);
    return branches;
  }

  async addBranch(companyId: string, branchData: Partial<BranchModel>): Promise<BranchModel> {
    const name = branchData.name?.trim();
    const code = branchData.code?.trim().toUpperCase();
    const manager = branchData.manager?.trim();
    const address = branchData.address?.trim();
    const phone = branchData.phone?.trim();

    if (!name || !code || !manager || !address || !phone) {
      throw new Error('Missing required branch fields. (name, code, manager, address, phone are required)');
    }

    if (!/[a-zA-Z0-9]/.test(address)) {
      throw new Error('Address must contain alphanumeric characters.');
    }
    if (!/^[a-zA-Z0-9\s,./#:()'&_–—-]*$/.test(address)) {
      throw new Error('Address contains invalid special characters.');
    }

    // Ensure branch name is unique within the company
    const existingName = await this.branchRepository.findByNameAndCompanyId(name, companyId);
    if (existingName) {
      throw new Error('A branch or division with this name is already registered for this company.');
    }

    // Ensure branch code is unique within the company
    const existing = await this.branchRepository.findByCodeAndCompanyId(code, companyId);
    if (existing) {
      throw new Error('Branch code is already registered for this company.');
    }

    // Sequential BRN-XXX generation based on max suffix
    const branchId = await this.branchRepository.getNextBranchId();

    const dataToSave: Partial<BranchModel> = {
      ...branchData,
      name,
      code,
      manager,
      address,
      phone,
      branchId,
      companyId,
      isFirstLogin: true,
    };

    if (branchData.password) {
      dataToSave.password = await bcrypt.hash(branchData.password.trim(), 10);
    } else {
      dataToSave.password = await bcrypt.hash('Branch@123', 10);
    }

    const savedBranch = await this.branchRepository.createBranch(dataToSave);
    delete savedBranch.password;
    return savedBranch;
  }

  async updateBranch(branchId: string, companyId: string, branchData: Partial<BranchModel>): Promise<BranchModel> {
    const branch = await this.branchRepository.findByBranchId(branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new Error('Branch not found.');
    }

    if (branchData.name !== undefined) {
      const trimmedName = branchData.name.trim();
      if (!trimmedName) throw new Error('Branch name cannot be empty.');
      const existingName = await this.branchRepository.findByNameAndCompanyId(trimmedName, companyId);
      if (existingName && existingName.branchId !== branchId) {
        throw new Error('A branch or division with this name is already registered for this company.');
      }
      branch.name = trimmedName;
    }

    if (branchData.manager !== undefined) {
      branch.manager = branchData.manager.trim();
    }

    if (branchData.address !== undefined) {
      const trimmedAddress = branchData.address.trim();
      if (!trimmedAddress) throw new Error('Address cannot be empty.');
      if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
        throw new Error('Address must contain alphanumeric characters.');
      }
      if (!/^[a-zA-Z0-9\s,./#:()'&_–—-]*$/.test(trimmedAddress)) {
        throw new Error('Address contains invalid special characters.');
      }
      branch.address = trimmedAddress;
    }

    if (branchData.phone !== undefined) {
      branch.phone = branchData.phone.trim();
    }

    if (branchData.password) {
      const trimmedPassword = branchData.password.trim();
      if (branch.password) {
        const isSamePassword = await bcrypt.compare(trimmedPassword, branch.password);
        if (isSamePassword) {
          throw new Error('New password must be different from the existing password.');
        }
      }
      branch.password = await bcrypt.hash(trimmedPassword, 10);
    }

    if (branchData.code !== undefined) {
      const trimmedCode = branchData.code.trim().toUpperCase();
      if (!trimmedCode) throw new Error('Branch code cannot be empty.');
      const existing = await this.branchRepository.findByCodeAndCompanyId(trimmedCode, companyId);
      if (existing && existing.branchId !== branchId) {
        throw new Error('Branch code is already registered for this company.');
      }
      branch.code = trimmedCode;
    }

    const savedBranch = await this.branchRepository.createBranch(branch);
    delete savedBranch.password;
    return savedBranch;
  }

  async deleteBranch(branchId: string, companyId: string): Promise<boolean> {
    const branch = await this.branchRepository.findByBranchId(branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new Error('Branch not found.');
    }
    return await this.branchRepository.deleteByBranchId(branchId, companyId);
  }

  async isExistingPassword(branchId: string, companyId: string, password: string): Promise<boolean> {
    const branch = await this.branchRepository.findByBranchId(branchId);
    if (!branch || branch.companyId !== companyId) {
      return false;
    }
    if (!branch.password) {
      return false;
    }
    return await bcrypt.compare(password.trim(), branch.password);
  }
}
