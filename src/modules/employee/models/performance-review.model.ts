import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('performance_reviews')
export class PerformanceReviewModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  reviewId!: string;

  @Column({ type: 'varchar' })
  employeeId!: string;

  @Column({ type: 'varchar' })
  employeeName!: string;

  @Column({ type: 'varchar' })
  companyId!: string;

  @Column({ type: 'varchar', default: 'Q1 2026' })
  reviewPeriod!: string;

  @Column({ type: 'float', default: 4.8 })
  rating!: number; // e.g. 4.8 out of 5.0

  @Column({ type: 'int', default: 95 })
  scorePercentage!: number; // e.g. 96%

  @Column({ type: 'int', default: 98 })
  slaCompliance!: number; // e.g. 98%

  @Column({ type: 'int', default: 85 })
  utilizedLoad!: number; // e.g. 85%

  @Column({ type: 'int', default: 5 })
  projectsCompleted!: number;

  @Column({ type: 'varchar', default: 'Project Delivery' })
  reviewCategory!: string;

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'varchar', nullable: true })
  reviewerName?: string;

  @Column({ type: 'text', nullable: true })
  certifications?: string;

  @Column({ type: 'varchar', default: 'Published' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
