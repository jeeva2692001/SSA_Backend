import { CompanyRepository } from '../repositories/company.repository';
import { CompanyModel } from '../models/company.model';
import bcrypt from 'bcryptjs';

export class CompanyService {
  private companyRepository: CompanyRepository;

  constructor() {
    this.companyRepository = new CompanyRepository();
  }

  async getAllCompanies(): Promise<CompanyModel[]> {
    return await this.companyRepository.findAll();
  }

  async registerCompany(companyData: Partial<CompanyModel>): Promise<CompanyModel> {
    if (!companyData.name || !companyData.email || !companyData.address || !companyData.contactPerson || !companyData.mobileNumber || !companyData.password) {
      throw new Error('Missing required company fields.');
    }

    const existingEmail = await this.companyRepository.findByEmail(companyData.email);
    if (existingEmail) {
      throw new Error('Company email is already registered.');
    }

    const existingContactPerson = await this.companyRepository.findByContactPerson(companyData.contactPerson);
    if (existingContactPerson) {
      throw new Error('Contact person name (username) is already registered.');
    }

    // Generate unique companyId (COM-00X)
    const count = await this.companyRepository.countCompanies();
    const companyId = `COM-${String(count + 1).padStart(3, '0')}`;
    
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(companyData.password, 10);
    
    companyData.companyId = companyId;
    companyData.password = hashedPassword;
    return await this.companyRepository.createCompany(companyData);
  }

  async updateCompany(companyId: string, companyData: Partial<CompanyModel>): Promise<CompanyModel> {
    const company = await this.companyRepository.findByCompanyId(companyId);
    if (!company) {
      throw new Error('Company not found.');
    }

    if (companyData.name) company.name = companyData.name;
    if (companyData.address) company.address = companyData.address;
    if (companyData.email) {
      const existing = await this.companyRepository.findByEmail(companyData.email);
      if (existing && existing.companyId !== companyId) {
        throw new Error('Company email is already registered.');
      }
      company.email = companyData.email;
    }
    if (companyData.contactPerson) {
      const existing = await this.companyRepository.findByContactPerson(companyData.contactPerson);
      if (existing && existing.companyId !== companyId) {
        throw new Error('Contact person name (username) is already registered.');
      }
      company.contactPerson = companyData.contactPerson;
    }
    if (companyData.mobileNumber) company.mobileNumber = companyData.mobileNumber;
    if (companyData.designation !== undefined) company.designation = companyData.designation;
    if (companyData.gstNo !== undefined) company.gstNo = companyData.gstNo;
    if (companyData.panNo !== undefined) company.panNo = companyData.panNo;
    if (companyData.status) company.status = companyData.status;

    if (companyData.password) {
      const hashedPassword = await bcrypt.hash(companyData.password, 10);
      company.password = hashedPassword;
    }

    return await this.companyRepository.createCompany(company);
  }

  async deleteCompany(companyId: string): Promise<boolean> {
    return await this.companyRepository.deleteByCompanyId(companyId);
  }
}
