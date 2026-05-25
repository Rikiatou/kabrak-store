import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ShoppingBag, BarChart3, CheckCircle, ArrowRight, X, Receipt,
  ChevronDown, ChevronUp, Globe, Shield, Smartphone, Store, Star, Zap,
  CreditCard, Bell, Barcode, Heart, Download, Building2, Phone,
  Users, Clock, Briefcase, Package, Layers, TrendingUp, FileText
} from 'lucide-react';

// ── Business examples (12 types from real entrepreneurs) ──
const businessesFR = [
  { emoji: '👠', title: 'Boutique Mode', example: 'Fatima Fashion Store', desc: 'Chaussures, sacs, parfums, bijoux. Stock par taille et pointure.', mode: 'product' },
  { emoji: '🎂', title: 'Gâteaux & Pâtisserie', example: 'Aïcha Cakes', desc: 'Commandes, acomptes, livraison. Suivi de chaque gâteau.', mode: 'product' },
  { emoji: '🍲', title: 'Food & Livraison', example: 'Mama Kitchen', desc: 'Commandes du jour, livreurs, revenus. Tout en temps réel.', mode: 'product' },
  { emoji: '📱', title: 'Vente WhatsApp/TikTok', example: 'Zara Online Shop', desc: 'Commandes en ligne, paiements, livraisons. Sans boutique physique.', mode: 'product' },
  { emoji: '🏪', title: 'Mini-Market', example: 'Chez Paul Market', desc: 'Scanner barcode, alertes stock faible, ventes du jour.', mode: 'product' },
  { emoji: '📦', title: 'Grossiste', example: 'Cosmetic Distribution', desc: 'Multi-magasins, profit réel, stock en gros.', mode: 'product' },
  { emoji: '📊', title: 'Marketing Digital', example: 'Kevin Marketing', desc: '30 clients, projets actifs, facturation récurrente.', mode: 'service' },
  { emoji: '🎨', title: 'Graphiste / Designer', example: 'DesignPro Studio', desc: 'Logos, flyers, branding. Acomptes et milestones.', mode: 'service' },
  { emoji: '💻', title: 'Agence Web', example: 'TechLab Agency', desc: 'Sites web, apps, deadlines. Gestion d\'équipe.', mode: 'service' },
  { emoji: '📋', title: 'Consultant', example: 'Consultant RH', desc: 'Missions, factures, clients. Suivi des paiements.', mode: 'service' },
  { emoji: '🖨️', title: 'Imprimerie', example: 'Print House', desc: 'Commandes flyers, roll-up, acomptes, factures.', mode: 'product' },
  { emoji: '✂️', title: 'Couturière', example: 'Amina Couture', desc: 'Commandes sur-mesure, mesures, date retrait, acomptes.', mode: 'product' },
];
const businessesEN = [
  { emoji: '👠', title: 'Fashion Store', example: 'Fatima Fashion Store', desc: 'Shoes, bags, perfumes, jewelry. Stock by size.', mode: 'product' },
  { emoji: '🎂', title: 'Cakes & Pastry', example: 'Aïcha Cakes', desc: 'Orders, deposits, delivery. Track every cake.', mode: 'product' },
  { emoji: '🍲', title: 'Food & Delivery', example: 'Mama Kitchen', desc: 'Daily orders, riders, revenue. All in real-time.', mode: 'product' },
  { emoji: '📱', title: 'WhatsApp/TikTok Seller', example: 'Zara Online Shop', desc: 'Online orders, payments, deliveries. No physical store needed.', mode: 'product' },
  { emoji: '🏪', title: 'Mini-Market', example: 'Chez Paul Market', desc: 'Barcode scanner, low stock alerts, daily sales.', mode: 'product' },
  { emoji: '📦', title: 'Wholesale', example: 'Cosmetic Distribution', desc: 'Multi-store, real profit tracking, bulk stock.', mode: 'product' },
  { emoji: '📊', title: 'Digital Marketing', example: 'Kevin Marketing', desc: '30 clients, active projects, recurring billing.', mode: 'service' },
  { emoji: '🎨', title: 'Graphic Designer', example: 'DesignPro Studio', desc: 'Logos, flyers, branding. Deposits and milestones.', mode: 'service' },
  { emoji: '💻', title: 'Web Agency', example: 'TechLab Agency', desc: 'Websites, apps, deadlines. Team management.', mode: 'service' },
  { emoji: '📋', title: 'Consultant', example: 'Consultant RH', desc: 'Missions, invoices, clients. Payment tracking.', mode: 'service' },
  { emoji: '🖨️', title: 'Print Shop', example: 'Print House', desc: 'Flyer orders, roll-ups, deposits, invoices.', mode: 'product' },
  { emoji: '✂️', title: 'Tailor', example: 'Amina Couture', desc: 'Custom orders, measurements, pickup date, deposits.', mode: 'product' },
];

// ── Problems → Solutions ──
const problemsFR = [
  { before: 'Tu gères ton stock ou tes projets dans ta tête', after: 'Dashboard adapté — produits OU services, tout en 1 clic' },
  { before: 'Tu ne sais pas combien tu as gagné ce mois', after: 'Revenus, bénéfices, top produits/projets — en temps réel' },
  { before: 'Les factures se font à la main', after: 'Factures PDF pro en 1 seconde, envoyées par WhatsApp' },
  { before: 'Tu ne sais pas qui sont tes meilleurs clients', after: 'Historique complet — achats, projets, paiements, fidélité' },
  { before: 'Les outils ne comprennent pas ton métier', after: 'Le logiciel s\'adapte : Produits pour boutiques, Services pour freelancers' },
];
const problemsEN = [
  { before: 'You manage stock or projects in your head', after: 'Adapted dashboard — products OR services, all in 1 click' },
  { before: 'You don\'t know how much you earned this month', after: 'Revenue, profits, top products/projects — in real-time' },
  { before: 'Invoices are done by hand', after: 'Professional PDF invoices in 1 second, sent via WhatsApp' },
  { before: 'You don\'t know who your best customers are', after: 'Complete history — purchases, projects, payments, loyalty' },
  { before: 'Tools don\'t understand your business', after: 'Software adapts: Products for shops, Services for freelancers' },
];

// ── Features (grouped by mode) ──
const featuresFR = [
  { icon: ShoppingBag, title: 'Gestion de Stock', desc: 'Stock adaptatif par taille, couleur, pointure. Alertes automatiques.', modes: ['product'] },
  { icon: Receipt, title: 'Factures & WhatsApp', desc: 'Factures PDF A4 et reçus 80mm en 1 clic. Envoi WhatsApp direct.', modes: ['product', 'service'] },
  { icon: CreditCard, title: 'Orange Money', desc: 'Paiement d\'abonnement par Orange Money. Activation rapide.', modes: ['product', 'service'] },
  { icon: Barcode, title: 'Caisse POS & Scanner', desc: 'Point de vente rapide avec scanner code-barres intégré.', modes: ['product'] },
  { icon: Heart, title: 'Programme Fidélité', desc: 'Points par achat, tiers Bronze/Silver/Gold, récompenses auto.', modes: ['product'] },
  { icon: Briefcase, title: 'Projets & Milestones', desc: 'Gérez vos projets clients avec jalons, budget et deadlines.', modes: ['service'] },
  { icon: FileText, title: 'Factures Standalone', desc: 'Créez des factures libres avec lignes personnalisées.', modes: ['service'] },
  { icon: TrendingUp, title: 'Facturation Récurrente', desc: 'Facturez automatiquement vos clients mensuels.', modes: ['service'] },
  { icon: Users, title: 'Gestion Employés', desc: 'OWNER, MANAGER, CASHIER — permissions par rôle.', modes: ['product', 'service'] },
  { icon: Building2, title: 'Multi-Magasins', desc: 'Plusieurs points de vente, un seul compte. (Business)', modes: ['product'] },
  { icon: Bell, title: 'Notifications', desc: 'Alertes stock faible, nouvelles commandes, paiements.', modes: ['product', 'service'] },
  { icon: Download, title: 'Export & Backup', desc: 'CSV/Excel export. Backup JSON automatique.', modes: ['product', 'service'] },
];
const featuresEN = [
  { icon: ShoppingBag, title: 'Stock Management', desc: 'Adaptive stock by size, color, shoe size. Auto alerts.', modes: ['product'] },
  { icon: Receipt, title: 'Invoices & WhatsApp', desc: 'PDF A4 invoices and 80mm receipts in 1 click. Direct WhatsApp.', modes: ['product', 'service'] },
  { icon: CreditCard, title: 'Orange Money', desc: 'Subscription payment via Orange Money. Fast activation.', modes: ['product', 'service'] },
  { icon: Barcode, title: 'POS & Scanner', desc: 'Fast point of sale with integrated barcode scanner.', modes: ['product'] },
  { icon: Heart, title: 'Loyalty Program', desc: 'Points per purchase, Bronze/Silver/Gold tiers, auto rewards.', modes: ['product'] },
  { icon: Briefcase, title: 'Projects & Milestones', desc: 'Manage client projects with milestones, budget & deadlines.', modes: ['service'] },
  { icon: FileText, title: 'Standalone Invoices', desc: 'Create free-form invoices with custom line items.', modes: ['service'] },
  { icon: TrendingUp, title: 'Recurring Billing', desc: 'Automatically bill your monthly clients.', modes: ['service'] },
  { icon: Users, title: 'Employee Management', desc: 'OWNER, MANAGER, CASHIER — role-based permissions.', modes: ['product', 'service'] },
  { icon: Building2, title: 'Multi-Store', desc: 'Multiple locations, one account. (Business)', modes: ['product'] },
  { icon: Bell, title: 'Notifications', desc: 'Low stock alerts, new orders, payments.', modes: ['product', 'service'] },
  { icon: Download, title: 'Export & Backup', desc: 'CSV/Excel export. Automatic JSON backup.', modes: ['product', 'service'] },
];

// ── Plans ──
const plansFR = [
  {
    name: 'KABRAK STORE',
    price: '4 900',
    tag: 'Vendeurs en ligne · Business maison',
    users: '1 utilisateur',
    color: 'border-gray-200',
    btnClass: 'border-2 border-blue-200 text-blue-600 hover:bg-blue-50',
    included: ['Commandes & ventes', 'Gestion clients', 'Acomptes & suivi paiements', 'Factures PDF & WhatsApp', 'Suivi livraison', 'Dashboard & statistiques', 'Paiement Orange Money', 'Notifications temps réel'],
    excluded: ['Stock avancé', 'Caisse POS', 'Employés', 'Scanner barcode', 'Multi-magasins'],
  },
  {
    name: 'KABRAK SHOP',
    price: '7 900',
    tag: 'Boutique en croissance',
    users: '3 utilisateurs',
    color: 'border-blue-400 ring-2 ring-blue-200',
    popular: true,
    btnClass: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:opacity-90 shadow-lg shadow-blue-200',
    included: ['Tout KABRAK STORE +', 'Stock avancé (taille, couleur, ML)', 'Caisse POS rapide', 'Scanner code-barres', 'Employés (accès limités)', 'Programme fidélité', 'Dashboard avancé', 'Export CSV/Excel'],
    excluded: ['Multi-magasins', 'Permissions avancées', 'Rapports détaillés'],
  },
  {
    name: 'KABRAK BUSINESS',
    price: '12 900',
    tag: 'Grand magasin · Multi-sites',
    users: '10 utilisateurs',
    color: 'border-amber-400 ring-2 ring-amber-200',
    btnClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-amber-200',
    included: ['Tout KABRAK SHOP +', 'Multi-employés avec permissions', 'Multi-magasins', 'Statistiques avancées', 'Bénéfices réels & rapports', 'Top vendeur / top catégories', 'Backup automatique', 'Support prioritaire WhatsApp'],
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
    included: ['Orders & sales', 'Client management', 'Deposits & payment tracking', 'PDF invoices & WhatsApp', 'Delivery tracking', 'Dashboard & statistics', 'Orange Money payment', 'Real-time notifications'],
    excluded: ['Advanced stock', 'POS register', 'Employees', 'Barcode scanner', 'Multi-store'],
  },
  {
    name: 'KABRAK SHOP',
    price: '7 900',
    tag: 'Growing store',
    users: '3 users',
    color: 'border-blue-400 ring-2 ring-blue-200',
    popular: true,
    btnClass: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:opacity-90 shadow-lg shadow-blue-200',
    included: ['Everything in STORE +', 'Advanced stock (size, color, ML)', 'Fast POS register', 'Barcode scanner', 'Employees (limited access)', 'Loyalty program', 'Advanced dashboard', 'CSV/Excel export'],
    excluded: ['Multi-store', 'Advanced permissions', 'Detailed reports'],
  },
  {
    name: 'KABRAK BUSINESS',
    price: '12 900',
    tag: 'Large store · Multi-sites',
    users: '10 users',
    color: 'border-amber-400 ring-2 ring-amber-200',
    btnClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-amber-200',
    included: ['Everything in SHOP +', 'Multi-employees with permissions', 'Multi-store management', 'Advanced statistics', 'Real profits & reports', 'Best seller / top categories', 'Automatic backup', 'Priority WhatsApp support'],
    multiBranch: true,
  },
];

// ── Comparison ──
const compareFR = [
  { fn: 'Commandes & Ventes', store: true, shop: true, business: true },
  { fn: 'Clients & Historique', store: true, shop: true, business: true },
  { fn: 'Factures PDF & WhatsApp', store: true, shop: true, business: true },
  { fn: 'Paiement Orange Money', store: true, shop: true, business: true },
  { fn: 'Suivi Livraison', store: true, shop: true, business: true },
  { fn: 'Dashboard & Stats', store: true, shop: true, business: true },
  { fn: 'Notifications', store: true, shop: true, business: true },
  { fn: 'Programme Fidélité', store: true, shop: true, business: true },
  { fn: 'Projets & Milestones', store: true, shop: true, business: true },
  { fn: 'Facturation Récurrente', store: true, shop: true, business: true },
  { fn: 'Gestion Stock Avancée', store: false, shop: true, business: true },
  { fn: 'Caisse POS & Scanner', store: false, shop: true, business: true },
  { fn: 'Export CSV/Excel', store: false, shop: true, business: true },
  { fn: 'Employés & Rôles', store: false, shop: true, business: true },
  { fn: 'Multi-Magasins', store: false, shop: false, business: true },
  { fn: 'Permissions Avancées', store: false, shop: false, business: true },
  { fn: 'Rapports Détaillés', store: false, shop: false, business: true },
  { fn: 'Backup Auto', store: false, shop: false, business: true },
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
  { fn: 'Projects & Milestones', store: true, shop: true, business: true },
  { fn: 'Recurring Billing', store: true, shop: true, business: true },
  { fn: 'Advanced Stock', store: false, shop: true, business: true },
  { fn: 'POS & Scanner', store: false, shop: true, business: true },
  { fn: 'CSV/Excel Export', store: false, shop: true, business: true },
  { fn: 'Employees & Roles', store: false, shop: true, business: true },
  { fn: 'Multi-Store', store: false, shop: false, business: true },
  { fn: 'Advanced Permissions', store: false, shop: false, business: true },
  { fn: 'Detailed Reports', store: false, shop: false, business: true },
  { fn: 'Auto Backup', store: false, shop: false, business: true },
];

// ── Testimonials (placeholder) ──
const testimonialsFR = [
  { name: 'Fatima A.', business: 'Fashion Store, Douala', text: 'Avant KABRAK, je perdais des clients parce que je ne retrouvais plus les commandes. Maintenant tout est organisé et mes clientes reçoivent leurs factures par WhatsApp.', avatar: '👩🏽' },
  { name: 'Kevin M.', business: 'Agence Marketing, Yaoundé', text: 'En tant que marketer avec 30+ clients, la facturation récurrente me fait gagner des heures chaque mois. C\'est exactement ce qu\'il me fallait.', avatar: '👨🏾' },
  { name: 'Paul N.', business: 'Mini-Market, Bafoussam', text: 'Le scanner code-barres et les alertes stock faible ont transformé ma boutique. Je ne suis plus jamais en rupture de stock.', avatar: '👨🏿' },
];
const testimonialsEN = [
  { name: 'Fatima A.', business: 'Fashion Store, Douala', text: 'Before KABRAK, I was losing customers because I couldn\'t find orders. Now everything is organized and my clients receive invoices via WhatsApp.', avatar: '👩🏽' },
  { name: 'Kevin M.', business: 'Marketing Agency, Yaoundé', text: 'As a marketer with 30+ clients, recurring billing saves me hours every month. This is exactly what I needed.', avatar: '👨🏾' },
  { name: 'Paul N.', business: 'Mini-Market, Bafoussam', text: 'The barcode scanner and low stock alerts transformed my store. I\'m never out of stock anymore.', avatar: '👨🏿' },
];

// ── FAQ ──
const faqsFR = [
  { q: 'C\'est pour quel type de business ?', a: 'KABRAK s\'adapte automatiquement. Mode "Vente & Commandes" pour les boutiques, restaurants, food, WhatsApp sellers, grossistes. Mode "Services & Clients" pour le marketing digital, freelancers, consultants, agences. Choisissez votre mode à l\'inscription.' },
  { q: 'Puis-je utiliser sur téléphone ?', a: 'Oui ! KABRAK Store est une PWA optimisée mobile. Installez-la sur votre écran d\'accueil comme une vraie application. Fonctionne même hors-ligne.' },
  { q: 'Comment se passe le paiement ?', a: 'Paiement simple par Orange Money. Vous payez, l\'admin confirme, votre abonnement s\'active en quelques minutes.' },
  { q: 'Combien d\'employés puis-je ajouter ?', a: 'STORE : 1 utilisateur · SHOP : 3 · BUSINESS : 10. Chaque employé a son accès avec des permissions (OWNER, MANAGER, CASHIER).' },
  { q: 'Et si j\'ai plusieurs boutiques ?', a: 'Le plan BUSINESS permet de gérer plusieurs magasins depuis un seul compte, avec un dashboard par magasin.' },
  { q: 'Comment fonctionne le mode Services ?', a: 'Vous créez des projets avec des milestones, gérez vos clients, envoyez des factures standalone et configurez la facturation récurrente automatique.' },
  { q: 'Les factures sont envoyées comment ?', a: 'En 1 clic : facture PDF (A4 ou ticket 80mm) envoyée directement par WhatsApp au client.' },
  { q: 'Mes données sont-elles en sécurité ?', a: 'Oui. Cryptage SSL, headers de sécurité (Helmet), serveurs sécurisés, et backup JSON disponible.' },
  { q: 'Y a-t-il un essai gratuit ?', a: 'Oui, 14 jours d\'essai gratuit avec accès complet. Aucune carte bancaire requise.' },
];
const faqsEN = [
  { q: 'What type of business is this for?', a: 'KABRAK adapts automatically. "Sales & Orders" mode for shops, restaurants, food, WhatsApp sellers, wholesalers. "Services & Clients" mode for digital marketing, freelancers, consultants, agencies. Choose your mode at registration.' },
  { q: 'Can I use it on my phone?', a: 'Yes! KABRAK Store is a mobile-optimized PWA. Install it on your home screen like a real app. Works even offline.' },
  { q: 'How does payment work?', a: 'Simple payment via Orange Money. You pay, admin confirms, your subscription activates in minutes.' },
  { q: 'How many employees can I add?', a: 'STORE: 1 user · SHOP: 3 · BUSINESS: 10. Each employee has their own access with permissions (OWNER, MANAGER, CASHIER).' },
  { q: 'What if I have multiple stores?', a: 'The BUSINESS plan allows managing multiple stores from one account, with a dashboard per store.' },
  { q: 'How does Service mode work?', a: 'Create projects with milestones, manage clients, send standalone invoices, and set up automatic recurring billing.' },
  { q: 'How are invoices sent?', a: 'In 1 click: PDF invoice (A4 or 80mm receipt) sent directly via WhatsApp to the client.' },
  { q: 'Is my data safe?', a: 'Yes. SSL encryption, security headers (Helmet), secure servers, and JSON backup available.' },
  { q: 'Is there a free trial?', a: 'Yes, 14 days free trial with full access. No credit card required.' },
];

// ── "How it works" steps ──
const howItWorksFR = [
  { step: '1', title: 'Inscrivez-vous', desc: 'Choisissez votre mode (Produits ou Services) et votre catégorie. 2 minutes.', icon: Users },
  { step: '2', title: 'Configurez', desc: 'Ajoutez vos produits, services, clients. Importez ou créez manuellement.', icon: Layers },
  { step: '3', title: 'Gérez & vendez', desc: 'Commandes, factures, paiements, livraisons — tout centralisé.', icon: Package },
  { step: '4', title: 'Grandissez', desc: 'Rapports, fidélité, employés, multi-magasins. Montez en gamme quand vous êtes prêt.', icon: TrendingUp },
];
const howItWorksEN = [
  { step: '1', title: 'Sign up', desc: 'Choose your mode (Products or Services) and category. 2 minutes.', icon: Users },
  { step: '2', title: 'Configure', desc: 'Add your products, services, clients. Import or create manually.', icon: Layers },
  { step: '3', title: 'Manage & sell', desc: 'Orders, invoices, payments, deliveries — all centralized.', icon: Package },
  { step: '4', title: 'Grow', desc: 'Reports, loyalty, employees, multi-store. Upgrade when ready.', icon: TrendingUp },
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
  const [featureMode, setFeatureMode] = useState<'all' | 'product' | 'service'>('all');
  const problems = lang === 'fr' ? problemsFR : problemsEN;
  const allFeatures = lang === 'fr' ? featuresFR : featuresEN;
  const plans = lang === 'fr' ? plansFR : plansEN;
  const compare = lang === 'fr' ? compareFR : compareEN;
  const faqs = lang === 'fr' ? faqsFR : faqsEN;
  const businesses = lang === 'fr' ? businessesFR : businessesEN;
  const testimonials = lang === 'fr' ? testimonialsFR : testimonialsEN;
  const howItWorks = lang === 'fr' ? howItWorksFR : howItWorksEN;

  const filteredFeatures = featureMode === 'all'
    ? allFeatures
    : allFeatures.filter(f => f.modes.includes(featureMode));

  return (
    <div className="min-h-screen bg-white">

      {/* ─── NAVBAR ─── */}
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
            <Link to="/login" className="hidden sm:inline text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">{lang === 'fr' ? 'Connexion' : 'Login'}</Link>
            <Link to="/register" className="px-3 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs sm:text-sm font-bold hover:opacity-90 shadow-lg shadow-blue-200 transition-all">
              {lang === 'fr' ? 'Essai gratuit' : 'Free trial'}
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-5 text-center bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-6 sm:mb-8">
            <Zap className="w-3.5 h-3.5" /> {lang === 'fr' ? '2 modes : Produits & Commandes + Services & Clients' : '2 modes: Products & Orders + Services & Clients'}
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
            {lang === 'fr' ? 'Le logiciel qui s\'adapte' : 'The software that adapts'}<br />
            <span className="bg-gradient-to-r from-blue-600 to-amber-500 bg-clip-text text-transparent">
              {lang === 'fr' ? 'à VOTRE business.' : 'to YOUR business.'}
            </span>
          </h1>
          <p className="text-base sm:text-xl text-gray-500 mb-3 max-w-2xl mx-auto leading-relaxed">
            {lang === 'fr'
              ? 'Boutiques, cakes, food delivery, WhatsApp sellers, freelancers, agences — '
              : 'Shops, cakes, food delivery, WhatsApp sellers, freelancers, agencies — '}
            <span className="font-semibold text-gray-800">{lang === 'fr' ? 'un seul logiciel.' : 'one software.'}</span>
          </p>
          <p className="text-xs sm:text-sm text-gray-400 mb-8 sm:mb-10">{lang === 'fr' ? 'Conçu pour les entrepreneurs au Cameroun et en Afrique. Stock, projets, factures, fidélité — tout inclus.' : 'Designed for entrepreneurs in Cameroon and Africa. Stock, projects, invoices, loyalty — all included.'}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm sm:text-base hover:opacity-90 shadow-2xl shadow-blue-300 transition-all">
              {lang === 'fr' ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20veux%20en%20savoir%20plus%20sur%20KABRAK%20Store"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl border-2 border-green-200 text-green-700 font-bold text-sm sm:text-base hover:bg-green-50 transition-all">
              <Phone className="w-5 h-5" /> WhatsApp
            </a>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-5">
            {lang === 'fr'
              ? '14 jours d\'essai gratuit  ·  Aucune carte requise  ·  Paiement Orange Money'
              : '14-day free trial  ·  No card required  ·  Orange Money payment'
            }
          </p>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="py-6 sm:py-8 px-5 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center text-white">
          <div>
            <p className="text-2xl sm:text-3xl font-black">2</p>
            <p className="text-[10px] sm:text-xs text-blue-200">{lang === 'fr' ? 'Modes adaptatifs' : 'Adaptive modes'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black">30+</p>
            <p className="text-[10px] sm:text-xs text-blue-200">{lang === 'fr' ? 'Catégories business' : 'Business categories'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black">FR/EN</p>
            <p className="text-[10px] sm:text-xs text-blue-200">{lang === 'fr' ? 'Bilingue' : 'Bilingual'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black">PWA</p>
            <p className="text-[10px] sm:text-xs text-blue-200">{lang === 'fr' ? 'App installable' : 'Installable app'}</p>
          </div>
        </div>
      </section>

      {/* ─── 12 BUSINESS TYPES ─── */}
      <section className="py-14 sm:py-20 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">{lang === 'fr' ? 'Pour tous les entrepreneurs' : 'For all entrepreneurs'}</span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mt-4 mb-3">{lang === 'fr' ? 'S\'adapte à VOTRE business' : 'Adapts to YOUR business'}</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">{lang === 'fr' ? 'Produits ou services — le logiciel s\'adapte automatiquement à votre métier.' : 'Products or services — the software adapts automatically to your trade.'}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {businesses.map(b => (
              <div key={b.title} className={`p-4 sm:p-5 rounded-2xl bg-white border-2 hover:shadow-lg transition-all ${b.mode === 'service' ? 'border-violet-100 hover:border-violet-300' : 'border-gray-100 hover:border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl">{b.emoji}</span>
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${b.mode === 'service' ? 'bg-violet-100 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>
                    {b.mode === 'service' ? 'Services' : (lang === 'fr' ? 'Produits' : 'Products')}
                  </span>
                </div>
                <h3 className="font-black text-gray-900 text-sm sm:text-base mb-1">{b.title}</h3>
                <p className="text-[10px] sm:text-xs text-blue-600 font-medium mb-1">{b.example}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-14 sm:py-20 px-5 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-green-600 uppercase tracking-wider bg-green-50 px-3 py-1 rounded-full">{lang === 'fr' ? 'Simple & rapide' : 'Simple & fast'}</span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mt-4 mb-3">{lang === 'fr' ? 'Comment ça marche' : 'How it works'}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {howItWorks.map((s) => (
              <div key={s.step} className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center mb-4 text-white font-black text-lg shadow-lg shadow-blue-200">{s.step}</div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{s.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROBLEMS → SOLUTIONS ─── */}
      <section className="py-14 sm:py-20 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">{lang === 'fr' ? 'Tu te reconnais là-dedans ?' : 'Do you recognize yourself here?'}</h2>
            <p className="text-sm text-gray-400">{lang === 'fr' ? 'Ce que vivent 90% des entrepreneurs chaque jour.' : 'What 90% of entrepreneurs experience every day.'}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="p-5 sm:p-6 rounded-2xl bg-red-50 border border-red-100">
              <p className="font-bold text-red-700 mb-4 text-xs sm:text-sm uppercase tracking-wide">{lang === 'fr' ? 'Sans KABRAK' : 'Without KABRAK'}</p>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.before} className="flex items-start gap-2 text-xs sm:text-sm text-red-600">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" /> {p.before}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-green-50 border border-green-100">
              <p className="font-bold text-green-700 mb-4 text-xs sm:text-sm uppercase tracking-wide">{lang === 'fr' ? 'Avec KABRAK' : 'With KABRAK'}</p>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.after} className="flex items-start gap-2 text-xs sm:text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {p.after}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES (filterable by mode) ─── */}
      <section className="py-14 sm:py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-3 py-1 rounded-full">{lang === 'fr' ? 'Fonctionnalités' : 'Features'}</span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mt-4 mb-3">{lang === 'fr' ? 'Tout est inclus' : 'Everything included'}</h2>
            <p className="text-sm text-gray-400 mb-6">{lang === 'fr' ? 'Un seul logiciel. Zéro papier. Zéro stress.' : 'One software. Zero paper. Zero stress.'}</p>
            <div className="flex justify-center gap-2">
              {[
                { id: 'all', label: lang === 'fr' ? 'Tout' : 'All' },
                { id: 'product', label: lang === 'fr' ? 'Produits' : 'Products' },
                { id: 'service', label: 'Services' },
              ].map(m => (
                <button key={m.id} onClick={() => setFeatureMode(m.id as 'all' | 'product' | 'service')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${featureMode === m.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredFeatures.map(({ icon: Icon, title, desc, modes }) => (
              <div key={title} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex gap-1">
                    {modes.map(m => (
                      <span key={m} className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${m === 'service' ? 'bg-violet-100 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>
                        {m === 'service' ? 'SVC' : 'PRD'}
                      </span>
                    ))}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-14 sm:py-20 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">{lang === 'fr' ? 'Ils utilisent KABRAK' : 'They use KABRAK'}</h2>
            <p className="text-sm text-gray-400">{lang === 'fr' ? 'Ce que disent les entrepreneurs.' : 'What entrepreneurs say.'}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.map(t => (
              <div key={t.name} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{t.avatar}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-blue-600">{t.business}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">"{t.text}"</p>
                <div className="flex gap-0.5 mt-3">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="py-14 sm:py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full">{lang === 'fr' ? 'Tarification' : 'Pricing'}</span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mt-4 mb-2">{lang === 'fr' ? 'Tarifs simples et transparents' : 'Simple and transparent pricing'}</h2>
            <p className="text-sm text-gray-400 mb-1">{lang === 'fr' ? 'Essai gratuit 14 jours — aucune carte requise' : '14-day free trial — no card required'}</p>
            <p className="text-xs text-gray-300">{lang === 'fr' ? 'Paiement mensuel par Orange Money' : 'Monthly payment via Orange Money'}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {plans.map(plan => (
              <div key={plan.name} className={`bg-white rounded-2xl border-2 p-5 sm:p-6 relative flex flex-col ${plan.color}`}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] sm:text-xs font-bold shadow-lg whitespace-nowrap">
                    <Star className="w-3 h-3 inline -mt-0.5 mr-1" />{lang === 'fr' ? 'Le plus choisi' : 'Most popular'}
                  </div>
                )}
                <div className="mb-1">
                  <span className="font-black text-gray-900 text-base sm:text-lg">{plan.name}</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-400 mb-3">{plan.tag}</p>
                <div className="mb-1">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-xs sm:text-sm"> FCFA/{lang === 'fr' ? 'mois' : 'month'}</span>
                </div>
                <p className="text-xs font-semibold text-blue-600 mb-4 sm:mb-5">{plan.users}</p>
                <ul className="space-y-2 mb-4 flex-1">
                  {plan.included.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.excluded && (
                  <ul className="space-y-1.5 mb-4 pt-3 border-t border-gray-100">
                    {plan.excluded.map(f => (
                      <li key={f} className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-300">
                        <X className="w-3.5 h-3.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                {plan.multiBranch && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-xs font-bold text-amber-700">{lang === 'fr' ? 'Multi-magasins' : 'Multi-store'}</p>
                    <p className="text-[10px] sm:text-xs text-amber-500 mt-1">+5 000 FCFA/{lang === 'fr' ? 'magasin' : 'store'}</p>
                  </div>
                )}
                <Link to="/register" className={`block text-center py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${plan.btnClass}`}>
                  {lang === 'fr' ? 'Commencer l\'essai gratuit' : 'Start free trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="py-10 sm:py-14 px-5 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-xl sm:text-2xl font-black text-gray-900 mb-6 sm:mb-8">{lang === 'fr' ? 'Comparatif des plans' : 'Plan comparison'}</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 sm:px-5 py-3 sm:py-4 text-gray-500 font-semibold text-xs sm:text-sm">{lang === 'fr' ? 'Fonctionnalité' : 'Feature'}</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-gray-700 font-bold text-xs sm:text-sm">Store</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-blue-600 font-bold text-xs sm:text-sm">Shop</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-amber-600 font-bold text-xs sm:text-sm">Business</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((row, i) => (
                  <tr key={row.fn} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                    <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-gray-600 text-[10px] sm:text-sm">{row.fn}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">{row.store ? <CheckCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-green-500 mx-auto" /> : <X className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-200 mx-auto" />}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">{row.shop ? <CheckCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-green-500 mx-auto" /> : <X className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-200 mx-auto" />}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">{row.business ? <CheckCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-green-500 mx-auto" /> : <X className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-200 mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── PWA INSTALL ─── */}
      <section className="py-14 sm:py-20 px-5 bg-gradient-to-br from-blue-50/30 to-amber-50/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100/50 px-3 py-1 rounded-full">
              <Smartphone className="w-3 h-3 inline -mt-0.5 mr-1" />{lang === 'fr' ? 'Application Mobile' : 'Mobile App'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-3">{lang === 'fr' ? 'Installez l\'app sur votre téléphone' : 'Install the app on your phone'}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-lg mx-auto">{lang === 'fr' ? 'Accédez à votre business en 1 clic — sans App Store ni Google Play.' : 'Access your business in 1 tap — without App Store or Google Play.'}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              { emoji: '🤖', title: 'Android (Chrome)', color: 'green', steps: lang === 'fr' ? ['Ouvrez Chrome → kabrak-store.kabrakeng.com', 'Appuyez sur ⋮ en haut à droite', '"Ajouter à l\'écran d\'accueil"', 'L\'app apparaît !'] : ['Open Chrome → kabrak-store.kabrakeng.com', 'Tap ⋮ in the top right', '"Add to Home screen"', 'The app appears!'] },
              { emoji: '🍎', title: 'iPhone (Safari)', color: 'blue', steps: lang === 'fr' ? ['Safari → kabrak-store.kabrakeng.com', 'Icône de partage en bas', '"Sur l\'écran d\'accueil"', '"Ajouter" en haut à droite'] : ['Safari → kabrak-store.kabrakeng.com', 'Share icon at the bottom', '"Add to Home Screen"', '"Add" in the top right'] },
              { emoji: '💻', title: lang === 'fr' ? 'Ordinateur' : 'Computer', color: 'gray', steps: lang === 'fr' ? ['Allez sur kabrak-store.kabrakeng.com', 'Icône d\'installation dans la barre', 'Cliquez "Installer"', 'L\'app s\'ouvre en standalone !'] : ['Go to kabrak-store.kabrakeng.com', 'Install icon in the address bar', 'Click "Install"', 'The app opens standalone!'] },
            ].map(p => (
              <div key={p.title} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="font-bold text-gray-800 text-sm">{p.title}</span>
                </div>
                <ol className="space-y-2.5">
                  {p.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className={`w-5 h-5 rounded-full bg-${p.color}-100 text-${p.color}-800 flex items-center justify-center flex-shrink-0 font-bold text-[10px]`}>{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section className="py-10 sm:py-14 px-5 bg-white">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-5 sm:gap-6 text-center">
          <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/50">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 text-sm mb-1">{lang === 'fr' ? 'Données Sécurisées' : 'Secure Data'}</h3>
            <p className="text-xs text-gray-400">{lang === 'fr' ? 'SSL, headers Helmet, serveurs sécurisés, backup auto' : 'SSL, Helmet headers, secure servers, auto backup'}</p>
          </div>
          <div className="p-5 sm:p-6 rounded-2xl bg-green-50/50">
            <Smartphone className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 text-sm mb-1">{lang === 'fr' ? 'PWA Installable' : 'Installable PWA'}</h3>
            <p className="text-xs text-gray-400">{lang === 'fr' ? 'Fonctionne sur téléphone, tablette et ordinateur — même hors-ligne' : 'Works on phone, tablet and computer — even offline'}</p>
          </div>
          <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/50">
            <BarChart3 className="w-8 h-8 text-amber-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 text-sm mb-1">{lang === 'fr' ? 'Rapports Intelligents' : 'Smart Reports'}</h3>
            <p className="text-xs text-gray-400">{lang === 'fr' ? 'Ventes, bénéfices, top produits/projets — en temps réel' : 'Sales, profits, top products/projects — in real time'}</p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-14 sm:py-20 px-5 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>
            <p className="text-sm text-gray-400">{lang === 'fr' ? 'Tout ce que vous devez savoir.' : 'Everything you need to know.'}</p>
          </div>
          <div className="space-y-3">
            {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-14 sm:py-20 px-5 text-center bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">{lang === 'fr' ? 'Prêt à digitaliser votre business ?' : 'Ready to digitize your business?'}</h2>
          <p className="text-blue-200 text-sm sm:text-base mb-8">{lang === 'fr' ? '14 jours gratuits · Produits, services, factures, fidélité — tout inclus · Orange Money' : '14 days free · Products, services, invoices, loyalty — all included · Orange Money'}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white text-blue-700 font-bold text-sm sm:text-base hover:bg-blue-50 shadow-2xl transition-all">
              {lang === 'fr' ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20veux%20en%20savoir%20plus%20sur%20KABRAK%20Store"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl border-2 border-white/30 text-white font-bold text-sm sm:text-base hover:bg-white/10 transition-all">
              <Phone className="w-5 h-5" /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
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
            <p className="text-gray-400 text-xs leading-relaxed">{lang === 'fr' ? 'Logiciel de gestion adaptative pour entrepreneurs en Afrique. Produits, services, projets — un seul outil.' : 'Adaptive management software for African entrepreneurs. Products, services, projects — one tool.'}</p>
            <p className="text-gray-500 text-[10px] mt-2 font-medium">KABRAK ENG</p>
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
              <li>kabrak-store.kabrakeng.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          &copy; 2026 KABRAK ENG &middot; {lang === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}
        </div>
      </footer>

      {/* ─── WHATSAPP FLOATING BUTTON ─── */}
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
