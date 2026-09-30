import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProjectCategoryModel } from './project-category.model';

@Entity('category_taglines')
export class CategoryTaglineModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  categoryId!: number;

  @ManyToOne(() => ProjectCategoryModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category?: ProjectCategoryModel;

  @Column({ type: 'varchar' })
  name!: string; // e.g. "Classroom Layout", "Master Bedroom", "ICU Layout"

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'integer', default: 0 })
  displayOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
