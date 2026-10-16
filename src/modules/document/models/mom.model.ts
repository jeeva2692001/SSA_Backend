import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('mom_records')
export class MomModel {
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
  host!: string;

  @Column({ type: 'varchar', nullable: true })
  uploadedBy?: string;

  @Column({ type: 'varchar' })
  date!: string;

  @Column({ type: 'varchar', nullable: true })
  time?: string;

  @Column({ type: 'varchar', nullable: true })
  location?: string;

  @Column({ type: 'varchar', default: 'Internal' })
  meetingType!: string;

  @Column({ type: 'text', nullable: true })
  attendees?: string;

  @Column({ type: 'text', nullable: true })
  discussionSummary?: string;

  @Column({ type: 'text', nullable: true })
  actionItems?: string; // JSON string of MomActionItem[]

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
