import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type VendorCategory = 'Material Supplier' | 'Contractor' | 'Consultant' | 'Service Provider';
export type VendorApprovalStatus = 'Approved' | 'Pending Approval' | 'Rejected';

@Entity('vendors')
export class VendorModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  vendorCode!: string; // e.g. "VEN-2026-001" or "VEN-001"

  @Column({ type: 'varchar' })
  companyId!: string; // Scopes vendor to Company level

  @Column({ type: 'varchar', nullable: true })
  branchId!: string | null; // Scopes vendor to Branch level

  @Column({ type: 'varchar' })
  vendorName!: string; // Legal / Trading Entity Name

  @Column({ type: 'varchar', default: 'Material Supplier' })
  category!: VendorCategory; // 'Material Supplier' | 'Contractor' | 'Consultant' | 'Service Provider'

  @Column({ type: 'varchar', nullable: true })
  tradeSpecialty?: string; // e.g. "BIM Services", "Structural Steel", "HVAC", "Civil Works"

  @Column({ type: 'varchar', nullable: true })
  contactPerson?: string;

  @Column({ type: 'varchar', nullable: true })
  mobile?: string;

  @Column({ type: 'varchar', nullable: true })
  alternatePhone?: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string;

  @Column({ type: 'varchar', nullable: true })
  state?: string;

  @Column({ type: 'varchar', nullable: true })
  country?: string;

  @Column({ type: 'varchar', nullable: true })
  pincode?: string;

  @Column({ type: 'varchar', nullable: true })
  gstNo?: string;

  @Column({ type: 'varchar', nullable: true })
  panNo?: string;

  @Column({ type: 'numeric', precision: 3, scale: 1, default: 4.0 })
  rating!: number; // 1.0 - 5.0 quality rating

  @Column({ type: 'varchar', default: 'Pending Approval' })
  approvalStatus!: VendorApprovalStatus; // 'Approved' | 'Pending Approval' | 'Rejected'

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'varchar', nullable: true })
  approvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
