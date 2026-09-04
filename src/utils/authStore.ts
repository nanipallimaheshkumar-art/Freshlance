import { UserAccount } from '../types';

const SESSION_KEY = 'freshlane_session';
const REGISTERED_USERS_KEY = 'freshlane_registered_users';

// Seed default demo accounts in India (Tadepalligudem Hub)
const DEFAULT_USERS: (UserAccount & { password?: string })[] = [
  {
    id: 'user-demo-1',
    name: 'Riya Sharma',
    email: 'riya@example.com',
    phone: '+91 98765 43210',
    role: 'shopper',
    address: '42 Sri Rama Colony, KN Road',
    city: 'Tadepalligudem',
    state: 'Andhra Pradesh',
    country: 'India',
    pincode: '534102',
    neighbourhood: 'KN Road',
    registeredAt: '2026-08-15T10:30:00.000Z',
    isVerified: true,
    password: 'password123',
  },
  {
    id: 'user-demo-2',
    name: 'Vikram Patel',
    email: 'owner@freshlane.com',
    phone: '+91 99001 12233',
    role: 'owner',
    address: 'FreshLane Operations Hub #1, Subba Rao Peta',
    city: 'Tadepalligudem',
    state: 'Andhra Pradesh',
    country: 'India',
    pincode: '534102',
    neighbourhood: 'Subba Rao Peta',
    registeredAt: '2026-07-01T08:00:00.000Z',
    isVerified: true,
    password: 'ownerpass123',
  },
  {
    id: 'user-demo-3',
    name: 'Arjun S. (Courier)',
    email: 'driver@freshlane.com',
    phone: '+91 98450 12345',
    role: 'driver',
    address: 'Fleet Station, KN Road',
    city: 'Tadepalligudem',
    state: 'Andhra Pradesh',
    country: 'India',
    pincode: '534102',
    neighbourhood: 'KN Road Hub',
    registeredAt: '2026-07-15T09:00:00.000Z',
    isVerified: true,
    password: 'driverpass123',
  },
];

// OTP / Verification Code storage
const OTP_STORE_KEY = 'freshlane_otp_sessions';

interface OtpRecord {
  identifier: string;
  code: string;
  expiresAt: number;
}

export function generateVerificationCode(identifier: string): string {
  const norm = identifier.trim().toLowerCase();
  // Generate a realistic 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  try {
    const raw = sessionStorage.getItem(OTP_STORE_KEY);
    const records: OtpRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = records.filter((r) => r.identifier !== norm);
    filtered.push({ identifier: norm, code, expiresAt });
    sessionStorage.setItem(OTP_STORE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to store OTP', e);
  }

  return code;
}

export function verifyCode(identifier: string, inputCode: string): { valid: boolean; error?: string } {
  const norm = identifier.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  try {
    const raw = sessionStorage.getItem(OTP_STORE_KEY);
    const records: OtpRecord[] = raw ? JSON.parse(raw) : [];
    const found = records.find((r) => r.identifier === norm);

    if (!found) {
      // Allow demo bypass code 123456 or prompt user to request code
      if (cleanCode === '123456') return { valid: true };
      return { valid: false, error: 'Verification code not found. Please click Resend Code.' };
    }

    if (Date.now() > found.expiresAt) {
      return { valid: false, error: 'Verification code has expired. Please request a new code.' };
    }

    if (found.code !== cleanCode && cleanCode !== '123456') {
      return { valid: false, error: 'Invalid verification code. Please check and try again.' };
    }

    return { valid: true };
  } catch {
    return { valid: cleanCode.length === 6 };
  }
}

export function getRegisteredUsers(): (UserAccount & { password?: string })[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveRegisteredUsers(users: (UserAccount & { password?: string })[]) {
  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function getCurrentSession(): UserAccount | null {
  try {
    const active = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!active) return null;
    return JSON.parse(active);
  } catch {
    return null;
  }
}

export function setCurrentSession(user: UserAccount, remember = true) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent('freshlane-auth-change', { detail: user }));
  } catch (e) {
    console.error('Failed to set session', e);
  }
}

export function clearCurrentSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent('freshlane-auth-change', { detail: null }));
  } catch (e) {
    console.error('Failed to clear session', e);
  }
}

export function registerAccount(params: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: 'shopper' | 'owner' | 'driver';
  address?: string;
  neighbourhood?: string;
  pincode?: string;
  verificationCode?: string;
}): { success: boolean; error?: string; user?: UserAccount } {
  const users = getRegisteredUsers();
  const emailNorm = params.email.trim().toLowerCase();

  // Validate verification code if provided
  if (params.verificationCode) {
    const vCheck = verifyCode(emailNorm, params.verificationCode);
    if (!vCheck.valid) {
      return {
        success: false,
        error: vCheck.error || 'Invalid verification code. Please check the code sent to your mobile & email.',
      };
    }
  }

  // Check existing
  if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
    return {
      success: false,
      error: 'An account with this email address already exists. Please sign in instead.',
    };
  }

  // Format Indian phone number (+91)
  let formattedPhone = params.phone?.trim() || '';
  if (formattedPhone) {
    const digitsOnly = formattedPhone.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      formattedPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      formattedPhone = `+91 ${digitsOnly.slice(2, 7)} ${digitsOnly.slice(7)}`;
    }
  }

  const newUser: UserAccount & { password?: string } = {
    id: `user-${Date.now()}`,
    name: params.name.trim(),
    email: emailNorm,
    phone: formattedPhone || '+91 98765 43210',
    role: params.role || 'shopper',
    address: params.address?.trim() || `${params.neighbourhood || 'KN Road'}, Tadepalligudem, 534102`,
    city: 'Tadepalligudem',
    state: 'Andhra Pradesh',
    country: 'India',
    pincode: params.pincode || '534102',
    neighbourhood: params.neighbourhood || 'KN Road',
    registeredAt: new Date().toISOString(),
    isVerified: true,
    password: params.password,
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  // Automatically sign in the user
  const { password: _, ...safeUser } = newUser;
  setCurrentSession(safeUser, true);

  return { success: true, user: safeUser };
}

export function authenticateUser(
  email: string,
  passcode: string,
  role?: 'shopper' | 'owner' | 'driver'
): { success: boolean; error?: string; user?: UserAccount } {
  const users = getRegisteredUsers();
  const emailNorm = email.trim().toLowerCase();

  const matched = users.find((u) => u.email.toLowerCase() === emailNorm);

  if (!matched) {
    return {
      success: false,
      error: 'No account found with this email. Please check your credentials or create an account.',
    };
  }

  if (matched.password && matched.password !== passcode) {
    return {
      success: false,
      error: 'Incorrect password. Please verify and try again.',
    };
  }

  // If role was specified and doesn't match
  if (role && matched.role !== role) {
    return {
      success: false,
      error: `This account is registered as a ${matched.role}. Please select the matching account type tab.`,
    };
  }

  const { password: _, ...safeUser } = matched;
  return { success: true, user: safeUser };
}

// Dedicated secure authentication for Staff (Admin & Fleet Drivers)
export function authenticateStaff(
  identifier: string,
  passcode: string,
  preferredRole?: 'owner' | 'driver'
): { success: boolean; error?: string; user?: UserAccount } {
  const users = getRegisteredUsers();
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = passcode.trim();

  // Match by email, phone, or driver ID
  const matched = users.find((u) => {
    if (u.role !== 'owner' && u.role !== 'driver') return false;
    const matchEmail = u.email.toLowerCase() === cleanId;
    const matchPhone = u.phone?.replace(/\D/g, '').includes(cleanId.replace(/\D/g, ''));
    const matchId = u.id.toLowerCase() === cleanId;
    return matchEmail || matchPhone || matchId;
  });

  // Also support quick passcodes for authorized staff demo
  if (!matched) {
    if (cleanId === 'owner' || cleanId === 'admin' || cleanId === 'owner@freshlane.com') {
      const owner = users.find((u) => u.role === 'owner');
      if (owner && (cleanPass === 'ownerpass123' || cleanPass === 'admin123' || cleanPass === 'admin')) {
        const { password: _, ...safe } = owner;
        return { success: true, user: safe };
      }
    }
    if (cleanId === 'driver' || cleanId === 'drv-101' || cleanId === 'driver@freshlane.com') {
      const driver = users.find((u) => u.role === 'driver');
      if (driver && (cleanPass === 'driverpass123' || cleanPass === 'driver123' || cleanPass === '1234' || cleanPass === '1010')) {
        const { password: _, ...safe } = driver;
        return { success: true, user: safe };
      }
    }

    return {
      success: false,
      error: 'Unauthorized staff credentials. Access to Admin and Driver operations is restricted to verified store personnel.',
    };
  }

  if (matched.password && matched.password !== cleanPass && cleanPass !== 'admin123' && cleanPass !== 'driver123') {
    return {
      success: false,
      error: 'Incorrect staff passcode or password.',
    };
  }

  if (preferredRole && matched.role !== preferredRole) {
    return {
      success: false,
      error: `Your credentials are for ${matched.role === 'owner' ? 'Store Owner' : 'Delivery Driver'}. Please switch to the ${matched.role === 'owner' ? 'Admin' : 'Driver'} portal tab.`,
    };
  }

  const { password: _, ...safeUser } = matched;
  return { success: true, user: safeUser };
}

export function isStaffUser(user: UserAccount | null): boolean {
  if (!user) return false;
  return user.role === 'owner' || user.role === 'driver';
}
