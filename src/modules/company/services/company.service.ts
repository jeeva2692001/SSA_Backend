import { CompanyRepository } from '../repositories/company.repository';
import { CompanyModel } from '../models/company.model';
import { UserRepository } from '../../auth/repositories/user.repository';
import { emailService } from '../../../shared/services/email.service';
import bcrypt from 'bcryptjs';

export class CompanyService {
  private companyRepository: CompanyRepository;
  private userRepository: UserRepository;

  constructor() {
    this.companyRepository = new CompanyRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Validates and normalizes a company name against length and allowed characters.
   */
  private validateCompanyName(name: string): string {
    const trimmedName = (name || '').trim();
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
    if (!/^[a-zA-Z0-9\s.,&'()-]+$/.test(trimmedName)) {
      throw new Error("Company name contains unsupported special characters. Only letters, numbers, spaces, and (. , & ' ( ) -) are allowed.");
    }
    return trimmedName;
  }

  private validateGstNo(value: string): string {
    const trimmed = (value || '').trim().toUpperCase();
    if (!trimmed) {
      throw new Error('GSTIN is required.');
    }
    if (trimmed.length !== 15) {
      throw new Error('GSTIN must be exactly 15 characters.');
    }
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmed)) {
      throw new Error('Invalid GSTIN format (e.g. 33AABCS1234D1Z2).');
    }
    return trimmed;
  }

  private validatePanNo(value: string): string {
    const trimmed = (value || '').trim().toUpperCase();
    if (!trimmed) {
      throw new Error('PAN is required.');
    }
    if (trimmed.length !== 10) {
      throw new Error('PAN must be exactly 10 characters.');
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmed)) {
      throw new Error('Invalid PAN format (e.g. AABCS1234D).');
    }
    return trimmed;
  }

  private validateWebsiteUrl(value: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    if (trimmed.length > 200) {
      throw new Error('Website URL cannot exceed 200 characters.');
    }
    if (/\s/.test(trimmed)) {
      throw new Error('Website URL cannot contain spaces.');
    }
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      throw new Error('Website URL cannot contain only special characters.');
    }
    if (trimmed.includes('@')) {
      throw new Error('Please enter a valid website URL (e.g. https://example.com).');
    }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
      throw new Error('Website URL must start with http:// or https://.');
    }
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error('Please enter a valid website URL (e.g. https://example.com).');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Website URL must start with http:// or https://.');
    }
    if (parsed.username || parsed.password) {
      throw new Error('Please enter a valid website URL (e.g. https://example.com).');
    }
    const host = parsed.hostname;
    if (!host || !host.includes('.') || host.startsWith('.') || host.endsWith('.') || host.includes('..')) {
      throw new Error('Please enter a valid website URL with a valid domain (e.g. https://example.com).');
    }
    const labels = host.split('.');
    const tld = labels[labels.length - 1];
    if (!/^[a-zA-Z]{2,24}$/.test(tld) || !labels.every((label) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))) {
      throw new Error('Please enter a valid website URL (e.g. https://example.com).');
    }
    return trimmed;
  }

  private validatePlaceName(value: string, label: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      throw new Error(`${label} cannot contain only special characters.`);
    }
    if (/^\d+$/.test(trimmed.replace(/\s+/g, ''))) {
      throw new Error(`${label} cannot contain only numeric characters.`);
    }
    if (trimmed.length < 2) {
      throw new Error(`${label} must be at least 2 characters.`);
    }
    if (trimmed.length > 60) {
      throw new Error(`${label} cannot exceed 60 characters.`);
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      throw new Error(`${label} must contain valid alphabetic characters.`);
    }
    if (!/^[a-zA-Z\s.'()-]+$/.test(trimmed)) {
      throw new Error(`${label} contains unsupported special characters.`);
    }
    return trimmed;
  }

  async getAllCompanies(): Promise<CompanyModel[]> {
    return await this.companyRepository.findAll();
  }

  async getCompanyById(companyId: string): Promise<CompanyModel | null> {
    if (!companyId) return null;
    let company = await this.companyRepository.findByCompanyId(companyId);
    if (!company && !isNaN(Number(companyId))) {
      company = await this.companyRepository.findById(Number(companyId));
    }
    return company;
  }

  async registerCompany(companyData: Partial<CompanyModel>): Promise<CompanyModel> {
    if (!companyData.name || !companyData.email || !companyData.address || !companyData.contactPerson || !companyData.mobileNumber || !companyData.password || !companyData.gstNo || !companyData.panNo) {
      throw new Error('Missing required company fields.');
    }

    const trimmedName = this.validateCompanyName(companyData.name);

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

    const trimmedCompanyName = companyData.name?.trim() || '';
    const existingName = await this.companyRepository.findByName(trimmedCompanyName);
    if (existingName) {
      throw new Error(`Company name "${trimmedCompanyName}" is already registered. Please choose a different company name.`);
    }

    const existingEmail = await this.companyRepository.findByEmail(companyData.email?.trim() || '');
    if (existingEmail) {
      throw new Error(`Company email "${companyData.email?.trim()}" is already registered.`);
    }

        const existingContactPerson = await this.companyRepository.findByContactPerson(trimmedContact);
    if (existingContactPerson) {
      throw new Error(`Username (contact person) "${trimmedContact}" is already registered. Please enter a different username.`);
    }

    const existingUser = await this.userRepository.findByUserId(trimmedContact);
    const existingUserByName = await this.userRepository.findByName(trimmedContact);
    if (existingUser || existingUserByName) {
      throw new Error(`Username "${trimmedContact}" is already in use by an account. Please choose a different username.`);
    }

    // Generate unique companyId (COM-00X)
    const companyId = await this.companyRepository.getNextCompanyId();

    // Hash password before saving
    const rawPassword = companyData.password.trim();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const cleanCompanyData: Partial<CompanyModel> = {
      ...companyData,
      companyId,
      name: companyData.name?.trim(),
      contactPerson: companyData.contactPerson?.trim(),
      email: companyData.email?.trim().toLowerCase(),
      address: companyData.address?.trim(),
      mobileNumber: companyData.mobileNumber?.trim(),
      designation: companyData.designation?.trim(),
      gstNo: this.validateGstNo((companyData.gstNo || (companyData as any).gstNumber) as string),
      panNo: this.validatePanNo((companyData.panNo || (companyData as any).panNumber) as string),
      legalEntity: (companyData as any).legalEntity?.trim() || 'Private Limited Company',
      city: (companyData as any).city ? this.validatePlaceName((companyData as any).city, 'City') : undefined,
      state: (companyData as any).state ? this.validatePlaceName((companyData as any).state, 'State') : undefined,
      country: (companyData as any).country ? this.validatePlaceName((companyData as any).country, 'Country') : 'India',
      website: (companyData as any).website ? this.validateWebsiteUrl((companyData as any).website) : undefined,
      phone: (companyData as any).phone?.trim() || companyData.mobileNumber?.trim(),
      password: hashedPassword,
      isFirstLogin: true,
    };

    const createdCompany = await this.companyRepository.createCompany(cleanCompanyData);

    // Auto-seed default RBAC roles and permissions matrix for the new company
    try {
      const { RbacService } = await import('../../rbac/services/rbac.service');
      const rbacService = new RbacService();
      await rbacService.ensureSeeded(createdCompany.companyId);
    } catch (rbacErr: any) {
      console.error('[CompanyService] Failed to seed default RBAC matrix for new company:', rbacErr?.message || rbacErr);
    }

    try {
      await emailService.sendCompanyWelcomeCredentialsEmail({
        companyEmail: createdCompany.email,
        companyName: createdCompany.name,
        companyId: createdCompany.companyId,
        contactPerson: createdCompany.contactPerson,
        password: rawPassword,
      });
    } catch (mailErr: any) {
      console.error('[CompanyService] Failed to send company welcome credentials email:', mailErr?.message || mailErr);
    }

    return createdCompany;
  }

  async updateCompany(companyId: string, companyData: Partial<CompanyModel>): Promise<CompanyModel> {
    const company = await this.companyRepository.findByCompanyId(companyId);
    if (!company) {
      throw new Error('Company not found.');
    }

    if (companyData.name !== undefined) {
      const trimmedName = this.validateCompanyName(companyData.name);
      const existingName = await this.companyRepository.findByName(trimmedName);
      if (existingName && existingName.companyId !== companyId) {
        throw new Error(`Company name "${trimmedName}" is already registered.`);
      }
      company.name = trimmedName;
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
    const rawGst = companyData.gstNo !== undefined ? companyData.gstNo : (companyData as any).gstNumber;
    if (rawGst !== undefined) {
      const trimmedGst = (rawGst || '').trim();
      company.gstNo = trimmedGst ? this.validateGstNo(trimmedGst) : undefined;
    }

    const rawPan = companyData.panNo !== undefined ? companyData.panNo : (companyData as any).panNumber;
    if (rawPan !== undefined) {
      const trimmedPan = (rawPan || '').trim();
      company.panNo = trimmedPan ? this.validatePanNo(trimmedPan) : undefined;
    }

    if ((companyData as any).legalEntity !== undefined) {
      company.legalEntity = (companyData as any).legalEntity?.trim();
    }
    if ((companyData as any).city !== undefined) {
      const trimmedCity = ((companyData as any).city || '').trim();
      company.city = trimmedCity ? this.validatePlaceName(trimmedCity, 'City') : undefined;
    }
    if ((companyData as any).state !== undefined) {
      const trimmedState = ((companyData as any).state || '').trim();
      company.state = trimmedState ? this.validatePlaceName(trimmedState, 'State') : undefined;
    }
    if ((companyData as any).country !== undefined) {
      const trimmedCountry = ((companyData as any).country || '').trim();
      company.country = trimmedCountry ? this.validatePlaceName(trimmedCountry, 'Country') : undefined;
    }
    if ((companyData as any).website !== undefined) {
      const trimmedWeb = ((companyData as any).website || '').trim();
      company.website = trimmedWeb ? this.validateWebsiteUrl(trimmedWeb) : undefined;
    }
    if ((companyData as any).phone !== undefined) {
      company.phone = (companyData as any).phone?.trim();
      if (!company.mobileNumber && company.phone) {
        company.mobileNumber = company.phone;
      }
    }
    if ((companyData as any).currency !== undefined) {
      company.currency = (companyData as any).currency?.trim();
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
    let company = await this.companyRepository.findByCompanyId(companyId);
    if (!company && !isNaN(Number(companyId))) {
      company = await this.companyRepository.findById(Number(companyId));
    }
    if (!company) {
      return false;
    }
    return await this.companyRepository.deleteByCompanyId(company.companyId);
  }
}
