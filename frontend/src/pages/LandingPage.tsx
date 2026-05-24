import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ShoppingBag, BarChart3, CheckCircle, ArrowRight, X, Receipt,
  ChevronDown, ChevronUp, Globe, Shield, Smartphone, Store, Star, Zap,
  CreditCard, Bell, Barcode, Heart, Download, Building2, Phone
} from 'lucide-react';

const problemsFR = [
  { before: 'Tu gères ton stock dans ta tête ou sur un cahier qui se perd', after: 'Stock en temps réel avec alertes automatiques — zéro rupture, zéro surprise' },
  { before: 'Tu ne sais pas combien tu as réellement gagné à la fin du mois', after: 'Dashboard avec ventes, bénéfices, top produits — tout est clair en 1 clic' },
  { before: 'Les factures se font à la main et tu oublies les détails', after: 'Factures PDF professionnelles générées en 1 seconde, envoyées par WhatsApp' },
  { before: 'Tu ne sais pas qui sont tes meilleurs clients', after: 'Programme fidélité intégré — points, récompenses, historique complet par client' },
  { before: 'Impossible de suivre les ventes de chaque employé', after: 'Chaque employé a son compte — tu vois qui vend quoi et combien' },
  { before: 'Tu perds du temps à compter les produits manuellement', after: 'Scanner code-barres + gestion de stock intelligente par taille/couleur/pointure' },
];
const problemsEN = [
  { before: 'You manage stock in your head or on a notebook that gets lost', after: 'Real-time stock with automatic alerts — zero shortages, zero surprises' },
  { before: 'You don\'t know how much you really earned at month end', after: 'Dashboard with sales, profits, top products — everything clear in 1 click' },
  { before: 'Invoices are done by hand and you forget details', after: 'Professional PDF invoices generated in 1 second, sent via WhatsApp' },
  { before: 'You don\'t know who your best customers are', after: 'Built-in loyalty program — points, rewards, complete history per client' },
  { before: 'Impossible to track each employee\'s sales', after: 'Each employee has their account — you see who sells what and how much' },
  { before: 'You waste time counting products manually', after: 'Barcode scanner + smart stock management by size/color/shoe size' },
];

const featuresFR = [
  { icon: ShoppingBag, title: 'Gestion de Stock Intelligente', desc: 'Stock adaptatif par taille, couleur, pointure. Alertes automatiques quand le stock est faible.' },
  { icon: Receipt, title: 'Factures PDF & WhatsApp', desc: 'Factures A4 et reçus thermiques 80mm générés en 1 clic, envoyables par WhatsApp.' },
  { icon: CreditCard, title: 'Paiement Orange Money', desc: 'Acceptez les paiements Orange Money directement depuis l\'application.' },
  { icon: Bell, title: 'Notifications Temps Réel', desc: 'Alertes stock faible, nouvelles commandes, paiements — ne ratez plus rien.' },
  { icon: Barcode, title: 'Scanner Code-Barres', desc: 'Scannez vos produits pour les retrouver instantanément. (Shop & Business)' },
  { icon: Heart, title: 'Programme Fidélité', desc: 'Points par achat, tiers Bronze/Silver/Gold/Platinum, récompenses automatiques.' },
  { icon: Download, title: 'Export CSV & Backup', desc: 'Exportez vos données en CSV/Excel. Backup JSON automatique de toutes vos données.' },
  { icon: Building2, title: 'Multi-Magasins', desc: 'Gérez plusieurs points de vente depuis un seul compte. (Business)' },
];
const featuresEN = [
  { icon: ShoppingBag, title: 'Smart Stock Management', desc: 'Adaptive stock by size, color, shoe size. Automatic alerts when stock is low.' },
  { icon: Receipt, title: 'PDF Invoices & WhatsApp', desc: 'A4 invoices and 80mm thermal receipts generated in 1 click, sendable via WhatsApp.' },
  { icon: CreditCard, title: 'Orange Money Payment', desc: 'Accept Orange Money payments directly from the application.' },
  { icon: Bell, title: 'Real-Time Notifications', desc: 'Low stock alerts, new orders, payments — never miss anything.' },
  { icon: Barcode, title: 'Barcode Scanner', desc: 'Scan your products to find them instantly. (Shop & Business)' },
  { icon: Heart, title: 'Loyalty Program', desc: 'Points per purchase, Bronze/Silver/Gold/Platinum tiers, automatic rewards.' },
  { icon: Download, title: 'CSV Export & Backup', desc: 'Export your data to CSV/Excel. Automatic JSON backup of all your data.' },
  { icon: Building2, title: 'Multi-Store', desc: 'Manage multiple points of sale from a single account. (Business)' },
];

const targetsFR = [
  { emoji: '👗', title: 'Vêtements & Mode', tags: ['Robes', 'Pantalons', 'Jupes', 'T-shirts', 'Hijabs', 'Abayas', 'Accessoires'] },
  { emoji: '👟', title: 'Chaussures', tags: ['Sneakers', 'Talons', 'Sandales', 'Pointures', 'Stock par taille'] },
  { emoji: '✨', title: 'Cosmétiques & Parfums', tags: ['Parfums', 'Maquillage', 'Soins', 'Crèmes', 'Sérums'] },
  { emoji: '🎂', title: 'Gâteaux & Food', tags: ['Gâteaux sur commande', 'Food delivery', 'Acomptes', 'Suivi livraison'] },
  { emoji: '💎', title: 'Bijoux & Sacs', tags: ['Bijoux', 'Sacs', 'Montres', 'Accessoires premium'] },
  { emoji: '🏪', title: 'Boutique Mixte', tags: ['Multi-catégories', 'Grand stock', 'Multi-employés', 'POS'] },
];
const targetsEN = [
  { emoji: '👗', title: 'Clothing & Fashion', tags: ['Dresses', 'Pants', 'Skirts', 'T-shirts', 'Hijabs', 'Abayas', 'Accessories'] },
  { emoji: '👟', title: 'Shoes', tags: ['Sneakers', 'Heels', 'Sandals', 'Shoe sizes', 'Stock by size'] },
  { emoji: '✨', title: 'Cosmetics & Perfumes', tags: ['Perfumes', 'Makeup', 'Skincare', 'Creams', 'Serums'] },
  { emoji: '🎂', title: 'Cakes & Food', tags: ['Custom cakes', 'Food delivery', 'Deposits', 'Delivery tracking'] },
  { emoji: '💎', title: 'Jewelry & Bags', tags: ['Jewelry', 'Bags', 'Watches', 'Premium accessories'] },
  { emoji: '🏪', title: 'General Store', tags: ['Multi-category', 'Large stock', 'Multi-employees', 'POS'] },
];

const plansFR = [
  {
    name: 'KABRAK STORE',
    price: '4 900',
    tag: 'Vendeurs en ligne · Business maison',
    users: '1 utilisateur',
    color: 'border-gray-200',
    btnClass: 'border-2 border-blue-200 text-blue-600 hover:bg-blue-50',
    included: [
      'Commandes & ventes',
      'Gestion clients',
      'Acomptes & suivi paiements',
      'Factures PDF & WhatsApp',
      'Suivi livraison',
      'Dashboard simple',
      'Statistiques de base',
      'Paiement Orange Money',
    ],
    excluded: [
      'Gestion de stock avancée',
      'Caisse POS',
      'Employés',
      'Scanner code-barres',
      'Multi-magasins',
    ],
  },
  {
    name: 'KABRAK SHOP',
    price: '7 900',
    tag: 'Boutique physique en croissance',
    users: '3 utilisateurs',
    color: 'border-blue-400 ring-2 ring-blue-200',
    popular: true,
    btnClass: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:opacity-90 shadow-lg shadow-blue-200',
    included: [
      'Tout KABRAK STORE +',
      'Gestion de stock avancée',
      'Caisse POS rapide',
      'Scanner code-barres',
      'Employés (accès limités)',
      'Clients fidélité',
      'Dashboard avancé',
      'Export CSV/Excel',
    ],
    excluded: [
      'Multi-magasins',
      'Permissions avancées',
      'Rapports détaillés',
    ],
  },
  {
    name: 'KABRAK BUSINESS',
    price: '12 900',
    tag: 'Grand magasin · Multi-sites',
    users: '10 utilisateurs',
    color: 'border-amber-400 ring-2 ring-amber-200',
    btnClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-amber-200',
    included: [
      'Tout KABRAK SHOP +',
      'Multi-employés avec permissions',
      'Multi-magasins',
      'Statistiques avancées',
      'Bénéfices réels & rapports',
      'Meilleur vendeur / top catégories',
      'Backup automatique JSON',
      'Support prioritaire WhatsApp',
    ],
    multiBranch: true,
  },
];
const plansEN = [
  {
    name: 'KABRAK STORE',
    price: '4 900',
    tag: 'Online sellers · Home business',
    users: '1 user',
    color: 'border-gray-200',
    btnClass: 'border-2 border-blue-200 text-blue-600 hover:bg-blue-50',
    included: [
      'Orders & sales',
      'Client management',
      'Deposits & payment tracking',
      'PDF invoices & WhatsApp',
      'Delivery tracking',
      'Simple dashboard',
      'Basic statistics',
      'Orange Money payment',
    ],
    excluded: [
      'Advanced stock management',
      'POS cash register',
      'Employees',
      'Barcode scanner',
      'Multi-store',
    ],
  },
  {
    name: 'KABRAK SHOP',
    price: '7 900',
    tag: 'Growing physical store',
    users: '3 users',
    color: 'border-blue-400 ring-2 ring-blue-200',
    popular: true,
    btnClass: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:opacity-90 shadow-lg shadow-blue-200',
    included: [
      'Everything in STORE +',
      'Advanced stock management',
      'Fast POS cash register',
      'Barcode scanner',
      'Employees (limited access)',
      'Client loyalty',
      'Advanced dashboard',
      'CSV/Excel export',
    ],
    excluded: [
      'Multi-store',
      'Advanced permissions',
      'Detailed reports',
    ],
  },
  {
    name: 'KABRAK BUSINESS',
    price: '12 900',
    tag: 'Large store · Multi-sites',
    users: '10 users',
    color: 'border-amber-400 ring-2 ring-amber-200',
    btnClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-amber-200',
    included: [
      'Everything in SHOP +',
      'Multi-employees with permissions',
      'Multi-store management',
      'Advanced statistics',
      'Real profits & reports',
      'Best seller / top categories',
      'Automatic JSON backup',
      'Priority WhatsApp support',
    ],
    multiBranch: true,
  },
];

const compareFR = [
  { fn: 'Commandes & Ventes', store: true, shop: true, business: true },
  { fn: 'Clients & Historique', store: true, shop: true, business: true },
  { fn: 'Factures PDF & WhatsApp', store: true, shop: true, business: true },
  { fn: 'Paiement Orange Money', store: true, shop: true, business: true },
  { fn: 'Suivi Livraison', store: true, shop: true, business: true },
  { fn: 'Dashboard & Stats', store: true, shop: true, business: true },
  { fn: 'Notifications', store: true, shop: true, business: true },
  { fn: 'Programme Fidélité', store: true, shop: true, business: true },
  { fn: 'Gestion Stock Avancée', store: false, shop: true, business: true },
  { fn: 'Caisse POS', store: false, shop: true, business: true },
  { fn: 'Scanner Code-Barres', store: false, shop: true, business: true },
  { fn: 'Export CSV/Excel', store: false, shop: true, business: true },
  { fn: 'Employés', store: false, shop: true, business: true },
  { fn: 'Multi-Magasins', store: false, shop: false, business: true },
  { fn: 'Permissions Avancées', store: false, shop: false, business: true },
  { fn: 'Rapports Détaillés', store: false, shop: false, business: true },
  { fn: 'Backup JSON Auto', store: false, shop: false, business: true },
];
const compareEN = [
  { fn: 'Orders & Sales', store: true, shop: true, business: true },
  { fn: 'Clients & History', store: true, shop: true, business: true },
  { fn: 'PDF Invoices & WhatsApp', store: true, shop: true, business: true },
  { fn: 'Orange Money Payment', store: true, shop: true, business: true },
  { fn: 'Delivery Tracking', store: true, shop: true, business: true },
  { fn: 'Dashboard & Stats', store: true, shop: true, business: true },
  { fn: 'Notifications', store: true, shop: true, business: true },
  { fn: 'Loyalty Program', store: true, shop: true, business: true },
  { fn: 'Advanced Stock', store: false, shop: true, business: true },
  { fn: 'POS Cash Register', store: false, shop: true, business: true },
  { fn: 'Barcode Scanner', store: false, shop: true, business: true },
  { fn: 'CSV/Excel Export', store: false, shop: true, business: true },
  { fn: 'Employees', store: false, shop: true, business: true },
  { fn: 'Multi-Store', store: false, shop: false, business: true },
  { fn: 'Advanced Permissions', store: false, shop: false, business: true },
  { fn: 'Detailed Reports', store: false, shop: false, business: true },
  { fn: 'Auto JSON Backup', store: false, shop: false, business: true },
];

const faqsFR = [
  { q: 'C\'est pour quel type de business ?', a: 'KABRAK Store s\'adapte automatiquement : vêtements, chaussures, parfums, cosmétiques, gâteaux, food delivery, bijoux, sacs — vous cochez vos catégories et les champs produits s\'adaptent.' },
  { q: 'Puis-je utiliser sur téléphone ?', a: 'Oui ! KABRAK Store est une PWA optimisée mobile. Installez-la sur votre écran d\'accueil comme une vraie application.' },
  { q: 'Comment se passe le paiement ?', a: 'Paiement simple par Orange Money. Activation en quelques minutes après confirmation.' },
  { q: 'Puis-je gérer plusieurs employés ?', a: 'Oui. STORE : 1 utilisateur · SHOP : 3 · BUSINESS : 10. Chaque employé a son accès avec permissions.' },
  { q: 'Et si j\'ai plusieurs boutiques ?', a: 'Le plan BUSINESS permet de gérer plusieurs magasins depuis un seul compte.' },
  { q: 'Les factures sont envoyées comment ?', a: 'En 1 clic : générez une facture PDF (A4 ou ticket thermique 80mm) et envoyez-la directement par WhatsApp au client.' },
  { q: 'Mes données sont-elles en sécurité ?', a: 'Oui, vos données sont cryptées et sauvegardées sur des serveurs sécurisés. Vous pouvez aussi faire des backups JSON.' },
];
const faqsEN = [
  { q: 'What type of business is this for?', a: 'KABRAK Store adapts automatically: clothing, shoes, perfumes, cosmetics, cakes, food delivery, jewelry, bags — you check your categories and product fields adapt.' },
  { q: 'Can I use it on my phone?', a: 'Yes! KABRAK Store is a mobile-optimized PWA. Install it on your home screen like a real app.' },
  { q: 'How does payment work?', a: 'Simple payment via Orange Money. Activation in a few minutes after confirmation.' },
  { q: 'Can I manage multiple employees?', a: 'Yes. STORE: 1 user · SHOP: 3 · BUSINESS: 10. Each employee has their access with permissions.' },
  { q: 'What if I have multiple stores?', a: 'The BUSINESS plan allows managing multiple stores from a single account.' },
  { q: 'How are invoices sent?', a: 'In 1 click: generate a PDF invoice (A4 or 80mm thermal receipt) and send it directly via WhatsApp to the client.' },
  { q: 'Is my data safe?', a: 'Yes, your data is encrypted and backed up on secure servers. You can also make JSON backups.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
        <span className="font-semibold text-gray-800 text-sm sm:text-base">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">{a}</div>}
    </div>
  );
}

export function LandingPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const problems = lang === 'fr' ? problemsFR : problemsEN;
  const features = lang === 'fr' ? featuresFR : featuresEN;
  const plans = lang === 'fr' ? plansFR : plansEN;
  const compare = lang === 'fr' ? compareFR : compareEN;
  const faqs = lang === 'fr' ? faqsFR : faqsEN;
  const targets = lang === 'fr' ? targetsFR : targetsEN;

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <span className="font-black text-gray-900 text-sm sm:text-lg">KABRAK</span>
              <span className="text-blue-600 font-bold text-sm sm:text-base"> Store</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-all">
              <Globe className="w-3.5 h-3.5" /> {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">{lang === 'fr' ? 'Connexion' : 'Login'}</Link>
            <Link to="/register" className="px-3 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs sm:text-sm font-bold hover:opacity-90 shadow-lg shadow-blue-200 transition-all">
              {lang === 'fr' ? 'Essai gratuit' : 'Free trial'}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-5 text-center bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-8">
            <Zap className="w-3.5 h-3.5" /> {lang === 'fr' ? 'Nouveau : Scanner code-barres + Programme fidélité intégré' : 'New: Barcode scanner + Built-in loyalty program'}
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 leading-tight mb-6">
            {lang === 'fr' ? 'Gérez votre business' : 'Manage your business'}<br />
            <span className="bg-gradient-to-r from-blue-600 to-amber-500 bg-clip-text text-transparent">
              {lang === 'fr' ? 'comme un pro.' : 'like a pro.'}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 mb-3 max-w-2xl mx-auto leading-relaxed">
            {lang === 'fr' ? 'Stock, ventes, factures, clients, fidélité, employés — ' : 'Stock, sales, invoices, clients, loyalty, employees — '}
            <span className="font-semibold text-gray-800">{lang === 'fr' ? 'tout centralisé dans un seul logiciel.' : 'everything centralized in one software.'}</span>
          </p>
          <p className="text-sm text-gray-400 mb-10">{lang === 'fr' ? 'Conçu pour les commerçants au Cameroun et en Afrique. S\'adapte à VOTRE type de business.' : 'Designed for merchants in Cameroon and Africa. Adapts to YOUR type of business.'}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base hover:opacity-90 shadow-2xl shadow-blue-300 transition-all">
              {lang === 'fr' ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20veux%20en%20savoir%20plus%20sur%20KABRAK%20Store"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-green-200 text-green-700 font-bold text-base hover:bg-green-50 transition-all">
              <Phone className="w-5 h-5" /> WhatsApp
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-5">
            {lang === 'fr'
              ? '14 jours d\'essai gratuit  ·  Activation rapide  ·  Paiement Orange Money'
              : '14-day free trial  ·  Fast activation  ·  Orange Money payment'
            }
          </p>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="py-8 px-5 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-white">
          <div>
            <p className="text-2xl sm:text-3xl font-black">3</p>
            <p className="text-xs text-blue-200">{lang === 'fr' ? 'Plans adaptés' : 'Adapted plans'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black">11+</p>
            <p className="text-xs text-blue-200">{lang === 'fr' ? 'Catégories business' : 'Business categories'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black">FR/EN</p>
            <p className="text-xs text-blue-200">{lang === 'fr' ? 'Bilingue' : 'Bilingual'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black">24/7</p>
            <p className="text-xs text-blue-200">{lang === 'fr' ? 'Accessible partout' : 'Accessible anywhere'}</p>
          </div>
        </div>
      </section>

      {/* POUR QUI */}
      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-3">{lang === 'fr' ? 'S\'adapte à VOTRE business' : 'Adapts to YOUR business'}</h2>
          <p className="text-center text-gray-400 mb-10 text-sm">{lang === 'fr' ? 'Cochez vos catégories — les champs produits s\'adaptent automatiquement.' : 'Check your categories — product fields adapt automatically.'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {targets.map(t => (
              <div key={t.title} className="p-6 rounded-2xl bg-white border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="text-3xl mb-3">{t.emoji}</div>
                <h3 className="font-black text-gray-900 text-lg mb-3">{t.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {t.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEMES → SOLUTIONS */}
      <section className="py-16 px-5 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-3">{lang === 'fr' ? 'Tu te reconnais là-dedans ?' : 'Do you recognize yourself here?'}</h2>
          <p className="text-center text-gray-400 mb-10 text-sm">{lang === 'fr' ? 'Ce que vivent 90% des commerçants chaque jour.' : 'What 90% of merchants experience every day.'}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-red-50 border border-red-100">
              <p className="font-bold text-red-700 mb-4 text-sm uppercase tracking-wide">{lang === 'fr' ? 'Sans KABRAK' : 'Without KABRAK'}</p>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.before} className="flex items-start gap-2 text-sm text-red-600">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" /> {p.before}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-green-50 border border-green-100">
              <p className="font-bold text-green-700 mb-4 text-sm uppercase tracking-wide">{lang === 'fr' ? 'Avec KABRAK' : 'With KABRAK'}</p>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.after} className="flex items-start gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {p.after}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-3">{lang === 'fr' ? 'Tout est inclus' : 'Everything included'}</h2>
          <p className="text-center text-gray-400 mb-10 text-sm">{lang === 'fr' ? 'Un seul logiciel. Zéro papier. Zéro stress.' : 'One software. Zero paper. Zero stress.'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-2">{lang === 'fr' ? 'Tarifs simples' : 'Simple pricing'}</h2>
          <p className="text-center text-gray-400 mb-2 text-sm">{lang === 'fr' ? 'Essai gratuit 14 jours — aucune carte requise' : '14-day free trial — no card required'}</p>
          <p className="text-center text-xs text-gray-300 mb-10">{lang === 'fr' ? 'Paiement mensuel par Orange Money' : 'Monthly payment via Orange Money'}</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.name} className={`bg-white rounded-2xl border-2 p-6 relative flex flex-col ${plan.color}`}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold shadow-lg whitespace-nowrap">
                    <Star className="w-3 h-3 inline -mt-0.5 mr-1" />{lang === 'fr' ? 'Le plus choisi' : 'Most popular'}
                  </div>
                )}
                <div className="mb-1">
                  <span className="font-black text-gray-900 text-lg">{plan.name}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{plan.tag}</p>
                <div className="mb-1">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm"> FCFA/{lang === 'fr' ? 'mois' : 'month'}</span>
                </div>
                <p className="text-xs font-semibold text-blue-600 mb-5">{plan.users}</p>
                <ul className="space-y-2 mb-4 flex-1">
                  {plan.included.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.excluded && (
                  <ul className="space-y-1.5 mb-4 pt-3 border-t border-gray-100">
                    {plan.excluded.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                        <X className="w-3.5 h-3.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                {plan.multiBranch && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-xs font-bold text-amber-700">{lang === 'fr' ? 'Multi-magasins' : 'Multi-store'}</p>
                    <p className="text-xs text-amber-500 mt-1">+5 000 FCFA/{lang === 'fr' ? 'magasin' : 'store'}</p>
                  </div>
                )}
                <Link to="/register" className={`block text-center py-3 rounded-xl text-sm font-bold transition-all ${plan.btnClass}`}>
                  {lang === 'fr' ? 'Commencer l\'essai gratuit' : 'Start free trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TABLEAU COMPARATIF */}
      <section className="py-12 px-5 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-xl sm:text-2xl font-black text-gray-900 mb-8">{lang === 'fr' ? 'Comparatif des plans' : 'Plan comparison'}</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-4 text-gray-500 font-semibold">{lang === 'fr' ? 'Fonctionnalité' : 'Feature'}</th>
                  <th className="px-4 py-4 text-center text-gray-700 font-bold">Store</th>
                  <th className="px-4 py-4 text-center text-blue-600 font-bold">Shop</th>
                  <th className="px-4 py-4 text-center text-amber-600 font-bold">Business</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((row, i) => (
                  <tr key={row.fn} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                    <td className="px-5 py-3 text-gray-600 text-xs sm:text-sm">{row.fn}</td>
                    <td className="px-4 py-3 text-center">{row.store ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-200 mx-auto" />}</td>
                    <td className="px-4 py-3 text-center">{row.shop ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-200 mx-auto" />}</td>
                    <td className="px-4 py-3 text-center">{row.business ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-200 mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PWA INSTALLATION */}
      <section className="py-16 px-5 bg-gradient-to-br from-blue-50/30 to-amber-50/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100/50 px-3 py-1 rounded-full">
              <Smartphone className="w-3 h-3 inline -mt-0.5 mr-1" />{lang === 'fr' ? 'Application Mobile' : 'Mobile App'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-3">{lang === 'fr' ? 'Installez l\'app sur votre Téléphone' : 'Install the App on Your Phone'}</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">{lang === 'fr' ? 'Accédez à votre boutique en 1 clic — sans passer par l\'App Store ou Google Play.' : 'Access your store in 1 tap — without going through App Store or Google Play.'}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <span className="font-bold text-green-800 text-sm">Android (Chrome)</span>
              </div>
              <ol className="space-y-3">
                {[
                  lang === 'fr' ? 'Ouvrez Chrome et allez sur kabrakstore.kabrakeng.com' : 'Open Chrome and go to kabrakstore.kabrakeng.com',
                  lang === 'fr' ? 'Appuyez sur les 3 points ⋮ en haut à droite' : 'Tap the 3 dots ⋮ in the top right',
                  lang === 'fr' ? '"Ajouter à l\'écran d\'accueil"' : '"Add to Home screen"',
                  lang === 'fr' ? 'Confirmez — l\'app apparaît !' : 'Confirm — the app appears!',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 flex items-center justify-center flex-shrink-0 font-bold text-[10px] mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🍎</span>
                <span className="font-bold text-blue-800 text-sm">iPhone / iPad (Safari)</span>
              </div>
              <ol className="space-y-3">
                {[
                  lang === 'fr' ? 'Ouvrez Safari → kabrakstore.kabrakeng.com' : 'Open Safari → kabrakstore.kabrakeng.com',
                  lang === 'fr' ? 'Appuyez sur l\'icône de partage en bas' : 'Tap the share icon at the bottom',
                  lang === 'fr' ? '"Sur l\'écran d\'accueil"' : '"Add to Home Screen"',
                  lang === 'fr' ? 'Appuyez "Ajouter" en haut à droite' : 'Tap "Add" in the top right',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0 font-bold text-[10px] mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💻</span>
                <span className="font-bold text-gray-800 text-sm">{lang === 'fr' ? 'Ordinateur (Chrome)' : 'Computer (Chrome)'}</span>
              </div>
              <ol className="space-y-3">
                {[
                  lang === 'fr' ? 'Allez sur kabrakstore.kabrakeng.com' : 'Go to kabrakstore.kabrakeng.com',
                  lang === 'fr' ? 'Cliquez l\'icône d\'installation dans la barre d\'adresse' : 'Click the install icon in the address bar',
                  lang === 'fr' ? 'Cliquez "Installer"' : 'Click "Install"',
                  lang === 'fr' ? 'L\'app s\'ouvre comme un logiciel !' : 'The app opens as standalone software!',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center flex-shrink-0 font-bold text-[10px] mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="py-12 px-5 bg-white">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-blue-50/50">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 text-sm mb-1">{lang === 'fr' ? 'Données Sécurisées' : 'Secure Data'}</h3>
            <p className="text-xs text-gray-400">{lang === 'fr' ? 'Cryptage SSL, serveurs sécurisés, backup automatique' : 'SSL encryption, secure servers, automatic backup'}</p>
          </div>
          <div className="p-6 rounded-2xl bg-green-50/50">
            <Smartphone className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 text-sm mb-1">{lang === 'fr' ? 'Mobile & Desktop' : 'Mobile & Desktop'}</h3>
            <p className="text-xs text-gray-400">{lang === 'fr' ? 'Fonctionne sur téléphone, tablette et ordinateur' : 'Works on phone, tablet and computer'}</p>
          </div>
          <div className="p-6 rounded-2xl bg-amber-50/50">
            <BarChart3 className="w-8 h-8 text-amber-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 text-sm mb-1">{lang === 'fr' ? 'Rapports Intelligents' : 'Smart Reports'}</h3>
            <p className="text-xs text-gray-400">{lang === 'fr' ? 'Ventes, bénéfices, top produits — en temps réel' : 'Sales, profits, top products — in real time'}</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-10">{lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>
          <div className="space-y-3">
            {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 px-5 text-center bg-gradient-to-br from-blue-50 to-amber-50">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mb-4">{lang === 'fr' ? 'Prêt à digitaliser votre business ?' : 'Ready to digitize your business?'}</h2>
          <p className="text-gray-500 mb-8">{lang === 'fr' ? '14 jours gratuits · Stock, ventes, factures, fidélité — tout inclus · Paiement Orange Money' : '14 days free · Stock, sales, invoices, loyalty — everything included · Orange Money payment'}</p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base hover:opacity-90 shadow-2xl shadow-blue-300 transition-all">
            {lang === 'fr' ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-5 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-black text-white text-sm">KABRAK</span>
                <span className="text-blue-400 font-bold text-xs"> Store</span>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">{lang === 'fr' ? 'Logiciel de gestion commerciale pour commerçants en Afrique.' : 'Business management software for merchants in Africa.'}</p>
          </div>
          <div>
            <p className="font-bold text-sm mb-3 text-gray-200">{lang === 'fr' ? 'Liens' : 'Links'}</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link to="/register" className="hover:text-white transition-colors">{lang === 'fr' ? 'Essai gratuit' : 'Free trial'}</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">{lang === 'fr' ? 'Connexion' : 'Login'}</Link></li>
              <li><a href="https://wa.me/237653561862" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{lang === 'fr' ? 'Démo WhatsApp' : 'WhatsApp demo'}</a></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-sm mb-3 text-gray-200">Contact</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>{lang === 'fr' ? 'Cameroun' : 'Cameroon'}</li>
              <li>+237 653 561 862</li>
              <li>kabrakstore.kabrakeng.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          &copy; 2026 KABRAK ENG &middot; {lang === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}
        </div>
      </footer>

      {/* WhatsApp flottant */}
      <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20veux%20en%20savoir%20plus%20sur%20KABRAK%20Store"
        target="_blank" rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-300 hover:scale-110 transition-transform">
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.575-1.472A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.327 0-4.47-.788-6.18-2.111l-.144-.113-2.98.96.978-2.917-.125-.149A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
        </svg>
      </a>
    </div>
  );
}
