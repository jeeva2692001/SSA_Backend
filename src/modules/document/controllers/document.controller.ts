import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../services/document.service';

export class DocumentController {
  private documentService = new DocumentService();

  private getCompanyId(user: any, searchParams?: URLSearchParams): string | undefined {
    if (user?.role === 'Super Admin') {
      return searchParams?.get('companyId') || undefined;
    }
    return user?.companyId || undefined;
  }

  // ==========================================
  // CLIENT BRIEFS
  // ==========================================
  async getBriefs(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = this.getCompanyId(user, searchParams);
      const project = searchParams.get('project') || undefined;
      const briefs = await this.documentService.getAllBriefs(companyId, project);
      return NextResponse.json({ success: true, data: briefs });
    } catch (err: any) {
      console.error('[DocumentController] getBriefs error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createBrief(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.title) {
        return NextResponse.json({ success: false, message: 'Brief Title is required.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const brief = await this.documentService.createBrief(body, companyId, user);
      return NextResponse.json({ success: true, data: brief });
    } catch (err: any) {
      console.error('[DocumentController] createBrief error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async updateBrief(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const updated = await this.documentService.updateBrief(id, body, companyId);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[DocumentController] updateBrief error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteBrief(req: NextRequest, id: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const success = await this.documentService.deleteBrief(id, companyId);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Brief not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Brief deleted successfully.' });
    } catch (err: any) {
      console.error('[DocumentController] deleteBrief error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // ==========================================
  // MINUTES OF MEETING (MOM)
  // ==========================================
  async getMoms(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = this.getCompanyId(user, searchParams);
      const project = searchParams.get('project') || undefined;
      const moms = await this.documentService.getAllMoms(companyId, project);
      return NextResponse.json({ success: true, data: moms });
    } catch (err: any) {
      console.error('[DocumentController] getMoms error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createMom(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.title) {
        return NextResponse.json({ success: false, message: 'MOM Title is required.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const mom = await this.documentService.createMom(body, companyId, user);
      return NextResponse.json({ success: true, data: mom });
    } catch (err: any) {
      console.error('[DocumentController] createMom error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async updateMom(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const updated = await this.documentService.updateMom(id, body, companyId);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[DocumentController] updateMom error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteMom(req: NextRequest, id: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const success = await this.documentService.deleteMom(id, companyId);
      if (!success) {
        return NextResponse.json({ success: false, message: 'MOM record not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'MOM record deleted successfully.' });
    } catch (err: any) {
      console.error('[DocumentController] deleteMom error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // ==========================================
  // SITE INSPECTION REPORTS
  // ==========================================
  async getSiteReports(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = this.getCompanyId(user, searchParams);
      const project = searchParams.get('project') || undefined;
      const reports = await this.documentService.getAllSiteReports(companyId, project);
      return NextResponse.json({ success: true, data: reports });
    } catch (err: any) {
      console.error('[DocumentController] getSiteReports error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createSiteReport(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.title) {
        return NextResponse.json({ success: false, message: 'Site Report Title is required.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const report = await this.documentService.createSiteReport(body, companyId, user);
      return NextResponse.json({ success: true, data: report });
    } catch (err: any) {
      console.error('[DocumentController] createSiteReport error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async updateSiteReport(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const updated = await this.documentService.updateSiteReport(id, body, companyId);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[DocumentController] updateSiteReport error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteSiteReport(req: NextRequest, id: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const success = await this.documentService.deleteSiteReport(id, companyId);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Site Report not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Site Report deleted successfully.' });
    } catch (err: any) {
      console.error('[DocumentController] deleteSiteReport error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // ==========================================
  // MATERIAL APPROVAL SUBMITTALS (MAS)
  // ==========================================
  async getMaterialApprovals(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = this.getCompanyId(user, searchParams);
      const project = searchParams.get('project') || undefined;
      const submittals = await this.documentService.getAllMaterialApprovals(companyId, project);
      return NextResponse.json({ success: true, data: submittals });
    } catch (err: any) {
      console.error('[DocumentController] getMaterialApprovals error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createMaterialApproval(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.materialName) {
        return NextResponse.json({ success: false, message: 'Material Name is required.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const submittal = await this.documentService.createMaterialApproval(body, companyId, user);
      return NextResponse.json({ success: true, data: submittal });
    } catch (err: any) {
      console.error('[DocumentController] createMaterialApproval error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async reviewMaterialApproval(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const reviewed = await this.documentService.reviewMaterialApproval(id, body, companyId, user);
      return NextResponse.json({ success: true, data: reviewed });
    } catch (err: any) {
      console.error('[DocumentController] reviewMaterialApproval error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async updateMaterialApproval(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const updated = await this.documentService.updateMaterialApproval(id, body, companyId);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[DocumentController] updateMaterialApproval error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteMaterialApproval(req: NextRequest, id: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const success = await this.documentService.deleteMaterialApproval(id, companyId);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Material submittal not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Material submittal deleted successfully.' });
    } catch (err: any) {
      console.error('[DocumentController] deleteMaterialApproval error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // ==========================================
  // QA/QC CHECKLISTS
  // ==========================================
  async getQaqcChecklists(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = this.getCompanyId(user, searchParams);
      const category = searchParams.get('category') || undefined;
      const checklists = await this.documentService.getAllQaqcChecklists(companyId, category);
      return NextResponse.json({ success: true, data: checklists });
    } catch (err: any) {
      console.error('[DocumentController] getQaqcChecklists error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createQaqcChecklist(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.title) {
        return NextResponse.json({ success: false, message: 'Checklist Title is required.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const checklist = await this.documentService.createQaqcChecklist(body, companyId, user);
      return NextResponse.json({ success: true, data: checklist });
    } catch (err: any) {
      console.error('[DocumentController] createQaqcChecklist error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async updateQaqcChecklist(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const updated = await this.documentService.updateQaqcChecklist(id, body, companyId);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[DocumentController] updateQaqcChecklist error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteQaqcChecklist(req: NextRequest, id: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const success = await this.documentService.deleteQaqcChecklist(id, companyId);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Checklist not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Checklist deleted successfully.' });
    } catch (err: any) {
      console.error('[DocumentController] deleteQaqcChecklist error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // ==========================================
  // QA/QC AUDIT RUNS
  // ==========================================
  async getQaqcAudits(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = this.getCompanyId(user, searchParams);
      const project = searchParams.get('project') || undefined;
      const audits = await this.documentService.getAllQaqcAudits(companyId, project);
      return NextResponse.json({ success: true, data: audits });
    } catch (err: any) {
      console.error('[DocumentController] getQaqcAudits error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createQaqcAudit(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.checklistId) {
        return NextResponse.json({ success: false, message: 'Checklist ID is required to execute an audit.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const audit = await this.documentService.createQaqcAudit(body, companyId, user);
      return NextResponse.json({ success: true, data: audit });
    } catch (err: any) {
      console.error('[DocumentController] createQaqcAudit error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async updateQaqcAudit(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const updated = await this.documentService.updateQaqcAudit(id, body, companyId, user);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[DocumentController] updateQaqcAudit error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteQaqcAudit(req: NextRequest, id: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const success = await this.documentService.deleteQaqcAudit(id, companyId);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Audit run not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Audit run deleted successfully.' });
    } catch (err: any) {
      console.error('[DocumentController] deleteQaqcAudit error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
}
