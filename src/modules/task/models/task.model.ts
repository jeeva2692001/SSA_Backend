import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Backlog' | 'In Progress' | 'Under Review' | 'Done';

@Entity('tasks')
export class TaskModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  taskCode?: string; // e.g. "TSK-1001"

  @Column({ type: 'varchar', nullable: true })
  taskId?: string; // for compatibility with legacy table schema

  @Column({ type: 'varchar' })
  taskName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedTo?: string; // Employee Name (e.g. Subash, Pavithra)

  @Column({ type: 'varchar', nullable: true })
  assignedToId?: string; // Employee ID (e.g. EMP-003)

  @Column({ type: 'varchar', default: 'Medium' })
  priority!: TaskPriority;

  @Column({ type: 'varchar', nullable: true })
  startDate?: string;

  @Column({ type: 'varchar', nullable: true })
  dueDate?: string;

  @Column({ type: 'varchar', default: 'Backlog' })
  status!: TaskStatus;

  @Column({ type: 'integer', default: 0 })
  progress!: number; // 0 - 100

  @Column({ type: 'varchar', nullable: true })
  projectCode?: string; // e.g. "SSA-CH-GR01"

  @Column({ type: 'varchar', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', default: 'COM-001' })
  companyId!: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
