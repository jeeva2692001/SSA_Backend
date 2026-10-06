import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('project_files')
export class ProjectFileModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  projectId!: string;

  @Column({ type: 'varchar' })
  folderId!: string;

  @Column({ type: 'varchar' })
  fileName!: string;

  @Column({ type: 'varchar' })
  filePath!: string;

  @Column({ type: 'varchar', nullable: true })
  fileType?: string;

  @Column({ type: 'bigint', default: 0 })
  fileSize!: number;

  @Column({ type: 'varchar', nullable: true })
  tagLine?: string;

  @Column({ type: 'varchar', nullable: true })
  tags?: string;

  @Column({ type: 'varchar', nullable: true })
  uploadedBy?: string;

  @Column({ type: 'varchar', default: 'DRAFT' })
  approvalStatus!: string; // DRAFT, PENDING_L1, APPROVED_L1, REJECTED_L1, PENDING_L2, APPROVED_L2, DISPATCHED_TO_CLIENT, CLIENT_APPROVED, CLIENT_REVISION_REQUESTED

  @Column({ type: 'varchar', nullable: true })
  l1ApprovedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  l1ApprovedAt?: string;

  @Column({ type: 'text', nullable: true })
  l1Notes?: string;

  @Column({ type: 'varchar', nullable: true })
  l2ApprovedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  l2ApprovedAt?: string;

  @Column({ type: 'text', nullable: true })
  l2Notes?: string;

  @Column({ type: 'varchar', nullable: true })
  clientApprovedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  clientApprovedAt?: string;

  @Column({ type: 'text', nullable: true })
  clientNotes?: string;

  @Column({ type: 'text', nullable: true })
  approvalHistory?: string; // JSON string array of approval events

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
