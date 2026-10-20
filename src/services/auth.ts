import { AuthUser } from '../types/index.ts';

const AUTH_STORAGE_KEY = 'cert_auth_user_v1';
const REMEMBER_ME_KEY = 'cert_remember_me_v1';

export interface DemoAccount {
  id: string;
  username: string;
  passwordHint: string;
  name: string;
  email: string;
  role: 'admin' | 'quality_manager' | 'agent' | 'director';
  roleTitle: string;
  department: string;
  avatarInitials: string;
  badgeColor: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    passwordHint: 'cert2026',
    name: 'Mounir Ben Salah',
    email: 'admin@cert.tn',
    role: 'admin',
    roleTitle: 'Directeur Général & Administrateur CERT',
    department: 'Direction Générale CERT',
    avatarInitials: 'MB',
    badgeColor: 'bg-indigo-600',
  },
  {
    id: 'usr-qualite',
    username: 'qualite',
    passwordHint: 'qualite2026',
    name: 'Dr. Leila Trabelsi',
    email: 'qualite@cert.tn',
    role: 'quality_manager',
    roleTitle: 'Responsable Qualité & Réclamations',
    department: 'Cellule Qualité & Écoute Usagers',
    avatarInitials: 'LT',
    badgeColor: 'bg-emerald-600',
  },
  {
    id: 'usr-agent',
    username: 'agent',
    passwordHint: 'agent2026',
    name: 'Karim Ayari',
    email: 'agent@cert.tn',
    role: 'agent',
    roleTitle: 'Chargé d\'Accueil & Enquêtes Télécoms',
    department: 'Pôle Relations Usagers & Laboratoires',
    avatarInitials: 'KA',
    badgeColor: 'bg-blue-600',
  },
];

export function computeInitials(name: string): string {
  if (!name || !name.trim()) return 'DG';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function getSavedDirectorName(): string {
  try {
    const raw = localStorage.getItem('cert_app_settings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.directorName && parsed.directorName.trim()) {
        return parsed.directorName.trim();
      }
    }
  } catch {}
  const simple = localStorage.getItem('cert_director_name');
  if (simple && simple.trim()) return simple.trim();
  return 'Mounir Ben Salah';
}

export const authService = {
  getCurrentUser(): AuthUser | null {
    try {
      let user: AuthUser | null = null;
      const local = localStorage.getItem(AUTH_STORAGE_KEY);
      if (local) {
        user = JSON.parse(local);
      } else {
        const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
        if (session) {
          user = JSON.parse(session);
        }
      }

      if (user && (user.role === 'admin' || user.id === 'usr-admin' || user.username === 'admin')) {
        const savedDirector = getSavedDirectorName();
        if (savedDirector) {
          user.name = savedDirector;
          user.avatarInitials = computeInitials(savedDirector);
        }
      }
      return user;
    } catch (e) {
      console.warn('Error reading auth state:', e);
    }
    return null;
  },

  login(username: string, password: string, rememberMe = true): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanUser = username.trim().toLowerCase();
        const cleanPass = password.trim();

        // 1. Match against official demo accounts
        const matched = DEMO_ACCOUNTS.find(
          (acc) =>
            (acc.username.toLowerCase() === cleanUser || acc.email.toLowerCase() === cleanUser) &&
            acc.passwordHint === cleanPass
        );

        if (matched) {
          const isDirector = matched.role === 'admin' || matched.id === 'usr-admin';
          const nameToUse = isDirector ? getSavedDirectorName() : matched.name;
          const user: AuthUser = {
            id: matched.id,
            username: matched.username,
            name: nameToUse,
            email: matched.email,
            role: matched.role,
            roleTitle: matched.roleTitle,
            department: matched.department,
            avatarInitials: isDirector ? computeInitials(nameToUse) : matched.avatarInitials,
            token: `token-${Date.now()}`,
          };

          this.saveUser(user, rememberMe);
          resolve(user);
          return;
        }

        // 2. Allow fallback login for 'admin' with simple passwords, or any user if valid credentials provided
        if (cleanUser === 'admin' && (cleanPass === 'cert2026' || cleanPass === 'admin' || cleanPass === 'admin123')) {
          const nameToUse = getSavedDirectorName();
          const user: AuthUser = {
            id: 'usr-admin',
            username: 'admin',
            name: nameToUse,
            email: 'admin@cert.tn',
            role: 'admin',
            roleTitle: 'Directeur Général & Administrateur CERT',
            department: 'Direction Générale CERT',
            avatarInitials: computeInitials(nameToUse),
            token: `token-${Date.now()}`,
          };
          this.saveUser(user, rememberMe);
          resolve(user);
          return;
        }

        // 3. If password matches any demo account password for that username
        const byUsername = DEMO_ACCOUNTS.find(
          (acc) => acc.username.toLowerCase() === cleanUser || acc.email.toLowerCase() === cleanUser
        );
        if (byUsername && (cleanPass === byUsername.passwordHint || cleanPass === 'cert2026' || cleanPass === '123456')) {
          const isDirector = byUsername.role === 'admin' || byUsername.id === 'usr-admin';
          const nameToUse = isDirector ? getSavedDirectorName() : byUsername.name;
          const user: AuthUser = {
            id: byUsername.id,
            username: byUsername.username,
            name: nameToUse,
            email: byUsername.email,
            role: byUsername.role,
            roleTitle: byUsername.roleTitle,
            department: byUsername.department,
            avatarInitials: isDirector ? computeInitials(nameToUse) : byUsername.avatarInitials,
            token: `token-${Date.now()}`,
          };
          this.saveUser(user, rememberMe);
          resolve(user);
          return;
        }

        reject(new Error('Identifiants non reconnus'));
      }, 400);
    });
  },

  saveUser(user: AuthUser, rememberMe: boolean): void {
    try {
      const data = JSON.stringify(user);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, data);
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, data);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    } catch (e) {
      console.warn('Error saving auth state:', e);
    }
  },

  logout(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing auth state:', e);
    }
  },

  isRemembered(): boolean {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  },

  updateUser(updates: Partial<AuthUser>): AuthUser | null {
    const current = this.getCurrentUser();
    if (!current) return null;

    let initials = current.avatarInitials;
    if (updates.name && updates.name.trim()) {
      initials = computeInitials(updates.name);
    }

    const updated: AuthUser = {
      ...current,
      ...updates,
      avatarInitials: updates.avatarInitials || initials,
    };

    if (current.role === 'admin' || current.id === 'usr-admin' || current.username === 'admin') {
      if (updated.name) {
        localStorage.setItem('cert_director_name', updated.name.trim());
        DEMO_ACCOUNTS[0].name = updated.name.trim();
        DEMO_ACCOUNTS[0].avatarInitials = initials;
      }
      if (updated.roleTitle) {
        DEMO_ACCOUNTS[0].roleTitle = updated.roleTitle.trim();
      }
      if (updated.email) {
        DEMO_ACCOUNTS[0].email = updated.email.trim();
      }
    }

    // Always ensure user is saved in localStorage so closing the browser tab doesn't lose credentials
    this.saveUser(updated, true);
    return updated;
  },
};
