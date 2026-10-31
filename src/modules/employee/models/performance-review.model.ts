import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('performance_reviews')
export class PerformanceReviewModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  reviewId!: string; // e.g. REV-101

  @Column({ type: 'varchar' })
  companyId!: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string;

  @Column({ type: 'varchar' })
  employeeId!: string;

  @Column({ type: 'varchar' })
  employeeName!: string;

  @Column({ type: 'varchar', nullable: true })
  employeeRole?: string;

  @Column({ type: 'varchar', nullable: true })
  reviewerName?: string;

  @Column({ type: 'varchar' })
  reviewPeriod!: string; // e.g. "Q1 2026", "Oct 2026", "Annual 2025"

  @Column({ type: 'float', default: 4.5 })
  rating!: number; // out of 5.0 (e.g. 4.8)

  @Column({ type: 'float', default: 90 })
  qualityScore!: number;

  @Column({ type: 'float', default: 90 })
  timelinessScore!: number;

  @Column({ type: 'float', default: 90 })
  communicationScore!: number;

  @Column({ type: 'float', default: 90 })
  technicalScore!: number;

  @Column({ type: 'int', default: 0 })
  projectsCompleted!: number;

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'text', nullable: true })
  goals?: string;

  @Column({ type: 'text', nullable: true })
  certifications?: string;

  @Column({ type: 'varchar', default: 'Completed' })
  status!: string; // 'Completed' | 'Pending Review' | 'Draft'

  @Column({ type: 'varchar', nullable: true })
  reviewDate?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
