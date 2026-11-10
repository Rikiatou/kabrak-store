interface StaffUser {
  role?: string;
  modules?: string[];
}

// Always reachable: help, own profile/password, and the subscription page (needed when the shop expires).
export const ALWAYS_ALLOWED = new Set(['guide', 'settings', 'billing']);

// Owner, or a staff account without a module list = full access.
export const hasFullAccess = (user: StaffUser | null | undefined) =>
  !user || user.role === 'OWNER' || !user.modules?.length;

export const canAccess = (user: StaffUser | null | undefined, key: string) =>
  hasFullAccess(user) || !!user?.modules?.includes(key);

// Purchase prices and profits: owner and managers only (the server doesn't send them to other roles either)
export const canSeeCosts = (user: StaffUser | null | undefined) =>
  user?.role === 'OWNER' || user?.role === 'MANAGER';
