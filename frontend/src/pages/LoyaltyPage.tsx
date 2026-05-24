import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import { Heart, Star, Gift, Plus, X, Trophy, Users } from 'lucide-react';
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

const tierColors: Record<string, string> = {
  BRONZE: 'bg-orange-100 text-orange-800 border-orange-300',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
  GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PLATINUM: 'bg-purple-100 text-purple-800 border-purple-300',
};

const tierIcons: Record<string, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
};

export function LoyaltyPage() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    pointsRequired: 100,
    discountPercent: 0,
    discountAmount: 0,
  });

  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [configRes, rewardsRes, clientsRes] = await Promise.all([
          api.get('/loyalty/config'),
          api.get('/loyalty/rewards'),
          api.get('/clients', { params: { limit: 100 } }),
        ]);
        if (mounted) {
          setConfig(configRes.data.data);
          setRewards(rewardsRes.data.data);
          setClients(clientsRes.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    refreshRef.current = load;
    load();
    return () => { mounted = false; };
  }, []);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/loyalty/rewards', rewardForm);
      setShowRewardForm(false);
      setRewardForm({ name: '', pointsRequired: 100, discountPercent: 0, discountAmount: 0 });
      refreshRef.current();
    } catch (err) {
      console.error(err);
    }
  };

  const topClients = [...clients]
    .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500" /> {t('nav.loyalty')}
        </h1>
      </div>

      {/* Tiers Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {config?.tiers.map((tier) => {
          const count = clients.filter((c) => c.loyaltyTier === tier.name).length;
          return (
            <Card key={tier.name} className={`border-2 ${tierColors[tier.name] || ''}`}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-1">{tierIcons[tier.name]}</div>
                <p className="font-bold text-sm">{tier.name}</p>
                <p className="text-xs mt-1">{tier.minPoints}+ pts</p>
                <p className="text-xs">{tier.discountPercent}% remise</p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  <span className="text-xs font-bold">{count}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Points Info */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm">
            <Star className="w-4 h-4 inline text-gold-500 mr-1" />
            <strong>1 point</strong> pour chaque <strong>{formatCurrency(config?.pointsPerFCFA || 1000)} FCFA</strong> dépensé.
            Les points sont attribués automatiquement à chaque achat.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rewards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" /> Récompenses
            </CardTitle>
            <Button size="sm" onClick={() => setShowRewardForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('common.noResults')}</p>
            ) : (
              <div className="space-y-2">
                {rewards.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.discountPercent > 0 ? `${r.discountPercent}% de remise` : `${formatCurrency(r.discountAmount)} FCFA de remise`}
                      </p>
                    </div>
                    <Badge variant="outline">{r.pointsRequired} pts</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Top clients fidèles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('common.noResults')}</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(c.totalSpent)} FCFA · {c.totalOrders} commandes
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={tierColors[c.loyaltyTier] || ''}>
                        {tierIcons[c.loyaltyTier]} {c.loyaltyPoints} pts
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Reward Modal */}
      {showRewardForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nouvelle récompense</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowRewardForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateReward} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom</label>
                  <Input
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="Ex: Remise fidélité 10%"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Points requis</label>
                  <Input
                    type="number"
                    value={rewardForm.pointsRequired}
                    onChange={(e) => setRewardForm({ ...rewardForm, pointsRequired: parseInt(e.target.value) || 0 })}
                    min={1}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Remise (%)</label>
                    <Input
                      type="number"
                      value={rewardForm.discountPercent}
                      onChange={(e) => setRewardForm({ ...rewardForm, discountPercent: parseInt(e.target.value) || 0 })}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Remise (FCFA)</label>
                    <Input
                      type="number"
                      value={rewardForm.discountAmount}
                      onChange={(e) => setRewardForm({ ...rewardForm, discountAmount: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowRewardForm(false)} className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1">
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
