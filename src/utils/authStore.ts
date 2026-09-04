import { UserAccount } from '../types';

const SESSION_KEY = 'freshlane_session';
const REGISTERED_USERS_KEY = 'freshlane_registered_users';

// Seed default demo accounts
const DEFAULT_USERS: (UserAccount & { password?: string })[] = [
  {
    id: 'user-demo-1',
    name: 'Riya Sharma',
    email: 'riya@example.com',
    phone: '+91 98765 43210',
    role: 'shopper',
    address: '42 Sri Rama Colony, KN Road, Tadepalligudem',
    city: 'Tadepalligudem',
    neighbourhood: 'KN Road',
    registeredAt: '2026-08-15T10:30:00.000Z',
    password: 'password123',
  },
  {
    id: 'user-demo-2',
    name: 'Vikram Patel',
    email: 'owner@freshlane.com',
    phone: '+91 99001 12233',
    role: 'owner',
    address: 'FreshLane Hub #1, Subba Rao Peta, Tadepalligudem, 534102',
    city: 'Tadepalligudem',
    neighbourhood: 'Subba Rao Peta',
    registeredAt: '2026-07-01T08:00:00.000Z',
    password: 'ownerpass123',
  },
];

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
  role: 'shopper' | 'owner';
  address?: string;
  neighbourhood?: string;
}): { success: boolean; error?: string; user?: UserAccount } {
  const users = getRegisteredUsers();
  const emailNorm = params.email.trim().toLowerCase();

  // Check existing
  if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
    return {
      success: false,
      error: 'An account with this email address already exists. Please sign in instead.',
    };
  }

  const newUser: UserAccount & { password?: string } = {
    id: `user-${Date.now()}`,
    name: params.name.trim(),
    email: emailNorm,
    phone: params.phone?.trim(),
    role: params.role,
    address: params.address?.trim() || `${params.neighbourhood || 'KN Road'}, Tadepalligudem, 534102`,
    city: 'Tadepalligudem',
    neighbourhood: params.neighbourhood || 'KN Road',
    registeredAt: new Date().toISOString(),
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
  role?: 'shopper' | 'owner'
): { success: boolean; error?: string; user?: UserAccount } {
  const users = getRegisteredUsers();
  const emailNorm = email.trim().toLowerCase();

  const matched = users.find((u) => u.email.toLowerCase() === emailNorm);

  if (!matched) {
    // If it's a first-time email, offer a graceful login or indicate not found
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
