import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('milestones')
export class MilestoneModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  projectId!: string;

  @Column({ type: 'varchar', nullable: true })
  projectCode?: string;

  @Column({ type: 'varchar', nullable: true })
  companyId?: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  dueDate?: string;

  @Column({ type: 'varchar', nullable: true })
  startDate?: string;

  @Column({ type: 'varchar', default: 'Pending' })
  status!: string; // 'Pending' | 'In Progress' | 'Completed' | 'Delayed'

  @Column({ type: 'integer', default: 1 })
  orderIndex!: number;

  @Column({ type: 'text', nullable: true })
  deliverable?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
