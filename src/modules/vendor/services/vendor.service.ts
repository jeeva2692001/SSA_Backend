import { VendorRepository, VendorFilterOptions } from '../repositories/vendor.repository';
import { VendorModel, VendorCategory, VendorApprovalStatus } from '../models/vendor.model';

const STANDARD_CATEGORIES: VendorCategory[] = [
  'Material Supplier',
  'Contractor',
  'Consultant',
  'Service Provider'
];

export class VendorService {
  private vendorRepo: VendorRepository;

  constructor() {
    this.vendorRepo = new VendorRepository();
  }

  async getAllVendors(
    context: { companyId?: string; branchId?: string | null; role?: string },
    options: {
      search?: string;
      category?: string;
      approvalStatus?: string;
    } = {}
  ): Promise<VendorModel[]> {
    await this.ensureSeeded(context.companyId);

    const filterOptions: VendorFilterOptions = {
      companyId: context.companyId || undefined,
      branchId: context.branchId !== undefined ? context.branchId : undefined,
      search: options.search,
      category: options.category,
      approvalStatus: options.approvalStatus
    };

    return await this.vendorRepo.findAll(filterOptions);
  }

  async getVendorById(idOrCode: string): Promise<VendorModel | null> {
    return await this.vendorRepo.findByIdOrCode(idOrCode);
  }

  private validateVendorInputs(data: Partial<VendorModel>): void {
    if (data.contactPerson !== undefined && data.contactPerson !== null) {
      const cp = data.contactPerson.trim();
      if (cp.length > 0) {
        if (cp.length < 2 || cp.length > 100) {
          throw new Error('Contact person name must be between 2 and 100 characters.');
        }
        if (/\d/.test(cp)) {
          throw new Error('Contact person name cannot contain numbers.');
        }
        if (!/[a-zA-Z]/.test(cp)) {
          throw new Error('Contact person name must contain letters and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z\s.'-]+$/.test(cp)) {
          throw new Error('Contact person name should contain only letters, dots, hyphens, and apostrophes.');
        }
      }
    }

    if (data.notes !== undefined && data.notes !== null) {
      const notesTrim = data.notes.trim();
      if (notesTrim.length > 0) {
        if (notesTrim.length > 500) {
          throw new Error('Notes cannot exceed 500 characters.');
        }
        if (!/[a-zA-Z0-9]/.test(notesTrim)) {
          throw new Error('Notes cannot be only special characters.');
        }
        if (/^\d+$/.test(notesTrim.replace(/[\s,.'&()/#:;!?"'–—+@%*-]+/g, '')) || /^\d+$/.test(notesTrim)) {
          throw new Error('Notes cannot be only numeric characters and must contain valid text.');
        }
        if (!/[a-zA-Z]/.test(notesTrim)) {
          throw new Error('Notes must contain alphabetic text.');
        }
        if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+@%*_-]+$/.test(notesTrim)) {
          throw new Error('Notes contains unsupported special characters.');
        }
      }
    }
  }

  async createVendor(
    data: Partial<VendorModel>,
    context: { companyId?: string; branchId?: string | null; userId?: string; role?: string }
  ): Promise<VendorModel> {
    if (!data.vendorName || !data.vendorName.trim()) {
      throw new Error('Vendor name is required.');
    }
    this.validateVendorInputs(data);
    const trimmedVendorName = data.vendorName.trim();
    if (trimmedVendorName.length < 2) {
      throw new Error('Vendor name must be at least 2 characters.');
    }
    if (!/[a-zA-Z]/.test(trimmedVendorName)) {
      if (/^\d+$/.test(trimmedVendorName)) {
        throw new Error('Vendor name cannot be only numeric values. It must contain letters.');
      }
      if (!/[a-zA-Z0-9]/.test(trimmedVendorName)) {
        throw new Error('Vendor name cannot contain only special characters. It must contain letters.');
      }
      throw new Error('Vendor name must contain at least one letter and cannot be only numeric or special characters.');
    }
    if (!/^[a-zA-Z0-9\s,.'&()/#_–—-]+$/.test(trimmedVendorName)) {
      throw new Error('Vendor name contains invalid special characters.');
    }

    // Validate standard category
    if (!data.category || !String(data.category).trim()) {
      throw new Error('Standard category is required.');
    }
    let category = data.category as VendorCategory;
    if (!STANDARD_CATEGORIES.includes(category)) {
      // Map common aliases or throw error
      const catLower = String(category || '').toLowerCase();
      if (catLower.includes('material') || catLower.includes('supplier')) {
        category = 'Material Supplier';
      } else if (catLower.includes('contract')) {
        category = 'Contractor';
      } else if (catLower.includes('consult')) {
        category = 'Consultant';
      } else if (catLower.includes('service')) {
        category = 'Service Provider';
      } else {
        throw new Error(`Invalid vendor category: "${category}". Must be one of: ${STANDARD_CATEGORIES.join(', ')}.`);
      }
    }

    // Validate tradeSpecialty if provided
    let cleanTradeSpecialty: string | undefined = undefined;
    if (data.tradeSpecialty && data.tradeSpecialty.trim()) {
      const trimmedTrade = data.tradeSpecialty.trim();
      if (!/[a-zA-Z]/.test(trimmedTrade)) {
        if (/^\d+$/.test(trimmedTrade)) {
          throw new Error('Trade specialty cannot be only numeric values. It must contain letters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedTrade)) {
          throw new Error('Trade specialty cannot contain only special characters. It must contain letters.');
        }
        throw new Error('Trade specialty must contain at least one letter and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#_–—-]+$/.test(trimmedTrade)) {
        throw new Error('Trade specialty contains invalid special characters.');
      }
      cleanTradeSpecialty = trimmedTrade;
    }

    // Validate contactPerson if provided
    let cleanContactPerson: string | undefined = undefined;
    if (data.contactPerson && data.contactPerson.trim()) {
      const trimmedContact = data.contactPerson.trim();
      if (!/[a-zA-Z]/.test(trimmedContact)) {
        if (/^\d+$/.test(trimmedContact)) {
          throw new Error('Contact person name cannot be only numeric values. It must contain letters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedContact)) {
          throw new Error('Contact person name cannot contain only special characters. It must contain letters.');
        }
        throw new Error('Contact person name must contain at least one letter and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'-]+$/.test(trimmedContact)) {
        throw new Error('Contact person name contains invalid special characters.');
      }
      cleanContactPerson = trimmedContact;
    }

    // Validate mobile if provided
    let cleanMobile: string | undefined = undefined;
    if (data.mobile && data.mobile.trim()) {
      const rawMobile = data.mobile.replace(/\D/g, '');
      const normalizedMobile = rawMobile.length === 12 && rawMobile.startsWith('91') ? rawMobile.slice(2) : rawMobile;
      if (normalizedMobile.length !== 10) {
        throw new Error('Mobile phone number must be exactly 10 digits.');
      }
      cleanMobile = normalizedMobile;
    }

    // Validate city if provided
    let cleanCity: string | undefined = undefined;
    if (data.city && data.city.trim()) {
      const trimmedCity = data.city.trim();
      if (trimmedCity.length < 2) {
        throw new Error('City must be at least 2 characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedCity)) {
        if (/^\d+$/.test(trimmedCity)) {
          throw new Error('City cannot be only numeric values. It must contain letters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedCity)) {
          throw new Error('City cannot contain only special characters. It must contain letters.');
        }
        throw new Error('City must contain at least one letter and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'-]+$/.test(trimmedCity)) {
        throw new Error('City contains invalid special characters.');
      }
      cleanCity = trimmedCity;
    }

    // Validate state if provided
    let cleanState: string | undefined = undefined;
    if (data.state && data.state.trim()) {
      const trimmedState = data.state.trim();
      if (trimmedState.length < 2) {
        throw new Error('State must be at least 2 characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedState)) {
        if (/^\d+$/.test(trimmedState)) {
          throw new Error('State cannot be only numeric values. It must contain letters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedState)) {
          throw new Error('State cannot contain only special characters. It must contain letters.');
        }
        throw new Error('State must contain at least one letter and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'-]+$/.test(trimmedState)) {
        throw new Error('State contains invalid special characters.');
      }
      cleanState = trimmedState;
    }

    // Validate GST number if provided
    let cleanGstNo: string | undefined = undefined;
    if (data.gstNo && data.gstNo.trim()) {
      const trimmedGst = data.gstNo.trim().toUpperCase();
      if (/[^a-zA-Z0-9]/.test(trimmedGst)) {
        throw new Error('GST Number does not accept special characters.');
      }
      if (trimmedGst.length !== 15) {
        throw new Error('GST Number must be exactly 15 alphanumeric characters.');
      }
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmedGst)) {
        throw new Error('Invalid GSTIN format (e.g. 33AABCG1234F1Z5).');
      }
      cleanGstNo = trimmedGst;
    }

    // Validate PAN number if provided
    let cleanPanNo: string | undefined = undefined;
    if (data.panNo && data.panNo.trim()) {
      const trimmedPan = data.panNo.trim().toUpperCase();
      if (!/[a-zA-Z0-9]/.test(trimmedPan)) {
        throw new Error('PAN Number cannot contain only special characters.');
      }
      if (/[^a-zA-Z0-9]/.test(trimmedPan)) {
        throw new Error('PAN Number does not accept special characters.');
      }
      if (trimmedPan.length !== 10) {
        throw new Error('PAN Number must be exactly 10 alphanumeric characters.');
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedPan)) {
        throw new Error('Invalid PAN format (e.g. AABCG1234F).');
      }
      cleanPanNo = trimmedPan;
    }

    // Validate Office / Yard Address if provided
    let cleanAddress: string | undefined = undefined;
    if (data.address && data.address.trim()) {
      const trimmedAddress = data.address.trim();
      if (trimmedAddress.length < 3) {
        throw new Error('Office / Yard Address must be at least 3 characters.');
      }
      if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
        throw new Error('Office / Yard Address cannot contain only special characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedAddress)) {
        if (/^\d+$/.test(trimmedAddress)) {
          throw new Error('Office / Yard Address cannot be only numeric values. It must contain letters.');
        }
        throw new Error('Office / Yard Address must contain at least one letter and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#_–—:;\n\r-]+$/.test(trimmedAddress)) {
        throw new Error('Office / Yard Address contains invalid special characters.');
      }
      cleanAddress = trimmedAddress;
    }

    const companyId = data.companyId || context.companyId || 'COM-001';
    const branchId = data.branchId !== undefined ? data.branchId : (context.branchId || null);

    if (data.vendorCode && data.vendorCode.trim()) {
      const existing = await this.vendorRepo.findByCode(data.vendorCode.trim());
      if (existing) {
        throw new Error(`Vendor code "${data.vendorCode.trim()}" is already in use by vendor "${existing.vendorName}".`);
      }
    }

    const initialStatus: VendorApprovalStatus = data.approvalStatus || 'Pending Approval';
    const ratingNum = typeof data.rating === 'number' ? data.rating : (parseFloat(String(data.rating || '4.0')) || 4.0);

    let attempts = 0;
    const maxAttempts = 5;
    let vendor: VendorModel | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      const vendorCode = (attempts === 1 && data.vendorCode?.trim())
        ? data.vendorCode.trim()
        : (await this.vendorRepo.getNextVendorCode(companyId));

      try {
        vendor = await this.vendorRepo.create({
          ...data,
          vendorCode,
          vendorName: trimmedVendorName,
          category,
          companyId,
          branchId,
          rating: Math.min(5, Math.max(1, ratingNum)),
          approvalStatus: initialStatus,
          contactPerson: cleanContactPerson,
          mobile: cleanMobile,
          email: data.email?.trim() || undefined,
          tradeSpecialty: cleanTradeSpecialty,
          address: cleanAddress,
          city: cleanCity,
          state: cleanState,
          gstNo: cleanGstNo,
          panNo: cleanPanNo
        });
        break;
      } catch (err: any) {
        const isUniqueViolation =
          err.code === '23505' ||
          err.message?.includes('duplicate key') ||
          err.message?.includes('unique constraint') ||
          err.message?.includes('UQ_b6fe5f17015beb44a185f51273c') ||
          err.message?.includes('vendorCode');

        if (isUniqueViolation && attempts < maxAttempts && !data.vendorCode) {
          continue;
        }
        throw err;
      }
    }

    if (!vendor) {
      throw new Error('Failed to create vendor record after multiple attempts.');
    }

    return vendor;
  }

  async updateVendor(
    id: string,
    data: Partial<VendorModel>,
    _context?: { companyId?: string; role?: string }
  ): Promise<VendorModel | null> {
    this.validateVendorInputs(data);

    const existing = await this.vendorRepo.findByIdOrCode(id);
    if (!existing) {
      throw new Error(`Vendor with ID "${id}" not found.`);
    }

    if (data.category && STANDARD_CATEGORIES.includes(data.category as VendorCategory)) {
      existing.category = data.category as VendorCategory;
    }
    if (data.vendorName !== undefined) {
      const trimmedVendorName = data.vendorName.trim();
      if (!trimmedVendorName) {
        throw new Error('Vendor name is required.');
      }
      if (trimmedVendorName.length < 2) {
        throw new Error('Vendor name must be at least 2 characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedVendorName)) {
        if (/^\d+$/.test(trimmedVendorName)) {
          throw new Error('Vendor name cannot be only numeric values. It must contain letters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedVendorName)) {
          throw new Error('Vendor name cannot contain only special characters. It must contain letters.');
        }
        throw new Error('Vendor name must contain at least one letter and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#_–—-]+$/.test(trimmedVendorName)) {
        throw new Error('Vendor name contains invalid special characters.');
      }
      existing.vendorName = trimmedVendorName;
    }
    if (data.contactPerson !== undefined) {
      if (data.contactPerson && data.contactPerson.trim()) {
        const trimmedContact = data.contactPerson.trim();
        if (!/[a-zA-Z]/.test(trimmedContact)) {
          if (/^\d+$/.test(trimmedContact)) {
            throw new Error('Contact person name cannot be only numeric values. It must contain letters.');
          }
          if (!/[a-zA-Z0-9]/.test(trimmedContact)) {
            throw new Error('Contact person name cannot contain only special characters. It must contain letters.');
          }
          throw new Error('Contact person name must contain at least one letter and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmedContact)) {
          throw new Error('Contact person name contains invalid special characters.');
        }
        existing.contactPerson = trimmedContact;
      } else {
        existing.contactPerson = undefined;
      }
    }
    if (data.mobile !== undefined) {
      if (data.mobile && data.mobile.trim()) {
        const rawMobile = data.mobile.replace(/\D/g, '');
        const normalizedMobile = rawMobile.length === 12 && rawMobile.startsWith('91') ? rawMobile.slice(2) : rawMobile;
        if (normalizedMobile.length !== 10) {
          throw new Error('Mobile phone number must be exactly 10 digits.');
        }
        existing.mobile = normalizedMobile;
      } else {
        existing.mobile = undefined;
      }
    }
    if (data.alternatePhone !== undefined) existing.alternatePhone = data.alternatePhone?.trim();
    if (data.email !== undefined) existing.email = data.email?.trim();
    if (data.tradeSpecialty !== undefined) {
      if (data.tradeSpecialty && data.tradeSpecialty.trim()) {
        const trimmedTrade = data.tradeSpecialty.trim();
        if (!/[a-zA-Z]/.test(trimmedTrade)) {
          if (/^\d+$/.test(trimmedTrade)) {
            throw new Error('Trade specialty cannot be only numeric values. It must contain letters.');
          }
          if (!/[a-zA-Z0-9]/.test(trimmedTrade)) {
            throw new Error('Trade specialty cannot contain only special characters. It must contain letters.');
          }
          throw new Error('Trade specialty must contain at least one letter and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z0-9\s,.'&()/#_–—-]+$/.test(trimmedTrade)) {
          throw new Error('Trade specialty contains invalid special characters.');
        }
        existing.tradeSpecialty = trimmedTrade;
      } else {
        existing.tradeSpecialty = undefined;
      }
    }
    if (data.address !== undefined) {
      if (data.address && data.address.trim()) {
        const trimmedAddress = data.address.trim();
        if (trimmedAddress.length < 3) {
          throw new Error('Office / Yard Address must be at least 3 characters.');
        }
        if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
          throw new Error('Office / Yard Address cannot contain only special characters.');
        }
        if (!/[a-zA-Z]/.test(trimmedAddress)) {
          if (/^\d+$/.test(trimmedAddress)) {
            throw new Error('Office / Yard Address cannot be only numeric values. It must contain letters.');
          }
          throw new Error('Office / Yard Address must contain at least one letter and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z0-9\s,.'&()/#_–—:;\n\r-]+$/.test(trimmedAddress)) {
          throw new Error('Office / Yard Address contains invalid special characters.');
        }
        existing.address = trimmedAddress;
      } else {
        existing.address = undefined;
      }
    }
    if (data.city !== undefined) {
      if (data.city && data.city.trim()) {
        const trimmedCity = data.city.trim();
        if (trimmedCity.length < 2) {
          throw new Error('City must be at least 2 characters.');
        }
        if (!/[a-zA-Z]/.test(trimmedCity)) {
          if (/^\d+$/.test(trimmedCity)) {
            throw new Error('City cannot be only numeric values. It must contain letters.');
          }
          if (!/[a-zA-Z0-9]/.test(trimmedCity)) {
            throw new Error('City cannot contain only special characters. It must contain letters.');
          }
          throw new Error('City must contain at least one letter and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmedCity)) {
          throw new Error('City contains invalid special characters.');
        }
        existing.city = trimmedCity;
      } else {
        existing.city = undefined;
      }
    }
    if (data.state !== undefined) {
      if (data.state && data.state.trim()) {
        const trimmedState = data.state.trim();
        if (trimmedState.length < 2) {
          throw new Error('State must be at least 2 characters.');
        }
        if (!/[a-zA-Z]/.test(trimmedState)) {
          if (/^\d+$/.test(trimmedState)) {
            throw new Error('State cannot be only numeric values. It must contain letters.');
          }
          if (!/[a-zA-Z0-9]/.test(trimmedState)) {
            throw new Error('State cannot contain only special characters. It must contain letters.');
          }
          throw new Error('State must contain at least one letter and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmedState)) {
          throw new Error('State contains invalid special characters.');
        }
        existing.state = trimmedState;
      } else {
        existing.state = undefined;
      }
    }
    if (data.gstNo !== undefined) {
      if (data.gstNo && data.gstNo.trim()) {
        const trimmedGst = data.gstNo.trim().toUpperCase();
        if (/[^a-zA-Z0-9]/.test(trimmedGst)) {
          throw new Error('GST Number does not accept special characters.');
        }
        if (trimmedGst.length !== 15) {
          throw new Error('GST Number must be exactly 15 alphanumeric characters.');
        }
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmedGst)) {
          throw new Error('Invalid GSTIN format (e.g. 33AABCG1234F1Z5).');
        }
        existing.gstNo = trimmedGst;
      } else {
        existing.gstNo = undefined;
      }
    }
    if (data.panNo !== undefined) {
      if (data.panNo && data.panNo.trim()) {
        const trimmedPan = data.panNo.trim().toUpperCase();
        if (!/[a-zA-Z0-9]/.test(trimmedPan)) {
          throw new Error('PAN Number cannot contain only special characters.');
        }
        if (/[^a-zA-Z0-9]/.test(trimmedPan)) {
          throw new Error('PAN Number does not accept special characters.');
        }
        if (trimmedPan.length !== 10) {
          throw new Error('PAN Number must be exactly 10 alphanumeric characters.');
        }
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedPan)) {
          throw new Error('Invalid PAN format (e.g. AABCG1234F).');
        }
        existing.panNo = trimmedPan;
      } else {
        existing.panNo = undefined;
      }
    }
    if (data.notes !== undefined) existing.notes = data.notes?.trim();
    if (data.rating !== undefined) {
      const num = parseFloat(String(data.rating));
      if (!isNaN(num)) existing.rating = Math.min(5, Math.max(1, num));
    }
    if (data.approvalStatus && ['Approved', 'Pending Approval', 'Rejected'].includes(data.approvalStatus)) {
      existing.approvalStatus = data.approvalStatus as VendorApprovalStatus;
    }

    return await this.vendorRepo.save(existing);
  }

  async updateApprovalStatus(
    id: string,
    status: VendorApprovalStatus,
    meta: { approvedBy?: string; rejectionReason?: string } = {}
  ): Promise<VendorModel | null> {
    const existing = await this.vendorRepo.findByIdOrCode(id);
    if (!existing) {
      throw new Error(`Vendor with ID "${id}" not found.`);
    }

    if (!['Approved', 'Pending Approval', 'Rejected'].includes(status)) {
      throw new Error(`Invalid vendor approval status: "${status}". Must be Approved, Pending Approval, or Rejected.`);
    }

    existing.approvalStatus = status;

    if (status === 'Approved') {
      existing.approvedBy = meta.approvedBy || 'Operations Lead';
      existing.approvedAt = new Date();
      existing.rejectionReason = undefined;
    } else if (status === 'Rejected') {
      existing.rejectionReason = meta.rejectionReason || 'Vendor profile does not meet procurement criteria.';
      existing.approvedAt = undefined;
    } else {
      existing.rejectionReason = undefined;
      existing.approvedAt = undefined;
    }

    return await this.vendorRepo.save(existing);
  }

  async deleteVendor(id: string): Promise<boolean> {
    const existing = await this.vendorRepo.findByIdOrCode(id);
    if (!existing) return false;
    return await this.vendorRepo.delete(existing.id);
  }

  async ensureSeeded(companyId?: string): Promise<void> {
    try {
      const count = await this.vendorRepo.count(companyId);
      if (count > 0) return;

      const targetCompany = companyId || 'COM-001';

      const defaultVendors: Array<Partial<VendorModel>> = [
        {
          vendorCode: 'VEN-2026-001',
          vendorName: 'Apex BIM Solutions Ltd',
          category: 'Consultant',
          tradeSpecialty: 'BIM Services & 3D Modeling',
          contactPerson: 'Mr. Arvind Swamy',
          mobile: '9845066112',
          email: 'arvind@apexbim.com',
          rating: 4.8,
          approvalStatus: 'Approved',
          city: 'Chennai',
          state: 'Tamil Nadu',
          approvedBy: 'Operations Lead',
          approvedAt: new Date()
        },
        {
          vendorCode: 'VEN-2026-002',
          vendorName: 'UltraTech Cement & Building Materials',
          category: 'Material Supplier',
          tradeSpecialty: 'Concrete, Cement & Aggregates',
          contactPerson: 'Mr. Rajesh Nambiar',
          mobile: '9840012345',
          email: 'orders@ultratech-materials.in',
          rating: 4.9,
          approvalStatus: 'Approved',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          approvedBy: 'Procurement Manager',
          approvedAt: new Date()
        },
        {
          vendorCode: 'VEN-2026-003',
          vendorName: 'Vikas Structural Labs & Contractors',
          category: 'Contractor',
          tradeSpecialty: 'Structural Steel & Heavy Civil Works',
          contactPerson: 'Dr. Vikas Gowda',
          mobile: '9900088220',
          email: 'vgowda@vikaslabs.in',
          rating: 4.5,
          approvalStatus: 'Approved',
          city: 'Bengaluru',
          state: 'Karnataka',
          approvedBy: 'Operations Lead',
          approvedAt: new Date()
        },
        {
          vendorCode: 'VEN-2026-004',
          vendorName: 'EcoAir HVAC Engineering',
          category: 'Contractor',
          tradeSpecialty: 'VRV/VRF HVAC Equipment & Ducting',
          contactPerson: 'Mr. Salim Merchant',
          mobile: '9741055661',
          email: 'salim@ecoairhvac.com',
          rating: 3.8,
          approvalStatus: 'Pending Approval',
          city: 'Chennai',
          state: 'Tamil Nadu'
        },
        {
          vendorCode: 'VEN-2026-005',
          vendorName: 'Matrix MEP Consultancies',
          category: 'Consultant',
          tradeSpecialty: 'Plumbing & Electrical Engineering Designs',
          contactPerson: 'Mrs. Rekha Iyer',
          mobile: '9884122330',
          email: 'rekha@matrixmep.com',
          rating: 4.2,
          approvalStatus: 'Approved',
          city: 'Chennai',
          state: 'Tamil Nadu',
          approvedBy: 'Design Lead',
          approvedAt: new Date()
        },
        {
          vendorCode: 'VEN-2026-006',
          vendorName: 'Vanguard Geospatial & Soil Surveys',
          category: 'Service Provider',
          tradeSpecialty: 'LIDAR Drone Surveying & Geotechnical Soil Tests',
          contactPerson: 'Mr. Mathew Thomas',
          mobile: '9003099881',
          email: 'm.thomas@vanguardgeo.com',
          rating: 2.5,
          approvalStatus: 'Rejected',
          rejectionReason: 'Incomplete compliance documents and pending accreditation.',
          city: 'Kochi',
          state: 'Kerala'
        },
        {
          vendorCode: 'VEN-2026-007',
          vendorName: 'Premier Modular & Interior Furnishings',
          category: 'Service Provider',
          tradeSpecialty: 'Acoustic Ceilings, Drywalls & Interior Joinery',
          contactPerson: 'Ms. Deepika Sundaram',
          mobile: '9940177882',
          email: 'deepika@premierinteriors.com',
          rating: 4.6,
          approvalStatus: 'Pending Approval',
          city: 'Chennai',
          state: 'Tamil Nadu'
        },
        {
          vendorCode: 'VEN-2026-008',
          vendorName: 'Schneider Electric Power Systems',
          category: 'Material Supplier',
          tradeSpecialty: 'Switchgear, Panels & Transformers',
          contactPerson: 'Mr. Vinod Sharma',
          mobile: '9810055443',
          email: 'v.sharma@schneider-dist.in',
          rating: 4.7,
          approvalStatus: 'Approved',
          city: 'Mumbai',
          state: 'Maharashtra',
          approvedBy: 'Procurement Manager',
          approvedAt: new Date()
        }
      ];

      for (const item of defaultVendors) {
        if (!item.vendorCode) continue;
        const existing = await this.vendorRepo.findByCode(item.vendorCode);
        if (existing) continue;

        await this.vendorRepo.create({
          ...item,
          companyId: targetCompany,
          branchId: null
        });
      }
    } catch (err) {
      console.warn('[VendorService] ensureSeeded note:', err);
    }
  }
}
