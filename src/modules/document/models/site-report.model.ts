import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('site_reports')
export class SiteReportModel {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  companyId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar' })
  project!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  inspector!: string;

  @Column({ type: 'varchar', nullable: true })
  uploadedBy?: string;

  @Column({ type: 'varchar' })
  date!: string;

  @Column({ type: 'varchar' })
  location!: string;

  @Column({ type: 'varchar', default: 'Compliant' })
  compliance!: string;

  @Column({ type: 'varchar', nullable: true })
  stageOfWork?: string;

  @Column({ type: 'varchar', nullable: true })
  weatherConditions?: string;

  @Column({ type: 'text', nullable: true })
  observations?: string;

  @Column({ type: 'text', nullable: true })
  recommendations?: string;

  @Column({ type: 'text', nullable: true })
  photos?: string; // JSON string of SitePhoto[]

  @Column({ type: 'varchar', nullable: true })
  fileName?: string;

  @Column({ type: 'text', nullable: true })
  fileUrl?: string;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  fileSize?: number;

  @Column({ type: 'varchar', nullable: true })
  fileType?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
