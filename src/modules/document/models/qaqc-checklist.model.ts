import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('qaqc_checklists')
export class QaqcChecklistModel {
  @PrimaryColumn({ type: 'varchar' })
  id!: string; // e.g. "QAC-001"

  @Column({ type: 'varchar', nullable: true })
  companyId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar' })
  code!: string; // e.g. "SSA-QA-ARC-01"

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  category!: string; // Architectural Finishes, Structural RCC & Concreting, MEP & Building Services, Waterproofing, Drawing & CAD QA/QC

  @Column({ type: 'varchar', nullable: true })
  discipline?: string;

  @Column({ type: 'varchar', nullable: true })
  standardReference?: string; // e.g. "IS 456:2000, NBC 2016"

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', default: '[]' })
  checkpoints!: string; // JSON string array of { id, code, title, acceptanceCriteria, referenceStandard, severity }

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
