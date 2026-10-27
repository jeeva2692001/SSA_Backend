import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '../services/vendor.service';

export class VendorController {
  private vendorService: VendorService;

  constructor() {
    this.vendorService = new VendorService();
  }

  async getAllVendors(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const category = searchParams.get('category') || undefined;
      const approvalStatus = searchParams.get('status') || searchParams.get('approvalStatus') || undefined;

      const vendors = await this.vendorService.getAllVendors(
        {
          companyId: user?.companyId || 'COM-001',
          branchId: user?.branchId || null,
          role: user?.role
        },
        { search, category, approvalStatus }
      );

      return NextResponse.json({ success: true, data: vendors }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getVendorById(_req: NextRequest, id: string) {
    try {
      const vendor = await this.vendorService.getVendorById(id);
      if (!vendor) {
        return NextResponse.json({ success: false, message: 'Vendor not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: vendor }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createVendor(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const vendor = await this.vendorService.createVendor(body, {
        companyId: user?.companyId || 'COM-001',
        branchId: user?.branchId || null,
        userId: user?.userId,
        role: user?.role
      });
      return NextResponse.json({
        success: true,
        data: vendor,
        message: `Vendor "${vendor.vendorName}" registered successfully with code ${vendor.vendorCode}.`
      }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async updateVendor(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const vendor = await this.vendorService.updateVendor(id, body, {
        companyId: user?.companyId,
        role: user?.role
      });
      if (!vendor) {
        return NextResponse.json({ success: false, message: 'Vendor not found.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: vendor,
        message: 'Vendor profile updated successfully.'
      }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async updateApprovalStatus(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const { status, rejectionReason } = body;
      if (!status) {
        return NextResponse.json({ success: false, message: 'Approval status is required.' }, { status: 400 });
      }

      const updated = await this.vendorService.updateApprovalStatus(id, status, {
        approvedBy: user?.name || user?.email || 'Operations Lead',
        rejectionReason
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Vendor status updated to "${status}".`
      }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async deleteVendor(_req: NextRequest, id: string, _user: any) {
    try {
      const success = await this.vendorService.deleteVendor(id);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Vendor not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Vendor deleted successfully.' }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
}
