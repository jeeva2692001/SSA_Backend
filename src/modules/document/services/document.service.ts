import { getDataSource } from '../../../shared/config/data-source';
import { ClientBriefModel, MomModel, SiteReportModel, MaterialApprovalModel } from '../models';

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
}
