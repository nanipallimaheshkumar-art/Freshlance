import { UserAccount } from '../types';

const SESSION_KEY = 'freshlane_session';
const REGISTERED_USERS_KEY = 'freshlane_registered_users';

// Authorized Admin Account
export const ADMIN_CREDENTIALS = {
  email: 'nanipallimaheshkumar@gmail.com',
  securityCode: '132908',
};

const DEFAULT_USERS: (UserAccount & { password?: string })[] = [
  {
    id: 'admin-mahesh',
    name: 'Mahesh Kumar',
    email: 'nanipallimaheshkumar@gmail.com',
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
    password: '132908',
  },
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
    
    // Check for matching identifier or any active unexpired record with matching code
    let found = records.find((r) => r.identifier === norm);
    if (!found) {
      found = records.find((r) => r.code === cleanCode && Date.now() <= r.expiresAt);
    }

    if (!found) {
      // Allow demo bypass code 123456 or prompt user to request code
      if (cleanCode === '123456') return { valid: true };
      return { valid: false, error: 'Verification code not found. Please click Resend Code.' };
    }

    if (Date.now() > found.expiresAt) {
      return { valid: false, error: 'Verification code has expired. Please request a new code.' };
    }

    if (found.code !== cleanCode && cleanCode !== '123456') {
      return { valid: false, error: 'Invalid verification code. Please check your SMS messages and try again.' };
    }

    return { valid: true };
  } catch {
    return { valid: cleanCode.length === 6 };
  }
}

export function getRegisteredUsers(): (UserAccount & { password?: string })[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    let list: (UserAccount & { password?: string })[] = [];

    if (!raw) {
      list = [...DEFAULT_USERS];
    } else {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [...DEFAULT_USERS];
    }

    // Sanitize: remove any legacy demo owner or demo driver credentials
    let changed = false;
    const cleaned = list.filter((u) => {
      const e = (u.email || '').toLowerCase().trim();
      if (e === 'owner@freshlane.com' || e === 'driver@freshlane.com') {
        changed = true;
        return false;
      }
      return true;
    });

    // Ensure the real Admin account exists with exact credentials
    const adminIdx = cleaned.findIndex(
      (u) => u.email?.toLowerCase().trim() === ADMIN_CREDENTIALS.email.toLowerCase()
    );

    if (adminIdx >= 0) {
      if (cleaned[adminIdx].password !== ADMIN_CREDENTIALS.securityCode || cleaned[adminIdx].role !== 'owner') {
        cleaned[adminIdx].password = ADMIN_CREDENTIALS.securityCode;
        cleaned[adminIdx].role = 'owner';
        changed = true;
      }
    } else {
      cleaned.unshift(DEFAULT_USERS[0]);
      changed = true;
    }

    if (changed || !raw) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
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
  preferredRole: 'owner' | 'driver' = 'owner'
): { success: boolean; error?: string; user?: UserAccount } {
  const users = getRegisteredUsers();
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = passcode.trim();

  // 1. STORE ADMIN LOGIN
  if (preferredRole === 'owner') {
    if (cleanId !== ADMIN_CREDENTIALS.email.toLowerCase()) {
      return {
        success: false,
        error: 'Unauthorized administrator email address. Access denied.',
      };
    }

    if (cleanPass !== ADMIN_CREDENTIALS.securityCode) {
      return {
        success: false,
        error: 'Invalid security code. Access denied.',
      };
    }

    const admin = users.find(
      (u) => u.role === 'owner' && u.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()
    );

    if (admin) {
      const { password: _, ...safeUser } = admin;
      return { success: true, user: safeUser };
    }

    return {
      success: true,
      user: {
        id: 'admin-mahesh',
        name: 'Store Administrator',
        email: ADMIN_CREDENTIALS.email,
        role: 'owner',
        city: 'Tadepalligudem',
        country: 'India',
        pincode: '534102',
        registeredAt: new Date().toISOString(),
        isVerified: true,
      },
    };
  }

  // 2. DELIVERY DRIVER LOGIN (Only drivers added by Admin in Admin Portal)
  if (preferredRole === 'driver') {
    const drivers = users.filter((u) => u.role === 'driver');

    if (drivers.length === 0) {
      return {
        success: false,
        error: 'No driver accounts registered yet. Please contact the Store Administrator to create driver credentials.',
      };
    }

    // Match driver by email, phone, or driver ID
    const matchedDriver = drivers.find((d) => {
      const matchEmail = d.email.toLowerCase() === cleanId;
      const matchPhone = d.phone && d.phone.replace(/\D/g, '').includes(cleanId.replace(/\D/g, ''));
      const matchId = d.id.toLowerCase() === cleanId;
      return matchEmail || matchPhone || matchId;
    });

    if (!matchedDriver) {
      return {
        success: false,
        error: 'Driver credentials not found. Only registered fleet drivers can access this portal.',
      };
    }

    if (matchedDriver.password && matchedDriver.password !== cleanPass) {
      return {
        success: false,
        error: 'Incorrect driver password. Please check your credentials or contact the Store Administrator.',
      };
    }

    const { password: _, ...safeDriver } = matchedDriver;
    return { success: true, user: safeDriver };
  }

  return { success: false, error: 'Invalid staff role specified.' };
}

export function isStaffUser(user: UserAccount | null): boolean {
  if (!user) return false;
  return user.role === 'owner' || user.role === 'driver';
}

// ---------------------------------------------------------------------------
// ADMIN DRIVER MANAGEMENT API (Store Admin can add/view/delete driver credentials)
// ---------------------------------------------------------------------------

export interface RegisterDriverInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  vehicleNumber: string;
  vehicleType?: 'electric_scooter' | 'bike' | 'van';
  zone?: string;
}

export function registerDriverAccount(input: RegisterDriverInput): {
  success: boolean;
  error?: string;
  driver?: UserAccount & { password?: string };
} {
  const users = getRegisteredUsers();
  const cleanEmail = input.email.trim().toLowerCase();

  if (!input.name.trim()) {
    return { success: false, error: 'Please enter driver full name.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid driver email address.' };
  }
  if (!input.password || input.password.trim().length < 4) {
    return { success: false, error: 'Driver password must be at least 4 characters.' };
  }
  if (!input.phone.trim()) {
    return { success: false, error: 'Please enter driver phone number.' };
  }

  // Check if email already taken
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: false,
      error: `An account with email "${cleanEmail}" is already registered.`,
    };
  }

  const driverId = `DRV-${Math.floor(100 + Math.random() * 900)}`;

  const newDriver: UserAccount & { password?: string } = {
    id: driverId,
    name: input.name.trim(),
    email: cleanEmail,
    password: input.password.trim(),
    phone: input.phone.trim(),
    role: 'driver',
    vehicleNumber: input.vehicleNumber.trim() || 'AP-39-EQ-4421',
    vehicleType: input.vehicleType || 'electric_scooter',
    zone: input.zone?.trim() || 'KN Road, Tadepalligudem',
    address: `${input.zone || 'KN Road'}, Tadepalligudem Hub`,
    city: 'Tadepalligudem',
    state: 'Andhra Pradesh',
    country: 'India',
    pincode: '534102',
    registeredAt: new Date().toISOString(),
    isVerified: true,
  };

  users.push(newDriver);
  saveRegisteredUsers(users);

  // Notify active components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('freshlane_drivers_updated', { detail: newDriver }));
  }

  return { success: true, driver: newDriver };
}

export function getRegisteredDrivers(): (UserAccount & { password?: string })[] {
  const users = getRegisteredUsers();
  return users.filter((u) => u.role === 'driver');
}

export function deleteDriverAccount(driverId: string): boolean {
  const users = getRegisteredUsers();
  const initialCount = users.length;
  const filtered = users.filter((u) => !(u.role === 'driver' && u.id === driverId));

  if (filtered.length !== initialCount) {
    saveRegisteredUsers(filtered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('freshlane_drivers_updated'));
    }
    return true;
  }
  return false;
}

export function updateDriverPassword(driverId: string, newPassword: string): boolean {
  const users = getRegisteredUsers();
  const driver = users.find((u) => u.role === 'driver' && u.id === driverId);
  if (!driver) return false;

  driver.password = newPassword.trim();
  saveRegisteredUsers(users);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('freshlane_drivers_updated'));
  }
  return true;
}
