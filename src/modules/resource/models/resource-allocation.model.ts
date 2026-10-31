import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ResourceType = 'Human' | 'Equipment';
export type AllocationStatus = 'Active' | 'Planned' | 'Completed';

@Entity('resource_allocations')
export class ResourceAllocationModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  allocationCode!: string; // e.g. "ALC-101"

  @Column({ type: 'varchar', default: 'Human' })
  resourceType!: ResourceType;

  // For Human: employeeId, for Equipment: equipmentCode or equipmentId
  @Column({ type: 'varchar' })
  resourceId!: string;

  @Column({ type: 'varchar' })
  resourceName!: string;

  @Column({ type: 'varchar', nullable: true })
  roleOrCategory?: string; // e.g. "Senior Architect" or "Plotter & Printing"

  @Column({ type: 'varchar', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', nullable: true })
  projectCode?: string;

  @Column({ type: 'varchar' })
  projectName!: string;

  // Percentage load (e.g. 50%, 100%, 120%)
  @Column({ type: 'integer', default: 100 })
  allocationPercentage!: number;

  // Weekly hours allocated (e.g. 20 hrs, 40 hrs)
  @Column({ type: 'integer', default: 40 })
  weeklyHours!: number;

  @Column({ type: 'varchar', nullable: true })
  startDate?: string;

  @Column({ type: 'varchar', nullable: true })
  endDate?: string;

  // Assigned budget in currency (₹)
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  budgetAllocation!: number;

  // Hourly or daily rate
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  costRate!: number;

  @Column({ type: 'varchar', default: 'Active' })
  status!: AllocationStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', default: 'COM-001' })
  companyId!: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
