import { getDataSource } from '../../../shared/config/data-source';
import {
  ClientBriefModel,
  MomModel,
  SiteReportModel,
  MaterialApprovalModel,
  QaqcChecklistModel,
  QaqcAuditModel
} from '../models';

export class DocumentService {
  private async getBriefRepo() {
    const ds = await getDataSource();
    return ds.getRepository(ClientBriefModel);
  }

  private async getMomRepo() {
    const ds = await getDataSource();
    return ds.getRepository(MomModel);
  }

  private async getSiteReportRepo() {
    const ds = await getDataSource();
    return ds.getRepository(SiteReportModel);
  }

  private async getMaterialApprovalRepo() {
    const ds = await getDataSource();
    return ds.getRepository(MaterialApprovalModel);
  }

  private async getQaqcChecklistRepo() {
    const ds = await getDataSource();
    return ds.getRepository(QaqcChecklistModel);
  }

  private async getQaqcAuditRepo() {
    const ds = await getDataSource();
    return ds.getRepository(QaqcAuditModel);
  }

  // ==========================================
  // CLIENT BRIEFS
  // ==========================================
  async getAllBriefs(companyId?: string, project?: string) {
    const repo = await this.getBriefRepo();
    const qb = repo.createQueryBuilder('brief');

    if (companyId) {
      qb.andWhere('(brief.companyId = :companyId OR brief.companyId IS NULL)', { companyId });
    }
    if (project) {
      qb.andWhere('LOWER(brief.project) = LOWER(:project)', { project });
    }

    qb.orderBy('brief.createdAt', 'DESC');
    return await qb.getMany();
  }

  async getBriefById(id: string) {
    const repo = await this.getBriefRepo();
    return await repo.findOne({ where: { id } });
  }

  async createBrief(data: any, companyId?: string, user?: any) {
    const repo = await this.getBriefRepo();
    const id = data.id || `CB-${Date.now().toString().slice(-4)}`;
    const uploader = data.uploadedBy || user?.name || user?.email || data.author || 'User';

    let brief = await repo.findOne({ where: { id } });
    if (!brief) {
      brief = repo.create({
        id,
        companyId: companyId || user?.companyId || null,
        branchId: data.branchId || user?.branchId || null,
        project: (data.project || '').toUpperCase(),
        title: data.title,
        author: data.author || uploader,
        uploadedBy: uploader,
        date: data.date || new Date().toISOString().split('T')[0],
        targetFreezeDate: data.targetFreezeDate || null,
        status: data.status || 'Draft',
        category: data.category || null,
        description: data.description || null,
        fileName: data.fileName || null,
        fileUrl: data.fileUrl || null,
        fileSize: data.fileSize ? Number(data.fileSize) : 0,
        fileType: data.fileType || null,
        uploadedAt: data.uploadedAt || new Date().toISOString(),
      });
    } else {
      Object.assign(brief, {
        project: data.project ? (data.project || '').toUpperCase() : brief.project,
        title: data.title ?? brief.title,
        author: data.author ?? brief.author,
        uploadedBy: uploader ?? brief.uploadedBy,
        date: data.date ?? brief.date,
        targetFreezeDate: data.targetFreezeDate ?? brief.targetFreezeDate,
        status: data.status ?? brief.status,
        category: data.category ?? brief.category,
        description: data.description ?? brief.description,
        fileName: data.fileName ?? brief.fileName,
        fileUrl: data.fileUrl ?? brief.fileUrl,
        fileSize: data.fileSize !== undefined ? Number(data.fileSize) : brief.fileSize,
        fileType: data.fileType ?? brief.fileType,
      });
    }

    return await repo.save(brief);
  }

  async updateBrief(id: string, data: any, companyId?: string) {
    const repo = await this.getBriefRepo();
    const brief = await repo.findOne({ where: { id } });
    if (!brief) {
      throw new Error(`Client brief with ID ${id} not found.`);
    }

    if (companyId && brief.companyId && brief.companyId !== companyId) {
      throw new Error('Access denied to update this brief.');
    }

    Object.assign(brief, {
      title: data.title ?? brief.title,
      project: data.project ? data.project.toUpperCase() : brief.project,
      author: data.author ?? brief.author,
      uploadedBy: data.uploadedBy ?? brief.uploadedBy,
      date: data.date ?? brief.date,
      targetFreezeDate: data.targetFreezeDate !== undefined ? data.targetFreezeDate : brief.targetFreezeDate,
      status: data.status ?? brief.status,
      category: data.category ?? brief.category,
      description: data.description ?? brief.description,
      fileName: data.fileName ?? brief.fileName,
      fileUrl: data.fileUrl ?? brief.fileUrl,
      fileSize: data.fileSize !== undefined ? Number(data.fileSize) : brief.fileSize,
      fileType: data.fileType ?? brief.fileType,
    });

    return await repo.save(brief);
  }

  async deleteBrief(id: string, companyId?: string) {
    const repo = await this.getBriefRepo();
    const brief = await repo.findOne({ where: { id } });
    if (!brief) {
      return false;
    }
    if (companyId && brief.companyId && brief.companyId !== companyId) {
      throw new Error('Access denied to delete this brief.');
    }
    await repo.remove(brief);
    return true;
  }

  // ==========================================
  // MINUTES OF MEETING (MOM)
  // ==========================================
  async getAllMoms(companyId?: string, project?: string) {
    const repo = await this.getMomRepo();
    const qb = repo.createQueryBuilder('mom');

    if (companyId) {
      qb.andWhere('(mom.companyId = :companyId OR mom.companyId IS NULL)', { companyId });
    }
    if (project) {
      qb.andWhere('LOWER(mom.project) = LOWER(:project)', { project });
    }

    qb.orderBy('mom.createdAt', 'DESC');
    const records = await qb.getMany();

    return records.map((m) => ({
      ...m,
      actionItems: m.actionItems
        ? typeof m.actionItems === 'string'
          ? (() => {
              try {
                return JSON.parse(m.actionItems);
              } catch {
                return [];
              }
            })()
          : m.actionItems
        : [],
    }));
  }

  async getMomById(id: string) {
    const repo = await this.getMomRepo();
    const record = await repo.findOne({ where: { id } });
    if (!record) return null;
    return {
      ...record,
      actionItems: record.actionItems
        ? typeof record.actionItems === 'string'
          ? (() => {
              try {
                return JSON.parse(record.actionItems);
              } catch {
                return [];
              }
            })()
          : record.actionItems
        : [],
    };
  }

  async createMom(data: any, companyId?: string, user?: any) {
    const repo = await this.getMomRepo();
    const id = data.id || `MOM-${Date.now().toString().slice(-4)}`;
    const uploader = data.uploadedBy || user?.name || user?.email || data.host || 'User';

    const actionItemsString = Array.isArray(data.actionItems)
      ? JSON.stringify(data.actionItems)
      : typeof data.actionItems === 'string'
      ? data.actionItems
      : '[]';

    let mom = await repo.findOne({ where: { id } });
    if (!mom) {
      mom = repo.create({
        id,
        companyId: companyId || user?.companyId || null,
        branchId: data.branchId || user?.branchId || null,
        project: (data.project || '').toUpperCase(),
        title: data.title,
        host: data.host || uploader,
        uploadedBy: uploader,
        date: data.date || new Date().toISOString().split('T')[0],
        time: data.time || null,
        location: data.location || null,
        meetingType: data.meetingType || 'Internal',
        attendees: data.attendees || null,
        discussionSummary: data.discussionSummary || null,
        actionItems: actionItemsString,
        fileName: data.fileName || null,
        fileUrl: data.fileUrl || null,
        fileSize: data.fileSize ? Number(data.fileSize) : 0,
        fileType: data.fileType || null,
        uploadedAt: data.uploadedAt || new Date().toISOString(),
      });
    } else {
      Object.assign(mom, {
        project: data.project ? (data.project || '').toUpperCase() : mom.project,
        title: data.title ?? mom.title,
        host: data.host ?? mom.host,
        uploadedBy: uploader ?? mom.uploadedBy,
        date: data.date ?? mom.date,
        time: data.time ?? mom.time,
        location: data.location ?? mom.location,
        meetingType: data.meetingType ?? mom.meetingType,
        attendees: data.attendees ?? mom.attendees,
        discussionSummary: data.discussionSummary ?? mom.discussionSummary,
        actionItems: actionItemsString,
        fileName: data.fileName ?? mom.fileName,
        fileUrl: data.fileUrl ?? mom.fileUrl,
        fileSize: data.fileSize !== undefined ? Number(data.fileSize) : mom.fileSize,
        fileType: data.fileType ?? mom.fileType,
      });
    }

    const saved = await repo.save(mom);
    return {
      ...saved,
      actionItems: Array.isArray(data.actionItems) ? data.actionItems : JSON.parse(saved.actionItems || '[]'),
    };
  }

  async updateMom(id: string, data: any, companyId?: string) {
    const repo = await this.getMomRepo();
    const mom = await repo.findOne({ where: { id } });
    if (!mom) {
      throw new Error(`MOM record with ID ${id} not found.`);
    }

    if (companyId && mom.companyId && mom.companyId !== companyId) {
      throw new Error('Access denied to update this MOM.');
    }

    const actionItemsString =
      data.actionItems !== undefined
        ? Array.isArray(data.actionItems)
          ? JSON.stringify(data.actionItems)
          : data.actionItems
        : mom.actionItems;

    Object.assign(mom, {
      title: data.title ?? mom.title,
      project: data.project ? data.project.toUpperCase() : mom.project,
      host: data.host ?? mom.host,
      uploadedBy: data.uploadedBy ?? mom.uploadedBy,
      date: data.date ?? mom.date,
      time: data.time ?? mom.time,
      location: data.location ?? mom.location,
      meetingType: data.meetingType ?? mom.meetingType,
      attendees: data.attendees ?? mom.attendees,
      discussionSummary: data.discussionSummary ?? mom.discussionSummary,
      actionItems: actionItemsString,
      fileName: data.fileName ?? mom.fileName,
      fileUrl: data.fileUrl ?? mom.fileUrl,
      fileSize: data.fileSize !== undefined ? Number(data.fileSize) : mom.fileSize,
      fileType: data.fileType ?? mom.fileType,
    });

    const saved = await repo.save(mom);
    return {
      ...saved,
      actionItems: saved.actionItems
        ? typeof saved.actionItems === 'string'
          ? (() => {
              try {
                return JSON.parse(saved.actionItems);
              } catch {
                return [];
              }
            })()
          : saved.actionItems
        : [],
    };
  }

  async deleteMom(id: string, companyId?: string) {
    const repo = await this.getMomRepo();
    const mom = await repo.findOne({ where: { id } });
    if (!mom) {
      return false;
    }
    if (companyId && mom.companyId && mom.companyId !== companyId) {
      throw new Error('Access denied to delete this MOM.');
    }
    await repo.remove(mom);
    return true;
  }

  // ==========================================
  // SITE INSPECTION REPORTS
  // ==========================================
  async getAllSiteReports(companyId?: string, project?: string) {
    const repo = await this.getSiteReportRepo();
    const qb = repo.createQueryBuilder('sr');

    if (companyId) {
      qb.andWhere('(sr.companyId = :companyId OR sr.companyId IS NULL)', { companyId });
    }
    if (project) {
      qb.andWhere('LOWER(sr.project) = LOWER(:project)', { project });
    }

    qb.orderBy('sr.createdAt', 'DESC');
    const records = await qb.getMany();

    return records.map((r) => ({
      ...r,
      photos: r.photos
        ? typeof r.photos === 'string'
          ? (() => {
              try {
                return JSON.parse(r.photos);
              } catch {
                return [];
              }
            })()
          : r.photos
        : [],
    }));
  }

  async getSiteReportById(id: string) {
    const repo = await this.getSiteReportRepo();
    const record = await repo.findOne({ where: { id } });
    if (!record) return null;
    return {
      ...record,
      photos: record.photos
        ? typeof record.photos === 'string'
          ? (() => {
              try {
                return JSON.parse(record.photos);
              } catch {
                return [];
              }
            })()
          : record.photos
        : [],
    };
  }

  async createSiteReport(data: any, companyId?: string, user?: any) {
    const repo = await this.getSiteReportRepo();
    const id = data.id || `SR-${Date.now().toString().slice(-4)}`;
    const uploader = data.uploadedBy || user?.name || user?.email || data.inspector || 'Inspector';

    const photosString = Array.isArray(data.photos)
      ? JSON.stringify(data.photos)
      : typeof data.photos === 'string'
      ? data.photos
      : '[]';

    let report = await repo.findOne({ where: { id } });
    if (!report) {
      report = repo.create({
        id,
        companyId: companyId || user?.companyId || null,
        branchId: data.branchId || user?.branchId || null,
        project: (data.project || '').toUpperCase(),
        title: data.title,
        inspector: data.inspector || uploader,
        uploadedBy: uploader,
        date: data.date || new Date().toISOString().split('T')[0],
        location: data.location || '',
        compliance: data.compliance || 'Compliant',
        stageOfWork: data.stageOfWork || null,
        weatherConditions: data.weatherConditions || null,
        observations: data.observations || null,
        recommendations: data.recommendations || null,
        photos: photosString,
        fileName: data.fileName || null,
        fileUrl: data.fileUrl || null,
        fileSize: data.fileSize ? Number(data.fileSize) : 0,
        fileType: data.fileType || null,
      });
    } else {
      Object.assign(report, {
        project: data.project ? (data.project || '').toUpperCase() : report.project,
        title: data.title ?? report.title,
        inspector: data.inspector ?? report.inspector,
        uploadedBy: uploader ?? report.uploadedBy,
        date: data.date ?? report.date,
        location: data.location ?? report.location,
        compliance: data.compliance ?? report.compliance,
        stageOfWork: data.stageOfWork ?? report.stageOfWork,
        weatherConditions: data.weatherConditions ?? report.weatherConditions,
        observations: data.observations ?? report.observations,
        recommendations: data.recommendations ?? report.recommendations,
        photos: photosString,
        fileName: data.fileName ?? report.fileName,
        fileUrl: data.fileUrl ?? report.fileUrl,
        fileSize: data.fileSize !== undefined ? Number(data.fileSize) : report.fileSize,
        fileType: data.fileType ?? report.fileType,
      });
    }

    const saved = await repo.save(report);
    return {
      ...saved,
      photos: Array.isArray(data.photos) ? data.photos : JSON.parse(saved.photos || '[]'),
    };
  }

  async updateSiteReport(id: string, data: any, companyId?: string) {
    const repo = await this.getSiteReportRepo();
    const report = await repo.findOne({ where: { id } });
    if (!report) {
      throw new Error(`Site report with ID ${id} not found.`);
    }

    if (companyId && report.companyId && report.companyId !== companyId) {
      throw new Error('Access denied to update this report.');
    }

    const photosString =
      data.photos !== undefined
        ? Array.isArray(data.photos)
          ? JSON.stringify(data.photos)
          : data.photos
        : report.photos;

    Object.assign(report, {
      title: data.title ?? report.title,
      project: data.project ? data.project.toUpperCase() : report.project,
      inspector: data.inspector ?? report.inspector,
      uploadedBy: data.uploadedBy ?? report.uploadedBy,
      date: data.date ?? report.date,
      location: data.location ?? report.location,
      compliance: data.compliance ?? report.compliance,
      stageOfWork: data.stageOfWork ?? report.stageOfWork,
      weatherConditions: data.weatherConditions ?? report.weatherConditions,
      observations: data.observations ?? report.observations,
      recommendations: data.recommendations ?? report.recommendations,
      photos: photosString,
      fileName: data.fileName ?? report.fileName,
      fileUrl: data.fileUrl ?? report.fileUrl,
      fileSize: data.fileSize !== undefined ? Number(data.fileSize) : report.fileSize,
      fileType: data.fileType ?? report.fileType,
    });

    const saved = await repo.save(report);
    return {
      ...saved,
      photos: saved.photos
        ? typeof saved.photos === 'string'
          ? (() => {
              try {
                return JSON.parse(saved.photos);
              } catch {
                return [];
              }
            })()
          : saved.photos
        : [],
    };
  }

  async deleteSiteReport(id: string, companyId?: string) {
    const repo = await this.getSiteReportRepo();
    const report = await repo.findOne({ where: { id } });
    if (!report) {
      return false;
    }
    if (companyId && report.companyId && report.companyId !== companyId) {
      throw new Error('Access denied to delete this site report.');
    }
    await repo.remove(report);
    return true;
  }

  // ==========================================
  // MATERIAL APPROVAL SUBMITTALS (MAS)
  // ==========================================
  async getAllMaterialApprovals(companyId?: string, project?: string) {
    const repo = await this.getMaterialApprovalRepo();
    const qb = repo.createQueryBuilder('mas');

    if (companyId) {
      qb.andWhere('(mas.companyId = :companyId OR mas.companyId IS NULL)', { companyId });
    }
    if (project) {
      qb.andWhere('LOWER(TRIM(mas.project)) = LOWER(TRIM(:project))', { project });
    }

    qb.orderBy('mas.createdAt', 'DESC');
    return await qb.getMany();
  }

  async getMaterialApprovalById(id: string) {
    const repo = await this.getMaterialApprovalRepo();
    return await repo.findOne({ where: { id } });
  }

  async createMaterialApproval(data: any, companyId?: string, user?: any) {
    const repo = await this.getMaterialApprovalRepo();
    const id = data.id || `MAS-${Date.now().toString().slice(-4)}`;
    const uploader = data.uploadedBy || user?.name || user?.email || data.submittedBy || 'Contractor';

    let mas = await repo.findOne({ where: { id } });
    if (!mas) {
      mas = repo.create({
        id,
        companyId: companyId || user?.companyId || null,
        branchId: data.branchId || user?.branchId || null,
        project: (data.project || '').trim().toUpperCase(),
        materialName: data.materialName,
        category: data.category || 'Architectural Finishes',
        specifiedBrand: data.specifiedBrand || null,
        proposedBrand: data.proposedBrand || '',
        manufacturer: data.manufacturer || null,
        supplierOrVendor: data.supplierOrVendor || null,
        locationOrUsage: data.locationOrUsage || null,
        sampleSubmitted: !!data.sampleSubmitted,
        sampleStatus: data.sampleStatus || (data.sampleSubmitted ? 'Physical Sample Submitted' : 'Spec-Sheet Only'),
        complianceStatus: data.complianceStatus || 'Pending Review',
        submissionDate: data.submissionDate || new Date().toISOString().split('T')[0],
        submittedBy: data.submittedBy || uploader,
        uploadedBy: uploader,
        reviewerComments: data.reviewerComments || null,
        reviewedBy: data.reviewedBy || null,
        reviewedAt: data.reviewedAt || null,
        specSheetUrl: data.specSheetUrl || null,
        specSheetName: data.specSheetName || null,
        testCertificateUrl: data.testCertificateUrl || null,
        testCertificateName: data.testCertificateName || null,
        samplePhotoUrl: data.samplePhotoUrl || null,
        samplePhotoName: data.samplePhotoName || null,
        fileSize: data.fileSize ? Number(data.fileSize) : 0,
        description: data.description || null,
      });
    } else {
      Object.assign(mas, {
        project: data.project ? (data.project || '').trim().toUpperCase() : mas.project,
        materialName: data.materialName ?? mas.materialName,
        category: data.category ?? mas.category,
        specifiedBrand: data.specifiedBrand ?? mas.specifiedBrand,
        proposedBrand: data.proposedBrand ?? mas.proposedBrand,
        manufacturer: data.manufacturer ?? mas.manufacturer,
        supplierOrVendor: data.supplierOrVendor ?? mas.supplierOrVendor,
        locationOrUsage: data.locationOrUsage ?? mas.locationOrUsage,
        sampleSubmitted: data.sampleSubmitted !== undefined ? !!data.sampleSubmitted : mas.sampleSubmitted,
        sampleStatus: data.sampleStatus ?? mas.sampleStatus,
        complianceStatus: data.complianceStatus ?? mas.complianceStatus,
        submissionDate: data.submissionDate ?? mas.submissionDate,
        submittedBy: data.submittedBy ?? mas.submittedBy,
        uploadedBy: uploader ?? mas.uploadedBy,
        reviewerComments: data.reviewerComments ?? mas.reviewerComments,
        reviewedBy: data.reviewedBy ?? mas.reviewedBy,
        reviewedAt: data.reviewedAt ?? mas.reviewedAt,
        specSheetUrl: data.specSheetUrl ?? mas.specSheetUrl,
        specSheetName: data.specSheetName ?? mas.specSheetName,
        testCertificateUrl: data.testCertificateUrl ?? mas.testCertificateUrl,
        testCertificateName: data.testCertificateName ?? mas.testCertificateName,
        samplePhotoUrl: data.samplePhotoUrl ?? mas.samplePhotoUrl,
        samplePhotoName: data.samplePhotoName ?? mas.samplePhotoName,
        fileSize: data.fileSize !== undefined ? Number(data.fileSize) : mas.fileSize,
        description: data.description ?? mas.description,
      });
    }

    return await repo.save(mas);
  }

  async reviewMaterialApproval(id: string, reviewData: any, companyId?: string, user?: any) {
    const repo = await this.getMaterialApprovalRepo();
    const mas = await repo.findOne({ where: { id } });
    if (!mas) {
      throw new Error(`Material submittal with ID ${id} not found.`);
    }

    if (companyId && mas.companyId && mas.companyId !== companyId) {
      throw new Error('Access denied to review this submittal.');
    }

    const reviewerName = reviewData.reviewedBy || user?.name || user?.email || 'Architect Reviewer';

    Object.assign(mas, {
      complianceStatus: reviewData.complianceStatus || reviewData.status || mas.complianceStatus,
      reviewerComments: reviewData.reviewerComments ?? reviewData.comments ?? mas.reviewerComments,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
    });

    return await repo.save(mas);
  }

  async updateMaterialApproval(id: string, data: any, companyId?: string) {
    const repo = await this.getMaterialApprovalRepo();
    const mas = await repo.findOne({ where: { id } });
    if (!mas) {
      throw new Error(`Material submittal with ID ${id} not found.`);
    }

    if (companyId && mas.companyId && mas.companyId !== companyId) {
      throw new Error('Access denied to update this submittal.');
    }

    Object.assign(mas, {
      project: data.project ? (data.project || '').trim().toUpperCase() : mas.project,
      materialName: data.materialName ?? mas.materialName,
      category: data.category ?? mas.category,
      specifiedBrand: data.specifiedBrand ?? mas.specifiedBrand,
      proposedBrand: data.proposedBrand ?? mas.proposedBrand,
      manufacturer: data.manufacturer ?? mas.manufacturer,
      supplierOrVendor: data.supplierOrVendor ?? mas.supplierOrVendor,
      locationOrUsage: data.locationOrUsage ?? mas.locationOrUsage,
      sampleSubmitted: data.sampleSubmitted !== undefined ? !!data.sampleSubmitted : mas.sampleSubmitted,
      sampleStatus: data.sampleStatus ?? mas.sampleStatus,
      complianceStatus: data.complianceStatus ?? mas.complianceStatus,
      submissionDate: data.submissionDate ?? mas.submissionDate,
      submittedBy: data.submittedBy ?? mas.submittedBy,
      uploadedBy: data.uploadedBy ?? mas.uploadedBy,
      reviewerComments: data.reviewerComments ?? mas.reviewerComments,
      reviewedBy: data.reviewedBy ?? mas.reviewedBy,
      reviewedAt: data.reviewedAt ?? mas.reviewedAt,
      specSheetUrl: data.specSheetUrl ?? mas.specSheetUrl,
      specSheetName: data.specSheetName ?? mas.specSheetName,
      testCertificateUrl: data.testCertificateUrl ?? mas.testCertificateUrl,
      testCertificateName: data.testCertificateName ?? mas.testCertificateName,
      samplePhotoUrl: data.samplePhotoUrl ?? mas.samplePhotoUrl,
      samplePhotoName: data.samplePhotoName ?? mas.samplePhotoName,
      fileSize: data.fileSize !== undefined ? Number(data.fileSize) : mas.fileSize,
      description: data.description ?? mas.description,
    });

    return await repo.save(mas);
  }

  async deleteMaterialApproval(id: string, companyId?: string) {
    const repo = await this.getMaterialApprovalRepo();
    const mas = await repo.findOne({ where: { id } });
    if (!mas) {
      return false;
    }
    if (companyId && mas.companyId && mas.companyId !== companyId) {
      throw new Error('Access denied to delete this submittal.');
    }
    await repo.remove(mas);
    return true;
  }

  // ==========================================
  // QA/QC CHECKLISTS
  // ==========================================
  async getAllQaqcChecklists(companyId?: string, category?: string) {
    await this.ensureDefaultQaqcChecklistsSeeded();
    const repo = await this.getQaqcChecklistRepo();
    const qb = repo.createQueryBuilder('chk');

    if (companyId) {
      qb.andWhere('(chk.companyId = :companyId OR chk.companyId IS NULL)', { companyId });
    }
    if (category && category !== 'ALL') {
      qb.andWhere('chk.category = :category', { category });
    }

    qb.orderBy('chk.createdAt', 'ASC');
    const records = await qb.getMany();
    return records.map((r) => ({
      ...r,
      checkpoints: typeof r.checkpoints === 'string' ? JSON.parse(r.checkpoints || '[]') : r.checkpoints,
    }));
  }

  async getQaqcChecklistById(id: string) {
    const repo = await this.getQaqcChecklistRepo();
    const record = await repo.findOne({ where: { id } });
    if (!record) return null;
    return {
      ...record,
      checkpoints: typeof record.checkpoints === 'string' ? JSON.parse(record.checkpoints || '[]') : record.checkpoints,
    };
  }

  async createQaqcChecklist(data: any, companyId?: string, user?: any) {
    const repo = await this.getQaqcChecklistRepo();
    const id = data.id || `QAC-${Date.now().toString().slice(-4)}`;
    const checkpointsString = Array.isArray(data.checkpoints)
      ? JSON.stringify(data.checkpoints)
      : typeof data.checkpoints === 'string'
      ? data.checkpoints
      : '[]';

    const checklist = repo.create({
      id,
      companyId: companyId || user?.companyId || null,
      branchId: data.branchId || user?.branchId || null,
      code: data.code || `SSA-QA-${Date.now().toString().slice(-4)}`,
      title: data.title,
      category: data.category || 'Architectural Finishes',
      discipline: data.discipline || 'Architecture',
      standardReference: data.standardReference || null,
      description: data.description || null,
      checkpoints: checkpointsString,
      isActive: data.isActive !== undefined ? !!data.isActive : true,
      createdBy: user?.name || user?.email || 'Lead QA/QC Auditor',
    });

    const saved = await repo.save(checklist);
    return {
      ...saved,
      checkpoints: Array.isArray(data.checkpoints) ? data.checkpoints : JSON.parse(saved.checkpoints || '[]'),
    };
  }

  async updateQaqcChecklist(id: string, data: any, companyId?: string) {
    const repo = await this.getQaqcChecklistRepo();
    const checklist = await repo.findOne({ where: { id } });
    if (!checklist) {
      throw new Error(`QA/QC Checklist with ID ${id} not found.`);
    }

    if (companyId && checklist.companyId && checklist.companyId !== companyId) {
      throw new Error('Access denied to update this checklist.');
    }

    const checkpointsString =
      data.checkpoints !== undefined
        ? Array.isArray(data.checkpoints)
          ? JSON.stringify(data.checkpoints)
          : data.checkpoints
        : checklist.checkpoints;

    Object.assign(checklist, {
      title: data.title ?? checklist.title,
      code: data.code ?? checklist.code,
      category: data.category ?? checklist.category,
      discipline: data.discipline ?? checklist.discipline,
      standardReference: data.standardReference ?? checklist.standardReference,
      description: data.description ?? checklist.description,
      checkpoints: checkpointsString,
      isActive: data.isActive !== undefined ? !!data.isActive : checklist.isActive,
    });

    const saved = await repo.save(checklist);
    return {
      ...saved,
      checkpoints: JSON.parse(saved.checkpoints || '[]'),
    };
  }

  async deleteQaqcChecklist(id: string, companyId?: string) {
    const repo = await this.getQaqcChecklistRepo();
    const checklist = await repo.findOne({ where: { id } });
    if (!checklist) return false;
    if (companyId && checklist.companyId && checklist.companyId !== companyId) {
      throw new Error('Access denied to delete this checklist.');
    }
    await repo.remove(checklist);
    return true;
  }

  // ==========================================
  // QA/QC AUDIT RUNS
  // ==========================================
  async getAllQaqcAudits(companyId?: string, project?: string) {
    const repo = await this.getQaqcAuditRepo();
    const qb = repo.createQueryBuilder('aud');

    if (companyId) {
      qb.andWhere('(aud.companyId = :companyId OR aud.companyId IS NULL)', { companyId });
    }
    if (project) {
      qb.andWhere('LOWER(TRIM(aud.project)) = LOWER(TRIM(:project))', { project });
    }

    qb.orderBy('aud.createdAt', 'DESC');
    const records = await qb.getMany();
    return records.map((a) => ({
      ...a,
      itemsResult: typeof a.itemsResult === 'string' ? JSON.parse(a.itemsResult || '[]') : a.itemsResult,
      ncrs: typeof a.ncrs === 'string' ? JSON.parse(a.ncrs || '[]') : a.ncrs,
    }));
  }

  async getQaqcAuditById(id: string) {
    const repo = await this.getQaqcAuditRepo();
    const record = await repo.findOne({ where: { id } });
    if (!record) return null;
    return {
      ...record,
      itemsResult: typeof record.itemsResult === 'string' ? JSON.parse(record.itemsResult || '[]') : record.itemsResult,
      ncrs: typeof record.ncrs === 'string' ? JSON.parse(record.ncrs || '[]') : record.ncrs,
    };
  }

  async createQaqcAudit(data: any, companyId?: string, user?: any) {
    const repo = await this.getQaqcAuditRepo();
    const id = data.id || `AUD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const uploader = user?.name || user?.email || data.auditorName || 'Quality Auditor';

    const itemsResultString = Array.isArray(data.itemsResult)
      ? JSON.stringify(data.itemsResult)
      : typeof data.itemsResult === 'string'
      ? data.itemsResult
      : '[]';

    const ncrsString = Array.isArray(data.ncrs)
      ? JSON.stringify(data.ncrs)
      : typeof data.ncrs === 'string'
      ? data.ncrs
      : '[]';

    const audit = repo.create({
      id,
      companyId: companyId || user?.companyId || null,
      branchId: data.branchId || user?.branchId || null,
      project: (data.project || 'PRJ-001').trim().toUpperCase(),
      checklistId: data.checklistId,
      checklistTitle: data.checklistTitle,
      category: data.category || 'General QA/QC',
      location: data.location || 'Site Inspection',
      auditDate: data.auditDate || new Date().toISOString().split('T')[0],
      auditorName: data.auditorName || uploader,
      auditorRole: data.auditorRole || 'Lead QA/QC Auditor',
      complianceScore: typeof data.complianceScore === 'number' ? data.complianceScore : 100,
      status: data.status || 'Passed',
      totalItems: Number(data.totalItems || 0),
      passedItems: Number(data.passedItems || 0),
      failedItems: Number(data.failedItems || 0),
      concessionItems: Number(data.concessionItems || 0),
      naItems: Number(data.naItems || 0),
      itemsResult: itemsResultString,
      ncrs: ncrsString,
      leadSignOffName: data.leadSignOffName || null,
      leadSignOffDate: data.leadSignOffDate || null,
      pmSignOffName: data.pmSignOffName || null,
      summaryComments: data.summaryComments || null,
    });

    const saved = await repo.save(audit);
    return {
      ...saved,
      itemsResult: Array.isArray(data.itemsResult) ? data.itemsResult : JSON.parse(saved.itemsResult || '[]'),
      ncrs: Array.isArray(data.ncrs) ? data.ncrs : JSON.parse(saved.ncrs || '[]'),
    };
  }

  async updateQaqcAudit(id: string, data: any, companyId?: string, user?: any) {
    const repo = await this.getQaqcAuditRepo();
    const audit = await repo.findOne({ where: { id } });
    if (!audit) {
      throw new Error(`QA/QC Audit with ID ${id} not found.`);
    }

    if (companyId && audit.companyId && audit.companyId !== companyId) {
      throw new Error('Access denied to update this audit run.');
    }

    const itemsResultString =
      data.itemsResult !== undefined
        ? Array.isArray(data.itemsResult)
          ? JSON.stringify(data.itemsResult)
          : data.itemsResult
        : audit.itemsResult;

    const ncrsString =
      data.ncrs !== undefined
        ? Array.isArray(data.ncrs)
          ? JSON.stringify(data.ncrs)
          : data.ncrs
        : audit.ncrs;

    Object.assign(audit, {
      project: data.project ? (data.project || '').trim().toUpperCase() : audit.project,
      location: data.location ?? audit.location,
      complianceScore: data.complianceScore !== undefined ? Number(data.complianceScore) : audit.complianceScore,
      status: data.status ?? audit.status,
      totalItems: data.totalItems !== undefined ? Number(data.totalItems) : audit.totalItems,
      passedItems: data.passedItems !== undefined ? Number(data.passedItems) : audit.passedItems,
      failedItems: data.failedItems !== undefined ? Number(data.failedItems) : audit.failedItems,
      concessionItems: data.concessionItems !== undefined ? Number(data.concessionItems) : audit.concessionItems,
      naItems: data.naItems !== undefined ? Number(data.naItems) : audit.naItems,
      itemsResult: itemsResultString,
      ncrs: ncrsString,
      leadSignOffName: data.leadSignOffName ?? audit.leadSignOffName,
      leadSignOffDate: data.leadSignOffDate ?? audit.leadSignOffDate,
      pmSignOffName: data.pmSignOffName ?? audit.pmSignOffName,
      summaryComments: data.summaryComments ?? audit.summaryComments,
    });

    const saved = await repo.save(audit);
    return {
      ...saved,
      itemsResult: JSON.parse(saved.itemsResult || '[]'),
      ncrs: JSON.parse(saved.ncrs || '[]'),
    };
  }

  async deleteQaqcAudit(id: string, companyId?: string) {
    const repo = await this.getQaqcAuditRepo();
    const audit = await repo.findOne({ where: { id } });
    if (!audit) return false;
    if (companyId && audit.companyId && audit.companyId !== companyId) {
      throw new Error('Access denied to delete this audit run.');
    }
    await repo.remove(audit);
    return true;
  }

  // ==========================================
  // SEED DEFAULT QA/QC CHECKLISTS
  // ==========================================
  async ensureDefaultQaqcChecklistsSeeded() {
    try {
      const repo = await this.getQaqcChecklistRepo();
      const count = await repo.count();
      if (count > 0) return;

      const defaultChecklists = [
        {
          id: 'QAC-001',
          code: 'SSA-QA-ARC-01',
          title: 'Architectural Finishes & Joinery Quality Checklist',
          category: 'Architectural Finishes',
          discipline: 'Architecture & Interiors',
          standardReference: 'IS 1443, IS 2114, CPWD Specs Vol II',
          description: 'Comprehensive inspection checklist for wall finishes, flooring, tiling, joinery, doors, and hardware prior to handover.',
          checkpoints: JSON.stringify([
            { id: 'CK-ARC-1', code: 'ARC-1.1', title: 'Tile Alignment & Lippage', acceptanceCriteria: 'Zero lippage (>0.5mm max tolerance); joint width uniform (3mm) with epoxy grout.', referenceStandard: 'IS 1443', severity: 'Critical' },
            { id: 'CK-ARC-2', code: 'ARC-1.2', title: 'Door & Window Frame Plumbness', acceptanceCriteria: 'Vertical plumb within 2mm per 2m height; rebate diagonal squareness verified.', referenceStandard: 'IS 1003', severity: 'Major' },
            { id: 'CK-ARC-3', code: 'ARC-1.3', title: 'Wall Skirting & Dado Flushness', acceptanceCriteria: 'Skirting aligned true with floor; silicone seal at junction without voids.', referenceStandard: 'CPWD 11.2', severity: 'Minor' },
            { id: 'CK-ARC-4', code: 'ARC-1.4', title: 'Paint Coating & Surface Texture', acceptanceCriteria: 'Uniform sheen, zero roller streaks, peeling, or pinholes; DFT conforms to spec.', referenceStandard: 'IS 2932', severity: 'Major' },
            { id: 'CK-ARC-5', code: 'ARC-1.5', title: 'Sanitary Fixtures & Silicon Watertightness', acceptanceCriteria: 'All fittings level, anti-fungal silicon sealed; zero leaks at 3 bar static head.', referenceStandard: 'IS 2556', severity: 'Critical' },
            { id: 'CK-ARC-6', code: 'ARC-1.6', title: 'False Ceiling Level & Perimeter Beading', acceptanceCriteria: 'Gypsum grid deflection < L/360; shadow gap perimeter true to laser level.', referenceStandard: 'IS 2095', severity: 'Minor' },
          ]),
          isActive: true,
          createdBy: 'SSA System Standard',
        },
        {
          id: 'QAC-002',
          code: 'SSA-QA-STR-02',
          title: 'Structural RCC & Concreting Quality Audit',
          category: 'Structural RCC & Concreting',
          discipline: 'Structural Engineering',
          standardReference: 'IS 456:2000, IS 1199, IS 516',
          description: 'Pre-pour shuttering, reinforcement inspection, slump verification, and post-pour cube strength testing standards.',
          checkpoints: JSON.stringify([
            { id: 'CK-STR-1', code: 'STR-2.1', title: 'Shuttering Rigidity & Release Agent', acceptanceCriteria: 'Plywood formwork sealed against slurry leak; no excessive oil pooling.', referenceStandard: 'IS 14687', severity: 'Major' },
            { id: 'CK-STR-2', code: 'STR-2.2', title: 'Rebar Cover & Lap Lengths', acceptanceCriteria: 'Cover blocks (slab 25mm, beam 30mm, col 40mm); laps 50d staggered at min 1.3L.', referenceStandard: 'IS 456 Cl 26.2', severity: 'Critical' },
            { id: 'CK-STR-3', code: 'STR-2.3', title: 'Concrete Slump Test at Discharge', acceptanceCriteria: 'Slump 100-120mm for pumped mix; checked every transit mixer batch.', referenceStandard: 'IS 1199', severity: 'Critical' },
            { id: 'CK-STR-4', code: 'STR-2.4', title: 'Cube Compressive Strength Sampling', acceptanceCriteria: '6 concrete cubes cast per 50m3 pour (tested at 7-day and 28-day curing).', referenceStandard: 'IS 516', severity: 'Critical' },
            { id: 'CK-STR-5', code: 'STR-2.5', title: 'Compaction & Needle Vibration', acceptanceCriteria: 'Thorough vibration without rebar contact; zero honeycombing or cold joints.', referenceStandard: 'IS 456 Cl 13.3', severity: 'Critical' },
            { id: 'CK-STR-6', code: 'STR-2.6', title: 'Ponding & Curing Maintenance', acceptanceCriteria: 'Continuous wet hessian or 50mm ponding maintained for minimum 14 days.', referenceStandard: 'IS 456 Cl 13.5', severity: 'Major' },
          ]),
          isActive: true,
          createdBy: 'SSA System Standard',
        },
        {
          id: 'QAC-003',
          code: 'SSA-QA-MEP-03',
          title: 'MEP & Building Services Installation Audit',
          category: 'MEP & Building Services',
          discipline: 'MEP Services',
          standardReference: 'NBC 2016 Part 8, IS 732, IS 1239',
          description: 'Plumbing hydrostatic pressure test, electrical circuit insulation, DB earthing, and HVAC duct air-leakage audit.',
          checkpoints: JSON.stringify([
            { id: 'CK-MEP-1', code: 'MEP-3.1', title: 'Plumbing Hydrostatic Pressure Test', acceptanceCriteria: 'Pressurized at 10 kg/cm² for 4 hours; zero pressure drop across test manifold.', referenceStandard: 'IS 1239 Part 1', severity: 'Critical' },
            { id: 'CK-MEP-2', code: 'MEP-3.2', title: 'Gravity Drainage Pipe Slope', acceptanceCriteria: 'Gradient min 1:50 for 100mm dia and 1:100 for 150mm dia soil waste pipes.', referenceStandard: 'NBC Part 9', severity: 'Major' },
            { id: 'CK-MEP-3', code: 'MEP-3.3', title: 'Conduit Concealment & Plaster Depth', acceptanceCriteria: 'PVC conduits chased into masonry min 25mm beneath finish plaster line.', referenceStandard: 'IS 732', severity: 'Minor' },
            { id: 'CK-MEP-4', code: 'MEP-3.4', title: 'Electrical DB Earthing & Megger Insulation', acceptanceCriteria: 'Insulation resistance > 1 MΩ; dual earthing pit continuity verified < 1.0 Ω.', referenceStandard: 'IS 3043', severity: 'Critical' },
            { id: 'CK-MEP-5', code: 'MEP-3.5', title: 'HVAC Duct Thermal Insulation & Damper Access', acceptanceCriteria: 'Zero air leakage; 600x600mm unobstructed ceiling access doors at all VAVs.', referenceStandard: 'SMACNA Standards', severity: 'Major' },
          ]),
          isActive: true,
          createdBy: 'SSA System Standard',
        },
        {
          id: 'QAC-004',
          code: 'SSA-QA-WTR-04',
          title: 'Waterproofing & Wet Area Flood Test Checklist',
          category: 'Waterproofing & Damp-Proofing',
          discipline: 'Civil & Waterproofing',
          standardReference: 'IS 1346, IS 3067, CPWD 12.0',
          description: 'Substrate preparation, polymer coving, pipe collar injection, and 48-hour standing water ponding test.',
          checkpoints: JSON.stringify([
            { id: 'CK-WTR-1', code: 'WTR-4.1', title: 'Substrate Cleaning & 45° Angle Fillet Coving', acceptanceCriteria: 'All dust, laitance removed; 75x75mm cementitious fillet at floor-wall junctions.', referenceStandard: 'IS 3067', severity: 'Major' },
            { id: 'CK-WTR-2', code: 'WTR-4.2', title: 'Pipe Penetration Collar Sealant', acceptanceCriteria: 'Non-shrink polymer PU grout injected around all sunken plumbing core-cuts.', referenceStandard: 'ASTM C920', severity: 'Critical' },
            { id: 'CK-WTR-3', code: 'WTR-4.3', title: '48-Hour Hydrostatic Ponding Test', acceptanceCriteria: 'Sunken slab flooded with 50mm clean water for 48 hours; zero bottom slab dampness.', referenceStandard: 'CPWD 12.3', severity: 'Critical' },
            { id: 'CK-WTR-4', code: 'WTR-4.4', title: 'Protective Screed Layer Over Coating', acceptanceCriteria: '1:4 cement screed laid over cured membrane before subsequent trade traffic.', referenceStandard: 'IS 1346', severity: 'Major' },
          ]),
          isActive: true,
          createdBy: 'SSA System Standard',
        },
        {
          id: 'QAC-005',
          code: 'SSA-CAD-CK-04',
          title: 'Drawing & CAD/BIM QA/QC Publishing Checklist',
          category: 'Drawing & CAD QA/QC',
          discipline: 'CAD/BIM Studio',
          standardReference: 'ISO 19650, SSA Drawing Standard R2.0',
          description: 'Verification of sheet title blocks, layer weights, coordinate scale, and revision cloud markings before issue.',
          checkpoints: JSON.stringify([
            { id: 'CK-CAD-1', code: 'CAD-5.1', title: 'Standard Sheet Size & Monochromatic CTB', acceptanceCriteria: 'True ISO A0/A1 sizing; official SSA_Standard.ctb applied; zero invalid colors.', referenceStandard: 'SSA-CAD-STD', severity: 'Major' },
            { id: 'CK-CAD-2', code: 'CAD-5.2', title: 'Title Block & Revision Cloud Integrity', acceptanceCriteria: 'Project Code, Client Name, Revision Delta cloud, and stage stamp verified.', referenceStandard: 'ISO 19650-2', severity: 'Critical' },
            { id: 'CK-CAD-3', code: 'CAD-5.3', title: 'Scale, Dimensions & Grid Alignment', acceptanceCriteria: 'Graphic scale and North arrow present; structural grid matches column centers.', referenceStandard: 'SP 46:2003', severity: 'Critical' },
            { id: 'CK-CAD-4', code: 'CAD-5.4', title: 'Clash Resolution Between ARC, STR & MEP', acceptanceCriteria: 'Zero hard clashes at beam penetrations, riser shafts, and finished ceiling heights.', referenceStandard: 'BIM Execution Plan', severity: 'Critical' },
          ]),
          isActive: true,
          createdBy: 'SSA System Standard',
        },
      ];

      for (const item of defaultChecklists) {
        const entry = repo.create(item);
        await repo.save(entry);
      }
      console.log('[Seed] Seeded default QA/QC checklists.');
    } catch (err) {
      console.warn('[Seed] Error seeding default QA/QC checklists:', err);
    }
  }
}
