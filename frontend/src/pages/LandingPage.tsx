import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  CheckCircle, ArrowRight, X,
  ChevronDown, ChevronUp, Globe, Star,
  MessageCircle
} from 'lucide-react';

// ── FAQ ──
const faqsFR = [
  { q: 'C\'est pour quel type de business ?', a: 'Boutiques, vente WhatsApp, gâteaux, food, mini-markets, grossistes, agences marketing, freelancers, consultants — KABRAK s\'adapte automatiquement à votre activité.' },
  { q: 'Comment ça marche sur téléphone ?', a: 'KABRAK s\'installe sur votre écran d\'accueil comme une vraie application. Pas besoin de Play Store ou App Store. Fonctionne même avec une connexion faible.' },
  { q: 'Comment je paie ?', a: 'Par Orange Money, c\'est simple. Vous payez, on confirme, votre compte s\'active en quelques minutes.' },
  { q: 'Combien d\'employés ?', a: 'STORE : 1 personne · SHOP : 3 personnes · BUSINESS : 10 personnes. Chacun a son propre accès.' },
  { q: 'Et si j\'ai plusieurs boutiques ?', a: 'Le plan BUSINESS gère plusieurs magasins depuis un seul compte.' },
  { q: 'Mes données sont en sécurité ?', a: 'Oui. Serveurs sécurisés, cryptage SSL, et vous pouvez exporter vos données à tout moment.' },
  { q: 'Y a-t-il un essai gratuit ?', a: '14 jours gratuits avec accès complet. Aucune carte requise.' },
];
const faqsEN = [
  { q: 'What type of business is this for?', a: 'Shops, WhatsApp sellers, cakes, food, mini-markets, wholesalers, marketing agencies, freelancers, consultants — KABRAK adapts automatically to your business.' },
  { q: 'How does it work on phone?', a: 'KABRAK installs on your home screen like a real app. No Play Store or App Store needed. Works even with weak connection.' },
  { q: 'How do I pay?', a: 'Via Orange Money, it\'s simple. You pay, we confirm, your account activates in minutes.' },
  { q: 'How many employees?', a: 'STORE: 1 person · SHOP: 3 people · BUSINESS: 10 people. Each has their own access.' },
  { q: 'What if I have multiple stores?', a: 'The BUSINESS plan manages multiple stores from one account.' },
  { q: 'Is my data safe?', a: 'Yes. Secure servers, SSL encryption, and you can export your data anytime.' },
  { q: 'Is there a free trial?', a: '14 days free with full access. No card required.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 text-left hover:bg-gray-50 transition-colors">
        <span className="font-semibold text-gray-800 text-sm sm:text-base pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-5 sm:px-6 pb-4 text-sm text-gray-500 leading-relaxed">{a}</div>}
    </div>
  );
}

export function LandingPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const faqs = lang === 'fr' ? faqsFR : faqsEN;
  const fr = lang === 'fr';

  return (
    <div className="min-h-screen bg-white">

      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="KABRAK Store" className="h-10 sm:h-14 object-contain" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-all">
              <Globe className="w-3.5 h-3.5" /> {fr ? 'EN' : 'FR'}
            </button>
            <Link to="/login" className="hidden sm:inline text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">{fr ? 'Connexion' : 'Login'}</Link>
            <Link to="/register" className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs sm:text-sm font-bold hover:opacity-90 shadow-lg shadow-blue-200 transition-all">
              {fr ? 'Essai gratuit' : 'Free trial'}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════
          SECTION 1 — HERO (5 secondes pour convaincre)
          ═══════════════════════════════════════════════ */}
      <section className="pt-28 sm:pt-36 pb-14 sm:pb-20 px-5 bg-gradient-to-b from-blue-50/60 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black text-gray-900 leading-[1.15] mb-5 sm:mb-6">
            {fr ? (
              <>Le logiciel qui aide votre business à <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">mieux vendre, mieux gérer</span> et <span className="bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent">grandir.</span></>
            ) : (
              <>The software that helps your business <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">sell better, manage smarter</span> and <span className="bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent">grow.</span></>
            )}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
            {fr
              ? 'Ventes, stock, clients, acomptes, factures WhatsApp et revenus — depuis votre téléphone ou ordinateur.'
              : 'Sales, stock, clients, deposits, WhatsApp invoices and revenue — from your phone or computer.'}
          </p>

          {/* Quick business tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {(fr
              ? ['🛍️ Boutique & Commerce', '📦 Vente en Ligne', '🚚 Commandes & Livraison', '🏪 Commerce Général', '💼 Services & Prestations', '📈 Grossistes']
              : ['🛍️ Retail & Commerce', '📦 Online Selling', '🚚 Orders & Delivery', '🏪 General Store', '💼 Services & Clients', '📈 Wholesale']
            ).map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs sm:text-sm font-medium text-gray-600 shadow-sm">
                {tag}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base hover:opacity-90 shadow-2xl shadow-blue-300 transition-all">
              {fr ? 'Essayer gratuitement 14 jours' : 'Try free for 14 days'} <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20veux%20voir%20une%20d%C3%A9mo%20de%20KABRAK%20Store"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-10 py-4 rounded-2xl bg-green-500 text-white font-bold text-base hover:bg-green-600 shadow-lg shadow-green-200 transition-all">
              <MessageCircle className="w-5 h-5" /> {fr ? 'Voir une démo WhatsApp' : 'See a WhatsApp demo'}
            </a>
          </div>
          <p className="text-[11px] text-gray-400 mt-4">{fr ? 'Aucune carte requise · Paiement Orange Money · Annulez à tout moment' : 'No card required · Orange Money payment · Cancel anytime'}</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2 — CONÇU POUR VOTRE TYPE DE BUSINESS
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mb-3">
              {fr ? 'Conçu pour votre type de business' : 'Built for your type of business'}
            </h2>
            <p className="text-sm sm:text-base text-gray-400">{fr ? 'KABRAK s\'adapte automatiquement à votre activité.' : 'KABRAK automatically adapts to your activity.'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {(fr ? [
              { emoji: '🛍️', title: 'Boutique & Commerce', sub: 'Vêtements, chaussures, sacs, parfums, bijoux, cosmétique…', features: ['Stock & ventes rapides', 'Acomptes & paiements', 'Programme fidélité'], plan: 'STORE' },
              { emoji: '📦', title: 'Vente en Ligne', sub: 'WhatsApp, Facebook, TikTok, Instagram, vendeurs à domicile…', features: ['Commandes & suivi', 'Livraisons', 'Paiements mobile money'], plan: 'STORE' },
              { emoji: '🚚', title: 'Commandes & Livraison', sub: 'Gâteaux, cuisine maison, traiteur, food business, snacks…', features: ['Commandes avec dates', 'Acomptes', 'Statut préparation'], plan: 'STORE' },
              { emoji: '🏪', title: 'Commerce Général', sub: 'Mini-market, alimentation, quincaillerie, commerce divers…', features: ['Caisse POS rapide', 'Scanner barcode', 'Stock important'], plan: 'SHOP' },
              { emoji: '💼', title: 'Services & Prestations', sub: 'Marketing, freelance, consulting, design, agence, imprimerie…', features: ['Projets & clients', 'Factures récurrentes', 'Paiements mensuels'], plan: 'SHOP' },
              { emoji: '📈', title: 'Grossistes & Distribution', sub: 'Wholesale, distribution, stock important, multi-vendeurs…', features: ['Multi-magasins', 'Employés', 'Rapports avancés'], plan: 'BUSINESS' },
            ] : [
              { emoji: '🛍️', title: 'Retail & Commerce', sub: 'Clothing, shoes, bags, perfumes, jewelry, cosmetics…', features: ['Stock & quick sales', 'Deposits & payments', 'Loyalty program'], plan: 'STORE' },
              { emoji: '📦', title: 'Online Selling', sub: 'WhatsApp, Facebook, TikTok, Instagram, home sellers…', features: ['Orders & tracking', 'Deliveries', 'Mobile money payments'], plan: 'STORE' },
              { emoji: '🚚', title: 'Orders & Delivery', sub: 'Cakes, home cooking, caterer, food business, snacks…', features: ['Orders with dates', 'Deposits', 'Preparation status'], plan: 'STORE' },
              { emoji: '🏪', title: 'General Store', sub: 'Mini-market, grocery, hardware, general trade…', features: ['Fast POS register', 'Barcode scanner', 'Large stock'], plan: 'SHOP' },
              { emoji: '💼', title: 'Services & Clients', sub: 'Marketing, freelance, consulting, design, agency, printing…', features: ['Projects & clients', 'Recurring invoices', 'Monthly payments'], plan: 'SHOP' },
              { emoji: '📈', title: 'Wholesale & Distribution', sub: 'Wholesale, distribution, large stock, multi-sellers…', features: ['Multi-store', 'Employees', 'Advanced reports'], plan: 'BUSINESS' },
            ]).map(b => (
              <div key={b.title} className="p-5 sm:p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl sm:text-4xl">{b.emoji}</span>
                  <div>
                    <p className="font-black text-gray-900 text-sm sm:text-base">{b.title}</p>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{b.plan}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3">{b.sub}</p>
                <ul className="space-y-1.5">
                  {b.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3 — 5 KILLER FEATURES (pas 12)
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-5 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mb-3">
              {fr ? 'Tout ce qu\'il faut pour votre business' : 'Everything your business needs'}
            </h2>
            <p className="text-sm text-gray-400">{fr ? 'Simple. Puissant. Adapté à votre métier.' : 'Simple. Powerful. Adapted to your trade.'}</p>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {(fr ? [
              { emoji: '📦', title: 'Stock intelligent', desc: 'Ajoutez vos produits, le stock se met à jour automatiquement. Alertes quand il est faible. Par taille, couleur, pointure.', tag: 'SHOP+' },
              { emoji: '🧾', title: 'Factures WhatsApp en 1 clic', desc: 'Générez une facture PDF professionnelle avec votre logo et envoyez-la direct au client par WhatsApp. A4 ou ticket de caisse.', tag: 'Tous' },
              { emoji: '💰', title: 'Dépenses & Bénéfice net', desc: 'Suivez vos dépenses par catégorie et calculez automatiquement votre bénéfice net. Dashboard avec marge % en temps réel.', tag: 'Tous' },
              { emoji: '👥', title: 'Clients & fidélité', desc: 'Historique complet de chaque client. Programme fidélité avec points et récompenses automatiques.', tag: 'Tous' },
              { emoji: '📊', title: 'Dashboard revenus', desc: 'Combien avez-vous gagné aujourd\'hui, ce mois, cette année ? Top produits, meilleurs clients — tout en 1 écran.', tag: 'Tous' },
              { emoji: '🏪', title: 'Fournisseurs', desc: 'Gérez vos fournisseurs, liez-les à vos dépenses d\'achat. Suivi complet de vos achats.', tag: 'SHOP+' },
              { emoji: '🌐', title: 'Vitrine publique', desc: 'Créez une page publique pour vos produits. Partagez le lien, vos clients commandent direct.', tag: 'BUSINESS' },
              { emoji: '✨', title: 'Rapports IA', desc: 'Analyse intelligente de votre business par GPT-4o. Recommandations actionnables pour grandir.', tag: 'BUSINESS' },
            ] : [
              { emoji: '📦', title: 'Smart stock', desc: 'Add your products, stock updates automatically. Alerts when low. By size, color, shoe size.', tag: 'SHOP+' },
              { emoji: '🧾', title: 'WhatsApp invoices in 1 click', desc: 'Generate a professional PDF invoice with your logo and send it directly via WhatsApp. A4 or receipt.', tag: 'All' },
              { emoji: '💰', title: 'Expenses & Net Profit', desc: 'Track expenses by category and automatically calculate net profit. Dashboard with real-time margin %.', tag: 'All' },
              { emoji: '👥', title: 'Clients & loyalty', desc: 'Complete history for each client. Loyalty program with automatic points and rewards.', tag: 'All' },
              { emoji: '📊', title: 'Revenue dashboard', desc: 'How much did you earn today, this month, this year? Top products, best clients — all in 1 screen.', tag: 'All' },
              { emoji: '🏪', title: 'Suppliers', desc: 'Manage your suppliers, link them to purchase expenses. Complete purchase tracking.', tag: 'SHOP+' },
              { emoji: '🌐', title: 'Public storefront', desc: 'Create a public page for your products. Share the link, clients order directly.', tag: 'BUSINESS' },
              { emoji: '✨', title: 'AI Reports', desc: 'Intelligent business analysis by GPT-4o. Actionable recommendations to grow.', tag: 'BUSINESS' },
            ]).map((f, i) => (
              <div key={f.title} className={`flex items-start gap-4 sm:gap-6 p-5 sm:p-7 rounded-2xl border-2 transition-all hover:shadow-lg ${i === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                <span className="text-3xl sm:text-4xl flex-shrink-0">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-gray-900 text-base sm:text-lg">{f.title}</h3>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{f.tag}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* More features (collapsed) */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 mb-3">{fr ? 'Et aussi :' : 'And also:'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {(fr
                ? ['Caisse POS', 'Scanner barcode', 'Projets & milestones', 'Facturation récurrente', 'Multi-magasins', 'Employés & permissions', 'Export CSV', 'Livraison', 'Orange Money', 'Bilingue FR/EN', 'Lien WhatsApp commande', 'Logo & couleur facture']
                : ['POS Register', 'Barcode scanner', 'Projects & milestones', 'Recurring billing', 'Multi-store', 'Employees & roles', 'CSV Export', 'Delivery', 'Orange Money', 'Bilingual FR/EN', 'WhatsApp order link', 'Logo & invoice color']
              ).map(f => (
                <span key={f} className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px] sm:text-xs text-gray-500 font-medium">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4 — AVANT / APRÈS (émotionnel)
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-10">
            {fr ? 'Avant KABRAK vs Après' : 'Before KABRAK vs After'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 sm:p-6 rounded-2xl bg-red-50 border border-red-100">
              <p className="font-bold text-red-600 mb-4 text-xs uppercase tracking-widest">{fr ? 'Avant' : 'Before'}</p>
              <ul className="space-y-3">
                {(fr ? [
                  'Stock dans la tête, on oublie',
                  'Factures à la main, perte de temps',
                  'On ne sait pas combien on a gagné',
                  '"Il me doit combien déjà ?"',
                  'Pas de suivi des clients fidèles',
                ] : [
                  'Stock in your head, you forget',
                  'Handwritten invoices, wasted time',
                  'No idea how much you earned',
                  '"How much does he owe me again?"',
                  'No tracking of loyal customers',
                ]).map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-red-600">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-green-50 border border-green-100">
              <p className="font-bold text-green-600 mb-4 text-xs uppercase tracking-widest">{fr ? 'Après' : 'After'}</p>
              <ul className="space-y-3">
                {(fr ? [
                  'Stock à jour en temps réel',
                  'Facture PDF par WhatsApp en 1 clic',
                  'Dashboard avec revenus du jour',
                  'Acomptes suivis automatiquement',
                  'Programme fidélité qui fait revenir',
                ] : [
                  'Stock updated in real-time',
                  'PDF invoice via WhatsApp in 1 click',
                  'Dashboard with today\'s revenue',
                  'Deposits tracked automatically',
                  'Loyalty program that brings them back',
                ]).map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 5 — DISPONIBLE SUR TÉLÉPHONE (pas technique)
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-16 px-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl sm:text-6xl mb-4">📱 💻</div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            {fr ? 'Disponible sur téléphone & ordinateur' : 'Available on phone & computer'}
          </h2>
          <p className="text-blue-200 text-sm sm:text-base max-w-lg mx-auto mb-6">
            {fr
              ? 'Installez KABRAK comme une vraie application sur votre téléphone. Ouvrez-le en 1 clic, même sans internet.'
              : 'Install KABRAK like a real app on your phone. Open it in 1 click, even without internet.'}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs sm:text-sm font-medium">
            <span className="px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">Android</span>
            <span className="px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">iPhone</span>
            <span className="px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">{fr ? 'Ordinateur' : 'Computer'}</span>
            <span className="px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">{fr ? 'Tablette' : 'Tablet'}</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 6 — PRICING (mensuel + annuel, WhatsApp inclus)
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2">{fr ? 'Tarifs simples, tout inclus' : 'Simple pricing, everything included'}</h2>
            <p className="text-sm text-gray-400 mb-4">{fr ? '14 jours gratuits · Aucune carte requise · Orange Money' : '14 days free · No card required · Orange Money'}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
              <span className="text-green-600 text-xs sm:text-sm font-bold">{fr ? '💬 WhatsApp · 📊 Rapports · 📱 App mobile · 🧾 Factures PDF — TOUT INCLUS, 0 frais cachés' : '💬 WhatsApp · 📊 Reports · 📱 Mobile app · 🧾 PDF invoices — ALL INCLUDED, 0 hidden fees'}</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {(fr ? [
              { name: 'KABRAK STORE', priceMonth: '4 900', tag: 'Boutique · Vente en ligne · Commandes', users: '1 utilisateur', features: ['Ventes & commandes', 'Clients & historique', 'Acomptes & paiements', 'Factures WhatsApp incluses', 'Dashboard & stats', 'Livraison', 'App mobile installable', '💰 Dépenses & Bénéfice net', '📊 Rapports basiques', '🎨 Logo & couleur facture'], color: 'border-gray-200', btn: 'border-2 border-blue-200 text-blue-600 hover:bg-blue-50' },
              { name: 'KABRAK SHOP', priceMonth: '7 900', tag: 'Commerce général · Services · Boutique+', users: '3 utilisateurs', features: ['Tout STORE +', 'Stock avancé & POS', 'Caisse rapide & scanner', 'Employés & permissions', 'Programme fidélité', 'Export CSV', 'Rapports avancés', '🏪 Fournisseurs'], popular: true, color: 'border-blue-400 ring-2 ring-blue-200', btn: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:opacity-90 shadow-lg shadow-blue-200' },
              { name: 'KABRAK BUSINESS', priceMonth: '', tag: 'Grossistes · Multi-magasins · Équipe', users: '10+ utilisateurs', features: ['Tout SHOP +', 'Multi-magasins', 'Permissions avancées', 'Rapports détaillés', 'Backup auto', 'Support prioritaire dédié', '🌐 Vitrine publique', '✨ Rapports IA (GPT-4o)', '💬 Lien WhatsApp commande'], quote: true, color: 'border-amber-400 ring-2 ring-amber-200', btn: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-amber-200' },
            ] : [
              { name: 'KABRAK STORE', priceMonth: '4 900', tag: 'Retail · Online selling · Orders', users: '1 user', features: ['Sales & orders', 'Clients & history', 'Deposits & payments', 'WhatsApp invoices included', 'Dashboard & stats', 'Delivery', 'Installable mobile app', '💰 Expenses & Net Profit', '📊 Basic reports', '🎨 Logo & invoice color'], color: 'border-gray-200', btn: 'border-2 border-blue-200 text-blue-600 hover:bg-blue-50' },
              { name: 'KABRAK SHOP', priceMonth: '7 900', tag: 'General store · Services · Growing biz', users: '3 users', features: ['Everything in STORE +', 'Advanced stock & POS', 'Fast register & scanner', 'Employees & roles', 'Loyalty program', 'CSV Export', 'Advanced reports', '🏪 Suppliers'], popular: true, color: 'border-blue-400 ring-2 ring-blue-200', btn: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:opacity-90 shadow-lg shadow-blue-200' },
              { name: 'KABRAK BUSINESS', priceMonth: '', tag: 'Wholesale · Multi-store · Team', users: '10+ users', features: ['Everything in SHOP +', 'Multi-store', 'Advanced permissions', 'Detailed reports', 'Auto backup', 'Dedicated priority support', '🌐 Public storefront', '✨ AI Reports (GPT-4o)', '💬 WhatsApp order link'], quote: true, color: 'border-amber-400 ring-2 ring-amber-200', btn: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-amber-200' },
            ]).map(plan => (
              <div key={plan.name} className={`bg-white rounded-2xl border-2 p-5 sm:p-6 relative flex flex-col ${plan.color}`}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] sm:text-xs font-bold shadow-lg whitespace-nowrap">
                    <Star className="w-3 h-3 inline -mt-0.5 mr-1" />{fr ? 'Le plus choisi' : 'Most popular'}
                  </div>
                )}
                <span className="font-black text-gray-900 text-base sm:text-lg">{plan.name}</span>
                <p className="text-[10px] sm:text-xs text-gray-400 mb-3">{plan.tag}</p>
                {plan.quote ? (
                  <div className="mb-4">
                    <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">{fr ? 'Sur devis' : 'Custom quote'}</span>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{fr ? 'Tarif adapté à vos besoins' : 'Pricing adapted to your needs'}</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="text-2xl sm:text-3xl font-black text-gray-900">{plan.priceMonth}</span>
                    <span className="text-gray-400 text-xs sm:text-sm"> FCFA/{fr ? 'mois' : 'month'}</span>
                  </div>
                )}
                <p className="text-xs font-semibold text-blue-600 mb-4">{plan.users}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.quote ? (
                  <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20plan%20BUSINESS" target="_blank" rel="noreferrer"
                    className={`block text-center py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${plan.btn}`}>
                    {fr ? 'Contactez-nous' : 'Contact us'}
                  </a>
                ) : (
                  <Link to="/register" className={`block text-center py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${plan.btn}`}>
                    {fr ? 'Essai gratuit 14 jours' : '14-day free trial'}
                  </Link>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">{fr ? 'Pas de frais cachés. Pas de supplément WhatsApp. Pas de supplément pour les rapports. Tout est inclus.' : 'No hidden fees. No WhatsApp add-on. No reports add-on. Everything is included.'}</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 7 — POURQUOI KABRAK ? (confiance)
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-10">
            {fr ? 'Pourquoi choisir KABRAK ?' : 'Why choose KABRAK?'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {(fr ? [
              { emoji: '💬', title: 'Accompagnement WhatsApp', desc: 'On vous aide à démarrer' },
              { emoji: '⚡', title: 'Installation facile', desc: 'Prêt en 2 minutes' },
              { emoji: '🟠', title: 'Paiement Orange Money', desc: 'Pas de carte bancaire' },
              { emoji: '🌍', title: 'Support local & international', desc: 'Cameroun et diaspora' },
              { emoji: '🇫🇷', title: 'Français & anglais', desc: 'Changez en 1 clic' },
              { emoji: '🔒', title: 'Données sécurisées', desc: 'Serveurs cryptés SSL' },
            ] : [
              { emoji: '💬', title: 'WhatsApp support', desc: 'We help you get started' },
              { emoji: '⚡', title: 'Easy setup', desc: 'Ready in 2 minutes' },
              { emoji: '🟠', title: 'Orange Money payment', desc: 'No credit card needed' },
              { emoji: '🌍', title: 'Local & international', desc: 'Cameroon and diaspora' },
              { emoji: '🇫🇷', title: 'French & English', desc: 'Switch in 1 click' },
              { emoji: '🔒', title: 'Secure data', desc: 'SSL encrypted servers' },
            ]).map(t => (
              <div key={t.title} className="text-center p-4 sm:p-5 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-all">
                <span className="text-2xl sm:text-3xl block mb-2">{t.emoji}</span>
                <p className="font-bold text-gray-900 text-xs sm:text-sm">{t.title}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 8 — TÉMOIGNAGES
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-16 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-8 sm:mb-10">
            {fr ? 'Ils gèrent mieux avec KABRAK' : 'They manage better with KABRAK'}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {(fr ? [
              { name: 'Fatima A.', biz: 'Boutique Mode, Douala', text: 'Mes clientes reçoivent leurs factures par WhatsApp maintenant. Plus de papier, plus d\'oublis.', avatar: '👩🏽' },
              { name: 'Kevin M.', biz: 'Agence Marketing, Yaoundé', text: 'La facturation récurrente me fait gagner des heures chaque mois. Exactement ce qu\'il me fallait.', avatar: '👨🏾' },
              { name: 'Paul N.', biz: 'Mini-Market, Bafoussam', text: 'Les alertes stock faible ont tout changé. Je ne suis plus jamais en rupture.', avatar: '👨🏿' },
            ] : [
              { name: 'Fatima A.', biz: 'Fashion Store, Douala', text: 'My clients receive their invoices via WhatsApp now. No more paper, no more forgetting.', avatar: '👩🏽' },
              { name: 'Kevin M.', biz: 'Marketing Agency, Yaoundé', text: 'Recurring billing saves me hours every month. Exactly what I needed.', avatar: '👨🏾' },
              { name: 'Paul N.', biz: 'Mini-Market, Bafoussam', text: 'Low stock alerts changed everything. I\'m never out of stock anymore.', avatar: '👨🏿' },
            ]).map(t => (
              <div key={t.name} className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{t.avatar}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-[10px] sm:text-xs text-blue-600">{t.biz}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">"{t.text}"</p>
                <div className="flex gap-0.5 mt-3">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 9 — FAQ
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-5 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-8">{fr ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>
          <div className="space-y-3">
            {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 10 — FINAL CTA
          ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-5 bg-gradient-to-br from-blue-600 to-blue-800 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">
            {fr ? 'Votre business mérite mieux qu\'un cahier.' : 'Your business deserves better than a notebook.'}
          </h2>
          <p className="text-blue-200 text-sm sm:text-base mb-8">
            {fr ? 'Rejoignez les entrepreneurs qui gèrent mieux avec KABRAK.' : 'Join the entrepreneurs who manage better with KABRAK.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 shadow-2xl transition-all">
              {fr ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20veux%20voir%20une%20d%C3%A9mo%20de%20KABRAK%20Store"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-bold text-base hover:bg-white/10 transition-all">
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 px-5 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8">
          <div>
            <div className="mb-3">
              <img src="/logo.png" alt="KABRAK Store" className="h-12 object-contain brightness-0 invert" />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">{fr ? 'Le logiciel de gestion qui s\'adapte à votre business.' : 'The management software that adapts to your business.'}</p>
            <p className="text-gray-500 text-[10px] mt-2 font-medium">KABRAK ENG</p>
          </div>
          <div>
            <p className="font-bold text-sm mb-3 text-gray-200">{fr ? 'Liens' : 'Links'}</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link to="/register" className="hover:text-white transition-colors">{fr ? 'Essai gratuit' : 'Free trial'}</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">{fr ? 'Connexion' : 'Login'}</Link></li>
              <li><a href="https://wa.me/237653561862" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{fr ? 'Démo WhatsApp' : 'WhatsApp demo'}</a></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-sm mb-3 text-gray-200">Contact</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>{fr ? 'Cameroun' : 'Cameroon'}</li>
              <li>+237 653 561 862</li>
              <li>kabrak-store.kabrakeng.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          &copy; 2026 KABRAK ENG &middot; {fr ? 'Tous droits réservés' : 'All rights reserved'}
        </div>
      </footer>

      {/* ─── WHATSAPP FLOATING ─── */}
      <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20veux%20en%20savoir%20plus%20sur%20KABRAK%20Store"
        target="_blank" rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-300 hover:scale-110 transition-transform">
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.657 0-3.216-.5-4.512-1.357l-.324-.193-2.868.852.852-2.868-.193-.324A7.963 7.963 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
        </svg>
      </a>
    </div>
  );
}
