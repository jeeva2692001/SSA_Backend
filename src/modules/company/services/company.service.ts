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
    if (!companyData.name || !companyData.email || !companyData.address || !companyData.contactPerson || !companyData.mobileNumber || !companyData.password || !companyData.gstNo || !companyData.panNo) {
      throw new Error('Missing required company fields.');
    }

    const trimmedName = companyData.name.trim();
    if (!trimmedName) {
      throw new Error('Company name is required.');
    }
    if (trimmedName.length < 3) {
      throw new Error('Company name must be at least 3 characters.');
    }
    if (trimmedName.length > 30) {
      throw new Error('Company name cannot exceed 30 characters.');
    }
    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      throw new Error('Company name cannot contain only special characters.');
    }
    if (/^\d+$/.test(trimmedName.replace(/\s+/g, ''))) {
      throw new Error('Company name cannot contain only numeric characters.');
    }
    if (!/[a-zA-Z]/.test(trimmedName)) {
      throw new Error('Company name must contain at least one letter.');
    }

    const trimmedAddress = companyData.address.trim();
    if (!trimmedAddress) {
      throw new Error('Company address is required.');
    }
    if (trimmedAddress.length < 5) {
      throw new Error('Address must be at least 5 characters.');
    }
    if (trimmedAddress.length > 250) {
      throw new Error('Address cannot exceed 250 characters.');
    }
    if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
      throw new Error('Company address cannot contain only special characters.');
    }
    if (/^\d+$/.test(trimmedAddress.replace(/[\s,.-]/g, ''))) {
      throw new Error('Company address cannot contain only numeric characters.');
    }
    if (!/[a-zA-Z]/.test(trimmedAddress)) {
      throw new Error('Company address must contain valid alphabetic characters.');
    }

    const trimmedContact = companyData.contactPerson.trim();
    if (!trimmedContact) {
      throw new Error('Contact person name is required.');
    }
    if (trimmedContact.length < 3) {
      throw new Error('Contact person name must be at least 3 characters.');
    }
    if (trimmedContact.length > 30) {
      throw new Error('Contact person name cannot exceed 30 characters.');
    }
    if (!/[a-zA-Z0-9]/.test(trimmedContact)) {
      throw new Error('Contact person name cannot contain only special characters.');
    }
    if (/^\d+$/.test(trimmedContact.replace(/\s+/g, ''))) {
      throw new Error('Contact person name cannot contain only numeric characters.');
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(trimmedContact) || !/[a-zA-Z]/.test(trimmedContact)) {
      throw new Error('Contact person name must contain valid alphabetic characters.');
    }

    if (companyData.mobileNumber) {
      const parts = companyData.mobileNumber.trim().split(' ');
      const cc = parts.length > 1 ? parts[0] : '+91';
      const num = parts.length > 1 ? parts.slice(1).join('') : parts[0];
      const cleaned = num.replace(/\D/g, '');
      if (cc === '+91') {
        if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
          throw new Error('Indian mobile number must be 10 digits and start with 6, 7, 8, or 9.');
        }
      } else if (cleaned.length < 7 || cleaned.length > 15) {
        throw new Error('Mobile number must be between 7 and 15 digits.');
      }
    }

    if (companyData.designation) {
      const trimmedDesig = companyData.designation.trim();
      if (trimmedDesig) {
        if (trimmedDesig.length < 2) {
          throw new Error('Designation must be at least 2 characters.');
        }
        if (trimmedDesig.length > 30) {
          throw new Error('Designation cannot exceed 30 characters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedDesig)) {
          throw new Error('Designation cannot contain only special characters.');
        }
        if (/^\d+$/.test(trimmedDesig.replace(/\s+/g, ''))) {
          throw new Error('Designation cannot contain only numeric characters.');
        }
        if (!/[a-zA-Z]/.test(trimmedDesig)) {
          throw new Error('Designation must contain valid alphabetic characters.');
        }
      }
    }

    if (!companyData.password) {
      throw new Error('Password is required.');
    }
    if (companyData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (companyData.password.length > 20) {
      throw new Error('Password cannot exceed 20 characters.');
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
    const companyId = await this.companyRepository.getNextCompanyId();

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(companyData.password, 10);

    companyData.companyId = companyId;
    companyData.password = hashedPassword;
    companyData.isFirstLogin = true;
    return await this.companyRepository.createCompany(companyData);
  }

  async updateCompany(companyId: string, companyData: Partial<CompanyModel>): Promise<CompanyModel> {
    const company = await this.companyRepository.findByCompanyId(companyId);
    if (!company) {
      throw new Error('Company not found.');
    }

    if (companyData.name !== undefined) {
      const trimmedName = companyData.name.trim();
      if (!trimmedName) {
        throw new Error('Company name is required.');
      }
      if (trimmedName.length < 3) {
        throw new Error('Company name must be at least 3 characters.');
      }
      if (trimmedName.length > 30) {
        throw new Error('Company name cannot exceed 30 characters.');
      }
      if (!/[a-zA-Z0-9]/.test(trimmedName)) {
        throw new Error('Company name cannot contain only special characters.');
      }
      if (/^\d+$/.test(trimmedName.replace(/\s+/g, ''))) {
        throw new Error('Company name cannot contain only numeric characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedName)) {
        throw new Error('Company name must contain at least one letter.');
      }
      company.name = companyData.name;
    }
    if (companyData.address !== undefined) {
      const trimmedAddress = companyData.address.trim();
      if (!trimmedAddress) {
        throw new Error('Company address is required.');
      }
      if (trimmedAddress.length < 5) {
        throw new Error('Address must be at least 5 characters.');
      }
      if (trimmedAddress.length > 250) {
        throw new Error('Address cannot exceed 250 characters.');
      }
      if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
        throw new Error('Company address cannot contain only special characters.');
      }
      if (/^\d+$/.test(trimmedAddress.replace(/[\s,.-]/g, ''))) {
        throw new Error('Company address cannot contain only numeric characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedAddress)) {
        throw new Error('Company address must contain valid alphabetic characters.');
      }
      company.address = companyData.address;
    }
    if (companyData.email) {
      const existing = await this.companyRepository.findByEmail(companyData.email);
      if (existing && existing.companyId !== companyId) {
        throw new Error('Company email is already registered.');
      }
      company.email = companyData.email;
    }
    if (companyData.contactPerson !== undefined) {
      const trimmedContact = companyData.contactPerson.trim();
      if (!trimmedContact) {
        throw new Error('Contact person name is required.');
      }
      if (trimmedContact.length < 3) {
        throw new Error('Contact person name must be at least 3 characters.');
      }
      if (trimmedContact.length > 30) {
        throw new Error('Contact person name cannot exceed 30 characters.');
      }
      if (!/[a-zA-Z0-9]/.test(trimmedContact)) {
        throw new Error('Contact person name cannot contain only special characters.');
      }
      if (/^\d+$/.test(trimmedContact.replace(/\s+/g, ''))) {
        throw new Error('Contact person name cannot contain only numeric characters.');
      }
      if (!/^[a-zA-Z\s.'-]+$/.test(trimmedContact) || !/[a-zA-Z]/.test(trimmedContact)) {
        throw new Error('Contact person name must contain valid alphabetic characters.');
      }
      const existing = await this.companyRepository.findByContactPerson(companyData.contactPerson);
      if (existing && existing.companyId !== companyId) {
        throw new Error('Contact person name (username) is already registered.');
      }
      company.contactPerson = companyData.contactPerson;
    }
    if (companyData.mobileNumber !== undefined) {
      const parts = companyData.mobileNumber.trim().split(' ');
      const cc = parts.length > 1 ? parts[0] : '+91';
      const num = parts.length > 1 ? parts.slice(1).join('') : parts[0];
      const cleaned = num.replace(/\D/g, '');
      if (cc === '+91') {
        if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
          throw new Error('Indian mobile number must be 10 digits and start with 6, 7, 8, or 9.');
        }
      } else if (cleaned.length < 7 || cleaned.length > 15) {
        throw new Error('Mobile number must be between 7 and 15 digits.');
      }
      company.mobileNumber = companyData.mobileNumber;
    }
    if (companyData.designation !== undefined) {
      const trimmedDesig = (companyData.designation || '').trim();
      if (trimmedDesig) {
        if (trimmedDesig.length < 2) {
          throw new Error('Designation must be at least 2 characters.');
        }
        if (trimmedDesig.length > 30) {
          throw new Error('Designation cannot exceed 30 characters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedDesig)) {
          throw new Error('Designation cannot contain only special characters.');
        }
        if (/^\d+$/.test(trimmedDesig.replace(/\s+/g, ''))) {
          throw new Error('Designation cannot contain only numeric characters.');
        }
        if (!/[a-zA-Z]/.test(trimmedDesig)) {
          throw new Error('Designation must contain valid alphabetic characters.');
        }
      }
      company.designation = companyData.designation;
    }
    if (companyData.gstNo !== undefined) {
      if (!companyData.gstNo.trim()) throw new Error('GST number is required.');
      company.gstNo = companyData.gstNo;
    }
    if (companyData.panNo !== undefined) {
      if (!companyData.panNo.trim()) throw new Error('PAN number is required.');
      company.panNo = companyData.panNo;
    }
    if (companyData.status) company.status = companyData.status;

    if (companyData.password) {
      if (companyData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      if (companyData.password.length > 20) {
        throw new Error('Password cannot exceed 20 characters.');
      }
      const hashedPassword = await bcrypt.hash(companyData.password, 10);
      company.password = hashedPassword;
    }

    return await this.companyRepository.createCompany(company);
  }

  async deleteCompany(companyId: string): Promise<boolean> {
    const company = await this.companyRepository.findByCompanyId(companyId);
    if (!company) {
      throw new Error('Company not found.');
    }
    company.status = 'Inactive';
    await this.companyRepository.createCompany(company);
    return true;
  }
}
