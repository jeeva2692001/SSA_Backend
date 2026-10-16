import { OpportunityRepository } from '../repositories/opportunity.repository';
import { OpportunityModel } from '../models/opportunity.model';
import { getDataSource } from '../../../shared/config/data-source';
import { LeadModel } from '../models/lead.model';
import { ClientModel } from '../../client/models/client.model';
import { ClientRepository } from '../../client/repositories/client.repository';

export class OpportunityService {
  private oppRepo: OpportunityRepository;

  constructor() {
    this.oppRepo = new OpportunityRepository();
  }

  async syncLiveOpportunities(companyId?: string, branchId?: string | null): Promise<void> {
    try {
      const ds = await getDataSource();
      const leadRepo = ds.getRepository(LeadModel);
      const oppModelRepo = ds.getRepository(OpportunityModel);

      // 1. Purge standalone deals or legacy deals that have no real lead
      await oppModelRepo
        .createQueryBuilder()
        .delete()
        .from(OpportunityModel)
        .where('leadId IS NULL OR leadId = :emptyLeadId', { emptyLeadId: '' })
        .execute();

      // 2. Fetch all real live leads in the database
      const leads = await leadRepo.find({ order: { id: 'ASC' } });

      for (const lead of leads) {
        // Check if an opportunity exists for this lead
        let existing = await oppModelRepo.findOne({
          where: [
            { leadId: String(lead.id) },
            { leadId: lead.leadId }
          ]
        });

        // Determine live stage from lead status
        const statusLower = (lead.status || '').toLowerCase();
        let stage = 'Discovery';
        if (statusLower.includes('won') || statusLower.includes('converted')) {
          stage = 'Won';
        } else if (statusLower.includes('negotiat')) {
          stage = 'Negotiation';
        } else if (statusLower.includes('proposal')) {
          stage = 'Proposal Sent';
        } else if (statusLower.includes('lost') || statusLower.includes('reject')) {
          stage = 'Lost';
        } else {
          stage = 'Discovery';
        }

        const budgetNum = parseFloat(String(lead.estimatedBudget || 0).replace(/[^0-9.]/g, '')) || 0;
        const dealCode = lead.leadId ? lead.leadId.replace('LEAD-', 'OPP-') : `OPP-${lead.id}`;

        if (!existing) {
          // Create live opportunity linked to lead
          const newDeal = oppModelRepo.create({
            dealId: dealCode,
            name: lead.leadTitle || `Project Opportunity #${lead.id}`,
            clientName: lead.contactPerson || lead.company || 'Direct Client',
            company: lead.company || lead.contactPerson || 'Direct Client',
            leadId: String(lead.id),
            clientId: lead.clientId || null,
            companyId: lead.companyId || companyId || 'COM-001',
            branchId: lead.branchId || branchId || null,
            dealValue: budgetNum,
            stage: stage,
            probability: this.getDefaultProbabilityForStage(stage),
            expectedClosureDate: lead.expectedCompletionDate || '2027-12-31',
            assignedEmployee: lead.assignedEmployee || 'Unassigned',
            notes: `Live lead opportunity synchronized from ${lead.leadId || '#' + lead.id}`
          });
          await oppModelRepo.save(newDeal);
        } else {
          // Keep live attributes in sync (name, client, budget, assigned)
          existing.name = lead.leadTitle || existing.name;
          existing.company = lead.company || existing.company;
          existing.clientName = lead.contactPerson || lead.company || existing.clientName;
          if (!existing.dealValue || existing.dealValue === 0) {
            existing.dealValue = budgetNum;
          }
          if ((!existing.assignedEmployee || existing.assignedEmployee === 'Unassigned') && lead.assignedEmployee) {
            existing.assignedEmployee = lead.assignedEmployee;
          }
          if (!existing.expectedClosureDate && lead.expectedCompletionDate) {
            existing.expectedClosureDate = lead.expectedCompletionDate;
          }
          await oppModelRepo.save(existing);
        }
      }
    } catch (err) {
      console.warn('[OpportunityService] syncLiveOpportunities warning:', err);
    }
  }

  async getAll(companyId?: string, branchId?: string | null): Promise<OpportunityModel[]> {
    await this.syncLiveOpportunities(companyId, branchId);
    return await this.oppRepo.findAll(companyId, branchId);
  }

  async getById(id: string): Promise<OpportunityModel | null> {
    return await this.oppRepo.findById(id);
  }

  async create(data: Partial<OpportunityModel>): Promise<OpportunityModel> {
    if (!data.dealId) {
      const count = await this.oppRepo.count(data.companyId);
      const year = new Date().getFullYear();
      data.dealId = `OPP-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    if (data.probability === undefined || data.probability === null) {
      data.probability = this.getDefaultProbabilityForStage(data.stage || 'Proposal Sent');
    }

    const created = await this.oppRepo.create(data);
    if (created.leadId && created.clientId) {
      try {
        const ds = await getDataSource();
        const leadRepo = ds.getRepository(LeadModel);
        const lead = !isNaN(Number(created.leadId))
          ? await leadRepo.findOne({ where: { id: Number(created.leadId) } })
          : await leadRepo.findOne({ where: { leadId: created.leadId } });
        if (lead && (!lead.clientId || lead.clientId !== created.clientId)) {
          lead.clientId = created.clientId;
          await leadRepo.save(lead);
        }
      } catch (err) {
        console.warn('[OpportunityService] create lead sync note:', err);
      }
    }
    return created;
  }

  async update(id: string, data: Partial<OpportunityModel>): Promise<OpportunityModel | null> {
    const existing = await this.oppRepo.findById(id);
    if (!existing) return null;

    if (data.stage && data.stage !== existing.stage) {
      return await this.updateStage(id, data.stage, data.probability);
    }

    Object.assign(existing, data);
    return await this.oppRepo.save(existing);
  }

  async updateStage(id: string, stage: string, explicitProbability?: number): Promise<OpportunityModel | null> {
    const existing = await this.oppRepo.findById(id);
    if (!existing) return null;

    existing.stage = stage;
    if (explicitProbability !== undefined && explicitProbability !== null) {
      existing.probability = explicitProbability;
    } else {
      existing.probability = this.getDefaultProbabilityForStage(stage);
    }

    const saved = await this.oppRepo.save(existing);

    // Sync with linked Lead and auto-create Client on Won
    if (existing.leadId) {
      try {
        const ds = await getDataSource();
        const leadRepo = ds.getRepository(LeadModel);
        const clientRepo = ds.getRepository(ClientModel);
        const clientRepoObj = new ClientRepository();

        const lead = !isNaN(Number(existing.leadId))
          ? await leadRepo.findOne({ where: { id: Number(existing.leadId) } })
          : await leadRepo.findOne({ where: { leadId: existing.leadId } });
        if (lead) {
          if (stage === 'Won') {
            lead.status = 'Won';

            // Ensure Client exists in database for this Won Deal
            let client: ClientModel | null = null;
            if (existing.clientId) {
              client = await clientRepo.findOne({ where: { id: existing.clientId } });
            }
            if (!client && lead.clientId) {
              client = await clientRepo.findOne({ where: { id: lead.clientId } });
            }
            if (!client && lead.mobile) {
              client = await clientRepo.findOne({ where: { mobile: lead.mobile.trim() } });
            }
            if (!client && (lead.company || lead.contactPerson)) {
              const compName = (lead.company || lead.contactPerson || '').trim();
              client = await clientRepo.findOne({
                where: [
                  { company: compName },
                  { clientName: compName }
                ]
              });
            }

            // If not existing, automatically create Client record
            if (!client) {
              const clientCode = await clientRepoObj.getNextClientCode();
              const clientName = (lead.clientName || lead.contactPerson || lead.company || existing.clientName || 'Client Account').trim();
              const company = (lead.company || lead.organisation || existing.company || clientName).trim();
              const contactPerson = (lead.contactPerson || lead.clientName || clientName).trim();
              const mobile = (lead.mobile || '9999999999').replace(/\D/g, '').slice(0, 10).padStart(10, '9');
              const email = (lead.email || `${clientCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`).trim();

              client = clientRepo.create({
                clientCode,
                companyId: lead.companyId || existing.companyId || 'COM-001',
                branchId: lead.branchId !== undefined ? lead.branchId : existing.branchId,
                clientName,
                company,
                contactPerson,
                mobile,
                email,
                address: lead.siteAddress || lead.locationAddress || 'Main Office / Site',
                city: lead.city || 'Chennai',
                state: lead.state || 'Tamil Nadu',
                country: lead.country || 'India',
                clientType: lead.projectType || 'Corporate',
                status: 'Active',
                remarks: `Created automatically upon winning Opportunity ${existing.dealId || existing.name}`
              });
              client = await clientRepo.save(client);
            }

            if (client) {
              lead.clientId = client.id;
              existing.clientId = client.id;
              await this.oppRepo.save(existing);
            }
          } else if (stage === 'Lost') {
            lead.status = 'Lost';
          } else if (stage === 'Negotiation') {
            lead.status = 'Negotiation';
          } else if (stage === 'Proposal Sent') {
            lead.status = 'Proposal Sent';
          }
          await leadRepo.save(lead);
        }
      } catch (err) {
        console.warn('[OpportunityService] Lead sync note:', err);
      }
    } else if (stage === 'Won' && !existing.clientId) {
      try {
        const ds = await getDataSource();
        const clientRepo = ds.getRepository(ClientModel);
        const clientRepoObj = new ClientRepository();
        const clientCode = await clientRepoObj.getNextClientCode();
        const clientName = (existing.clientName || existing.company || 'Client Account').trim();
        const company = (existing.company || existing.clientName || clientName).trim();

        let client = await clientRepo.findOne({
          where: [{ company }, { clientName }]
        });
        if (!client) {
          client = clientRepo.create({
            clientCode,
            companyId: existing.companyId || 'COM-001',
            branchId: existing.branchId || null,
            clientName,
            company,
            contactPerson: clientName,
            mobile: '9999999999',
            email: `${clientCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
            clientType: 'Corporate',
            status: 'Active',
            remarks: `Created automatically upon winning Opportunity ${existing.dealId || existing.name}`
          });
          client = await clientRepo.save(client);
        }
        existing.clientId = client.id;
        await this.oppRepo.save(existing);
      } catch (err) {
        console.warn('[OpportunityService] Direct opp client create note:', err);
      }
    }

    return saved;
  }

  async delete(id: string): Promise<boolean> {
    return await this.oppRepo.delete(id);
  }

  public getDefaultProbabilityForStage(stage: string): number {
    const s = stage.toLowerCase();
    if (s.includes('won')) return 100;
    if (s.includes('lost')) return 0;
    if (s.includes('negotiat')) return 85;
    if (s.includes('proposal')) return 60;
    if (s.includes('discovery') || s.includes('qualif') || s.includes('present')) return 30;
    return 50;
  }

  async ensureSeeded(): Promise<void> {
    await this.syncLiveOpportunities();
  }
}
