import { useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, DollarSign, BarChart3, Lightbulb, Target, Calendar } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface ReportData {
  report: string;
  period: string;
  metrics: {
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    margin: number;
  };
}

const SECTION_ICONS: Record<number, { icon: typeof Sparkles; color: string; bg: string }> = {
  1: { icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  2: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  3: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  4: { icon: Lightbulb, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  5: { icon: Target, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
};

function ParsedReport({ text }: { text: string }) {
  const lines = text.split('\n');
  const sections: { title: string; num: number; items: string[] }[] = [];
  let current: { title: string; num: number; items: string[] } | null = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (sectionMatch) {
      if (current) sections.push(current);
      current = { num: parseInt(sectionMatch[1]), title: sectionMatch[2], items: [] };
    } else if (current && line.trim().startsWith('-')) {
      current.items.push(line.trim().replace(/^-\s*/, ''));
    } else if (current && line.trim() && !line.match(/^\d+\./)) {
      current.items.push(line.trim());
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    return (
      <div className="space-y-2">
        {lines.filter(l => l.trim()).map((line, i) => (
          <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{line}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((sec) => {
        const cfg = SECTION_ICONS[sec.num] || SECTION_ICONS[1];
        const Icon = cfg.icon;
        return (
          <div key={sec.num} className={`rounded-xl p-4 ${cfg.bg} border border-transparent`}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
              <h3 className={`font-bold text-sm ${cfg.color}`}>{sec.title}</h3>
            </div>
            <ul className="space-y-1.5">
              {sec.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function AIReportsPage() {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const plan = useAuthStore((s) => s.tenant?.plan || 'STORE');
  const isShop = plan === 'SHOP';
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/report', { period });
      if (res.data.success) {
        setReport(res.data.data);
        setGeneratedAt(new Date());
      } else {
        setError(res.data.message || 'Erreur inconnue');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur de connexion';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const profitPositive = (report?.metrics.profit ?? 0) >= 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {fr ? 'Rapports IA — GPT-4o' : 'AI Reports — GPT-4o'}
              {isShop && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/30 text-amber-100 border border-amber-300/30">
                  {fr ? '3/mois · SHOP' : '3/mo · SHOP'}
                </span>
              )}
            </h1>
            <p className="text-purple-200 text-xs mt-1">
              {fr ? 'Analyse intelligente de votre business avec recommandations actionnables' : 'Intelligent business analysis with actionable recommendations'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex rounded-xl overflow-hidden border border-white/30">
              {(['week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${period === p ? 'bg-white text-purple-700' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                  {p === 'week' ? (fr ? '7 jours' : '7 days') : (fr ? 'Ce mois' : 'This month')}
                </button>
              ))}
            </div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-700 font-bold hover:bg-purple-50 disabled:opacity-60 transition-colors text-sm shadow"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {fr ? 'Générer' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">{fr ? 'Erreur' : 'Error'}</p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
          </div>
          <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      )}

      {/* Results */}
      {!loading && report && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500 font-medium">{fr ? 'Revenus' : 'Revenue'}</span>
              </div>
              <p className="font-black text-lg text-green-600">{formatCurrency(report.metrics.totalRevenue)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-xs text-gray-500 font-medium">{fr ? 'Dépenses' : 'Expenses'}</span>
              </div>
              <p className="font-black text-lg text-red-500">{formatCurrency(report.metrics.totalExpenses)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className={`w-4 h-4 ${profitPositive ? 'text-blue-500' : 'text-red-400'}`} />
                <span className="text-xs text-gray-500 font-medium">{fr ? 'Bénéfice' : 'Profit'}</span>
              </div>
              <p className={`font-black text-lg ${profitPositive ? 'text-blue-600' : 'text-red-500'}`}>
                {formatCurrency(report.metrics.profit)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className={`w-4 h-4 ${profitPositive ? 'text-purple-500' : 'text-red-400'}`} />
                <span className="text-xs text-gray-500 font-medium">{fr ? 'Marge nette' : 'Net margin'}</span>
              </div>
              <p className={`font-black text-lg ${profitPositive ? 'text-purple-600' : 'text-red-500'}`}>
                {report.metrics.margin}%
              </p>
            </div>
          </div>

          {/* Profit bar */}
          {report.metrics.totalRevenue > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{fr ? 'Répartition revenus' : 'Revenue breakdown'}</span>
                <span>{report.metrics.margin}% {fr ? 'de marge' : 'margin'}</span>
              </div>
              <div className="w-full h-3 bg-red-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, report.metrics.margin))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{fr ? 'Dépenses' : 'Expenses'}: {formatCurrency(report.metrics.totalExpenses)}</span>
                <span>{fr ? 'Bénéfice' : 'Profit'}: {formatCurrency(Math.max(0, report.metrics.profit))}</span>
              </div>
            </div>
          )}

          {/* Report body */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                {fr ? 'Analyse complète' : 'Full analysis'}
              </h2>
              {generatedAt && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {generatedAt.toLocaleTimeString(fr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <ParsedReport text={report.report} />
          </div>

          {/* Regenerate */}
          <div className="text-center">
            <button
              onClick={generateReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-purple-200 text-purple-600 font-semibold text-sm hover:bg-purple-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {fr ? 'Régénérer' : 'Regenerate'}
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !report && !error && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
            {fr ? 'Générez votre rapport IA' : 'Generate your AI report'}
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            {fr
              ? 'GPT-4o analysera vos ventes, dépenses et clients pour vous donner des recommandations concrètes.'
              : 'GPT-4o will analyze your sales, expenses and clients to give you concrete recommendations.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8 text-xs text-gray-500">
            {(fr
              ? ['📊 Résumé exécutif', '✅ Points forts', '⚠️ Axes d\'amélioration', '💡 Recommandations', '🎯 Prévisions']
              : ['📊 Executive summary', '✅ Strengths', '⚠️ Areas to improve', '💡 Recommendations', '🎯 Forecasts']
            ).map(item => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 font-medium">{item}</span>
            ))}
          </div>
          <button
            onClick={generateReport}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-700 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-200"
          >
            <Sparkles className="w-5 h-5" />
            {fr ? 'Analyser mon business' : 'Analyze my business'}
          </button>
        </div>
      )}
    </div>
  );
}
