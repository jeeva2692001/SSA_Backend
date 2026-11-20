import { LeadRepository } from '../repositories/lead.repository';
import { LeadModel } from '../models/lead.model';
import { ClientRepository } from '../../client/repositories/client.repository';
import { OpportunityService } from './opportunity.service';

export const DEFAULT_CATEGORY_TAGLINES: Record<string, string[]> = {
  RESIDENTIAL: [
    'Master Bedroom',
    'Bedroom Design',
    'Living Room',
    'Hall Design',
    'Kitchen Interior',
    'Dining Area',
    'Balcony / Terrace',
    'Pooja Room',
    'False Ceiling',
    '3D Elevation',
    '3D Render',
    'Floor Plan',
    'Electrical Layout',
    'Plumbing Layout',
    'Landscape Design',
    'Section / Detail',
    'Structural Detail',
    'Bathroom Design'
  ],
  SCHOOLS: [
    'Classroom Layout',
    'Science Lab',
    'Computer Lab',
    'Library & Reading Hall',
    'Auditorium / Assembly Hall',
    'Indoor Sports Hall',
    'Playground / Sports Ground',
    'Principal / Admin Office',
    'Staff Room',
    'Cafeteria / Dining Hall',
    'Student Restroom Block',
    'Campus Master Plan',
    'Main Entrance & Security Gate',
    'Bus Bay & Drop-off Zone',
    'Fire & Evacuation Plan',
    'Multi-Purpose Hall (MPH)'
  ],
  HOSPITALS: [
    'Emergency / Casualty',
    'ICU / Critical Care Unit',
    'Operation Theatre (OT) Complex',
    'OPD Consultation Rooms',
    'Inpatient Patient Ward',
    'Private Patient Room',
    'Radiology & Imaging (X-Ray / MRI)',
    'Pathology Lab',
    'Pharmacy & Medicine Store',
    'Central Sterile Services (CSSD)',
    'Doctors Lounge & Nurse Station',
    'Hospital Reception & Waiting Lobby',
    'Ambulance Bay & ER Ramp',
    'Medical Gas Pipeline (MGPS) Plan',
    'Mortuary',
    'Biomedical Waste Area'
  ],
  COMMERCIAL: [
    'Open Office Workstation Area',
    'Executive Cabin / MD Office',
    'Boardroom / Conference Room',
    'Reception & Waiting Lounge',
    'Breakout Zone & Pantry',
    'Server & UPS Room',
    'Retail Storefront & Showroom',
    'Mall Atrium & Corridors',
    'Food Court & Dining',
    'Public Washroom Block',
    'Central HVAC & Ducting Plan',
    'Fire Sprinkler & Hydrant Plan',
    'Multi-level Car Parking (MLCP)',
    'Facade & Curtain Wall Detail'
  ],
  HOSPITALITY: [
    'Deluxe Guest Room / Suite',
    'Presidential Suite',
    'Hotel Grand Lobby & Reception',
    'All-Day Dining Restaurant',
    'Banquet Hall & Ballroom',
    'Commercial Kitchen / BOH',
    'Bar & Lounge',
    'Swimming Pool & Sun Deck',
    'Spa & Wellness Center',
    'Gymnasium & Fitness',
    'Back of House & Staff Locker',
    'Laundry & Linen Store',
    'Resort Cottage / Villa Layout',
    'Valet & Porch Entry'
  ],
  INDUSTRIAL: [
    'Manufacturing / Production Hall',
    'Raw Material Storage',
    'Finished Goods Warehouse',
    'Heavy Vehicle Loading Dock',
    'Overhead Crane Gantry Section',
    'Industrial Flooring Plan',
    'Substation & Transformer Yard',
    'Plant Manager & Admin Office',
    'Workers Canteen & Locker',
    'Effluent Treatment Plant (ETP)',
    'Fire Safety & Hazardous Storage',
    'Ventilation & Exhaust Detail'
  ],
  INSTITUTIONAL: [
    'Lecture Hall / Amphitheatre',
    'Seminar Hall',
    'Community Hall / Sabha Gruha',
    'Prayer / Meditation Hall',
    'Student Hostel Block',
    'Dining Hall & Mess',
    'Central Library',
    'Exhibition Gallery',
    'Administration Building',
    'Parking & Traffic Circulation'
  ],
  MIXED_USE: [
    'Retail Podium Floor',
    'Residential Tower Typical Floor',
    'Office Tower Typical Floor',
    'Mixed-Use Plaza & Landscaping',
    'Basements & Parking Circulation',
    'Transfer Slab Structural Detail',
    'Service Core & Lift Bank',
    'Sky Garden & Common Amenities'
  ]
};

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

  // ── Category Taglines & Template Field Validators ───────────────────────────
  private validateTaglineName(name: string): string {
    const cleanName = (name || '').trim().replace(/,/g, '');
    if (!cleanName) {
      throw new Error('Tagline name is required.');
    }
    if (!/[a-zA-Z0-9]/.test(cleanName)) {
      throw new Error('Tagline cannot contain only special characters.');
    }
    if (/^\d+$/.test(cleanName.replace(/[\s/.'&()_-]+/g, ''))) {
      throw new Error('Tagline cannot contain only numeric characters.');
    }
    if (cleanName.length < 2) {
      throw new Error('Tagline name must be at least 2 characters.');
    }
    if (cleanName.length > 100) {
      throw new Error('Tagline name cannot exceed 100 characters.');
    }
    if (!/[a-zA-Z]/.test(cleanName)) {
      throw new Error('Tagline must contain at least one letter.');
    }
    if (!/^[a-zA-Z0-9\s&/.,()'-]+$/.test(cleanName)) {
      throw new Error('Tagline contains unsupported special characters.');
    }
    return cleanName;
  }

  private validateTemplateFieldName(fieldName: string): string {
    const trimmed = (fieldName || '').trim();
    if (!trimmed) {
      throw new Error('Question / Field Name is required.');
    }
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      throw new Error('Question should not accept special characters alone. Question / Field Name cannot contain only special characters.');
    }
    if (/^\d+$/.test(trimmed.replace(/[\s/.'&()?-]+/g, ''))) {
      throw new Error('Question should not accept numbers alone. Question / Field Name cannot contain only numeric characters.');
    }
    if (trimmed.length < 2) {
      throw new Error('Question / Field Name must be at least 2 characters.');
    }
    if (trimmed.length > 120) {
      throw new Error('Question / Field Name cannot exceed 120 characters.');
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      throw new Error('Question should not accept numbers or symbols alone. Question / Field Name must contain at least one letter.');
    }
    if (!/^[a-zA-Z0-9\s&/.,():;'?!"–—+éè-]+$/.test(trimmed)) {
      throw new Error('Question / Field Name contains unsupported special characters.');
    }
    return trimmed;
  }

  private validateTemplateSection(section: string): string {
    const trimmed = (section || '').trim();
    if (!trimmed) {
      throw new Error('Section name is required.');
    }
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      throw new Error('Section name cannot contain only special characters.');
    }
    if (/^\d+$/.test(trimmed.replace(/[\s/.'&()-]+/g, ''))) {
      throw new Error('Section name cannot contain only numeric characters.');
    }
    if (trimmed.length < 2) {
      throw new Error('Section name must be at least 2 characters.');
    }
    if (trimmed.length > 80) {
      throw new Error('Section name cannot exceed 80 characters.');
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      throw new Error('Section name must contain at least one letter.');
    }
    if (!/^[a-zA-Z0-9\s&/.,():;'–—+-]+$/.test(trimmed)) {
      throw new Error('Section name contains unsupported special characters.');
    }
    return trimmed;
  }

  // ── Category Taglines Management ───────────────────────────────────────────
  async getTaglines(categoryId?: number, categoryCode?: string) {
    if (categoryId !== undefined) {
      return await this.leadRepository.findTaglinesByCategoryId(Number(categoryId));
    }
    if (categoryCode !== undefined) {
      const cat = await this.leadRepository.findCategoryByCode(categoryCode);
      return cat ? await this.leadRepository.findTaglinesByCategoryId(cat.id) : [];
    }
    return await this.leadRepository.findAllTaglines();
  }

  async createTagline(data: { categoryId: number; name: string; description?: string; displayOrder?: number }, userRole?: string) {
    if (userRole && !['Company', 'Super Admin', 'Super Administrator', 'Admin', 'Branch'].includes(userRole)) {
      throw new Error('Unauthorized: Insufficient permissions to create taglines.');
    }
    const cleanName = this.validateTaglineName(data.name);
    const categoryId = Number(data.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new Error('Valid Category ID is required.');
    }
    const cat = await this.leadRepository.findCategoryById(categoryId);
    if (!cat) {
      throw new Error(`Category with ID ${categoryId} not found.`);
    }

    // Duplicate check within category
    const existing = await this.leadRepository.findTaglinesByCategoryId(categoryId);
    if (existing.some(t => t.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`Tagline "${cleanName}" already exists for category "${cat.name}".`);
    }

    const saved = await this.leadRepository.createTagline({
      categoryId,
      name: cleanName,
      description: data.description?.trim(),
      displayOrder: data.displayOrder ?? (existing.length + 1),
      isActive: true
    });
    return { ...saved, categoryId, category: saved.category ?? cat };
  }

  async updateTagline(id: number, data: { name?: string; categoryId?: number; description?: string; displayOrder?: number; isActive?: boolean }, userRole?: string) {
    if (userRole && !['Company', 'Super Admin', 'Super Administrator', 'Admin', 'Branch'].includes(userRole)) {
      throw new Error('Unauthorized: Insufficient permissions to update taglines.');
    }
    const existing = await this.leadRepository.findTaglineById(id);
    if (!existing) {
      throw new Error(`Tagline with ID ${id} not found.`);
    }

    const updates: any = {};
    if (data.name !== undefined) {
      const cleanName = this.validateTaglineName(data.name);
      const targetCatId = data.categoryId || existing.categoryId;
      const allInCat = await this.leadRepository.findTaglinesByCategoryId(targetCatId);
      if (allInCat.some(t => t.id !== id && t.name.toLowerCase() === cleanName.toLowerCase())) {
        throw new Error(`Tagline "${cleanName}" already exists in this category.`);
      }
      updates.name = cleanName;
    }

    if (data.categoryId !== undefined) {
      const cat = await this.leadRepository.findCategoryById(data.categoryId);
      if (!cat) throw new Error(`Category with ID ${data.categoryId} not found.`);
      updates.categoryId = data.categoryId;
    }

    if (data.description !== undefined) {
      updates.description = data.description ? data.description.trim() : null;
    }
    if (data.displayOrder !== undefined) {
      updates.displayOrder = data.displayOrder;
    }
    if (data.isActive !== undefined) {
      if (data.isActive === false && existing.isActive !== false) {
        const catTaglines = await this.leadRepository.findTaglinesByCategoryId(existing.categoryId);
        const activeCount = catTaglines.filter(t => t.isActive !== false).length;
        if (activeCount <= 4) {
          throw new Error('Cannot deactivate tagline. A minimum of four active taglines must be maintained for the project/design.');
        }
      }
      updates.isActive = data.isActive;
    }

    return await this.leadRepository.updateTagline(id, updates);
  }

  async deleteTagline(id: number, userRole?: string) {
    if (userRole && !['Company', 'Super Admin', 'Super Administrator', 'Admin', 'Branch'].includes(userRole)) {
      throw new Error('Unauthorized: Insufficient permissions to delete taglines.');
    }
    const existing = await this.leadRepository.findTaglineById(id);
    if (!existing) {
      throw new Error(`Tagline with ID ${id} not found.`);
    }

    // Enforce business rule: A minimum of four taglines should be maintained for the project/design
    const categoryTaglines = await this.leadRepository.findTaglinesByCategoryId(existing.categoryId);
    const activeCount = categoryTaglines.filter(t => t.isActive !== false).length;
    if (activeCount <= 4) {
      throw new Error('Cannot delete tagline. A minimum of four taglines should be maintained for the project/design.');
    }

    await this.leadRepository.deleteTagline(id);
  }

  async resetDefaultTaglines(categoryId?: number, userRole?: string) {
    if (userRole && !['Company', 'Super Admin', 'Super Administrator', 'Admin'].includes(userRole)) {
      throw new Error('Unauthorized: Only Administrators can reset default taglines.');
    }
    const categories = await this.leadRepository.findAllCategories();
    const targets = categoryId ? categories.filter(c => c.id === categoryId) : categories;

    for (const cat of targets) {
      const defaults = DEFAULT_CATEGORY_TAGLINES[cat.code];
      if (!defaults || defaults.length === 0) {
        if (categoryId) {
          throw new Error(`No preset default taglines are configured for custom category "${cat.name}".`);
        }
        continue;
      }
      // Clean existing
      await this.leadRepository.deleteTaglinesByCategoryId(cat.id);
      // Create defaults
      const itemsToCreate = defaults.map((tagName, idx) => ({
        categoryId: cat.id,
        name: tagName,
        displayOrder: idx + 1,
        isActive: true
      }));
      if (itemsToCreate.length > 0) {
        await this.leadRepository.bulkCreateTaglines(itemsToCreate);
      }
    }
    return await this.getTaglines(categoryId);
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
    const cleanFieldName = this.validateTemplateFieldName(data.fieldName);
    const cleanSection = this.validateTemplateSection(data.section);

    const category = await this.leadRepository.findCategoryById(data.categoryId);
    if (!category) {
      throw new Error(`Category with ID ${data.categoryId} not found.`);
    }

    const existingFields = await this.leadRepository.findTemplateFieldsByCategoryId(data.categoryId);
    const duplicateInSection = existingFields.some(
      (f) =>
        f.section.trim().toLowerCase() === cleanSection.toLowerCase() &&
        f.fieldName.trim().toLowerCase() === cleanFieldName.toLowerCase()
    );
    if (duplicateInSection) {
      throw new Error(`Question "${cleanFieldName}" already exists under the "${cleanSection}" section.`);
    }

    // Auto-generate camelCase fieldKey if not explicitly specified
    let fieldKey = data.fieldKey
      ? data.fieldKey.trim()
      : cleanFieldName
          .replace(/[^a-zA-Z0-9]/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
          .join('');
    if (!fieldKey) fieldKey = `custom_${Date.now()}`;

    if (existingFields.some(f => f.fieldKey === fieldKey)) {
      fieldKey = `${fieldKey}_${Date.now().toString().slice(-4)}`;
    }

    return await this.leadRepository.createTemplateField({
      categoryId: data.categoryId,
      fieldKey,
      fieldName: cleanFieldName,
      fieldType: data.fieldType || 'text',
      fieldOptions: data.fieldOptions || [],
      section: cleanSection,
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
    const existingField = await this.leadRepository.findTemplateFieldById(id);
    if (!existingField) {
      throw new Error(`Template field with ID ${id} not found.`);
    }

    const cleanFieldName = data.fieldName !== undefined
      ? this.validateTemplateFieldName(data.fieldName)
      : existingField.fieldName;
    const cleanSection = data.section !== undefined
      ? this.validateTemplateSection(data.section)
      : existingField.section;

    const existingFields = await this.leadRepository.findTemplateFieldsByCategoryId(existingField.categoryId);
    const duplicateInSection = existingFields.some(
      (f) =>
        f.id !== id &&
        f.section.trim().toLowerCase() === cleanSection.toLowerCase() &&
        f.fieldName.trim().toLowerCase() === cleanFieldName.toLowerCase()
    );
    if (duplicateInSection) {
      throw new Error(`Question "${cleanFieldName}" already exists under the "${cleanSection}" section.`);
    }

    return await this.leadRepository.updateTemplateField(id, {
      ...data,
      fieldName: cleanFieldName,
      section: cleanSection
    });
  }

  async deleteTemplateField(id: number, userRole: string) {
    if (userRole !== 'Company' && userRole !== 'Super Admin' && userRole !== 'Super Administrator' && userRole !== 'Admin') {
      throw new Error('Unauthorized: Only Company Admin or Super Admin can delete lead questions.');
    }
    return await this.leadRepository.deleteTemplateField(id);
  }

  private validateLeadTextWithLetters(
    value: string,
    label: string,
    minLen: number,
    maxLen: number,
    allowedRegex: RegExp,
    numericStripRegex: RegExp
  ): void {
    const trimmed = value.trim();
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      throw new Error(`${label} cannot contain only special characters.`);
    }
    if (/^\d+$/.test(trimmed.replace(numericStripRegex, ''))) {
      throw new Error(`${label} cannot contain only numeric characters.`);
    }
    if (trimmed.length < minLen) {
      throw new Error(`${label} must be at least ${minLen} characters.`);
    }
    if (trimmed.length > maxLen) {
      throw new Error(`${label} cannot exceed ${maxLen} characters.`);
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      throw new Error(`${label} must contain valid alphabetic text.`);
    }
    if (!allowedRegex.test(trimmed)) {
      throw new Error(`${label} contains unsupported special characters.`);
    }
  }

  private validateLeadCoreFields(leadData: Partial<LeadModel>, isDraft: boolean, isUpdate: boolean): void {
    if (leadData.clientName !== undefined && !leadData.clientName.trim()) {
      throw new Error('Client Name is required.');
    }

    if (!isDraft) {
      const effectiveTitle = leadData.leadTitle !== undefined ? leadData.leadTitle : (!isUpdate ? leadData.projectName : undefined);
      if (effectiveTitle !== undefined && !effectiveTitle.trim()) {
        throw new Error('Lead Title is required.');
      }
      if (!isUpdate && leadData.leadTitle === undefined && !leadData.projectName?.trim()) {
        throw new Error('Lead Title is required.');
      }
      if (leadData.mobile !== undefined && !leadData.mobile.trim()) {
        throw new Error('Mobile number is required.');
      }
      if (leadData.email !== undefined && !leadData.email.trim()) {
        throw new Error('Email is required.');
      }
    }

    if (leadData.leadTitle !== undefined) {
      const titleTrim = (leadData.leadTitle || '').trim();
      if (!titleTrim) {
        if (!isDraft) throw new Error('Lead Title is required.');
      } else {
        this.validateLeadTextWithLetters(
          titleTrim,
          'Lead Title',
          2,
          150,
          /^[a-zA-Z0-9\s.'&()/_,-]+$/,
          /[\s.'&()/_,-]+/g
        );
      }
    } else if (!isUpdate && !isDraft && leadData.projectName && leadData.projectName.trim()) {
      this.validateLeadTextWithLetters(
        leadData.projectName,
        'Lead Title',
        2,
        150,
        /^[a-zA-Z0-9\s.'&()/_,-]+$/,
        /[\s.'&()/_,-]+/g
      );
    }

    const companyVal = leadData.company !== undefined ? leadData.company : leadData.organisation;
    if (companyVal && companyVal.trim()) {
      this.validateLeadTextWithLetters(
        companyVal,
        'Company / Organization',
        2,
        100,
        /^[a-zA-Z0-9\s.'&()/_,-]+$/,
        /[\s.'&()/_,-]+/g
      );
    }

    if (leadData.contactPerson !== undefined && leadData.contactPerson !== null) {
      const cp = leadData.contactPerson.trim();
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

    if (leadData.decisionMakers && leadData.decisionMakers.trim()) {
      this.validateLeadTextWithLetters(
        leadData.decisionMakers,
        'Decision Makers',
        2,
        100,
        /^[a-zA-Z0-9\s,.'&()/-]+$/,
        /[\s,.'&()/-]+/g
      );
    }

    if (leadData.adjacentDevelopments && leadData.adjacentDevelopments.trim()) {
      this.validateLeadTextWithLetters(
        leadData.adjacentDevelopments,
        'Adjacent Developments',
        2,
        200,
        /^[a-zA-Z0-9\s,.'&()/_–—-]+$/,
        /[\s,.'&()/_–—-]+/g
      );
    }

    const addressVal = leadData.siteAddress !== undefined ? leadData.siteAddress : leadData.locationAddress;
    if (addressVal && addressVal.trim()) {
      this.validateLeadTextWithLetters(
        addressVal,
        'Site Address',
        5,
        300,
        /^[a-zA-Z0-9\s,./#()'&_–—-]+$/,
        /[\s,./#()'&_–—-]+/g
      );
    }
  }

  private normalizeLeadSiteAndRegulatoryFields(leadData: Partial<LeadModel>): void {
    const siteDetailFields: Array<{ key: keyof LeadModel; label: string }> = [
      { key: 'siteAddress', label: 'Site Address' },
      { key: 'locationAddress', label: 'Site Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
      { key: 'surveyNumber', label: 'Survey Number' },
      { key: 'topographyLevels', label: 'Topography / Levels' },
      { key: 'accessRoadWidth', label: 'Access Road Width' },
      { key: 'orientation', label: 'Orientation' },
      { key: 'adjacentDevelopments', label: 'Adjacent Developments' },
    ];

    for (const { key, label } of siteDetailFields) {
      const val = leadData[key];
      if (typeof val === 'string') {
        if (val.length > 0 && !val.trim()) {
          throw new Error(`${label} cannot contain only spaces.`);
        }
        (leadData as any)[key] = val.trim();
      }
    }

    const trimOnlyFields: Array<keyof LeadModel> = [
      'approvingAuthority',
      'landUseZoning',
      'fsiCoverageKnown',
      'setbacksHeightRestrictions',
      'priorApprovalsViolations',
      'specialRestrictions',
      'leadTitle',
      'projectName',
      'clientName',
      'company',
      'organisation',
      'contactPerson',
      'decisionMakers',
      'mobile',
      'email',
      'ebSupplySanctionedLoad',
      'telecom',
      'preferredVendors',
      'siteVisitFrequencyExpectation',
      'reportingExpectations',
      'styleReferencesInspiration',
      'sustainabilityGoals',
      'vaastuOrientationRequirements',
      'materialPreferences',
      'remarks',
    ];

    for (const key of trimOnlyFields) {
      const val = leadData[key];
      if (typeof val === 'string') {
        (leadData as any)[key] = val.trim();
      }
    }
  }

  private async validateDuplicateLeadClientDetails(
    leadData: Partial<LeadModel>,
    scopedCompanyId: string,
    excludeLeadId?: number
  ): Promise<void> {
    const repoAny = this.leadRepository as any;
    if (typeof repoAny.findDuplicateLeadByClientDetails !== 'function') {
      return;
    }

    const dup = await repoAny.findDuplicateLeadByClientDetails(
      scopedCompanyId,
      leadData.clientName,
      leadData.mobile,
      leadData.email,
      excludeLeadId
    );
    if (!dup) return;

    if (dup.matchedBy === 'all') {
      throw new Error('Duplicate lead detected: a lead already exists with the same client name, mobile number, and email address.');
    }
    throw new Error('Duplicate lead detected: a lead already exists with the same client name and mobile number.');
  }

  private async validateUniqueLeadEmail(
    email: string | undefined,
    scopedCompanyId: string,
    linkedClientId?: string | null,
    excludeLeadId?: number
  ): Promise<void> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const existingLead = await this.leadRepository.findLeadByEmail(cleanEmail, scopedCompanyId, excludeLeadId);
    if (existingLead) {
      throw new Error('This email address is already in use by an existing lead.');
    }

    const existingClient = await this.clientRepository.findByEmail(cleanEmail, scopedCompanyId);
    if (existingClient && String(existingClient.id) !== String(linkedClientId || '')) {
      throw new Error('This email address is already in use by an existing client.');
    }
  }

  async createLead(
    leadData: Partial<LeadModel>, 
    requirementValues: Record<string, any>,
    userContext: { companyId: string; branchId: string | null; role: string; userId: string }
  ): Promise<any> {
    if (!leadData.clientName || !leadData.clientName.trim()) {
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

    const isDraft = leadData.status === 'Draft';
    this.normalizeLeadSiteAndRegulatoryFields(leadData);
    this.validateLeadCoreFields(leadData, isDraft, false);
    if (!isDraft) {
      await this.validateDuplicateLeadClientDetails(leadData, scopedCompanyId);
    }
    if (leadData.email !== undefined) {
      await this.validateUniqueLeadEmail(leadData.email, scopedCompanyId, leadData.clientId);
      leadData.email = leadData.email.trim();
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
      if (/^\d+$/.test(remTrim.replace(/[\s,.'&()/#:;!?"'–—+@%*-]+/g, '')) || /^\d+$/.test(remTrim)) {
        throw new Error('Internal remarks cannot be only numbers.');
      }
      if (!/[a-zA-Z]/.test(remTrim)) {
        throw new Error('Internal remarks must contain alphabetic text.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+@%*_-]+$/.test(remTrim)) {
        throw new Error('Internal remarks contains unsupported special characters.');
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

    try {
      const oppService = new OpportunityService();
      await oppService.syncSingleLead(lead);
    } catch (oppErr) {
      console.warn('[LeadService] Opportunity sync on create error:', oppErr);
    }

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

    const isDraft = (leadData.status ?? lead.status) === 'Draft';
    this.normalizeLeadSiteAndRegulatoryFields(leadData);
    this.validateLeadCoreFields(leadData, isDraft, true);
    if (!isDraft && (leadData.clientName !== undefined || leadData.mobile !== undefined || leadData.email !== undefined)) {
      await this.validateDuplicateLeadClientDetails(
        {
          clientName: leadData.clientName ?? lead.clientName,
          mobile: leadData.mobile ?? lead.mobile,
          email: leadData.email ?? lead.email,
        },
        lead.companyId,
        id
      );
    }
    if (leadData.email !== undefined) {
      const targetClientId = leadData.clientId !== undefined ? leadData.clientId : lead.clientId;
      await this.validateUniqueLeadEmail(leadData.email, lead.companyId, targetClientId, id);
      leadData.email = leadData.email.trim();
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
      if (/^\d+$/.test(remTrim.replace(/[\s,.'&()/#:;!?"'–—+@%*-]+/g, '')) || /^\d+$/.test(remTrim)) {
        throw new Error('Internal remarks cannot be only numbers.');
      }
      if (!/[a-zA-Z]/.test(remTrim)) {
        throw new Error('Internal remarks must contain alphabetic text.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+@%*_-]+$/.test(remTrim)) {
        throw new Error('Internal remarks contains unsupported special characters.');
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

    try {
      const oppService = new OpportunityService();
      await oppService.syncSingleLead(updatedLead);
    } catch (oppErr) {
      console.warn('[LeadService] Opportunity sync on update error:', oppErr);
    }

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
