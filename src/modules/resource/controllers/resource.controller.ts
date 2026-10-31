import { NextRequest, NextResponse } from 'next/server';
import { ResourceService } from '../services/resource.service';

export class ResourceController {
  private resourceService: ResourceService;

  constructor() {
    this.resourceService = new ResourceService();
  }

  // ==========================================
  // EQUIPMENT HANDLERS
  // ==========================================

  async getAllEquipment(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const category = searchParams.get('category') || undefined;
      const status = searchParams.get('status') || undefined;
      const assignedProjectId = searchParams.get('assignedProjectId') || undefined;

      const equipment = await this.resourceService.getAllEquipment(
        {
          companyId: user?.companyId || 'COM-001',
          branchId: user?.branchId || undefined,
          role: user?.role
        },
        { search, category, status, assignedProjectId }
      );

      return NextResponse.json({ success: true, data: equipment }, { status: 200 });
    } catch (err: any) {
      console.error('[ResourceController] getAllEquipment error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getEquipmentById(_req: NextRequest, id: string) {
    try {
      const equipment = await this.resourceService.getEquipmentById(id);
      if (!equipment) {
        return NextResponse.json({ success: false, message: 'Equipment not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: equipment }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createEquipment(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const equipment = await this.resourceService.createEquipment(body, {
        companyId: user?.companyId || 'COM-001',
        branchId: user?.branchId || null
      });

      return NextResponse.json(
        { success: true, message: 'Equipment registered successfully.', data: equipment },
        { status: 201 }
      );
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async updateEquipment(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const updated = await this.resourceService.updateEquipment(id, body, {
        companyId: user?.companyId || 'COM-001'
      });

      if (!updated) {
        return NextResponse.json({ success: false, message: 'Equipment not found.' }, { status: 404 });
      }

      return NextResponse.json(
        { success: true, message: 'Equipment updated successfully.', data: updated },
        { status: 200 }
      );
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async deleteEquipment(_req: NextRequest, id: string) {
    try {
      const deleted = await this.resourceService.deleteEquipment(id);
      if (!deleted) {
        return NextResponse.json({ success: false, message: 'Equipment not found.' }, { status: 404 });
      }

      return NextResponse.json(
        { success: true, message: 'Equipment deleted successfully.' },
        { status: 200 }
      );
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // ==========================================
  // ALLOCATION HANDLERS
  // ==========================================

  async getAllAllocations(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const resourceType = searchParams.get('resourceType') || undefined;
      const projectId = searchParams.get('projectId') || undefined;
      const projectCode = searchParams.get('projectCode') || undefined;
      const resourceId = searchParams.get('resourceId') || undefined;
      const status = searchParams.get('status') || undefined;

      const allocations = await this.resourceService.getAllAllocations(
        {
          companyId: user?.companyId || 'COM-001',
          branchId: user?.branchId || undefined,
          role: user?.role
        },
        { search, resourceType, projectId, projectCode, resourceId, status }
      );

      return NextResponse.json({ success: true, data: allocations }, { status: 200 });
    } catch (err: any) {
      console.error('[ResourceController] getAllAllocations error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getAllocationById(_req: NextRequest, id: string) {
    try {
      const alloc = await this.resourceService.getAllocationById(id);
      if (!alloc) {
        return NextResponse.json({ success: false, message: 'Allocation not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: alloc }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createAllocation(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const alloc = await this.resourceService.createAllocation(body, {
        companyId: user?.companyId || 'COM-001',
        branchId: user?.branchId || null,
        userId: user?.userId || user?.name
      });

      return NextResponse.json(
        { success: true, message: 'Resource allocated successfully.', data: alloc },
        { status: 201 }
      );
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async updateAllocation(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const updated = await this.resourceService.updateAllocation(id, body, {
        companyId: user?.companyId || 'COM-001'
      });

      if (!updated) {
        return NextResponse.json({ success: false, message: 'Allocation not found.' }, { status: 404 });
      }

      return NextResponse.json(
        { success: true, message: 'Allocation updated successfully.', data: updated },
        { status: 200 }
      );
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async deleteAllocation(_req: NextRequest, id: string) {
    try {
      const deleted = await this.resourceService.deleteAllocation(id);
      if (!deleted) {
        return NextResponse.json({ success: false, message: 'Allocation not found.' }, { status: 404 });
      }

      return NextResponse.json(
        { success: true, message: 'Allocation removed successfully.' },
        { status: 200 }
      );
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // ==========================================
  // AVAILABILITY REPORT
  // ==========================================

  async getAvailability(req: NextRequest, user: any) {
    try {
      const report = await this.resourceService.getAvailabilityReport({
        companyId: user?.companyId || 'COM-001',
        branchId: user?.branchId || undefined,
        role: user?.role
      });

      return NextResponse.json({ success: true, data: report }, { status: 200 });
    } catch (err: any) {
      console.error('[ResourceController] getAvailability error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
}
