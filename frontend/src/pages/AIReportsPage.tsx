import { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

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

export function AIReportsPage() {
  const { language } = useTranslation();
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/report', { period });
      setReport(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatReport = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.match(/^\d+\./)) {
        return <h3 key={i} className="font-semibold text-foreground mt-4 mb-2">{line}</h3>;
      }
      if (line.startsWith('-')) {
        return <li key={i} className="text-sm text-muted-foreground ml-4 mb-1">{line}</li>;
      }
      if (line.trim()) {
        return <p key={i} className="text-sm text-muted-foreground mb-2">{line}</p>;
      }
      return null;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          {language === 'fr' ? 'Rapports IA' : 'AI Reports'}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="week">{language === 'fr' ? '7 derniers jours' : 'Last 7 days'}</option>
            <option value="month">{language === 'fr' ? 'Ce mois' : 'This month'}</option>
          </select>
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {language === 'fr' ? 'Générer rapport' : 'Generate report'}
          </button>
        </div>
      </div>

      {/* Metrics cards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground font-medium">{language === 'fr' ? 'Revenus' : 'Revenue'}</span>
            </div>
            <p className="font-bold text-lg text-green-600">{formatCurrency(report.metrics.totalRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground font-medium">{language === 'fr' ? 'Dépenses' : 'Expenses'}</span>
            </div>
            <p className="font-bold text-lg text-red-500">{formatCurrency(report.metrics.totalExpenses)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">{language === 'fr' ? 'Bénéfice' : 'Profit'}</span>
            </div>
            <p className={`font-bold text-lg ${report.metrics.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(report.metrics.profit)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground font-medium">Marge</span>
            </div>
            <p className={`font-bold text-lg ${report.metrics.margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {report.metrics.margin}%
            </p>
          </div>
        </div>
      )}

      {/* Report content */}
      {report ? (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="prose prose-sm max-w-none">
            {formatReport(report.report)}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">
            {language === 'fr' ? 'Générez votre premier rapport IA' : 'Generate your first AI report'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'fr' ? 'L\'IA analysera vos données et vous donnera des recommandations actionnables.' : 'AI will analyze your data and provide actionable recommendations.'}
          </p>
          <button
            onClick={generateReport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {language === 'fr' ? 'Générer maintenant' : 'Generate now'}
          </button>
        </div>
      )}
    </div>
  );
}
