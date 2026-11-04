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

  async createVendor(
    data: Partial<VendorModel>,
    context: { companyId?: string; branchId?: string | null; userId?: string; role?: string }
  ): Promise<VendorModel> {
    if (!data.vendorName || !data.vendorName.trim()) {
      throw new Error('Vendor name is required.');
    }

    // Validate standard category
    let category = data.category as VendorCategory;
    if (!category || !STANDARD_CATEGORIES.includes(category)) {
      // Map common aliases or default to Service Provider / Material Supplier
      const catLower = String(category || '').toLowerCase();
      if (catLower.includes('material') || catLower.includes('supplier')) {
        category = 'Material Supplier';
      } else if (catLower.includes('contract')) {
        category = 'Contractor';
      } else if (catLower.includes('consult')) {
        category = 'Consultant';
      } else {
        category = 'Service Provider';
      }
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
          vendorName: data.vendorName.trim(),
          category,
          companyId,
          branchId,
          rating: Math.min(5, Math.max(1, ratingNum)),
          approvalStatus: initialStatus,
          contactPerson: data.contactPerson?.trim() || undefined,
          mobile: data.mobile?.trim() || undefined,
          email: data.email?.trim() || undefined,
          tradeSpecialty: data.tradeSpecialty?.trim() || undefined,
          address: data.address?.trim() || undefined,
          city: data.city?.trim() || undefined,
          state: data.state?.trim() || undefined,
          gstNo: data.gstNo?.trim() || undefined,
          panNo: data.panNo?.trim() || undefined
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
    const existing = await this.vendorRepo.findByIdOrCode(id);
    if (!existing) {
      throw new Error(`Vendor with ID "${id}" not found.`);
    }

    if (data.category && STANDARD_CATEGORIES.includes(data.category as VendorCategory)) {
      existing.category = data.category as VendorCategory;
    }
    if (data.vendorName) existing.vendorName = data.vendorName.trim();
    if (data.contactPerson !== undefined) existing.contactPerson = data.contactPerson?.trim();
    if (data.mobile !== undefined) existing.mobile = data.mobile?.trim();
    if (data.alternatePhone !== undefined) existing.alternatePhone = data.alternatePhone?.trim();
    if (data.email !== undefined) existing.email = data.email?.trim();
    if (data.tradeSpecialty !== undefined) existing.tradeSpecialty = data.tradeSpecialty?.trim();
    if (data.address !== undefined) existing.address = data.address?.trim();
    if (data.city !== undefined) existing.city = data.city?.trim();
    if (data.state !== undefined) existing.state = data.state?.trim();
    if (data.gstNo !== undefined) existing.gstNo = data.gstNo?.trim();
    if (data.panNo !== undefined) existing.panNo = data.panNo?.trim();
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
