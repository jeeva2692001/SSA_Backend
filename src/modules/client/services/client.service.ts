import { ClientRepository } from '../repositories/client.repository';
import { ClientModel } from '../models/client.model';

export class ClientService {
  private clientRepo: ClientRepository;

  constructor() {
    this.clientRepo = new ClientRepository();
  }

  async getAllClients(
    userContext: { companyId: string; branchId: string | null; role: string },
    search?: string
  ): Promise<any[]> {
    const isSuper = userContext.role === 'Super Admin' || userContext.role === 'Super Administrator';
    const companyId = isSuper ? undefined : (userContext.companyId && userContext.companyId.trim() ? userContext.companyId.trim() : undefined);
    const branchId = isSuper || userContext.role === 'Company' ? null : (userContext.branchId && userContext.branchId.trim() ? userContext.branchId.trim() : null);

    const clients = await this.clientRepo.findAll(companyId, branchId, search);

    // Populate computed statistics (leads count, projects count, contract value)
    const result = await Promise.all(
      clients.map(async (c) => {
        const leads = await this.clientRepo.findLeadsByClientId(c.id, c.clientName || c.company);
        const projects = await this.clientRepo.findProjectsByClientId(c.id, c.clientName || c.company);

        const totalContractValue = leads.reduce((sum, l) => {
          const val = parseFloat(String(l.estimatedBudget || '').replace(/[^0-9.]/g, '')) || 0;
          return sum + val;
        }, 0);

        const activeLeadsCount = leads.filter(l => (l.status || '').toLowerCase() !== 'won' && (l.status || '').toLowerCase() !== 'lost').length;
        const wonLeadsCount = leads.filter(l => (l.status || '').toLowerCase() === 'won').length;

        return {
          ...c,
          leadsCount: leads.length,
          activeLeadsCount,
          wonLeadsCount,
          projectsCount: projects.length,
          totalContractValue,
          leads: leads.map(l => ({
            id: l.id,
            leadId: l.leadId,
            leadTitle: l.leadTitle || l.clientName,
            status: l.status,
            projectType: l.projectType,
            estimatedBudget: l.estimatedBudget,
            createdAt: l.createdAt
          })),
          projects: projects.map(p => ({
            id: p.id,
            projectCode: p.projectCode,
            projectName: p.projectName,
            status: p.status,
            createdAt: p.createdAt
          }))
        };
      })
    );

    return result;
  }

  async getClientById(id: string): Promise<any> {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new Error(`Client with ID ${id} not found.`);
    }

    const leads = await this.clientRepo.findLeadsByClientId(client.id, client.clientName || client.company);
    const projects = await this.clientRepo.findProjectsByClientId(client.id, client.clientName || client.company);

    const totalContractValue = leads.reduce((sum, l) => {
      const val = parseFloat(String(l.estimatedBudget || '').replace(/[^0-9.]/g, '')) || 0;
      return sum + val;
    }, 0);

    return {
      ...client,
      leadsCount: leads.length,
      projectsCount: projects.length,
      totalContractValue,
      leads,
      projects
    };
  }

  private validateClientFields(data: Partial<ClientModel>, isUpdate: boolean): void {
    if (!isUpdate || data.clientName !== undefined) {
      if (!data.clientName || !data.clientName.trim()) {
        throw new Error('Client Name is required.');
      }
      const name = data.clientName.trim();
      if (name.length < 2 || name.length > 100) {
        throw new Error('Client Name must be between 2 and 100 characters.');
      }
      if (!/[a-zA-Z]/.test(name)) {
        throw new Error('Client Name must contain letters and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'-]+$/.test(name)) {
        throw new Error('Client Name should contain only letters, dots, hyphens, and apostrophes.');
      }
    }

    if (data.company !== undefined && data.company !== null) {
      const comp = data.company.trim();
      if (comp.length > 0) {
        if (comp.length < 2 || comp.length > 150) {
          throw new Error('Company name must be between 2 and 150 characters.');
        }
        if (!/[a-zA-Z]/.test(comp)) {
          throw new Error('Company name must contain at least one letter and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z0-9\s,.'&()/#_–—-]+$/.test(comp)) {
          throw new Error('Company name contains invalid characters.');
        }
      }
    }

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

    if (!isUpdate || data.mobile !== undefined) {
      if (!data.mobile || !data.mobile.trim()) {
        throw new Error('Mobile number is required.');
      }
      const cleanMobile = data.mobile.trim();
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        throw new Error('Mobile number must be a valid 10-digit number starting with 6-9.');
      }
    }

    if (!isUpdate || data.email !== undefined) {
      if (!data.email || !data.email.trim()) {
        throw new Error('Email address is required.');
      }
      const cleanEmail = data.email.trim();
      if (cleanEmail.length < 5 || cleanEmail.length > 100) {
        throw new Error('Email address must be between 5 and 100 characters.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error('Email address must be a valid email format (e.g. client@organization.com).');
      }
    }

    if (!isUpdate || data.address !== undefined) {
      if (!data.address || !data.address.trim()) {
        throw new Error('Address is required.');
      }
      const addr = data.address.trim();
      if (addr.length < 5 || addr.length > 250) {
        throw new Error('Address must be between 5 and 250 characters.');
      }
      if (!/[a-zA-Z]/.test(addr)) {
        throw new Error('Address must contain letters and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,./#()'&_–—-]+$/.test(addr)) {
        throw new Error('Address contains invalid characters.');
      }
    }

    if (!isUpdate || data.city !== undefined) {
      if (!data.city || !data.city.trim()) {
        throw new Error('City is required.');
      }
      const city = data.city.trim();
      if (city.length < 2 || city.length > 60) {
        throw new Error('City must be between 2 and 60 characters.');
      }
      if (!/[a-zA-Z]/.test(city)) {
        throw new Error('City cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(city)) {
        throw new Error('City should contain only letters and standard punctuation.');
      }
    }

    if (!isUpdate || data.state !== undefined) {
      if (!data.state || !data.state.trim()) {
        throw new Error('State is required.');
      }
      const state = data.state.trim();
      if (state.length < 2 || state.length > 60) {
        throw new Error('State must be between 2 and 60 characters.');
      }
      if (!/[a-zA-Z]/.test(state)) {
        throw new Error('State cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(state)) {
        throw new Error('State should contain only letters and standard punctuation.');
      }
    }

    if (data.gstNo && data.gstNo.trim() && data.gstNo.trim().length !== 15) {
      throw new Error('GST number must be 15 characters.');
    }
    if (data.panNo && data.panNo.trim() && data.panNo.trim().length !== 10) {
      throw new Error('PAN number must be 10 characters.');
    }
    if (data.aadharNo && data.aadharNo.trim()) {
      const aadharDigits = data.aadharNo.replace(/\D/g, '');
      if (aadharDigits.length !== 12) {
        throw new Error('Aadhar number must be 12 digits.');
      }
    }
    if (data.remarks !== undefined && data.remarks !== null) {
      const rem = data.remarks.trim();
      if (rem.length > 0) {
        if (rem.length > 250) {
          throw new Error('Notes / Remarks cannot exceed 250 characters.');
        }
        if (!/[a-zA-Z0-9]/.test(rem)) {
          throw new Error('Notes / Remarks cannot be only special characters.');
        }
        if (/^\d+$/.test(rem.replace(/[\s,.'&()/#:;!?"'–—+@%*-]+/g, '')) || /^\d+$/.test(rem)) {
          throw new Error('Notes / Remarks cannot be only numeric characters and must contain valid text.');
        }
        if (!/[a-zA-Z]/.test(rem)) {
          throw new Error('Notes / Remarks must contain alphabetic text.');
        }
        if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+@%*_-]+$/.test(rem)) {
          throw new Error('Notes / Remarks contains unsupported special characters.');
        }
      }
    }
  }

  async createClient(
    data: Partial<ClientModel>,
    userContext: { companyId: string; branchId: string | null; role: string; userId: string }
  ): Promise<ClientModel> {
    this.validateClientFields(data, false);

    const scopedCompanyId = data.companyId || userContext.companyId;
    const scopedBranchId = data.branchId !== undefined ? data.branchId : userContext.branchId;

    // Check if client with this mobile number already exists
    const cleanMobile = data.mobile!.trim();
    const existingClientWithMobile = await this.clientRepo.findByMobile(cleanMobile, scopedCompanyId);
    if (existingClientWithMobile) {
      throw new Error(`A client with mobile number "${cleanMobile}" already exists in the system (${existingClientWithMobile.clientName} - ${existingClientWithMobile.clientCode || 'Existing'}).`);
    }

    // Check if client with this email already exists
    const cleanEmail = data.email!.trim();
    const existingClientWithEmail = await this.clientRepo.findByEmail(cleanEmail, scopedCompanyId);
    if (existingClientWithEmail) {
      throw new Error(`A client with email address "${cleanEmail}" already exists in the system (${existingClientWithEmail.clientName} - ${existingClientWithEmail.clientCode || 'Existing'}).`);
    }

    // Generate clientCode if not provided (e.g. CL-2026-001)
    let clientCode = data.clientCode;
    if (!clientCode) {
      clientCode = await this.clientRepo.getNextClientCode();
    }

    const newClient = await this.clientRepo.create({
      ...data,
      clientName: data.clientName!.trim(),
      company: data.company ? data.company.trim() : data.company,
      contactPerson: data.contactPerson ? data.contactPerson.trim() : data.contactPerson,
      mobile: cleanMobile,
      email: cleanEmail,
      address: data.address!.trim(),
      city: data.city!.trim(),
      state: data.state!.trim(),
      clientCode,
      companyId: scopedCompanyId,
      branchId: scopedBranchId,
      status: data.status || 'Active',
      clientType: data.clientType || 'Corporate'
    });

    return newClient;
  }

  async updateClient(
    id: string,
    data: Partial<ClientModel>,
    userContext: { companyId: string; role: string }
  ): Promise<ClientModel> {
    const existing = await this.clientRepo.findById(id);
    if (!existing) {
      throw new Error(`Client with ID ${id} not found.`);
    }

    this.validateClientFields(data, true);

    if (data.mobile && data.mobile.trim() && data.mobile.trim() !== existing.mobile) {
      const cleanMobile = data.mobile.trim();
      const duplicate = await this.clientRepo.findByMobile(cleanMobile, userContext.companyId);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`A client with mobile number "${cleanMobile}" already exists in the system (${duplicate.clientName} - ${duplicate.clientCode || 'Existing'}).`);
      }
    }

    if (data.email && data.email.trim() && data.email.trim().toLowerCase() !== (existing.email || '').toLowerCase()) {
      const cleanEmail = data.email.trim();
      const duplicate = await this.clientRepo.findByEmail(cleanEmail, userContext.companyId);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`A client with email address "${cleanEmail}" already exists in the system (${duplicate.clientName} - ${duplicate.clientCode || 'Existing'}).`);
      }
    }

    const trimmedData = { ...data };
    if (trimmedData.clientName) trimmedData.clientName = trimmedData.clientName.trim();
    if (trimmedData.company !== undefined) trimmedData.company = trimmedData.company ? trimmedData.company.trim() : '';
    if (trimmedData.contactPerson !== undefined) trimmedData.contactPerson = trimmedData.contactPerson ? trimmedData.contactPerson.trim() : '';
    if (trimmedData.mobile) trimmedData.mobile = trimmedData.mobile.trim();
    if (trimmedData.email) trimmedData.email = trimmedData.email.trim();
    if (trimmedData.address) trimmedData.address = trimmedData.address.trim();
    if (trimmedData.city) trimmedData.city = trimmedData.city.trim();
    if (trimmedData.state) trimmedData.state = trimmedData.state.trim();

    const updated = await this.clientRepo.update(id, trimmedData);
    if (data.enableReferencesFolder !== undefined) {
      try {
        const isRef = Boolean(data.enableReferencesFolder);
        const clientProjects = await this.clientRepo.findProjectsByClientId(id, existing.clientName || existing.company);
        const projectRepo = await (this.clientRepo as any).getProjectRepo();
        const manager = projectRepo.manager;

        for (const p of clientProjects) {
          await projectRepo.update(p.id, { enableReferencesFolder: isRef });
          if (!isRef) {
            // Delete REF discipline from project_disciplines for this project
            await manager.createQueryBuilder()
              .delete()
              .from('project_disciplines')
              .where('projectId = :projectId AND disciplineCode = :code', { projectId: p.id, code: 'REF' })
              .execute();
          } else {
            // Add REF discipline if not present
            const existingRef = await manager.createQueryBuilder()
              .select('pd.id')
              .from('project_disciplines', 'pd')
              .where('pd.projectId = :projectId AND pd.disciplineCode = :code', { projectId: p.id, code: 'REF' })
              .getRawOne();
            if (!existingRef) {
              await manager.createQueryBuilder()
                .insert()
                .into('project_disciplines')
                .values({
                  projectId: p.id,
                  disciplineCode: 'REF',
                  folderCode: `${p.projectCode}-REF`,
                  status: 'Active'
                })
                .execute();
            }
          }
        }
      } catch (pErr) {
        console.warn('[ClientService] Note syncing enableReferencesFolder to projects:', pErr);
      }
    }

    if (data.allowClientDownload !== undefined) {
      try {
        const isDownload = Boolean(data.allowClientDownload);
        const clientProjects = await this.clientRepo.findProjectsByClientId(id, existing.clientName || existing.company);
        const projectRepo = await (this.clientRepo as any).getProjectRepo();
        for (const p of clientProjects) {
          await projectRepo.update(p.id, { allowClientDownload: isDownload });
        }
      } catch (pErr) {
        console.warn('[ClientService] Note syncing allowClientDownload to projects:', pErr);
      }
    }
    return updated!;
  }

  async deleteClient(id: string): Promise<boolean> {
    const existing = await this.clientRepo.findById(id);
    if (!existing) {
      throw new Error(`Client with ID ${id} not found.`);
    }
    return await this.clientRepo.delete(id);
  }

  async getClientLeads(id: string) {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new Error(`Client with ID ${id} not found.`);
    }
    return await this.clientRepo.findLeadsByClientId(client.id, client.clientName || client.company);
  }

  async getClientProjects(id: string) {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new Error(`Client with ID ${id} not found.`);
    }
    return await this.clientRepo.findProjectsByClientId(client.id, client.clientName || client.company);
  }
}
