import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { UserModel } from '../models/user.model';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-architect-erp';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(userId: string, password: string): Promise<{ user: any; token: string }> {
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new Error('Invalid User ID or Password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid User ID or Password.');
    }

    const token = jwt.sign(
      {
        id: user.id,
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as any }
    );

    const userResponse = {
      id: `USR-${String(user.id).padStart(3, '0')}`,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    };

    return { user: userResponse, token };
  }

  async register(userData: Partial<UserModel>): Promise<UserModel> {
    if (!userData.userId || !userData.email || !userData.password || !userData.name) {
      throw new Error('Missing required user registration fields.');
    }

    const existingUserById = await this.userRepository.findByUserId(userData.userId);
    if (existingUserById) {
      throw new Error('User ID is already registered.');
    }

    const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
    if (existingUserByEmail) {
      throw new Error('Email is already registered.');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUserData = {
      ...userData,
      password: hashedPassword,
    };

    return await this.userRepository.createUser(newUserData);
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid or expired authentication token.');
    }
  }

  async getUserById(id: number): Promise<UserModel | null> {
    return await this.userRepository.findById(id);
  }
}
