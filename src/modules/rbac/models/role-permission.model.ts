import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface PermissionsMap {
  Create: boolean;
  Read: boolean;
  Update: boolean;
  Delete: boolean;
  Approve: boolean;
  Export: boolean;
  [key: string]: boolean;
}

@Entity('role_permissions')
export class RolePermissionModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  role!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  permissions!: PermissionsMap;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
