import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { UserModel } from '../models/user.model';
import { CompanyRepository } from '../../company/repositories/company.repository';
import { CompanyModel } from '../../company/models/company.model';
import { BranchModel } from '../../branch/models/branch.model';
import { getDataSource } from '../../../shared/config/data-source';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-architect-erp';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

export class AuthService {
  private userRepository: UserRepository;
  private companyRepository: CompanyRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.companyRepository = new CompanyRepository();
  }

  async companyLogin(username: string, password: string): Promise<{ user: any; token: string; mustChangePassword?: boolean; maskedEmail?: string; username?: string; name?: string; role?: string }> {
    const trimmedUser = (username || '').trim();
    const trimmedPass = (password || '').trim();

    let company = await this.companyRepository.findByContactPerson(trimmedUser);
    if (!company) {
      company = await this.companyRepository.findByCompanyId(trimmedUser);
    }
    if (!company) {
      company = await this.companyRepository.findByEmail(trimmedUser);
    }

    if (!company) {
      throw new Error('Invalid Username or Password.');
    }

    if (company.status === 'Inactive') {
      throw new Error('This account has been deactivated. Please contact your administrator.');
    }

    if (!company.password) {
      throw new Error('Company account has no password set. Please contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(trimmedPass, company.password);
    if (!isPasswordValid) {
      throw new Error('Invalid Username or Password.');
    }

    const mustChange = !!company.isFirstLogin;
    if (mustChange) {
      const { otpService } = await import('./otp.service');
      const otpResult = await otpService.createAndSendOtp(
        company.contactPerson,
        company.email,
        company.contactPerson,
        'initial_login',
        company.name
      );
      return {
        mustChangePassword: true,
        maskedEmail: otpResult.maskedEmail,
        username: company.contactPerson,
        name: company.name,
        role: 'Company',
        user: {
          id: company.companyId,
          userId: company.companyId,
          name: company.name,
          email: company.email,
          role: 'Company',
          contactPerson: company.contactPerson,
          status: company.status,
          mustChangePassword: true,
        },
        token: null as any,
      };
    }

    const token = jwt.sign(
      {
        id: company.id,
        companyId: company.companyId,
        email: company.email,
        role: 'Company',
        name: company.name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as any }
    );

    const companyResponse = {
      id: company.companyId,
      userId: company.companyId,
      name: company.name,
      email: company.email,
      role: 'Company',
      contactPerson: company.contactPerson,
      status: company.status,
      mustChangePassword: false,
    };

    return { user: companyResponse, token };
  }

  async login(username: string, password: string): Promise<{ user: any; token: string; mustChangePassword?: boolean; maskedEmail?: string; username?: string; name?: string; role?: string }> {
    const trimmedUser = (username || '').trim();
    const trimmedPass = (password || '').trim();

    // 1. Try to find in UserRepository (by userId or email)
    let user = await this.userRepository.findByUserId(trimmedUser);
    if (!user) {
      user = await this.userRepository.findByEmail(trimmedUser);
    }

    if (user) {
      const isPasswordValid = await bcrypt.compare(trimmedPass, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid Username or Password.');
      }

      const mustChange = user.role !== 'Super Admin' && !!user.isFirstLogin;
      if (mustChange) {
        const { otpService } = await import('./otp.service');
        const otpResult = await otpService.createAndSendOtp(
          user.userId,
          user.email || 'user@ssa-erp.com',
          user.name || user.userId
        );
        return {
          mustChangePassword: true,
          maskedEmail: otpResult.maskedEmail,
          username: user.userId,
          name: user.name,
          role: user.role,
          user: {
            id: `USR-${String(user.id).padStart(3, '0')}`,
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            mustChangePassword: true,
          },
          token: null as any,
        };
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
        mustChangePassword: false,
      };

      return { user: userResponse, token };
    }

    // 2. Try to find in CompanyRepository (by contactPerson, companyId, or email)
    let company = await this.companyRepository.findByContactPerson(trimmedUser);
    if (!company) {
      company = await this.companyRepository.findByCompanyId(trimmedUser);
    }
    if (!company) {
      company = await this.companyRepository.findByEmail(trimmedUser);
    }

    if (company) {
      if (company.status === 'Inactive') {
        throw new Error('This account has been deactivated. Please contact your administrator.');
      }

      if (!company.password) {
        throw new Error('Company account has no password set. Please contact your administrator.');
      }

      const isPasswordValid = await bcrypt.compare(trimmedPass, company.password);
      if (!isPasswordValid) {
        throw new Error('Invalid Username or Password.');
      }

      const mustChange = !!company.isFirstLogin;
      if (mustChange) {
        const { otpService } = await import('./otp.service');
        const otpResult = await otpService.createAndSendOtp(
          company.contactPerson,
          company.email,
          company.contactPerson,
          'initial_login',
          company.name
        );
        return {
          mustChangePassword: true,
          maskedEmail: otpResult.maskedEmail,
          username: company.contactPerson,
          name: company.name,
          role: 'Company',
          user: {
            id: company.companyId,
            userId: company.companyId,
            name: company.name,
            email: company.email,
            role: 'Company',
            contactPerson: company.contactPerson,
            status: company.status,
            mustChangePassword: true,
          },
          token: null as any,
        };
      }

      const token = jwt.sign(
        {
          id: company.id,
          companyId: company.companyId,
          email: company.email,
          role: 'Company',
          name: company.name,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );

      const companyResponse = {
        id: company.companyId,
        userId: company.companyId,
        name: company.name,
        email: company.email,
        role: 'Company',
        contactPerson: company.contactPerson,
        status: company.status,
        mustChangePassword: false,
      };

      return { user: companyResponse, token };
    }

    // 3. Try to find in BranchRepository (by branchId or code)
    const dataSource = await getDataSource();
    const branchRepo = dataSource.getRepository(BranchModel);
    let branch = await branchRepo.createQueryBuilder('branch')
      .where('LOWER(branch.branchId) = :u OR LOWER(branch.code) = :u', { u: trimmedUser.toLowerCase() })
      .getOne();

    if (branch) {
      if (branch.status === 'Inactive') {
        throw new Error('This branch has been deactivated. Please contact your administrator.');
      }

      const savedPassword = branch.password || await bcrypt.hash('Branch@123', 10);
      const isPasswordValid = await bcrypt.compare(trimmedPass, savedPassword);
      if (!isPasswordValid) {
        throw new Error('Invalid Username or Password.');
      }

      const mustChange = !!branch.isFirstLogin;
      if (mustChange) {
        const { otpService } = await import('./otp.service');
        const otpResult = await otpService.createAndSendOtp(
          branch.branchId,
          `${branch.code.toLowerCase()}@ssa-erp.com`,
          branch.name || branch.branchId
        );
        return {
          mustChangePassword: true,
          maskedEmail: otpResult.maskedEmail,
          username: branch.branchId,
          name: branch.name,
          role: 'Branch',
          user: {
            id: branch.branchId,
            userId: branch.branchId,
            name: branch.name,
            role: 'Branch',
            code: branch.code,
            manager: branch.manager,
            companyId: branch.companyId,
            mustChangePassword: true,
          },
          token: null as any,
        };
      }

      const token = jwt.sign(
        {
          id: branch.id,
          branchId: branch.branchId,
          role: 'Branch',
          name: branch.name,
          companyId: branch.companyId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );

      const branchResponse = {
        id: branch.branchId,
        userId: branch.branchId,
        name: branch.name,
        role: 'Branch',
        code: branch.code,
        manager: branch.manager,
        companyId: branch.companyId,
        mustChangePassword: false,
      };

      return { user: branchResponse, token };
    }

    throw new Error('Invalid Username or Password.');
  }

  async completeFirstLogin(
    username: string,
    otp: string,
    newPassword: string
  ): Promise<{ user: any; token: string }> {
    const trimmedUser = (username || '').trim();
    const trimmedOtp = (otp || '').trim();
    const trimmedNew = (newPassword || '').trim();

    if (!trimmedUser || !trimmedOtp || !trimmedNew) {
      throw new Error('Username, OTP, and new password are required.');
    }

    // Resolve target account first
    let user = await this.userRepository.findByUserId(trimmedUser);
    if (!user) {
      user = await this.userRepository.findByEmail(trimmedUser);
    }

    let company: CompanyModel | null = null;
    if (!user) {
      company = await this.companyRepository.findByContactPerson(trimmedUser);
      if (!company) {
        company = await this.companyRepository.findByCompanyId(trimmedUser);
      }
      if (!company) {
        company = await this.companyRepository.findByEmail(trimmedUser);
      }
    }

    let branch: BranchModel | null = null;
    if (!user && !company) {
      const dataSource = await getDataSource();
      const branchRepo = dataSource.getRepository(BranchModel);
      branch = await branchRepo.createQueryBuilder('branch')
        .where('LOWER(branch.branchId) = :u OR LOWER(branch.code) = :u', { u: trimmedUser.toLowerCase() })
        .getOne();
    }

    if (!user && !company && !branch) {
      throw new Error('Account not found.');
    }

    // 1. Verify OTP with email alias support
    const { otpService } = await import('./otp.service');
    const aliasEmail = user?.email || company?.email || (branch ? `${branch.code.toLowerCase()}@ssa-erp.com` : undefined);
    const otpResult = otpService.verifyOtp(trimmedUser, trimmedOtp, aliasEmail);
    if (!otpResult.valid) {
      throw new Error(otpResult.message || 'Invalid or expired OTP.');
    }

    // 2. Validate Password Policy
    if (trimmedNew.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    if (trimmedNew.length > 20) {
      throw new Error('Password cannot exceed 20 characters.');
    }
    if (!/[A-Z]/.test(trimmedNew)) {
      throw new Error('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(trimmedNew)) {
      throw new Error('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(trimmedNew)) {
      throw new Error('Password must contain at least one number.');
    }
    if (!/[^A-Za-z0-9]/.test(trimmedNew)) {
      throw new Error('Password must contain at least one special character (!@#$...).');
    }

    // 3. Prevent reusing the temporary password
    const currentPassHash = user?.password || company?.password || branch?.password;
    if (currentPassHash) {
      const isSame = await bcrypt.compare(trimmedNew, currentPassHash);
      if (isSame) {
        throw new Error('New password must be different from the temporary password.');
      }
    }

    const hashedNew = await bcrypt.hash(trimmedNew, 10);

    // 4. Update account and clear isFirstLogin
    if (user) {
      user.password = hashedNew;
      user.isFirstLogin = false;
      await this.userRepository.createUser(user);
      otpService.consumeOtp(trimmedUser);
      if (user.userId) otpService.consumeOtp(user.userId);
      if (user.email) otpService.consumeOtp(user.email);

      const token = jwt.sign(
        { id: user.id, userId: user.userId, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );
      return {
        user: {
          id: `USR-${String(user.id).padStart(3, '0')}`,
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          mustChangePassword: false,
        },
        token,
      };
    }

    if (company) {
      company.password = hashedNew;
      company.isFirstLogin = false;
      await this.companyRepository.createCompany(company);
      otpService.consumeOtp(trimmedUser);
      if (company.contactPerson) otpService.consumeOtp(company.contactPerson);
      if (company.companyId) otpService.consumeOtp(company.companyId);
      if (company.email) otpService.consumeOtp(company.email);

      const token = jwt.sign(
        { id: company.id, companyId: company.companyId, email: company.email, role: 'Company', name: company.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );
      return {
        user: {
          id: company.companyId,
          userId: company.companyId,
          name: company.name,
          email: company.email,
          role: 'Company',
          contactPerson: company.contactPerson,
          status: company.status,
          mustChangePassword: false,
        },
        token,
      };
    }

    if (branch) {
      branch.password = hashedNew;
      branch.isFirstLogin = false;
      const dataSource = await getDataSource();
      const branchRepo = dataSource.getRepository(BranchModel);
      await branchRepo.save(branch);
      otpService.consumeOtp(trimmedUser);
      if (branch.branchId) otpService.consumeOtp(branch.branchId);

      const token = jwt.sign(
        { id: branch.id, branchId: branch.branchId, role: 'Branch', name: branch.name, companyId: branch.companyId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );
      return {
        user: {
          id: branch.branchId,
          userId: branch.branchId,
          name: branch.name,
          role: 'Branch',
          code: branch.code,
          manager: branch.manager,
          companyId: branch.companyId,
          mustChangePassword: false,
        },
        token,
      };
    }

    throw new Error('Account not found.');
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

    const hashedPassword = await bcrypt.hash((userData.password || '').trim(), 10);
    const newUserData = {
      ...userData,
      password: hashedPassword,
      isFirstLogin: true,
    };

    return await this.userRepository.createUser(newUserData);
  }

  async changeInitialPassword(
    username: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ user: any; token: string }> {
    const trimmedUser = (username || '').trim();
    const trimmedCurrent = (currentPassword || '').trim();
    const trimmedNew = (newPassword || '').trim();

    if (!trimmedUser || !trimmedCurrent || !trimmedNew) {
      throw new Error('Username, current password, and new password are required.');
    }

    if (trimmedNew === trimmedCurrent) {
      throw new Error('New password must be different from the temporary password.');
    }

    if (trimmedNew.length < 8) {
      throw new Error('New password must be at least 8 characters.');
    }
    if (trimmedNew.length > 20) {
      throw new Error('New password cannot exceed 20 characters.');
    }
    if (!/[A-Z]/.test(trimmedNew)) {
      throw new Error('New password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(trimmedNew)) {
      throw new Error('New password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(trimmedNew)) {
      throw new Error('New password must contain at least one number.');
    }
    if (!/[^A-Za-z0-9]/.test(trimmedNew)) {
      throw new Error('New password must contain at least one special character (!@#$...).');
    }

    const hashedNew = await bcrypt.hash(trimmedNew, 10);

    // 1. Check User
    let user = await this.userRepository.findByUserId(trimmedUser);
    if (!user) {
      user = await this.userRepository.findByEmail(trimmedUser);
    }
    if (user) {
      const isValid = await bcrypt.compare(trimmedCurrent, user.password);
      if (!isValid) {
        throw new Error('Current temporary password is incorrect.');
      }
      user.password = hashedNew;
      user.isFirstLogin = false;
      await this.userRepository.createUser(user);

      const token = jwt.sign(
        { id: user.id, userId: user.userId, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );
      return {
        user: {
          id: `USR-${String(user.id).padStart(3, '0')}`,
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          mustChangePassword: false,
        },
        token,
      };
    }

    // 2. Check Company
    let company = await this.companyRepository.findByContactPerson(trimmedUser);
    if (!company) {
      company = await this.companyRepository.findByCompanyId(trimmedUser);
    }
    if (!company) {
      company = await this.companyRepository.findByEmail(trimmedUser);
    }
    if (company) {
      const currentHash = company.password || '';
      const isValid = await bcrypt.compare(trimmedCurrent, currentHash);
      if (!isValid) {
        throw new Error('Current temporary password is incorrect.');
      }
      company.password = hashedNew;
      company.isFirstLogin = false;
      await this.companyRepository.createCompany(company);

      const token = jwt.sign(
        { id: company.id, companyId: company.companyId, email: company.email, role: 'Company', name: company.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );
      return {
        user: {
          id: company.companyId,
          userId: company.companyId,
          name: company.name,
          email: company.email,
          role: 'Company',
          contactPerson: company.contactPerson,
          status: company.status,
          mustChangePassword: false,
        },
        token,
      };
    }

    // 3. Check Branch
    const dataSource = await getDataSource();
    const branchRepo = dataSource.getRepository(BranchModel);
    let branch = await branchRepo.findOne({ where: { branchId: trimmedUser } });
    if (!branch) {
      branch = await branchRepo.findOne({ where: { code: trimmedUser } });
    }
    if (branch) {
      const savedPass = branch.password || (await bcrypt.hash('Branch@123', 10));
      const isValid = await bcrypt.compare(trimmedCurrent, savedPass);
      if (!isValid) {
        throw new Error('Current temporary password is incorrect.');
      }
      branch.password = hashedNew;
      branch.isFirstLogin = false;
      await branchRepo.save(branch);

      const token = jwt.sign(
        { id: branch.id, branchId: branch.branchId, role: 'Branch', name: branch.name, companyId: branch.companyId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );
      return {
        user: {
          id: branch.branchId,
          userId: branch.branchId,
          name: branch.name,
          role: 'Branch',
          code: branch.code,
          manager: branch.manager,
          companyId: branch.companyId,
          mustChangePassword: false,
        },
        token,
      };
    }

    throw new Error('Account not found.');
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

  async getCompanyById(id: number): Promise<CompanyModel | null> {
    return await this.companyRepository.findById(id);
  }

  async getBranchById(id: number): Promise<BranchModel | null> {
    const dataSource = await getDataSource();
    const branchRepo = dataSource.getRepository(BranchModel);
    return await branchRepo.findOne({ where: { id } });
  }

  async branchLogin(username: string, password: string): Promise<{ user: any; token: string }> {
    const dataSource = await getDataSource();
    const branchRepo = dataSource.getRepository(BranchModel);
    
    // Find branch by branchId or code
    let branch = await branchRepo.findOne({ where: { branchId: username } });
    if (!branch) {
      branch = await branchRepo.findOne({ where: { code: username } });
    }

    if (!branch) {
      throw new Error('Invalid Username or Password.');
    }

    if (branch.status === 'Inactive') {
      throw new Error('This branch has been deactivated. Please contact your administrator.');
    }

    const savedPassword = branch.password || await bcrypt.hash('Branch@123', 10);
    const isPasswordValid = await bcrypt.compare(password, savedPassword);
    if (!isPasswordValid) {
      throw new Error('Invalid Username or Password.');
    }

    const token = jwt.sign(
      {
        id: branch.id,
        branchId: branch.branchId,
        role: 'Branch',
        name: branch.name,
        companyId: branch.companyId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as any }
    );

    const branchResponse = {
      id: branch.branchId,
      userId: branch.branchId,
      name: branch.name,
      role: 'Branch',
      code: branch.code,
      manager: branch.manager,
      companyId: branch.companyId,
    };

    return { user: branchResponse, token };
  }

  async verifyUserForReset(username: string): Promise<{ exists: boolean; name: string; maskedEmail: string }> {
    const trimmed = (username || '').trim();
    if (!trimmed) {
      throw new Error('Username or email is required.');
    }

    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      throw new Error('Username must contain alphanumeric characters.');
    }

    let foundEmail = '';
    let foundName = '';

    // 1. Check superadmin / UserRepository
    const user = await this.userRepository.findByUserId(trimmed);
    if (user) {
      foundName = user.name || user.userId;
      foundEmail = user.email || 'admin@ssa-erp.com';
    } else {
      const userByEmail = await this.userRepository.findByEmail(trimmed);
      if (userByEmail) {
        foundName = userByEmail.name || userByEmail.userId;
        foundEmail = userByEmail.email;
      }
    }

    // 2. Check CompanyRepository
    if (!foundEmail) {
      const company = await this.companyRepository.findByContactPerson(trimmed);
      if (company) {
        foundName = company.name || company.contactPerson;
        foundEmail = company.email;
      } else {
        const companyByEmail = await this.companyRepository.findByEmail(trimmed);
        if (companyByEmail) {
          foundName = companyByEmail.name || companyByEmail.contactPerson;
          foundEmail = companyByEmail.email;
        }
      }
    }

    // 3. Check BranchRepository
    if (!foundEmail) {
      const dataSource = await getDataSource();
      const branchRepo = dataSource.getRepository(BranchModel);
      let branch = await branchRepo.findOne({ where: { branchId: trimmed } });
      if (!branch) {
        branch = await branchRepo.findOne({ where: { code: trimmed } });
      }
      if (branch) {
        foundName = branch.name || branch.branchId;
        foundEmail = `${branch.code.toLowerCase()}@ssa-erp.com`;
      }
    }

    // 4. Superadmin fallback
    if (!foundEmail && (trimmed.toLowerCase() === 'superadmin' || trimmed.toLowerCase() === 'superadmin@ssa.com')) {
      foundName = 'Super Admin';
      foundEmail = 'superadmin@ssa-erp.com';
    }

    if (!foundEmail) {
      throw new Error('No registered account found with this username or email.');
    }

    // Generate & send OTP
    const { otpService } = await import('./otp.service');
    const otpResult = await otpService.createAndSendOtp(trimmed, foundEmail, foundName, 'password_reset');

    return {
      exists: true,
      name: otpResult.userName,
      maskedEmail: otpResult.maskedEmail,
    };
  }

  async verifyOtp(username: string, otp: string): Promise<{ valid: boolean; message?: string }> {
    const trimmed = (username || '').trim();
    if (!trimmed || !otp) {
      throw new Error('Username and OTP are required.');
    }

    // Resolve alias email if available
    let aliasEmail: string | undefined = undefined;
    const user = await this.userRepository.findByUserId(trimmed).catch(() => null);
    if (user?.email) {
      aliasEmail = user.email;
    } else {
      const company = await this.companyRepository.findByContactPerson(trimmed).catch(() => null) 
        || await this.companyRepository.findByCompanyId(trimmed).catch(() => null);
      if (company?.email) {
        aliasEmail = company.email;
      }
    }

    const { otpService } = await import('./otp.service');
    const result = otpService.verifyOtp(trimmed, otp, aliasEmail);
    if (!result.valid) {
      throw new Error(result.message || 'Invalid OTP code.');
    }
    return result;
  }

  async resetPassword(username: string, newPassword: string): Promise<boolean> {
    const trimmed = (username || '').trim();
    if (!trimmed || !newPassword) {
      throw new Error('Username and new password are required.');
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    const user = await this.userRepository.findByUserId(trimmed);
    if (user) {
      user.password = hashedPassword;
      user.isFirstLogin = false;
      await this.userRepository.createUser(user);
      const { otpService } = await import('./otp.service');
      otpService.consumeOtp(trimmed);
      return true;
    }

    const userByEmail = await this.userRepository.findByEmail(trimmed);
    if (userByEmail) {
      userByEmail.password = hashedPassword;
      userByEmail.isFirstLogin = false;
      await this.userRepository.createUser(userByEmail);
      const { otpService } = await import('./otp.service');
      otpService.consumeOtp(trimmed);
      return true;
    }

    const company = await this.companyRepository.findByContactPerson(trimmed);
    if (company) {
      company.password = hashedPassword;
      company.isFirstLogin = false;
      await this.companyRepository.createCompany(company);
      const { otpService } = await import('./otp.service');
      otpService.consumeOtp(trimmed);
      return true;
    }

    const companyByEmail = await this.companyRepository.findByEmail(trimmed);
    if (companyByEmail) {
      companyByEmail.password = hashedPassword;
      companyByEmail.isFirstLogin = false;
      await this.companyRepository.createCompany(companyByEmail);
      const { otpService } = await import('./otp.service');
      otpService.consumeOtp(trimmed);
      return true;
    }

    const dataSource = await getDataSource();
    const branchRepo = dataSource.getRepository(BranchModel);
    let branch = await branchRepo.findOne({ where: { branchId: trimmed } });
    if (!branch) {
      branch = await branchRepo.findOne({ where: { code: trimmed } });
    }
    if (branch) {
      branch.password = hashedPassword;
      branch.isFirstLogin = false;
      await branchRepo.save(branch);
      const { otpService } = await import('./otp.service');
      otpService.consumeOtp(trimmed);
      return true;
    }

    if (trimmed.toLowerCase() === 'superadmin') {
      const { otpService } = await import('./otp.service');
      otpService.consumeOtp(trimmed);
      return true;
    }

    throw new Error('No registered account found with this username or email.');
  }
}
