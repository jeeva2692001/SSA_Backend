import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('client_briefs')
export class ClientBriefModel {
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
  author!: string;

  @Column({ type: 'varchar', nullable: true })
  uploadedBy?: string;

  @Column({ type: 'varchar' })
  date!: string;

  @Column({ type: 'varchar', nullable: true })
  targetFreezeDate?: string;

  @Column({ type: 'varchar', default: 'Draft' })
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  category?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  fileName?: string;

  @Column({ type: 'text', nullable: true })
  fileUrl?: string;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  fileSize?: number;

  @Column({ type: 'varchar', nullable: true })
  fileType?: string;

  @Column({ type: 'varchar', nullable: true })
  uploadedAt?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
