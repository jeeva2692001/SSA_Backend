import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type MaterialStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

@Entity('materials')
export class MaterialStockModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  materialCode?: string; // e.g. "MAT-801"

  @Column({ type: 'varchar' })
  materialName!: string;

  @Column({ type: 'varchar', default: 'General' })
  category!: string;

  @Column({ type: 'integer', default: 0 })
  stockLevel!: number;

  @Column({ type: 'varchar', default: 'Units' })
  unit!: string;

  @Column({ type: 'integer', default: 5 })
  reorderPoint!: number;

  @Column({ type: 'varchar', default: 'In Stock' })
  status!: MaterialStatus;

  @Column({ type: 'varchar', default: 'COM-001' })
  companyId!: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
