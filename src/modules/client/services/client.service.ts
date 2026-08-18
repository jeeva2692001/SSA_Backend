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
    const companyId = userContext.role === 'Super Admin' ? undefined : userContext.companyId;
    const branchId = userContext.role === 'Super Admin' || userContext.role === 'Company' ? null : userContext.branchId;

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

  async createClient(
    data: Partial<ClientModel>,
    userContext: { companyId: string; branchId: string | null; role: string; userId: string }
  ): Promise<ClientModel> {
    if (!data.clientName || !data.clientName.trim()) {
      throw new Error('Client Name is required.');
    }
    if (!data.mobile || !data.mobile.trim()) {
      throw new Error('Mobile number is required.');
    }
    if (!data.email || !data.email.trim()) {
      throw new Error('Email address is required.');
    }
    if (!data.address || !data.address.trim()) {
      throw new Error('Address is required.');
    }
    if (!data.city || !data.city.trim()) {
      throw new Error('City is required.');
    }
    if (!data.state || !data.state.trim()) {
      throw new Error('State is required.');
    }

    const scopedCompanyId = data.companyId || userContext.companyId;
    const scopedBranchId = data.branchId !== undefined ? data.branchId : userContext.branchId;

    // Generate clientCode if not provided (e.g. CL-2026-001)
    let clientCode = data.clientCode;
    if (!clientCode) {
      const total = await this.clientRepo.countClients(scopedCompanyId);
      const year = new Date().getFullYear();
      const seq = String(total + 1).padStart(3, '0');
      clientCode = `CL-${year}-${seq}`;
    }

    const newClient = await this.clientRepo.create({
      ...data,
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

    const updated = await this.clientRepo.update(id, data);
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
