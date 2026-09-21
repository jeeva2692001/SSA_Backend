import { LeadRepository } from '../repositories/lead.repository';
import { LeadModel } from '../models/lead.model';
import { ClientRepository } from '../../client/repositories/client.repository';

export class LeadService {
  private leadRepository: LeadRepository;
  private clientRepository: ClientRepository;

  constructor() {
    this.leadRepository = new LeadRepository();
    this.clientRepository = new ClientRepository();
  }

  async getCategories() {
    return await this.leadRepository.findAllCategories();
  }

  async createCategory(data: { name: string; code?: string; description?: string }, userRole: string) {
    if (userRole !== 'Company' && userRole !== 'Super Admin' && userRole !== 'Super Administrator' && userRole !== 'Admin') {
      throw new Error('Unauthorized: Only Company Admin or Super Admin can create project categories.');
    }
    if (!data.name || !data.name.trim()) {
      throw new Error('Category name is required.');
    }
    const nameTrimmed = data.name.trim();
    if (nameTrimmed.length < 2) {
      throw new Error('Category name must be at least 2 characters.');
    }
    if (nameTrimmed.length > 60) {
      throw new Error('Category name cannot exceed 60 characters.');
    }
    if (!/[a-zA-Z]/.test(nameTrimmed)) {
      throw new Error('Category name must contain alphabetic letters.');
    }
    if (!/^[a-zA-Z0-9\s&—–/,.()'-]+$/.test(nameTrimmed)) {
      throw new Error('Category name contains invalid characters. Special characters like @, #, $, %, etc. are not allowed.');
    }

    // Duplicate check for name
    const existingByName = await this.leadRepository.findCategoryByName(nameTrimmed);
    if (existingByName) {
      throw new Error(`Category Name '${nameTrimmed}' already exists. Please enter a unique category name.`);
    }

    if (data.code && data.code.trim()) {
      const codeTrimmed = data.code.trim();
      if (codeTrimmed.length > 30) {
        throw new Error('Category code cannot exceed 30 characters.');
      }
      if (!/^[A-Z0-9_-]+$/i.test(codeTrimmed)) {
        throw new Error('Category code contains invalid characters. Special characters like @, #, $, %, etc. are not allowed. Only uppercase letters, numbers, hyphens, and underscores are allowed.');
      }
    }

    if (data.description && data.description.trim()) {
      const descTrimmed = data.description.trim();
      if (descTrimmed.length > 250) {
        throw new Error('Category description cannot exceed 250 characters.');
      }
      if (!/^[a-zA-Z0-9\s&—–/,.()':;!?"'-]+$/.test(descTrimmed)) {
        throw new Error('Category description contains invalid special characters. Special characters like @, #, $, %, etc. are not allowed.');
      }
    }
    
    // Generate uppercase code if not provided
    let code = data.code ? data.code.toUpperCase().replace(/\s+/g, '_') : data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    code = code.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    if (code.length > 30) {
      code = code.slice(0, 30);
    }

    // Duplicate check for code
    const existingByCode = await this.leadRepository.findCategoryByCode(code);
    if (existingByCode) {
      throw new Error(`Category Code '${code}' already exists. Please enter a unique category code.`);
    }

    return await this.leadRepository.createCategory({
      name: nameTrimmed,
      code,
      description: data.description?.trim() || ''
    });
  }

  async updateCategory(id: number, data: { name?: string; description?: string }, userRole: string) {
    if (userRole !== 'Company' && userRole !== 'Super Admin' && userRole !== 'Super Administrator' && userRole !== 'Admin') {
      throw new Error('Unauthorized: Only Company Admin or Super Admin can edit project categories.');
    }
    if (data.name !== undefined) {
      const nameTrimmed = data.name.trim();
      if (!nameTrimmed) {
        throw new Error('Category name is required.');
      }
      if (nameTrimmed.length < 2) {
        throw new Error('Category name must be at least 2 characters.');
      }
      if (nameTrimmed.length > 60) {
        throw new Error('Category name cannot exceed 60 characters.');
      }
      if (!/[a-zA-Z]/.test(nameTrimmed)) {
        throw new Error('Category name must contain alphabetic letters.');
      }
      if (!/^[a-zA-Z0-9\s&—–/,.()'-]+$/.test(nameTrimmed)) {
        throw new Error('Category name contains invalid characters. Special characters like @, #, $, %, etc. are not allowed.');
      }
      const existingByName = await this.leadRepository.findCategoryByName(nameTrimmed);
      if (existingByName && existingByName.id !== id) {
        throw new Error(`Category Name '${nameTrimmed}' already exists. Please enter a unique category name.`);
      }
    }
    if (data.description !== undefined && data.description.trim()) {
      const descTrimmed = data.description.trim();
      if (descTrimmed.length > 250) {
        throw new Error('Category description cannot exceed 250 characters.');
      }
      if (!/^[a-zA-Z0-9\s&—–/,.()':;!?"'-]+$/.test(descTrimmed)) {
        throw new Error('Category description contains invalid special characters. Special characters like @, #, $, %, etc. are not allowed.');
      }
    }
    return await this.leadRepository.updateCategory(id, data);
  }

  async deleteCategory(id: number, userRole: string) {
    if (userRole !== 'Company' && userRole !== 'Super Admin' && userRole !== 'Super Administrator' && userRole !== 'Admin') {
      throw new Error('Unauthorized: Only Company Admin or Super Admin can delete project categories.');
    }
    return await this.leadRepository.deleteCategory(id);
  }

  async getTemplateFields(categoryId: number) {
    const category = await this.leadRepository.findCategoryById(categoryId);
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found.`);
    }
    return await this.leadRepository.findTemplateFieldsByCategoryId(categoryId);
  }

  async createTemplateField(
    data: {
      categoryId: number;
      fieldName: string;
      fieldKey?: string;
      fieldType: 'text' | 'number' | 'single-select' | 'multi-select' | 'yes-no' | 'attachment';
      fieldOptions?: string[];
      section: string;
      capturedAtStage?: 'Lead' | 'Requirement Collection' | 'Client Brief';
      isRequired?: boolean;
      displayOrder?: number;
    },
    userRole: string
  ) {
    if (userRole !== 'Company' && userRole !== 'Super Admin' && userRole !== 'Super Administrator' && userRole !== 'Admin') {
      throw new Error('Unauthorized: Only Company Admin or Super Admin can add lead questions.');
    }
    if (!data.categoryId) {
      throw new Error('Category ID is required.');
    }
    if (!data.fieldName || !data.fieldName.trim()) {
      throw new Error('Question / Field Name is required.');
    }
    if (!data.section || !data.section.trim()) {
      throw new Error('Section name is required.');
    }

    const category = await this.leadRepository.findCategoryById(data.categoryId);
    if (!category) {
      throw new Error(`Category with ID ${data.categoryId} not found.`);
    }

    // Auto-generate camelCase fieldKey if not explicitly specified
    let fieldKey = data.fieldKey ? data.fieldKey.trim() : data.fieldName.replace(/[^a-zA-Z0-9]/g, ' ').split(' ').map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
    if (!fieldKey) fieldKey = `custom_${Date.now()}`;

    const existingFields = await this.leadRepository.findTemplateFieldsByCategoryId(data.categoryId);
    if (existingFields.some(f => f.fieldKey === fieldKey)) {
      fieldKey = `${fieldKey}_${Date.now().toString().slice(-4)}`;
    }

    return await this.leadRepository.createTemplateField({
      categoryId: data.categoryId,
      fieldKey,
      fieldName: data.fieldName.trim(),
      fieldType: data.fieldType || 'text',
      fieldOptions: data.fieldOptions || [],
      section: data.section.trim(),
      capturedAtStage: data.capturedAtStage || 'Requirement Collection',
      isRequired: !!data.isRequired,
      displayOrder: data.displayOrder ?? (existingFields.length + 1)
    });
  }

  async updateTemplateField(
    id: number,
    data: {
      fieldName?: string;
      fieldType?: 'text' | 'number' | 'single-select' | 'multi-select' | 'yes-no' | 'attachment';
      fieldOptions?: string[];
      section?: string;
      capturedAtStage?: 'Lead' | 'Requirement Collection' | 'Client Brief';
      isRequired?: boolean;
      displayOrder?: number;
    },
    userRole: string
  ) {
    if (userRole !== 'Company' && userRole !== 'Super Admin' && userRole !== 'Super Administrator' && userRole !== 'Admin') {
      throw new Error('Unauthorized: Only Company Admin or Super Admin can edit lead questions.');
    }
    return await this.leadRepository.updateTemplateField(id, data);
  }

  async deleteTemplateField(id: number, userRole: string) {
    if (userRole !== 'Company' && userRole !== 'Super Admin' && userRole !== 'Super Administrator' && userRole !== 'Admin') {
      throw new Error('Unauthorized: Only Company Admin or Super Admin can delete lead questions.');
    }
    return await this.leadRepository.deleteTemplateField(id);
  }

  async createLead(
    leadData: Partial<LeadModel>, 
    requirementValues: Record<string, any>,
    userContext: { companyId: string; branchId: string | null; role: string; userId: string }
  ): Promise<any> {
    if (!leadData.clientName) {
      throw new Error('Client Name is required.');
    }
    if (!leadData.categoryId) {
      throw new Error('Project Category ID is required.');
    }

    // Enforce company scope based on token
    let scopedCompanyId = userContext.companyId;
    let scopedBranchId = userContext.branchId;

    if (userContext.role === 'Super Admin' || userContext.role === 'Employee' || userContext.role === 'Company') {
      // If admin/employee/company, allow custom payload scoping
      scopedCompanyId = leadData.companyId || userContext.companyId;
      scopedBranchId = leadData.branchId !== undefined ? leadData.branchId : userContext.branchId;
    }

    const category = await this.leadRepository.findCategoryById(leadData.categoryId);
    if (!category) {
      throw new Error(`Category with ID ${leadData.categoryId} not found.`);
    }

    const templateFields = await this.leadRepository.findTemplateFieldsByCategoryId(leadData.categoryId);

    // Validate category-specific fields (skip if saving as Draft)
    if (leadData.status !== 'Draft') {
      for (const field of templateFields) {
        const val = requirementValues[field.fieldKey];
        if (field.isRequired && (val === undefined || val === null || val === '')) {
          throw new Error(`Field '${field.fieldName}' is required for ${category.name} projects.`);
        }
        if (val !== undefined && val !== null && val !== '') {
          if (field.fieldType === 'text' && typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.length > 150) {
              throw new Error(`Field '${field.fieldName}' cannot exceed 150 characters.`);
            }
            if (/\d/.test(trimmed)) {
              throw new Error(`Field '${field.fieldName}' allows text only (numbers are not allowed).`);
            }
            if (!/[a-zA-Z]/.test(trimmed)) {
              throw new Error(`Field '${field.fieldName}' must contain text characters.`);
            }
            if (!/^[a-zA-Z\s,.'()&/%@:;–"'+-]+$/.test(trimmed)) {
              throw new Error(`Field '${field.fieldName}' contains invalid characters.`);
            }
          } else if (field.fieldType === 'number') {
            const strVal = String(val).trim();
            if (!/^\d+$/.test(strVal)) {
              throw new Error(`Field '${field.fieldName}' allows numbers only.`);
            }
            const numVal = Number(strVal);
            if (isNaN(numVal)) {
              throw new Error(`Field '${field.fieldName}' must be a valid number.`);
            }
            if (numVal < 0) {
              throw new Error(`Field '${field.fieldName}' cannot be negative.`);
            }
            if (numVal > 1000000000000) {
              throw new Error(`Field '${field.fieldName}' exceeds maximum allowable limit.`);
            }
          }
        }
      }
    }

    // Validate city and state if provided
    if (leadData.city && leadData.city.trim()) {
      const cityTrim = leadData.city.trim();
      if (!/[a-zA-Z]/.test(cityTrim)) {
        throw new Error('City cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(cityTrim)) {
        throw new Error('City should contain only letters and standard punctuation.');
      }
    }

    if (leadData.state && leadData.state.trim()) {
      const stateTrim = leadData.state.trim();
      if (!/[a-zA-Z]/.test(stateTrim)) {
        throw new Error('State cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(stateTrim)) {
        throw new Error('State should contain only letters and standard punctuation.');
      }
    }

    if (leadData.country && leadData.country.trim()) {
      const cntryTrim = leadData.country.trim();
      if (!/[a-zA-Z]/.test(cntryTrim)) {
        throw new Error('Country cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(cntryTrim)) {
        throw new Error('Country should contain only letters and standard punctuation.');
      }
    }

    if (leadData.surveyNumber && leadData.surveyNumber.trim()) {
      const survTrim = leadData.surveyNumber.trim();
      if (!/\d/.test(survTrim)) {
        throw new Error('Survey number must contain numeric digits (e.g. 124/2A or Plot 45).');
      }
      if (!/^[a-zA-Z0-9\s/.,#–-]+$/.test(survTrim)) {
        throw new Error('Survey number contains invalid characters.');
      }
    }

    if (leadData.topographyLevels && leadData.topographyLevels.trim()) {
      const topoTrim = leadData.topographyLevels.trim();
      if (!/[a-zA-Z]/.test(topoTrim)) {
        throw new Error('Topography / levels cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'/%+–-]+$/.test(topoTrim)) {
        throw new Error('Topography / levels contains invalid characters.');
      }
    }

    if (leadData.accessRoadWidth && leadData.accessRoadWidth.trim()) {
      const roadTrim = leadData.accessRoadWidth.trim();
      if (!/\d/.test(roadTrim)) {
        throw new Error('Access road width must contain numeric width (e.g. 30 ft, 12m).');
      }
      if (!/[a-zA-Z'"]/.test(roadTrim)) {
        throw new Error('Access road width must include units (e.g. 30 ft, 12m).');
      }
      if (
        /\d{5,}/.test(roadTrim) ||
        /[a-zA-Z]{4,}\d{3,}/.test(roadTrim) ||
        /\d{3,}[a-zA-Z]{4,}/.test(roadTrim) ||
        !(/\b(ft|feet|foot|m|meters?|mtrs?|yards?|inch(?:es)?|wide|road)\b/i.test(roadTrim) || /['"]/.test(roadTrim))
      ) {
        throw new Error('Enter a valid road width with units (e.g. 30 ft, 12m, 40 feet).');
      }
      if (!/^[a-zA-Z0-9\s,.'/%–"-]+$/.test(roadTrim)) {
        throw new Error('Access road width contains invalid characters.');
      }
    }

    if (leadData.orientation && leadData.orientation.trim()) {
      const oriTrim = leadData.orientation.trim();
      if (!/[a-zA-Z]/.test(oriTrim)) {
        throw new Error('Orientation cannot be only numeric or special characters.');
      }
      if (
        /\d{3,}/.test(oriTrim) ||
        !/\b(north|south|east|west|ne|nw|se|sw|facing|corner|vaastu|direction)\b/i.test(oriTrim)
      ) {
        throw new Error('Enter a valid orientation direction (e.g. North-East, East facing, South-West).');
      }
      if (!/^[a-zA-Z\s,.'–-]+$/.test(oriTrim)) {
        throw new Error('Orientation should contain only letters and standard punctuation.');
      }
    }

    if (leadData.ebSupplySanctionedLoad && leadData.ebSupplySanctionedLoad.trim()) {
      const ebTrim = leadData.ebSupplySanctionedLoad.trim();
      if (!/\d/.test(ebTrim)) {
        throw new Error('EB Sanctioned Load must contain numeric capacity (e.g. 15 kW, 3 Phase).');
      }
      if (!/[a-zA-Z]/.test(ebTrim)) {
        throw new Error('EB Sanctioned Load must include units (e.g. 15 kW, 3 Phase).');
      }
      if (
        /\d{6,}/.test(ebTrim) ||
        /[a-zA-Z]{4,}\d{3,}/.test(ebTrim) ||
        /\d{3,}[a-zA-Z]{4,}/.test(ebTrim) ||
        !/\b(kw|kva|hp|phase|ph|amps?|watts?|mw|kv)\b/i.test(ebTrim)
      ) {
        throw new Error('Enter a valid EB load format with recognized units (e.g. 15 kW, 3 Phase, 25 kVA).');
      }
      if (!/^[a-zA-Z0-9\s,.'/%+–-]+$/.test(ebTrim)) {
        throw new Error('EB Sanctioned Load contains invalid characters.');
      }
    }

    if (leadData.telecom && leadData.telecom.trim()) {
      const telTrim = leadData.telecom.trim();
      if (!/[a-zA-Z]/.test(telTrim)) {
        throw new Error('Telecom / connectivity details cannot be only numeric or special characters.');
      }
      if (
        /\d{5,}/.test(telTrim) ||
        /[a-zA-Z]{4,}\d{3,}/.test(telTrim) ||
        /\d{3,}[a-zA-Z]{4,}/.test(telTrim)
      ) {
        throw new Error('Telecom details must be a valid description (e.g. Fiber line active, 4G/5G available).');
      }
      if (!/^[a-zA-Z0-9\s,.'/%+–&/-]+$/.test(telTrim)) {
        throw new Error('Telecom / connectivity details contain invalid characters.');
      }
    }

    if (leadData.approvingAuthority && leadData.approvingAuthority.trim()) {
      const authTrim = leadData.approvingAuthority.trim();
      if (!/[a-zA-Z]/.test(authTrim)) {
        throw new Error('Approving Authority cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(authTrim) || /[a-zA-Z]{4,}\d{3,}/.test(authTrim) || /\d{3,}[a-zA-Z]{4,}/.test(authTrim)) {
        throw new Error('Enter a valid Approving Authority (e.g. CMDA, DTCP, Corporation).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/-]+$/.test(authTrim)) {
        throw new Error('Approving Authority contains invalid characters.');
      }
    }

    if (leadData.landUseZoning && leadData.landUseZoning.trim()) {
      const zoneTrim = leadData.landUseZoning.trim();
      if (!/[a-zA-Z]/.test(zoneTrim)) {
        throw new Error('Land Use Zoning cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(zoneTrim) || /[a-zA-Z]{4,}\d{3,}/.test(zoneTrim) || /\d{3,}[a-zA-Z]{4,}/.test(zoneTrim)) {
        throw new Error('Enter a valid Land Use Zoning (e.g. Residential, Commercial, Mixed-Use).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/-]+$/.test(zoneTrim)) {
        throw new Error('Land Use Zoning contains invalid characters.');
      }
    }

    if (leadData.fsiCoverageKnown && leadData.fsiCoverageKnown.trim()) {
      const fsiTrim = leadData.fsiCoverageKnown.trim();
      if (!/[a-zA-Z0-9]/.test(fsiTrim)) {
        throw new Error('FSI & Coverage details cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(fsiTrim)) {
        throw new Error('FSI & Coverage details contain invalid characters.');
      }
    }

    if (leadData.setbacksHeightRestrictions && leadData.setbacksHeightRestrictions.trim()) {
      const setTrim = leadData.setbacksHeightRestrictions.trim();
      if (!/[a-zA-Z0-9]/.test(setTrim)) {
        throw new Error('Setbacks / Height restrictions cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–"+-]+$/.test(setTrim)) {
        throw new Error('Setbacks / Height restrictions contain invalid characters.');
      }
    }

    if (leadData.priorApprovalsViolations && leadData.priorApprovalsViolations.trim()) {
      const priorTrim = leadData.priorApprovalsViolations.trim();
      if (!/[a-zA-Z0-9]/.test(priorTrim)) {
        throw new Error('Prior Approvals / Violations details cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(priorTrim)) {
        throw new Error('Prior Approvals / Violations details contain invalid characters.');
      }
    }

    if (leadData.specialRestrictions && leadData.specialRestrictions.trim()) {
      const specTrim = leadData.specialRestrictions.trim();
      if (!/[a-zA-Z0-9]/.test(specTrim)) {
        throw new Error('Special Restrictions details cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(specTrim)) {
        throw new Error('Special Restrictions details contain invalid characters.');
      }
    }

    if (leadData.expectedStartDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (leadData.expectedStartDate < todayStr) {
        throw new Error('Expected Start Date must be the current date or a future date.');
      }
    }

    if (leadData.expectedStartDate && leadData.expectedCompletionDate) {
      const start = new Date(leadData.expectedStartDate);
      const end = new Date(leadData.expectedCompletionDate);
      if (end < start) {
        throw new Error('Completion date cannot be earlier than the start date.');
      }
    }

    if (leadData.expectedFloors && leadData.expectedFloors.trim()) {
      const flrTrim = leadData.expectedFloors.trim();
      if (!/[a-zA-Z]/.test(flrTrim)) {
        throw new Error('Expected Floors cannot be only numeric or special characters (e.g. G + 2 Floors, 3 Floors).');
      }
      if (/\d{4,}/.test(flrTrim) || /[a-zA-Z]{5,}\d{3,}/.test(flrTrim) || /\d{3,}[a-zA-Z]{5,}/.test(flrTrim)) {
        throw new Error('Enter a valid floor description (e.g. G + 2 Floors, Stilt + 3, 2 Floors).');
      }
      if (!/^[a-zA-Z0-9\s,.'()+–&/–-]+$/.test(flrTrim)) {
        throw new Error('Expected Floors contains invalid characters.');
      }
    }

    if (leadData.preferredVendors && leadData.preferredVendors.trim()) {
      const vTrim = leadData.preferredVendors.trim();
      if (!/[a-zA-Z]/.test(vTrim)) {
        throw new Error('Preferred vendors cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(vTrim) || /[a-zA-Z]{5,}\d{3,}/.test(vTrim) || /\d{3,}[a-zA-Z]{5,}/.test(vTrim)) {
        throw new Error('Enter valid preferred vendor names (e.g. UltraTech, Tata Steel, Jaquar).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(vTrim)) {
        throw new Error('Preferred vendors contains invalid characters.');
      }
    }

    if (leadData.siteVisitFrequencyExpectation && leadData.siteVisitFrequencyExpectation.trim()) {
      const svTrim = leadData.siteVisitFrequencyExpectation.trim();
      if (!/[a-zA-Z]/.test(svTrim)) {
        throw new Error('Site visit expectation cannot be only numeric or special characters.');
      }
      if (/\d{4,}/.test(svTrim) || /[a-zA-Z]{5,}\d{3,}/.test(svTrim) || /\d{3,}[a-zA-Z]{5,}/.test(svTrim)) {
        throw new Error('Enter a valid site visit frequency (e.g. Weekly, 2 times a month).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(svTrim)) {
        throw new Error('Site visit expectation contains invalid characters.');
      }
    }

    if (leadData.reportingExpectations && leadData.reportingExpectations.trim()) {
      const repTrim = leadData.reportingExpectations.trim();
      if (!/[a-zA-Z]/.test(repTrim)) {
        throw new Error('Reporting expectations cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(repTrim) || /[a-zA-Z]{5,}\d{3,}/.test(repTrim) || /\d{3,}[a-zA-Z]{5,}/.test(repTrim)) {
        throw new Error('Enter valid reporting expectations (e.g. Weekly status reports, Monthly audit).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(repTrim)) {
        throw new Error('Reporting expectations contains invalid characters.');
      }
    }

    if (leadData.styleReferencesInspiration && leadData.styleReferencesInspiration.trim()) {
      const stTrim = leadData.styleReferencesInspiration.trim();
      if (!/[a-zA-Z]/.test(stTrim)) {
        throw new Error('Style references cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(stTrim) || /[a-zA-Z]{5,}\d{3,}/.test(stTrim) || /\d{3,}[a-zA-Z]{5,}/.test(stTrim)) {
        throw new Error('Enter valid style references (e.g. Modernist, Minimalist, Traditional).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(stTrim)) {
        throw new Error('Style references contains invalid characters.');
      }
    }

    if (leadData.sustainabilityGoals && leadData.sustainabilityGoals.trim()) {
      const susTrim = leadData.sustainabilityGoals.trim();
      if (!/[a-zA-Z]/.test(susTrim)) {
        throw new Error('Sustainability goals cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(susTrim) || /[a-zA-Z]{5,}\d{3,}/.test(susTrim) || /\d{3,}[a-zA-Z]{5,}/.test(susTrim)) {
        throw new Error('Enter valid sustainability goals (e.g. Solar panel integration, Net-zero).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(susTrim)) {
        throw new Error('Sustainability goals contains invalid characters.');
      }
    }

    if (leadData.vaastuOrientationRequirements && leadData.vaastuOrientationRequirements.trim()) {
      const vaoTrim = leadData.vaastuOrientationRequirements.trim();
      if (!/[a-zA-Z]/.test(vaoTrim)) {
        throw new Error('Vaastu details cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(vaoTrim) || /[a-zA-Z]{5,}\d{3,}/.test(vaoTrim) || /\d{3,}[a-zA-Z]{5,}/.test(vaoTrim)) {
        throw new Error('Enter valid Vaastu details (e.g. Strict Vaastu, East facing entry).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(vaoTrim)) {
        throw new Error('Vaastu details contains invalid characters.');
      }
    }

    if (leadData.materialPreferences && leadData.materialPreferences.trim()) {
      const matTrim = leadData.materialPreferences.trim();
      if (!/[a-zA-Z]/.test(matTrim)) {
        throw new Error('Material preferences cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(matTrim) || /[a-zA-Z]{5,}\d{3,}/.test(matTrim) || /\d{3,}[a-zA-Z]{5,}/.test(matTrim)) {
        throw new Error('Enter valid material preferences (e.g. Natural stone cladding, exposed brick).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(matTrim)) {
        throw new Error('Material preferences contains invalid characters.');
      }
    }

    if (leadData.remarks && leadData.remarks.trim()) {
      const remTrim = leadData.remarks.trim();
      if (!/[a-zA-Z0-9]/.test(remTrim)) {
        throw new Error('Internal remarks cannot be only special characters.');
      }
      if (/^\d+$/.test(remTrim)) {
        throw new Error('Internal remarks cannot be only numbers.');
      }
    }

    // Generate unique sequential leadId
    const leadId = await this.leadRepository.getNextLeadId();

    leadData.leadId = leadId;
    leadData.companyId = scopedCompanyId;
    leadData.branchId = scopedBranchId;
    leadData.createdBy = userContext.userId;
    leadData.status = leadData.status || 'Lead';

    const lead = await this.leadRepository.createLead(leadData);

    // Save category-specific values
    let savedValues: any[] = [];
    if (requirementValues && Object.keys(requirementValues).length > 0) {
      // Filter values to only save known template fields
      const cleanValues: Record<string, any> = {};
      for (const field of templateFields) {
        if (requirementValues[field.fieldKey] !== undefined) {
          cleanValues[field.fieldKey] = requirementValues[field.fieldKey];
        }
      }
      savedValues = await this.leadRepository.saveRequirementValues(lead.id, cleanValues);
    }

    // Auto-generate deliverables checklist (Common + Category Specific)
    let deliverables: any[] = [];
    try {
      const templates = await this.leadRepository.findDeliverableTemplatesByCategoryId(lead.categoryId);
      if (templates.length > 0) {
        const leadDeliverables = templates.map(t => ({
          leadId: lead.id,
          templateId: t.id,
          phase: t.phase,
          deliverableName: t.deliverableName,
          discipline: t.discipline,
          status: 'Pending' as const
        }));
        deliverables = await this.leadRepository.createLeadDeliverables(leadDeliverables);
        console.log(`[LeadService] Auto-generated ${deliverables.length} deliverables for Lead ${lead.leadId}`);
      }
    } catch (err: any) {
      console.error('[LeadService] Failed to auto-generate deliverables checklist:', err.message);
    }

    return {
      ...lead,
      categoryValues: savedValues.reduce((acc, curr) => {
        acc[curr.fieldKey] = curr.value;
        return acc;
      }, {} as Record<string, any>),
      deliverablesCount: deliverables.length
    };
  }

  async getAllLeads(userContext: { companyId: string; branchId: string | null; role: string }): Promise<any[]> {
    const leads = await this.leadRepository.findAllLeads(userContext.companyId, userContext.branchId, userContext.role);
    
    // Merge category values into each lead record for easy frontend consumption
    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const values = await this.leadRepository.findRequirementValuesByLeadId(lead.id);
        const categoryValues = values.reduce((acc, curr) => {
          acc[curr.fieldKey] = curr.value;
          return acc;
        }, {} as Record<string, any>);

        return {
          ...lead,
          categoryValues
        };
      })
    );
    return enrichedLeads;
  }

  async getLeadById(id: number, userContext: { companyId: string; branchId: string | null; role: string }): Promise<any> {
    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new Error('Lead not found.');
    }

    // Verify company/branch permissions
    if (userContext.role !== 'Super Admin' && userContext.role !== 'Employee') {
      if (lead.companyId !== userContext.companyId) {
        throw new Error('Unauthorized to view this lead.');
      }
      if (userContext.role === 'Branch' && userContext.branchId && lead.branchId !== userContext.branchId) {
        throw new Error('Unauthorized to view this lead.');
      }
    }

    const values = await this.leadRepository.findRequirementValuesByLeadId(lead.id);
    const categoryValues = values.reduce((acc, curr) => {
      acc[curr.fieldKey] = curr.value;
      return acc;
    }, {} as Record<string, any>);

    return {
      ...lead,
      categoryValues
    };
  }

  async updateLead(
    id: number, 
    leadData: Partial<LeadModel>, 
    requirementValues: Record<string, any>,
    userContext: { companyId: string; branchId: string | null; role: string }
  ): Promise<any> {
    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new Error('Lead not found.');
    }

    // Verify permissions
    if (userContext.role !== 'Super Admin' && userContext.role !== 'Employee') {
      if (lead.companyId !== userContext.companyId) {
        throw new Error('Unauthorized to modify this lead.');
      }
      if (userContext.role === 'Branch' && userContext.branchId && lead.branchId !== userContext.branchId) {
        throw new Error('Unauthorized to modify this lead.');
      }
    }

    // Disallow converting a Draft lead directly to Won / Converted
    if (lead.status === 'Draft' && (leadData.status === 'Converted' || leadData.status === 'Won')) {
      throw new Error('Draft leads cannot be converted to an active project. Please complete and submit the lead details first.');
    }

    // Validate city and state if provided
    if (leadData.city && leadData.city.trim()) {
      const cityTrim = leadData.city.trim();
      if (!/[a-zA-Z]/.test(cityTrim)) {
        throw new Error('City cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(cityTrim)) {
        throw new Error('City should contain only letters and standard punctuation.');
      }
    }

    if (leadData.state && leadData.state.trim()) {
      const stateTrim = leadData.state.trim();
      if (!/[a-zA-Z]/.test(stateTrim)) {
        throw new Error('State cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(stateTrim)) {
        throw new Error('State should contain only letters and standard punctuation.');
      }
    }

    if (leadData.country && leadData.country.trim()) {
      const cntryTrim = leadData.country.trim();
      if (!/[a-zA-Z]/.test(cntryTrim)) {
        throw new Error('Country cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z\s.'–-]+$/.test(cntryTrim)) {
        throw new Error('Country should contain only letters and standard punctuation.');
      }
    }

    if (leadData.surveyNumber && leadData.surveyNumber.trim()) {
      const survTrim = leadData.surveyNumber.trim();
      if (!/\d/.test(survTrim)) {
        throw new Error('Survey number must contain numeric digits (e.g. 124/2A or Plot 45).');
      }
      if (!/^[a-zA-Z0-9\s/.,#–-]+$/.test(survTrim)) {
        throw new Error('Survey number contains invalid characters.');
      }
    }

    if (leadData.topographyLevels && leadData.topographyLevels.trim()) {
      const topoTrim = leadData.topographyLevels.trim();
      if (!/[a-zA-Z]/.test(topoTrim)) {
        throw new Error('Topography / levels cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'/%+–-]+$/.test(topoTrim)) {
        throw new Error('Topography / levels contains invalid characters.');
      }
    }

    if (leadData.accessRoadWidth && leadData.accessRoadWidth.trim()) {
      const roadTrim = leadData.accessRoadWidth.trim();
      if (!/\d/.test(roadTrim)) {
        throw new Error('Access road width must contain numeric width (e.g. 30 ft, 12m).');
      }
      if (!/[a-zA-Z'"]/.test(roadTrim)) {
        throw new Error('Access road width must include units (e.g. 30 ft, 12m).');
      }
      if (
        /\d{5,}/.test(roadTrim) ||
        /[a-zA-Z]{4,}\d{3,}/.test(roadTrim) ||
        /\d{3,}[a-zA-Z]{4,}/.test(roadTrim) ||
        !(/\b(ft|feet|foot|m|meters?|mtrs?|yards?|inch(?:es)?|wide|road)\b/i.test(roadTrim) || /['"]/.test(roadTrim))
      ) {
        throw new Error('Enter a valid road width with units (e.g. 30 ft, 12m, 40 feet).');
      }
      if (!/^[a-zA-Z0-9\s,.'/%–"-]+$/.test(roadTrim)) {
        throw new Error('Access road width contains invalid characters.');
      }
    }

    if (leadData.orientation && leadData.orientation.trim()) {
      const oriTrim = leadData.orientation.trim();
      if (!/[a-zA-Z]/.test(oriTrim)) {
        throw new Error('Orientation cannot be only numeric or special characters.');
      }
      if (
        /\d{3,}/.test(oriTrim) ||
        !/\b(north|south|east|west|ne|nw|se|sw|facing|corner|vaastu|direction)\b/i.test(oriTrim)
      ) {
        throw new Error('Enter a valid orientation direction (e.g. North-East, East facing, South-West).');
      }
      if (!/^[a-zA-Z\s,.'–-]+$/.test(oriTrim)) {
        throw new Error('Orientation should contain only letters and standard punctuation.');
      }
    }

    if (leadData.ebSupplySanctionedLoad && leadData.ebSupplySanctionedLoad.trim()) {
      const ebTrim = leadData.ebSupplySanctionedLoad.trim();
      if (!/\d/.test(ebTrim)) {
        throw new Error('EB Sanctioned Load must contain numeric capacity (e.g. 15 kW, 3 Phase).');
      }
      if (!/[a-zA-Z]/.test(ebTrim)) {
        throw new Error('EB Sanctioned Load must include units (e.g. 15 kW, 3 Phase).');
      }
      if (
        /\d{6,}/.test(ebTrim) ||
        /[a-zA-Z]{4,}\d{3,}/.test(ebTrim) ||
        /\d{3,}[a-zA-Z]{4,}/.test(ebTrim) ||
        !/\b(kw|kva|hp|phase|ph|amps?|watts?|mw|kv)\b/i.test(ebTrim)
      ) {
        throw new Error('Enter a valid EB load format with recognized units (e.g. 15 kW, 3 Phase, 25 kVA).');
      }
      if (!/^[a-zA-Z0-9\s,.'/%+–-]+$/.test(ebTrim)) {
        throw new Error('EB Sanctioned Load contains invalid characters.');
      }
    }

    if (leadData.telecom && leadData.telecom.trim()) {
      const telTrim = leadData.telecom.trim();
      if (!/[a-zA-Z]/.test(telTrim)) {
        throw new Error('Telecom / connectivity details cannot be only numeric or special characters.');
      }
      if (
        /\d{5,}/.test(telTrim) ||
        /[a-zA-Z]{4,}\d{3,}/.test(telTrim) ||
        /\d{3,}[a-zA-Z]{4,}/.test(telTrim)
      ) {
        throw new Error('Telecom details must be a valid description (e.g. Fiber line active, 4G/5G available).');
      }
      if (!/^[a-zA-Z0-9\s,.'/%+–&/-]+$/.test(telTrim)) {
        throw new Error('Telecom / connectivity details contain invalid characters.');
      }
    }

    if (leadData.approvingAuthority && leadData.approvingAuthority.trim()) {
      const authTrim = leadData.approvingAuthority.trim();
      if (!/[a-zA-Z]/.test(authTrim)) {
        throw new Error('Approving Authority cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(authTrim) || /[a-zA-Z]{4,}\d{3,}/.test(authTrim) || /\d{3,}[a-zA-Z]{4,}/.test(authTrim)) {
        throw new Error('Enter a valid Approving Authority (e.g. CMDA, DTCP, Corporation).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/-]+$/.test(authTrim)) {
        throw new Error('Approving Authority contains invalid characters.');
      }
    }

    if (leadData.landUseZoning && leadData.landUseZoning.trim()) {
      const zoneTrim = leadData.landUseZoning.trim();
      if (!/[a-zA-Z]/.test(zoneTrim)) {
        throw new Error('Land Use Zoning cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(zoneTrim) || /[a-zA-Z]{4,}\d{3,}/.test(zoneTrim) || /\d{3,}[a-zA-Z]{4,}/.test(zoneTrim)) {
        throw new Error('Enter a valid Land Use Zoning (e.g. Residential, Commercial, Mixed-Use).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/-]+$/.test(zoneTrim)) {
        throw new Error('Land Use Zoning contains invalid characters.');
      }
    }

    if (leadData.fsiCoverageKnown && leadData.fsiCoverageKnown.trim()) {
      const fsiTrim = leadData.fsiCoverageKnown.trim();
      if (!/[a-zA-Z0-9]/.test(fsiTrim)) {
        throw new Error('FSI & Coverage details cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(fsiTrim)) {
        throw new Error('FSI & Coverage details contain invalid characters.');
      }
    }

    if (leadData.setbacksHeightRestrictions && leadData.setbacksHeightRestrictions.trim()) {
      const setTrim = leadData.setbacksHeightRestrictions.trim();
      if (!/[a-zA-Z0-9]/.test(setTrim)) {
        throw new Error('Setbacks / Height restrictions cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–"+-]+$/.test(setTrim)) {
        throw new Error('Setbacks / Height restrictions contain invalid characters.');
      }
    }

    if (leadData.priorApprovalsViolations && leadData.priorApprovalsViolations.trim()) {
      const priorTrim = leadData.priorApprovalsViolations.trim();
      if (!/[a-zA-Z0-9]/.test(priorTrim)) {
        throw new Error('Prior Approvals / Violations details cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(priorTrim)) {
        throw new Error('Prior Approvals / Violations details contain invalid characters.');
      }
    }

    if (leadData.specialRestrictions && leadData.specialRestrictions.trim()) {
      const specTrim = leadData.specialRestrictions.trim();
      if (!/[a-zA-Z0-9]/.test(specTrim)) {
        throw new Error('Special Restrictions details cannot be only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(specTrim)) {
        throw new Error('Special Restrictions details contain invalid characters.');
      }
    }

    if (leadData.expectedStartDate && leadData.expectedStartDate !== lead.expectedStartDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (leadData.expectedStartDate < todayStr) {
        throw new Error('Expected Start Date must be the current date or a future date.');
      }
    }

    if (leadData.expectedStartDate && leadData.expectedCompletionDate) {
      const start = new Date(leadData.expectedStartDate);
      const end = new Date(leadData.expectedCompletionDate);
      if (end < start) {
        throw new Error('Completion date cannot be earlier than the start date.');
      }
    }

    if (leadData.expectedFloors && leadData.expectedFloors.trim()) {
      const flrTrim = leadData.expectedFloors.trim();
      if (!/[a-zA-Z]/.test(flrTrim)) {
        throw new Error('Expected Floors cannot be only numeric or special characters (e.g. G + 2 Floors, 3 Floors).');
      }
      if (/\d{4,}/.test(flrTrim) || /[a-zA-Z]{5,}\d{3,}/.test(flrTrim) || /\d{3,}[a-zA-Z]{5,}/.test(flrTrim)) {
        throw new Error('Enter a valid floor description (e.g. G + 2 Floors, Stilt + 3, 2 Floors).');
      }
      if (!/^[a-zA-Z0-9\s,.'()+–&/–-]+$/.test(flrTrim)) {
        throw new Error('Expected Floors contains invalid characters.');
      }
    }

    if (leadData.preferredVendors && leadData.preferredVendors.trim()) {
      const vTrim = leadData.preferredVendors.trim();
      if (!/[a-zA-Z]/.test(vTrim)) {
        throw new Error('Preferred vendors cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(vTrim) || /[a-zA-Z]{5,}\d{3,}/.test(vTrim) || /\d{3,}[a-zA-Z]{5,}/.test(vTrim)) {
        throw new Error('Enter valid preferred vendor names (e.g. UltraTech, Tata Steel, Jaquar).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(vTrim)) {
        throw new Error('Preferred vendors contains invalid characters.');
      }
    }

    if (leadData.siteVisitFrequencyExpectation && leadData.siteVisitFrequencyExpectation.trim()) {
      const svTrim = leadData.siteVisitFrequencyExpectation.trim();
      if (!/[a-zA-Z]/.test(svTrim)) {
        throw new Error('Site visit expectation cannot be only numeric or special characters.');
      }
      if (/\d{4,}/.test(svTrim) || /[a-zA-Z]{5,}\d{3,}/.test(svTrim) || /\d{3,}[a-zA-Z]{5,}/.test(svTrim)) {
        throw new Error('Enter a valid site visit frequency (e.g. Weekly, 2 times a month).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(svTrim)) {
        throw new Error('Site visit expectation contains invalid characters.');
      }
    }

    if (leadData.reportingExpectations && leadData.reportingExpectations.trim()) {
      const repTrim = leadData.reportingExpectations.trim();
      if (!/[a-zA-Z]/.test(repTrim)) {
        throw new Error('Reporting expectations cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(repTrim) || /[a-zA-Z]{5,}\d{3,}/.test(repTrim) || /\d{3,}[a-zA-Z]{5,}/.test(repTrim)) {
        throw new Error('Enter valid reporting expectations (e.g. Weekly status reports, Monthly audit).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(repTrim)) {
        throw new Error('Reporting expectations contains invalid characters.');
      }
    }

    if (leadData.styleReferencesInspiration && leadData.styleReferencesInspiration.trim()) {
      const stTrim = leadData.styleReferencesInspiration.trim();
      if (!/[a-zA-Z]/.test(stTrim)) {
        throw new Error('Style references cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(stTrim) || /[a-zA-Z]{5,}\d{3,}/.test(stTrim) || /\d{3,}[a-zA-Z]{5,}/.test(stTrim)) {
        throw new Error('Enter valid style references (e.g. Modernist, Minimalist, Traditional).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(stTrim)) {
        throw new Error('Style references contains invalid characters.');
      }
    }

    if (leadData.sustainabilityGoals && leadData.sustainabilityGoals.trim()) {
      const susTrim = leadData.sustainabilityGoals.trim();
      if (!/[a-zA-Z]/.test(susTrim)) {
        throw new Error('Sustainability goals cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(susTrim) || /[a-zA-Z]{5,}\d{3,}/.test(susTrim) || /\d{3,}[a-zA-Z]{5,}/.test(susTrim)) {
        throw new Error('Enter valid sustainability goals (e.g. Solar panel integration, Net-zero).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/%–-]+$/.test(susTrim)) {
        throw new Error('Sustainability goals contains invalid characters.');
      }
    }

    if (leadData.vaastuOrientationRequirements && leadData.vaastuOrientationRequirements.trim()) {
      const vaoTrim = leadData.vaastuOrientationRequirements.trim();
      if (!/[a-zA-Z]/.test(vaoTrim)) {
        throw new Error('Vaastu details cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(vaoTrim) || /[a-zA-Z]{5,}\d{3,}/.test(vaoTrim) || /\d{3,}[a-zA-Z]{5,}/.test(vaoTrim)) {
        throw new Error('Enter valid Vaastu details (e.g. Strict Vaastu, East facing entry).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(vaoTrim)) {
        throw new Error('Vaastu details contains invalid characters.');
      }
    }

    if (leadData.materialPreferences && leadData.materialPreferences.trim()) {
      const matTrim = leadData.materialPreferences.trim();
      if (!/[a-zA-Z]/.test(matTrim)) {
        throw new Error('Material preferences cannot be only numeric or special characters.');
      }
      if (/\d{5,}/.test(matTrim) || /[a-zA-Z]{5,}\d{3,}/.test(matTrim) || /\d{3,}[a-zA-Z]{5,}/.test(matTrim)) {
        throw new Error('Enter valid material preferences (e.g. Natural stone cladding, exposed brick).');
      }
      if (!/^[a-zA-Z0-9\s,.'()&/–-]+$/.test(matTrim)) {
        throw new Error('Material preferences contains invalid characters.');
      }
    }

    if (leadData.remarks && leadData.remarks.trim()) {
      const remTrim = leadData.remarks.trim();
      if (!/[a-zA-Z0-9]/.test(remTrim)) {
        throw new Error('Internal remarks cannot be only special characters.');
      }
      if (/^\d+$/.test(remTrim)) {
        throw new Error('Internal remarks cannot be only numbers.');
      }
    }

    // Update properties dynamically (excluding read-only fields)
    const mutableFields = [
      // Lead / client identification
      'clientId', 'clientName', 'leadTitle', 'company', 'contactPerson', 'email', 'mobile',
      'organisation', 'leadSource', 'decisionMakers', 'priorProjectsWithSSA',
      // Project classification
      'projectType', 'projectSubType', 'leadCategory', 'subType', 'buildType',
      // Site location
      'siteAddress', 'locationAddress', 'city', 'state', 'country',
      'surveyNumber', 'siteArea', 'unit', 'siteExtent',
      // Site details
      'landOwnershipDocsAvailable', 'topographyLevels', 'accessRoadWidth',
      'orientation', 'existingStructures', 'soilReportAvailable', 'adjacentDevelopments',
      // Utilities
      'ebSupplySanctionedLoad', 'waterSource', 'sewerSeptic', 'stormDrainage', 'telecom',
      // Regulatory
      'approvingAuthority', 'landUseZoning', 'fsiCoverageKnown', 'setbacksHeightRestrictions',
      'priorApprovalsViolations', 'specialRestrictions',
      // Project basics / budget
      'projectName', 'expectedBuiltUpArea', 'expectedFloors',
      'budgetRange', 'estimatedBudget', 'timelineExpectation',
      'expectedStartDate', 'expectedCompletionDate',
      'fundingSource', 'phasingNeeds', 'servicesRequired',
      // Execution
      'contractorStatus', 'preferredVendors', 'siteVisitFrequencyExpectation', 'reportingExpectations',
      // Design preferences
      'styleReferencesInspiration', 'sustainabilityGoals', 'vaastuOrientationRequirements', 'materialPreferences',
      // Assignment & status
      'assignedEmployee', 'branch', 'branchId', 'remarks', 'status', 'attachments',
    ];

    for (const key of mutableFields) {
      if ((leadData as any)[key] !== undefined) {
        (lead as any)[key] = (leadData as any)[key];
      }
    }

    // Save lead core
    const updatedLead = await this.leadRepository.createLead(lead);

    // Save/update requirement values if provided
    let savedValues: any[] = [];
    if (requirementValues && Object.keys(requirementValues).length > 0) {
      const templateFields = await this.leadRepository.findTemplateFieldsByCategoryId(lead.categoryId);
      const cleanValues: Record<string, any> = {};
      for (const field of templateFields) {
        if (requirementValues[field.fieldKey] !== undefined) {
          const val = requirementValues[field.fieldKey];
          if (val !== null && val !== '') {
            if (field.fieldType === 'text' && typeof val === 'string') {
              const trimmed = val.trim();
              if (trimmed.length > 150) {
                throw new Error(`Field '${field.fieldName}' cannot exceed 150 characters.`);
              }
              if (/\d/.test(trimmed)) {
                throw new Error(`Field '${field.fieldName}' allows text only (numbers are not allowed).`);
              }
              if (!/[a-zA-Z]/.test(trimmed)) {
                throw new Error(`Field '${field.fieldName}' must contain text characters.`);
              }
              if (!/^[a-zA-Z\s,.'()&/%@:;–"'+-]+$/.test(trimmed)) {
                throw new Error(`Field '${field.fieldName}' contains invalid characters.`);
              }
            } else if (field.fieldType === 'number') {
              const strVal = String(val).trim();
              if (!/^\d+$/.test(strVal)) {
                throw new Error(`Field '${field.fieldName}' allows numbers only.`);
              }
              const numVal = Number(strVal);
              if (isNaN(numVal)) {
                throw new Error(`Field '${field.fieldName}' must be a valid number.`);
              }
              if (numVal < 0) {
                throw new Error(`Field '${field.fieldName}' cannot be negative.`);
              }
              if (numVal > 1000000000000) {
                throw new Error(`Field '${field.fieldName}' exceeds maximum allowable limit.`);
              }
            }
          }
          cleanValues[field.fieldKey] = requirementValues[field.fieldKey];
        }
      }
      savedValues = await this.leadRepository.saveRequirementValues(lead.id, cleanValues);
    } else {
      savedValues = await this.leadRepository.findRequirementValuesByLeadId(lead.id);
    }

    return {
      ...updatedLead,
      categoryValues: savedValues.reduce((acc, curr) => {
        acc[curr.fieldKey] = curr.value;
        return acc;
      }, {} as Record<string, any>)
    };
  }

  async getLeadDeliverables(leadId: number, userContext: { companyId: string; branchId: string | null; role: string }) {
    const lead = await this.leadRepository.findLeadById(leadId);
    if (!lead) {
      throw new Error('Lead not found.');
    }

    // Verify company/branch permissions
    if (userContext.role !== 'Super Admin' && userContext.role !== 'Employee') {
      if (lead.companyId !== userContext.companyId) {
        throw new Error('Unauthorized to view deliverables for this lead.');
      }
      if (userContext.role === 'Branch' && userContext.branchId && lead.branchId !== userContext.branchId) {
        throw new Error('Unauthorized to view deliverables for this lead.');
      }
    }

    return await this.leadRepository.findDeliverablesByLeadId(leadId);
  }

  async deleteLead(id: number, userContext: { companyId: string; branchId: string | null; role: string }): Promise<void> {
    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new Error('Lead not found.');
    }

    // Verify permissions
    if (userContext.role !== 'Super Admin' && userContext.role !== 'Employee') {
      if (lead.companyId !== userContext.companyId) {
        throw new Error('Unauthorized to delete this lead.');
      }
      if (userContext.role === 'Branch' && userContext.branchId && lead.branchId !== userContext.branchId) {
        throw new Error('Unauthorized to delete this lead.');
      }
    }

    await this.leadRepository.deleteLead(id);
  }

  async convertLeadToClient(id: number, userContext: { companyId: string; branchId: string | null; role: string; userId: string }) {
    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new Error('Lead not found.');
    }

    if (userContext.role !== 'Super Admin' && userContext.role !== 'Employee') {
      if (lead.companyId !== userContext.companyId) {
        throw new Error('Unauthorized to convert this lead.');
      }
      if (userContext.role === 'Branch' && userContext.branchId && lead.branchId !== userContext.branchId) {
        throw new Error('Unauthorized to convert this lead.');
      }
    }

    if (lead.status === 'Draft') {
      throw new Error('Draft leads cannot be converted to a Client. Please complete and submit the lead details first.');
    }

    let client = null;
    const scopedCompanyId = lead.companyId || userContext.companyId;

    // 1. Check if lead already has a linked clientId
    if (lead.clientId) {
      client = await this.clientRepository.findById(lead.clientId);
    }

    // 2. Check if a client with this mobile number already exists in company
    if (!client && lead.mobile && lead.mobile.trim()) {
      const cleanMobile = lead.mobile.trim();
      client = await this.clientRepository.findByMobile(cleanMobile, scopedCompanyId);
    }

    // 3. If client does not exist, create a new Client record from the lead details
    if (!client) {
      const clientCode = await this.clientRepository.getNextClientCode();

      const clientName = (lead.clientName || lead.contactPerson || lead.company || 'Client Account').trim();
      const company = (lead.company || lead.organisation || clientName).trim();
      const contactPerson = (lead.contactPerson || lead.clientName || clientName).trim();
      const mobile = (lead.mobile || '9999999999').replace(/\D/g, '').slice(0, 10).padStart(10, '9');
      const email = (lead.email || `${clientCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`).trim();
      const address = (lead.siteAddress || lead.locationAddress || 'Main Office / Site').trim();
      const city = (lead.city || 'Chennai').trim();
      const state = (lead.state || 'Tamil Nadu').trim();
      const country = (lead.country || 'India').trim();

      client = await this.clientRepository.create({
        clientCode,
        companyId: scopedCompanyId,
        branchId: lead.branchId !== undefined ? lead.branchId : userContext.branchId,
        clientName,
        company,
        contactPerson,
        mobile,
        email,
        address,
        city,
        state,
        country,
        clientType: lead.projectType || 'Corporate',
        status: 'Active',
        remarks: `Converted from Lead ${lead.leadId || `LD-${lead.id}`}`
      });
    }

    // 4. Update Lead record: link clientId & update status to 'Converted to Client'
    lead.clientId = client.id;
    lead.status = 'Converted to Client';
    const updatedLead = await this.leadRepository.updateLead(lead.id, {
      clientId: client.id,
      status: 'Converted to Client'
    });

    return {
      success: true,
      client,
      lead: updatedLead || lead
    };
  }
}
