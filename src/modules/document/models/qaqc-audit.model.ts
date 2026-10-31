import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('qaqc_audits')
export class QaqcAuditModel {
  @PrimaryColumn({ type: 'varchar' })
  id!: string; // e.g. "AUD-2026-001"

  @Column({ type: 'varchar', nullable: true })
  companyId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar' })
  project!: string; // Project Code e.g. "HJL-2026-001"

  @Column({ type: 'varchar' })
  checklistId!: string;

  @Column({ type: 'varchar' })
  checklistTitle!: string;

  @Column({ type: 'varchar' })
  category!: string;

  @Column({ type: 'varchar' })
  location!: string; // e.g. "Tower A, 4th Floor Slab"

  @Column({ type: 'varchar' })
  auditDate!: string;

  @Column({ type: 'varchar' })
  auditorName!: string;

  @Column({ type: 'varchar', nullable: true })
  auditorRole?: string;

  @Column({ type: 'float', default: 0 })
  complianceScore!: number; // Percentage 0 - 100

  @Column({ type: 'varchar', default: 'Passed' })
  status!: string; // Passed, Deficiencies Found, Rectification Required, Closed

  @Column({ type: 'int', default: 0 })
  totalItems!: number;

  @Column({ type: 'int', default: 0 })
  passedItems!: number;

  @Column({ type: 'int', default: 0 })
  failedItems!: number;

  @Column({ type: 'int', default: 0 })
  concessionItems!: number;

  @Column({ type: 'int', default: 0 })
  naItems!: number;

  @Column({ type: 'text', default: '[]' })
  itemsResult!: string; // JSON string array of checkpoint results

  @Column({ type: 'text', default: '[]' })
  ncrs!: string; // JSON string array of Non-Conformance Reports (NCR)

  @Column({ type: 'varchar', nullable: true })
  leadSignOffName?: string;

  @Column({ type: 'varchar', nullable: true })
  leadSignOffDate?: string;

  @Column({ type: 'varchar', nullable: true })
  pmSignOffName?: string;

  @Column({ type: 'text', nullable: true })
  summaryComments?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
