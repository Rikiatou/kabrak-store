import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { Star, Gift, Plus, Trophy, Users, Medal, Award, Crown, Gem, type LucideIcon } from 'lucide-react';
import api from '@/lib/api';

interface LoyaltyConfig {
  tiers: Array<{ name: string; minPoints: number; discountPercent: number }>;
  pointsPerFCFA: number;
}

interface Reward {
  id: string;
  name: string;
  pointsRequired: number;
  discountPercent: number;
  discountAmount: number;
  isActive: boolean;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  totalOrders: number;
}

const tierStyles: Record<string, { icon: LucideIcon; card: string; badge: string; iconColor: string }> = {
  BRONZE: { icon: Medal, card: 'border-orange-200 dark:border-orange-900/60', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200', iconColor: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40' },
  SILVER: { icon: Award, card: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100', iconColor: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-200' },
  GOLD: { icon: Crown, card: 'border-amber-300 dark:border-amber-800/60', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', iconColor: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' },
  PLATINUM: { icon: Gem, card: 'border-sky-300 dark:border-sky-800/60', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', iconColor: 'text-sky-600 bg-sky-100 dark:bg-sky-900/40' },
};

const emptyReward = { name: '', pointsRequired: 100, discountPercent: 0, discountAmount: 0 };

export function LoyaltyPage() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState(emptyReward);

  const load = useCallback(async () => {
    try {
      const [configRes, rewardsRes, clientsRes] = await Promise.all([
        api.get('/loyalty/config'),
        api.get('/loyalty/rewards'),
        api.get('/clients', { params: { limit: 100 } }),
      ]);
      setConfig(configRes.data.data);
      setRewards(rewardsRes.data.data);
      setClients(clientsRes.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.loadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rewardForm.discountPercent <= 0 && rewardForm.discountAmount <= 0) {
      toast.error(t('loyalty.rewardRequired'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/loyalty/rewards', rewardForm);
      toast.success(t('loyalty.rewardCreated'));
      setShowRewardForm(false);
      setRewardForm(emptyReward);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  const topClients = [...clients]
    .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    .slice(0, 10);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title={t('loyalty.title')} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {config?.tiers.map((tier) => {
          const count = clients.filter((c) => c.loyaltyTier === tier.name).length;
          const style = tierStyles[tier.name] || tierStyles.BRONZE;
          const Icon = style.icon;
          return (
            <Card key={tier.name} className={style.card}>
              <CardContent className="p-4 text-center">
                <div className={cn('mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full', style.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm">{tier.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('loyalty.minPoints', { n: tier.minPoints })}</p>
                <p className="text-xs text-muted-foreground">{tier.discountPercent}% {t('loyalty.tierDiscount')}</p>
                <div className="mt-2 flex items-center justify-center gap-1 text-muted-foreground" title={t('loyalty.clientsInTier')}>
                  <Users className="w-3 h-3" />
                  <span className="text-xs font-semibold text-foreground">{count}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 flex items-start gap-2 text-sm">
          <Star className="w-4 h-4 mt-0.5 shrink-0 text-gold-500" />
          <p>{t('loyalty.pointsRule', { amount: formatCurrency(config?.pointsPerFCFA || 1000) })}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="w-5 h-5 text-primary" /> {t('loyalty.rewards')}
            </CardTitle>
            <Button size="sm" onClick={() => setShowRewardForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> {t('common.add')}
            </Button>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t('loyalty.noRewards')}</p>
            ) : (
              <div className="space-y-2">
                {rewards.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.discountPercent > 0 ? `${r.discountPercent}%` : formatCurrency(r.discountAmount)} {t('loyalty.discountOff')}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{r.pointsRequired} pts</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-gold-500" /> {t('loyalty.topClients')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t('loyalty.noClients')}</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => {
                  const style = tierStyles[c.loyaltyTier] || tierStyles.BRONZE;
                  const Icon = style.icon;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="w-6 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(c.totalSpent)} · {c.totalOrders} {t('loyalty.orders')}
                        </p>
                      </div>
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', style.badge)}>
                        <Icon className="h-3 w-3" /> {c.loyaltyPoints} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showRewardForm} onOpenChange={setShowRewardForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('loyalty.newReward')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateReward} className="space-y-4">
            <div>
              <Label htmlFor="r-name">{t('loyalty.rewardName')} *</Label>
              <Input id="r-name" value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder={t('loyalty.rewardNameHint')} required autoFocus />
            </div>
            <div>
              <Label htmlFor="r-points">{t('loyalty.pointsRequired')} *</Label>
              <Input id="r-points" type="number" min={1} required value={rewardForm.pointsRequired}
                onChange={(e) => setRewardForm({ ...rewardForm, pointsRequired: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-pct">{t('loyalty.discountPercent')}</Label>
                <Input id="r-pct" type="number" min={0} max={100} value={rewardForm.discountPercent}
                  onChange={(e) => setRewardForm({ ...rewardForm, discountPercent: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="r-amt">{t('loyalty.discountAmount')}</Label>
                <Input id="r-amt" type="number" min={0} value={rewardForm.discountAmount}
                  onChange={(e) => setRewardForm({ ...rewardForm, discountAmount: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRewardForm(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner className="mr-2" />}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
