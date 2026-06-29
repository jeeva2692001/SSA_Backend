import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  userId!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({
    type: 'varchar',
    default: 'Employee'
  })
  role!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  avatar?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
