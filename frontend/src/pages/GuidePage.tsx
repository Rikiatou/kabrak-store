import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FileText, UserCog, Truck,
  BarChart3, Tags, Heart, Store, FolderKanban, RefreshCw, Monitor, TrendingDown,
  Building2, Sparkles, Briefcase, ChevronRight, CheckCircle, BookOpen, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface GuideModule {
  key: string;
  icon: typeof LayoutDashboard;
  color: string;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  steps: { fr: string[]; en: string[] };
  link: string;
  plans?: string[];
  modes?: ('PRODUCT' | 'SERVICE')[];
}

const ALL_MODULES: GuideModule[] = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    color: 'from-blue-500 to-blue-600',
    title: { fr: 'Tableau de bord', en: 'Dashboard' },
    description: {
      fr: 'Vue d\'ensemble de toute ton activité : ventes du jour, revenus, stocks, clients et bien plus.',
      en: 'Overview of your entire activity: today\'s sales, revenue, stock, clients and more.',
    },
    steps: {
      fr: [
        'Accède au dashboard depuis la sidebar en cliquant sur l\'icône maison.',
        'Choisis la période : Aujourd\'hui, Semaine, Mois ou Année.',
        'Les cartes affichent tes ventes, revenus et clients en temps réel.',
        'Consulte les commandes récentes et les produits les plus vendus.',
        'L\'alerte stock faible t\'indique quels produits réapprovisionner.',
      ],
      en: [
        'Access the dashboard from the sidebar by clicking the home icon.',
        'Choose the period: Today, Week, Month or Year.',
        'Cards show your sales, revenue and clients in real time.',
        'Check recent orders and top-selling products.',
        'Low stock alerts tell you which products to restock.',
      ],
    },
    link: '/dashboard',
  },
  {
    key: 'products',
    icon: Package,
    color: 'from-emerald-500 to-emerald-600',
    title: { fr: 'Produits & Stock', en: 'Products & Stock' },
    description: {
      fr: 'Gère ton catalogue de produits, prix, stock et alertes de réapprovisionnement.',
      en: 'Manage your product catalog, prices, stock and restock alerts.',
    },
    steps: {
      fr: [
        'Clique sur "Nouveau produit" pour ajouter un article.',
        'Renseigne le nom, prix de vente, prix de revient et stock initial.',
        'Définis un seuil d\'alerte stock (ex : 5 unités).',
        'Ajoute une photo et un code-barres si nécessaire.',
        'Utilise le filtre pour chercher par nom ou catégorie.',
        'Le stock se met à jour automatiquement à chaque vente.',
      ],
      en: [
        'Click "New product" to add an item.',
        'Enter name, selling price, cost price and initial stock.',
        'Set a low stock alert threshold (e.g. 5 units).',
        'Add a photo and barcode if needed.',
        'Use the filter to search by name or category.',
        'Stock updates automatically with each sale.',
      ],
    },
    link: '/products',
    modes: ['PRODUCT'],
  },
  {
    key: 'orders',
    icon: ShoppingCart,
    color: 'from-blue-500 to-blue-600',
    title: { fr: 'Commandes', en: 'Orders' },
    description: {
      fr: 'Crée et suis toutes tes commandes : ventes directes, WhatsApp, paiements partiels.',
      en: 'Create and track all your orders: direct sales, WhatsApp, partial payments.',
    },
    steps: {
      fr: [
        'Clique sur "Nouvelle commande" pour créer une vente.',
        'Ajoute les produits depuis la liste ou par code-barres.',
        'Sélectionne ou crée un client (optionnel).',
        'Applique une remise si nécessaire.',
        'Choisis le mode de paiement (cash, mobile money, etc.).',
        'Tu peux enregistrer un paiement partiel et laisser un reste à payer.',
        'Envoie la facture par WhatsApp directement depuis la commande.',
      ],
      en: [
        'Click "New order" to create a sale.',
        'Add products from the list or by barcode.',
        'Select or create a client (optional).',
        'Apply a discount if needed.',
        'Choose the payment method (cash, mobile money, etc.).',
        'You can record a partial payment and leave a balance due.',
        'Send the invoice via WhatsApp directly from the order.',
      ],
    },
    link: '/orders',
    modes: ['PRODUCT'],
  },
  {
    key: 'pos',
    icon: Monitor,
    color: 'from-cyan-500 to-cyan-600',
    title: { fr: 'Caisse (POS)', en: 'Cash Register (POS)' },
    description: {
      fr: 'Caisse enregistreuse rapide pour les ventes en boutique physique. Scan produit, ticket immédiat.',
      en: 'Fast cash register for physical store sales. Scan product, immediate receipt.',
    },
    steps: {
      fr: [
        'Accède à la caisse POS depuis la sidebar.',
        'Scanne un code-barres ou cherche un produit par nom.',
        'Clique sur un produit pour l\'ajouter au panier.',
        'Ajuste les quantités directement dans le panier.',
        'Saisie le montant reçu pour calculer la monnaie rendue.',
        'Valide la vente — le stock se met à jour instantanément.',
      ],
      en: [
        'Access the POS from the sidebar.',
        'Scan a barcode or search a product by name.',
        'Click a product to add it to the cart.',
        'Adjust quantities directly in the cart.',
        'Enter the amount received to calculate change.',
        'Confirm the sale — stock updates instantly.',
      ],
    },
    link: '/pos',
    modes: ['PRODUCT'],
    plans: ['SHOP', 'BUSINESS'],
  },
  {
    key: 'categories',
    icon: Tags,
    color: 'from-violet-500 to-violet-600',
    title: { fr: 'Catégories', en: 'Categories' },
    description: {
      fr: 'Organise tes produits en catégories pour un catalogue bien structuré.',
      en: 'Organize your products into categories for a well-structured catalog.',
    },
    steps: {
      fr: [
        'Crée tes catégories : ex. "Robes", "Chaussures", "Accessoires".',
        'Assigne chaque produit à une catégorie depuis la page Produits.',
        'Filtre les produits par catégorie dans les commandes et le POS.',
      ],
      en: [
        'Create your categories: e.g. "Dresses", "Shoes", "Accessories".',
        'Assign each product to a category from the Products page.',
        'Filter products by category in orders and POS.',
      ],
    },
    link: '/categories',
    modes: ['PRODUCT'],
    plans: ['SHOP', 'BUSINESS'],
  },
  {
    key: 'delivery',
    icon: Truck,
    color: 'from-orange-500 to-orange-600',
    title: { fr: 'Livraisons', en: 'Deliveries' },
    description: {
      fr: 'Suit les livraisons de tes commandes : adresse, statut, date de livraison.',
      en: 'Track deliveries for your orders: address, status, delivery date.',
    },
    steps: {
      fr: [
        'Une livraison est créée automatiquement depuis une commande.',
        'Renseigne l\'adresse et le numéro du client.',
        'Change le statut : En attente → Récupéré → En route → Livré.',
        'Le client est notifié à chaque changement de statut.',
      ],
      en: [
        'A delivery is automatically created from an order.',
        'Enter the client\'s address and phone number.',
        'Change status: Pending → Picked up → In transit → Delivered.',
        'The client is notified at each status change.',
      ],
    },
    link: '/deliveries',
    modes: ['PRODUCT'],
    plans: ['SHOP', 'BUSINESS'],
  },
  {
    key: 'loyalty',
    icon: Heart,
    color: 'from-pink-500 to-pink-600',
    title: { fr: 'Fidélité', en: 'Loyalty' },
    description: {
      fr: 'Programme de fidélité : tes clients gagnent des points à chaque achat et peuvent les échanger.',
      en: 'Loyalty program: your clients earn points with each purchase and can redeem them.',
    },
    steps: {
      fr: [
        'Crée des récompenses : ex. "10% de remise pour 500 points".',
        'Les points sont attribués automatiquement aux clients à chaque commande.',
        'Consulte le niveau de fidélité de chaque client (Bronze/Silver/Gold).',
        'Applique une récompense lors d\'une commande.',
      ],
      en: [
        'Create rewards: e.g. "10% discount for 500 points".',
        'Points are automatically assigned to clients with each order.',
        'View each client\'s loyalty tier (Bronze/Silver/Gold).',
        'Apply a reward when creating an order.',
      ],
    },
    link: '/loyalty',
    modes: ['PRODUCT'],
    plans: ['SHOP', 'BUSINESS'],
  },
  {
    key: 'clients',
    icon: Users,
    color: 'from-violet-500 to-violet-600',
    title: { fr: 'Clients', en: 'Clients' },
    description: {
      fr: 'Base de données clients : historique d\'achats, points fidélité, coordonnées.',
      en: 'Client database: purchase history, loyalty points, contact details.',
    },
    steps: {
      fr: [
        'Ajoute un client manuellement ou lors d\'une commande.',
        'Consulte l\'historique complet de chaque client.',
        'Vois le total dépensé, nombre de commandes et points fidélité.',
        'Contacte un client directement par WhatsApp depuis sa fiche.',
      ],
      en: [
        'Add a client manually or during an order.',
        'View each client\'s complete history.',
        'See total spent, order count and loyalty points.',
        'Contact a client directly via WhatsApp from their profile.',
      ],
    },
    link: '/clients',
  },
  {
    key: 'invoices',
    icon: FileText,
    color: 'from-amber-500 to-amber-600',
    title: { fr: 'Factures', en: 'Invoices' },
    description: {
      fr: 'Crée et envoie des factures professionnelles avec ton logo et couleurs.',
      en: 'Create and send professional invoices with your logo and colors.',
    },
    steps: {
      fr: [
        'Une facture est générée automatiquement à chaque commande.',
        'Crée aussi des factures manuelles pour d\'autres prestations.',
        'Ajoute des lignes de produits/services librement.',
        'Définis une date d\'échéance pour les paiements différés.',
        'Envoie la facture en PDF par WhatsApp ou email.',
        'Suis le statut : Non payé / Partiel / Payé.',
      ],
      en: [
        'An invoice is automatically generated with each order.',
        'Also create manual invoices for other services.',
        'Add product/service lines freely.',
        'Set a due date for deferred payments.',
        'Send the invoice as PDF via WhatsApp or email.',
        'Track status: Unpaid / Partial / Paid.',
      ],
    },
    link: '/invoices',
  },
  {
    key: 'expenses',
    icon: TrendingDown,
    color: 'from-red-500 to-red-600',
    title: { fr: 'Dépenses', en: 'Expenses' },
    description: {
      fr: 'Enregistre tes dépenses (loyer, stock, salaires, transport) pour suivre ta rentabilité.',
      en: 'Record your expenses (rent, stock, salaries, transport) to track profitability.',
    },
    steps: {
      fr: [
        'Clique sur "Nouvelle dépense" et renseigne le montant.',
        'Choisis la catégorie : Stock, Salaire, Loyer, Transport...',
        'Associe un fournisseur si nécessaire.',
        'Consulte le total des dépenses par catégorie dans les rapports.',
      ],
      en: [
        'Click "New expense" and enter the amount.',
        'Choose the category: Stock, Salary, Rent, Transport...',
        'Link a supplier if needed.',
        'View total expenses by category in reports.',
      ],
    },
    link: '/expenses',
  },
  {
    key: 'suppliers',
    icon: Building2,
    color: 'from-slate-500 to-slate-600',
    title: { fr: 'Fournisseurs', en: 'Suppliers' },
    description: {
      fr: 'Gère tes fournisseurs et associe-les à tes dépenses de stock.',
      en: 'Manage your suppliers and link them to your stock expenses.',
    },
    steps: {
      fr: [
        'Ajoute un fournisseur avec son nom, téléphone et email.',
        'Lors d\'une dépense, sélectionne le fournisseur concerné.',
        'Consulte l\'historique des achats par fournisseur.',
      ],
      en: [
        'Add a supplier with their name, phone and email.',
        'When recording an expense, select the relevant supplier.',
        'View purchase history by supplier.',
      ],
    },
    link: '/suppliers',
    plans: ['SHOP', 'BUSINESS'],
  },
  {
    key: 'employees',
    icon: UserCog,
    color: 'from-blue-500 to-indigo-600',
    title: { fr: 'Employés', en: 'Employees' },
    description: {
      fr: 'Ajoute des membres d\'équipe avec différents rôles : Manager, Caissier, Employé.',
      en: 'Add team members with different roles: Manager, Cashier, Employee.',
    },
    steps: {
      fr: [
        'Crée un compte employé depuis la page Employés.',
        'Assigne un rôle : Manager (accès complet), Caissier (POS seulement), Employé (lecture).',
        'L\'employé reçoit un email avec ses identifiants de connexion.',
        'Chaque vente est tracée par employé dans les rapports.',
      ],
      en: [
        'Create an employee account from the Employees page.',
        'Assign a role: Manager (full access), Cashier (POS only), Employee (read-only).',
        'The employee receives an email with their login credentials.',
        'Each sale is tracked per employee in reports.',
      ],
    },
    link: '/employees',
    plans: ['SHOP', 'BUSINESS'],
  },
  {
    key: 'reports',
    icon: BarChart3,
    color: 'from-teal-500 to-teal-600',
    title: { fr: 'Rapports', en: 'Reports' },
    description: {
      fr: 'Analyses complètes : bénéfice net, top clients, top produits, évolution des ventes.',
      en: 'Complete analytics: net profit, top clients, top products, sales trends.',
    },
    steps: {
      fr: [
        'Choisis la période à analyser (semaine, mois, année).',
        'Vois le chiffre d\'affaires, bénéfice net et marge brute.',
        'Identifie tes meilleurs clients et produits.',
        'Exporte les données en CSV pour Excel.',
      ],
      en: [
        'Choose the analysis period (week, month, year).',
        'View revenue, net profit and gross margin.',
        'Identify your best clients and products.',
        'Export data to CSV for Excel.',
      ],
    },
    link: '/reports',
    plans: ['SHOP', 'BUSINESS'],
  },
  {
    key: 'stores',
    icon: Store,
    color: 'from-indigo-500 to-indigo-600',
    title: { fr: 'Multi-boutiques', en: 'Multi-stores' },
    description: {
      fr: 'Gère plusieurs points de vente depuis un seul compte KABRAK Business.',
      en: 'Manage multiple points of sale from a single KABRAK Business account.',
    },
    steps: {
      fr: [
        'Crée une nouvelle boutique depuis la page Boutiques.',
        'Assigne des produits et employés à chaque boutique.',
        'Consulte les performances par boutique dans les rapports.',
        'Chaque caissier voit uniquement sa boutique.',
      ],
      en: [
        'Create a new store from the Stores page.',
        'Assign products and employees to each store.',
        'View performance by store in reports.',
        'Each cashier only sees their own store.',
      ],
    },
    link: '/stores',
    plans: ['BUSINESS'],
  },
  {
    key: 'ai-reports',
    icon: Sparkles,
    color: 'from-purple-500 to-purple-600',
    title: { fr: 'Rapports IA', en: 'AI Reports' },
    description: {
      fr: 'Analyse intelligente de ton activité avec des recommandations personnalisées.',
      en: 'Intelligent analysis of your activity with personalized recommendations.',
    },
    steps: {
      fr: [
        'Accède aux rapports IA depuis la sidebar.',
        'L\'IA analyse tes ventes, stocks et dépenses.',
        'Reçois des recommandations : produits à valoriser, périodes creuses, etc.',
        'Pose des questions en langage naturel sur ton activité.',
      ],
      en: [
        'Access AI reports from the sidebar.',
        'AI analyzes your sales, stock and expenses.',
        'Receive recommendations: products to promote, slow periods, etc.',
        'Ask questions in natural language about your activity.',
      ],
    },
    link: '/ai-reports',
    plans: ['BUSINESS'],
  },
  // SERVICE mode
  {
    key: 'projects',
    icon: FolderKanban,
    color: 'from-violet-500 to-violet-600',
    title: { fr: 'Projets', en: 'Projects' },
    description: {
      fr: 'Gère tes projets clients avec budget, jalons, échéances et suivi de paiement.',
      en: 'Manage your client projects with budget, milestones, deadlines and payment tracking.',
    },
    steps: {
      fr: [
        'Crée un projet avec son nom, budget total et date limite.',
        'Associe-le à un client existant ou nouveau.',
        'Ajoute des jalons (ex : Maquette, Développement, Livraison).',
        'Marque les jalons comme complétés au fur et à mesure.',
        'Enregistre les paiements reçus pour suivre le reste à payer.',
        'Génère une facture depuis le projet en un clic.',
      ],
      en: [
        'Create a project with its name, total budget and deadline.',
        'Link it to an existing or new client.',
        'Add milestones (e.g. Mockup, Development, Delivery).',
        'Mark milestones as completed as you go.',
        'Record received payments to track the remaining balance.',
        'Generate an invoice from the project in one click.',
      ],
    },
    link: '/projects',
    modes: ['SERVICE'],
  },
  {
    key: 'services',
    icon: Briefcase,
    color: 'from-blue-500 to-blue-600',
    title: { fr: 'Services', en: 'Services' },
    description: {
      fr: 'Catalogue de tes offres de services avec prix, durée et type de facturation.',
      en: 'Catalog of your service offerings with price, duration and billing type.',
    },
    steps: {
      fr: [
        'Crée tes offres de services (ex : "Site web vitrine", "Shooting photo").',
        'Définis le prix, la durée et le type (ponctuel ou récurrent).',
        'Utilise tes services comme lignes de facturation dans les projets.',
        'Propose des abonnements mensuels avec la facturation récurrente.',
      ],
      en: [
        'Create your service offerings (e.g. "Website", "Photo shooting").',
        'Set price, duration and type (one-time or recurring).',
        'Use your services as billing lines in projects.',
        'Offer monthly subscriptions with recurring billing.',
      ],
    },
    link: '/services',
    modes: ['SERVICE'],
  },
  {
    key: 'recurring',
    icon: RefreshCw,
    color: 'from-teal-500 to-teal-600',
    title: { fr: 'Récurrent', en: 'Recurring' },
    description: {
      fr: 'Facturation automatique pour tes clients en abonnement mensuel ou trimestriel.',
      en: 'Automatic billing for your clients on monthly or quarterly subscriptions.',
    },
    steps: {
      fr: [
        'Crée une facturation récurrente pour un client.',
        'Choisis la fréquence : mensuel, trimestriel, annuel.',
        'Une facture est générée automatiquement à chaque échéance.',
        'Tu es notifié quand une facture est générée et quand elle est due.',
      ],
      en: [
        'Create a recurring billing for a client.',
        'Choose frequency: monthly, quarterly, annual.',
        'An invoice is automatically generated at each due date.',
        'You\'re notified when an invoice is generated and when it\'s due.',
      ],
    },
    link: '/recurring',
    modes: ['SERVICE'],
  },
];

const DONE_KEY = 'kabrak_guide_done';

function getStoredDone(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch { return {}; }
}
function markDone(key: string) {
  const done = getStoredDone();
  done[key] = true;
  localStorage.setItem(DONE_KEY, JSON.stringify(done));
}

export function GuidePage() {
  const { language, tenant } = useAuthStore();
  const fr = language === 'fr';
  const plan = tenant?.plan || 'STORE';
  const mode = tenant?.businessMode || 'PRODUCT';

  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>(getStoredDone());

  const visibleModules = ALL_MODULES.filter((m) => {
    if (m.plans && !m.plans.includes(plan)) return false;
    if (m.modes && !m.modes.includes(mode as 'PRODUCT' | 'SERVICE')) return false;
    return true;
  });

  const selectedModule = selected ? ALL_MODULES.find((m) => m.key === selected) : null;
  const completedCount = visibleModules.filter((m) => done[m.key]).length;

  const handleDone = (key: string) => {
    markDone(key);
    setDone({ ...getStoredDone() });
  };

  const planLabel: Record<string, { fr: string; en: string }> = {
    STORE: { fr: 'KABRAK STORE', en: 'KABRAK STORE' },
    SHOP: { fr: 'KABRAK SHOP', en: 'KABRAK SHOP' },
    BUSINESS: { fr: 'KABRAK BUSINESS', en: 'KABRAK BUSINESS' },
  };

  const planColors: Record<string, string> = {
    STORE: 'from-blue-600 to-blue-700',
    SHOP: 'from-amber-500 to-amber-600',
    BUSINESS: 'from-violet-600 to-violet-700',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${planColors[plan] || 'from-blue-600 to-blue-700'} rounded-2xl p-6 text-white`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {fr ? 'Guide d\'utilisation' : 'User Guide'}
            </h1>
            <p className="text-white/70 text-sm">
              {planLabel[plan]?.[fr ? 'fr' : 'en']} · {mode === 'SERVICE'
                ? (fr ? 'Mode Services' : 'Service Mode')
                : (fr ? 'Mode Commerce' : 'Commerce Mode')}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/80">
              {completedCount}/{visibleModules.length} {fr ? 'modules vus' : 'modules seen'}
            </span>
            <span className="text-white/80">
              {Math.round((completedCount / visibleModules.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / visibleModules.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleModules.map((mod) => {
          const Icon = mod.icon;
          const isDone = done[mod.key];
          return (
            <button
              key={mod.key}
              onClick={() => setSelected(mod.key)}
              className={`relative text-left bg-white dark:bg-gray-800 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
                isDone ? 'border-green-200 dark:border-green-800' : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              {isDone && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-3 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                {mod.title[fr ? 'fr' : 'en']}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {mod.description[fr ? 'fr' : 'en']}
              </p>
              <div className="flex items-center gap-1 mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium">
                {fr ? 'Voir le guide' : 'View guide'} <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className={`bg-gradient-to-r ${selectedModule.color} p-5 rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <selectedModule.icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-lg">
                    {selectedModule.title[fr ? 'fr' : 'en']}
                  </h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {selectedModule.description[fr ? 'fr' : 'en']}
              </p>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                  {fr ? '📋 Comment utiliser' : '📋 How to use'}
                </h3>
                <ol className="space-y-2">
                  {selectedModule.steps[fr ? 'fr' : 'en'].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className={`w-6 h-6 shrink-0 rounded-full bg-gradient-to-br ${selectedModule.color} text-white text-xs flex items-center justify-center font-bold`}>
                        {i + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  to={selectedModule.link}
                  onClick={() => {
                    handleDone(selectedModule.key);
                    setSelected(null);
                  }}
                  className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${selectedModule.color} text-white font-bold text-sm text-center hover:opacity-90 transition-all`}
                >
                  {fr ? 'Aller sur cette page →' : 'Go to this page →'}
                </Link>
                {!done[selectedModule.key] && (
                  <button
                    onClick={() => {
                      handleDone(selectedModule.key);
                      setSelected(null);
                    }}
                    className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {fr ? 'Compris ✓' : 'Got it ✓'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
