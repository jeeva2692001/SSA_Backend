import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type EquipmentCategory =
  | 'Plotter & Printing'
  | 'Survey & Scanning'
  | 'BIM Workstation'
  | 'Drone & Aerial'
  | 'VR & AR'
  | 'Measuring & Field'
  | 'Other';

export type EquipmentStatus = 'Available' | 'In Use' | 'Under Maintenance' | 'Decommissioned';
export type EquipmentCondition = 'Excellent' | 'Good' | 'Fair' | 'Needs Repair';

@Entity('equipment')
export class EquipmentModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  equipmentCode!: string; // e.g. "EQP-001"

  @Column({ type: 'varchar' })
  name!: string; // e.g. "HP DesignJet T830 36-in Plotter"

  @Column({ type: 'varchar', default: 'Other' })
  category!: EquipmentCategory;

  @Column({ type: 'varchar', nullable: true })
  modelNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  serialNumber?: string;

  @Column({ type: 'varchar', default: 'Available' })
  status!: EquipmentStatus;

  @Column({ type: 'varchar', default: 'Excellent' })
  condition!: EquipmentCondition;

  @Column({ type: 'varchar', nullable: true })
  assignedProjectId?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedProjectCode?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedProjectName?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedEmployeeId?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedEmployeeName?: string;

  @Column({ type: 'varchar', nullable: true })
  location?: string; // e.g. "Chennai HQ - Studio A"

  @Column({ type: 'varchar', nullable: true })
  purchaseDate?: string;

  @Column({ type: 'varchar', nullable: true })
  warrantyExpiry?: string;

  @Column({ type: 'varchar', nullable: true })
  maintenanceDue?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  dailyCostRate!: number;

  @Column({ type: 'text', nullable: true })
  specifications?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', default: 'COM-001' })
  companyId!: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
