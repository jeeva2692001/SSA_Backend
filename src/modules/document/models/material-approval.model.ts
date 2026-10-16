import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('material_approvals')
export class MaterialApprovalModel {
  @PrimaryColumn({ type: 'varchar' })
  id!: string; // e.g. "MAS-001"

  @Column({ type: 'varchar', nullable: true })
  companyId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar' })
  project!: string; // Project Code e.g. "HJL-2026-001"

  @Column({ type: 'varchar' })
  materialName!: string;

  @Column({ type: 'varchar' })
  category!: string; // Architectural Finishes, Civil & Structural, MEP, etc.

  @Column({ type: 'varchar', nullable: true })
  specifiedBrand?: string;

  @Column({ type: 'varchar' })
  proposedBrand!: string;

  @Column({ type: 'varchar', nullable: true })
  manufacturer?: string;

  @Column({ type: 'varchar', nullable: true })
  supplierOrVendor?: string;

  @Column({ type: 'varchar', nullable: true })
  locationOrUsage?: string;

  @Column({ type: 'boolean', default: false })
  sampleSubmitted!: boolean;

  @Column({ type: 'varchar', nullable: true })
  sampleStatus?: string; // Physical Sample Handed Over, Sample Under Transit, Catalogue Only

  @Column({ type: 'varchar', default: 'Pending Review' })
  complianceStatus!: string; // Pending Review, Approved, Approved as Noted, Revise & Resubmit, Rejected

  @Column({ type: 'varchar' })
  submissionDate!: string;

  @Column({ type: 'varchar' })
  submittedBy!: string;

  @Column({ type: 'varchar', nullable: true })
  uploadedBy?: string;

  @Column({ type: 'text', nullable: true })
  reviewerComments?: string;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  reviewedAt?: string;

  @Column({ type: 'text', nullable: true })
  specSheetUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  specSheetName?: string;

  @Column({ type: 'text', nullable: true })
  testCertificateUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  testCertificateName?: string;

  @Column({ type: 'text', nullable: true })
  samplePhotoUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  samplePhotoName?: string;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  fileSize?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
