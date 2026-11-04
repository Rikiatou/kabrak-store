type Sub = { plan: string; status: string; endDate: string; isExpired?: boolean } | null | undefined;

/** Mirrors the server rule: BUSINESS feature, open on every plan during the free trial. */
export function storefrontAccess(sub: Sub): 'open' | 'trial' | 'locked' {
  if (!sub) return 'locked';
  const active = !sub.isExpired && new Date(sub.endDate) > new Date();
  if (sub.status === 'TRIAL') return active ? (sub.plan === 'BUSINESS' ? 'open' : 'trial') : 'locked';
  return sub.plan === 'BUSINESS' && sub.status === 'ACTIVE' && active ? 'open' : 'locked';
}
