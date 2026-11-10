import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FileText, UserCog, Truck,
  BarChart3, Tags, Heart, Store, FolderKanban, RefreshCw, Monitor, TrendingDown,
  Building2, Sparkles, Briefcase, ChevronRight, CheckCircle, BookOpen, X,
  MessageCircle, Globe, ClipboardCheck, HandCoins, CalendarDays, WifiOff, CreditCard, Settings,
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
  videoUrl?: string;
}

const ALL_MODULES: GuideModule[] = [
  {
    key: 'getting-started',
    icon: Sparkles,
    color: 'from-violet-500 to-violet-600',
    title: { fr: 'Commencer', en: 'Getting Started' },
    description: {
      fr: 'Ordre recommandé pour bien démarrer : produits → clients → commandes.',
      en: 'Recommended order to get started: products → clients → orders.',
    },
    steps: {
      fr: [
        '1️⃣ PRODUITS : Ajoute d\'abord tes produits avec leurs prix et stock. C\'est la base de ton catalogue.',
        '2️⃣ CLIENTS : Enregistre tes clients pour suivre leur historique d\'achats et les fidéliser.',
        '3️⃣ COMMANDES : Crée des commandes en quelques clics. Le stock se met à jour automatiquement.',
        '💡 Tu peux créer une commande avec "Client de passage" si tu n\'as pas encore enregistré de clients.',
        '💡 Tu peux aussi créer des produits directement depuis une commande, mais c\'est moins pratique.',
      ],
      en: [
        '1️⃣ PRODUCTS: Add your products first with prices and stock. This is the base of your catalog.',
        '2️⃣ CLIENTS: Register your clients to track their purchase history and build loyalty.',
        '3️⃣ ORDERS: Create orders in a few clicks. Stock updates automatically.',
        '💡 You can create an order with "Walk-in customer" if you haven\'t registered clients yet.',
        '💡 You can also create products directly from an order, but it\'s less convenient.',
      ],
    },
    link: '/products',
  },
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
        'Ajoute jusqu’à 5 photos (tu peux en choisir plusieurs d’un coup). La 1re est la photo principale ; touche l’étoile pour changer.',
        'Tailles, couleurs, parfums : ouvre « Variantes ». Une variante = une version avec son prix d’achat, son prix de vente et son stock (ex : « Large · Rouge »).',
        'Pour aller vite : écris les couleurs une seule fois, puis une ligne par taille avec son prix (Large 500, Medium 350…). Touche « Créer les variantes » : toutes les combinaisons sont créées avec le bon prix.',
        '« Même stock partout » remplit tous les stocks d’un coup ; corrige ensuite ceux qui sont différents.',
        'Vente en gros : mets le prix du paquet dans la variante. Coche « Vendu aussi à l’unité » seulement si tu vends aussi au détail (nombre d’unités dans 1 paquet + prix d’1 unité).',
        'Prix selon la quantité (facultatif) : ex « À partir de 10 → 1 750 ». La caisse applique le prix toute seule.',
        'Le prix de vente et le stock sont obligatoires (mets 0 si tu n’en as pas encore).',
        'Le prix de revient sert à calculer ton bénéfice dans les rapports.',
        'Ajoute un code-barres si nécessaire.',
        'Utilise le filtre pour chercher par nom ou catégorie.',
        'Le stock se met à jour automatiquement à chaque vente.',
      ],
      en: [
        'Click "New product" to add an item.',
        'Enter name, selling price, cost price and initial stock.',
        'Set a low stock alert threshold (e.g. 5 units).',
        'Add up to 5 photos (you can pick several at once). The 1st is the main photo; tap the star to change it.',
        'Sizes, colours, flavours: open “Variants”. A variant = one version with its own cost, selling price and stock (e.g. “Large · Red”).',
        'To go fast: type the colours once, then one row per size with its price (Large 500, Medium 350…). Tap “Create variants”: every combination is created with the right price.',
        '“Same stock everywhere” fills every stock at once; then fix the ones that differ.',
        'Wholesale: put the pack price in the variant. Tick “Also sold by unit” only if you also sell single items (units per pack + price of 1 unit).',
        'Quantity prices (optional): e.g. “From 10 → 1,750”. The register applies the price by itself.',
        'Selling price and stock are required (enter 0 if you have none yet).',
        'The cost price is used to compute your profit in reports.',
        'Add a barcode if needed.',
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
      fr: 'Enregistre les ventes de produits en stock. Le stock se met à jour automatiquement.',
      en: 'Record sales of products in stock. Stock updates automatically.',
    },
    steps: {
      fr: [
        'Clique sur "Nouvelle commande" pour créer une vente.',
        'Ajoute les produits depuis la liste ou par code-barres.',
        'Sélectionne ou crée un client (optionnel).',
        'Applique une remise si nécessaire.',
        'Choisis le mode de paiement (cash, mobile money, etc.).',
        'Entre le montant payé (total ou acompte).',
        'Clique "Enregistrer" — le stock est déduit automatiquement.',
        'Bouton 💬 WhatsApp texte : Envoie un résumé texte de la commande.',
        'Bouton 📤 Partager : Génère une image PDF professionnelle et l\'envoie sur WhatsApp.',
      ],
      en: [
        'Click "New order" to create a sale.',
        'Add products from the list or by barcode.',
        'Select or create a client (optional).',
        'Apply a discount if needed.',
        'Choose the payment method (cash, mobile money, etc.).',
        'Enter the amount paid (full or partial).',
        'Click "Save" — stock is deducted automatically.',
        '💬 WhatsApp text button: Sends a text summary of the order.',
        '📤 Share button: Generates a professional PDF image and sends via WhatsApp.',
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
        'Produit avec variantes : choisis la variante (taille, couleur). Produit en paquet : il part en paquet ; touche « → unité » sur la ligne pour vendre au détail.',
        'Ajuste les quantités directement dans le panier. Le prix de gros s’applique tout seul dès la quantité prévue.',
        'Saisis le montant reçu pour calculer la monnaie rendue.',
        'Valide la vente — le stock se met à jour instantanément.',
        'Imprime le ticket en 58 mm ou 80 mm ; choisis la taille du texte (M, L, XL, XXL). Le téléphone s’en souvient.',
      ],
      en: [
        'Access the POS from the sidebar.',
        'Scan a barcode or search a product by name.',
        'Click a product to add it to the cart.',
        'Product with variants: pick the variant (size, colour). Pack product: it goes in as a pack; tap “→ unit” on the line to sell single items.',
        'Adjust quantities directly in the cart. The wholesale price applies by itself from the set quantity.',
        'Enter the amount received to calculate change.',
        'Confirm the sale — stock updates instantly.',
        'Print the receipt on 58 mm or 80 mm; choose the text size (M, L, XL, XXL). The phone remembers it.',
      ],
    },
    link: '/pos',
    modes: ['PRODUCT'],
  },
  {
    key: 'cash-drawer',
    icon: ClipboardCheck,
    color: 'from-emerald-500 to-emerald-600',
    title: { fr: 'Ouverture / fermeture de caisse (rapport Z)', en: 'Open / close the drawer (Z report)' },
    description: {
      fr: 'Contrôlez l’argent du tiroir chaque jour : fond de caisse le matin, comptage le soir, écart et rapport Z imprimé.',
      en: 'Check the drawer money every day: float in the morning, count at night, difference and printed Z report.',
    },
    steps: {
      fr: [
        'Le matin, sur le tableau de bord ou dans « Clôture du jour », cliquez « Ouvrir la caisse » et saisissez le fond de caisse (la monnaie dans le tiroir).',
        'Vendez normalement à la caisse. Les ventes en espèces, Orange Money, MTN et les dettes encaissées sont comptées automatiquement.',
        'Une dépense payée en espèces (transport, achat…) est retirée de l’argent attendu dans le tiroir.',
        'Le soir, comptez l’argent du tiroir, saisissez le montant compté puis cliquez « Fermer et éditer le Z ».',
        'Le rapport Z affiche : ventes, encaissements par moyen, fond + espèces − sorties = attendu, compté, et l’écart (MANQUE ou SURPLUS).',
        'Il montre aussi ce que chaque employé a vendu (articles et montants) et le bénéfice du jour.',
        'Imprimez le Z en ticket 58 mm ou 80 mm, ou envoyez-le sur WhatsApp. Un Z fermé ne peut plus être modifié.',
        'Retrouvez tous les anciens Z dans « Rapports Z » (historique). Si des ventes hors ligne sont en attente, reconnectez-vous avant de fermer.',
      ],
      en: [
        'In the morning, on the dashboard or in “Daily closing”, click “Open drawer” and enter the float (change in the drawer).',
        'Sell as usual at the POS. Cash, Orange Money, MTN sales and collected debts are counted automatically.',
        'An expense paid in cash (transport, purchase…) is taken out of the expected drawer cash.',
        'At night, count the drawer, enter the counted amount and click “Close & print Z”.',
        'The Z report shows: sales, payments by method, float + cash − cash out = expected, counted, and the difference (SHORT or OVER).',
        'It also shows what each employee sold (items and amounts) and the day’s profit.',
        'Print the Z on a 58 mm or 80 mm receipt, or send it on WhatsApp. A closed Z can no longer be changed.',
        'Find all past Z reports under “Z reports” (history). If offline sales are pending, reconnect before closing.',
      ],
    },
    link: '/closing',
    modes: ['PRODUCT'],
  },
  {
    key: 'offline',
    icon: WifiOff,
    color: 'from-slate-500 to-slate-600',
    title: { fr: 'Vendre sans internet', en: 'Selling offline' },
    description: {
      fr: 'La caisse continue de marcher sans connexion. Les ventes partent toutes seules quand internet revient.',
      en: 'The cash register keeps working without a connection. Sales are sent automatically when internet is back.',
    },
    steps: {
      fr: [
        'Ouvre l’app au moins une fois avec internet pour charger tes produits et tes clients.',
        'Sans internet, vends normalement à la caisse : la vente est gardée sur le téléphone.',
        'Dès que la connexion revient, les ventes sont envoyées automatiquement, sans doublon, et le stock se met à jour.',
        'Hors ligne, tu ne peux pas créer de nouveau client : choisis un client existant ou « Client de passage ».',
        'Avant de fermer la caisse (rapport Z), reconnecte-toi pour envoyer les ventes en attente.',
      ],
      en: [
        'Open the app at least once online to load your products and clients.',
        'Without internet, sell as usual at the POS: the sale is kept on the phone.',
        'As soon as the connection is back, sales are sent automatically, without duplicates, and stock updates.',
        'Offline you cannot create a new client: pick an existing one or “Walk-in client”.',
        'Before closing the drawer (Z report), reconnect to send pending sales.',
      ],
    },
    link: '/pos',
    modes: ['PRODUCT'],
  },
  {
    key: 'agenda',
    icon: CalendarDays,
    color: 'from-pink-500 to-pink-600',
    title: { fr: 'Agenda des commandes', en: 'Orders agenda' },
    description: {
      fr: 'Pour les commandes à préparer et à remettre plus tard (gâteaux, sur commande…) : date de retrait et acompte.',
      en: 'For orders to prepare and hand over later (cakes, made to order…): pickup date and deposit.',
    },
    steps: {
      fr: [
        'À la caisse, ouvre « Note / date de retrait », choisis la date, puis valide en « acompte » si le client paie une partie.',
        'Le reste à payer est suivi automatiquement.',
        'Ouvre l’Agenda : il montre les commandes des 31 prochains jours, jour par jour, avec le client, l’acompte et ce qui est payé.',
        'Quand le client récupère sa commande, encaisse le reste puis marque-la « Remis ».',
      ],
      en: [
        'At the POS, open “Note / pickup date”, pick the date, then confirm as a deposit if the customer pays part of it.',
        'The remaining balance is tracked automatically.',
        'Open the Agenda: it shows orders for the next 31 days, day by day, with the client, the deposit and what is paid.',
        'When the customer picks up the order, collect the rest and mark it “Done”.',
      ],
    },
    link: '/agenda',
    modes: ['PRODUCT'],
  },
  {
    key: 'debts',
    icon: HandCoins,
    color: 'from-rose-500 to-rose-600',
    title: { fr: 'Dettes clients', en: 'Client debts' },
    description: {
      fr: 'Suivez qui vous doit de l’argent et relancez par WhatsApp.',
      en: 'Track who owes you money and remind them on WhatsApp.',
    },
    steps: {
      fr: [
        'À la caisse, choisissez (ou créez) la cliente et saisissez seulement le montant reçu : le reste devient une dette.',
        'Ouvrez « Dettes clients » : vous voyez chaque cliente, le total dû et depuis combien de jours.',
        'Cliquez « Rappel » pour envoyer un message WhatsApp prêt avec le montant et la facture.',
        'Quand elle paie, cliquez « Encaisser », saisissez le montant et le moyen de paiement. La dette baisse ou disparaît.',
      ],
      en: [
        'At the POS, select (or create) the client and enter only the amount received: the rest becomes a debt.',
        'Open “Client debts”: you see each client, the total due and for how many days.',
        'Click “Remind” to send a ready WhatsApp message with the amount and invoice.',
        'When she pays, click “Collect”, enter the amount and payment method. The debt goes down or disappears.',
      ],
    },
    link: '/debts',
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
        'Lors de la création d\'une commande, active l\'option livraison.',
        'Renseigne l\'adresse et le numéro de téléphone du destinataire.',
        'Change le statut manuellement : En attente → Récupéré → En route → Livré.',
        'Envoie le statut de livraison directement par WhatsApp au client.',
      ],
      en: [
        'When creating an order, enable the delivery option.',
        'Enter the recipient\'s address and phone number.',
        'Manually update the status: Pending → Picked up → In transit → Delivered.',
        'Send the delivery status directly via WhatsApp to the client.',
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
        'Attribue des points manuellement depuis la fiche client.',
        'Consulte le niveau de fidélité de chaque client (Bronze/Silver/Gold).',
        'Applique une récompense lors d\'une commande en sélectionnant le client.',
      ],
      en: [
        'Create rewards: e.g. "10% discount for 500 points".',
        'Manually assign points from the client profile.',
        'View each client\'s loyalty tier (Bronze/Silver/Gold).',
        'Apply a reward when creating an order by selecting the client.',
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
      fr: 'Deux modes : factures liées aux commandes (automatiques) ou factures indépendantes (manuelles pour services/frais).',
      en: 'Two modes: order-linked invoices (automatic) or standalone invoices (manual for services/fees).',
    },
    steps: {
      fr: [
        'MODE 1 — Facture automatique : Générée quand tu crées une commande. Tu la retrouves dans le menu Factures.',
        'MODE 2 — Facture indépendante : Menu → Factures → bouton "+" → Ajoute des lignes manuellement.',
        'Utilise les factures indépendantes pour : services, frais de livraison, acomptes, pénalités, facturation mensuelle.',
        'Les factures indépendantes NE touchent PAS au stock.',
        'Bouton 💬 WhatsApp texte : Envoie un résumé texte (numéro, montant, statut).',
        'Bouton 📤 Partager : Génère une image PDF professionnelle avec ton logo et l\'envoie sur WhatsApp.',
        'Bouton 📧 Email : Envoie la facture par email au client.',
        'Retour d’un article : touche ↺ sur la vente, indique combien la cliente rapporte. L’article repart dans son stock (même variante, à l’unité ou en paquet comme vendu) et l’app affiche la somme à rendre.',
      ],
      en: [
        'MODE 1 — Automatic invoice: Generated when you create an order. Find it in the Invoices menu.',
        'MODE 2 — Standalone invoice: Menu → Invoices → "+" button → Add lines manually.',
        'Use standalone invoices for: services, delivery fees, deposits, penalties, monthly billing.',
        'Standalone invoices do NOT affect stock.',
        '💬 WhatsApp text button: Sends a text summary (number, amount, status).',
        '📤 Share button: Generates a professional PDF image with your logo and sends via WhatsApp.',
        '📧 Email button: Sends the invoice by email to the client.',
        'Item returned: tap ↺ on the sale and enter how many the client brings back. It goes back to its own stock (same variant, unit or pack as sold) and the app shows the amount to give back.',
      ],
    },
    link: '/invoices',
  },
  {
    key: 'whatsapp-order',
    icon: MessageCircle,
    color: 'from-green-500 to-green-600',
    title: { fr: 'Lien commande WhatsApp', en: 'WhatsApp Order Link' },
    description: {
      fr: 'Chaque commande génère un lien unique que le client peut ouvrir pour voir le détail et confirmer directement sur WhatsApp.',
      en: 'Each order generates a unique link the client can open to view details and confirm directly on WhatsApp.',
    },
    steps: {
      fr: [
        'Crée une commande et enregistre-la.',
        'Bouton 💬 Texte : Envoie un résumé texte rapide (réf., montant, statut) — idéal pour confirmer vite.',
        'Bouton 📤 Partager : Génère une image PDF professionnelle avec ton logo et l\'envoie sur WhatsApp.',
        'Le lien de commande (/order/...) est une page web publique que le client peut consulter à tout moment.',
        'Le client voit les articles, le montant payé, le reste à payer et le statut de la commande.',
        'Il peut cliquer “Confirmer sur WhatsApp” pour te contacter directement depuis la page.',
      ],
      en: [
        'Create an order and save it.',
        '💬 Text button: Sends a quick text summary (ref, amount, status) — ideal for fast confirmation.',
        '📤 Share button: Generates a professional PDF image with your logo and sends via WhatsApp.',
        'The order link (/order/...) is a public web page the client can view at any time.',
        'The client sees items, amount paid, remaining balance and order status.',
        'They can click “Confirm on WhatsApp” to contact you directly from the page.',
      ],
    },
    link: '/orders',
    modes: ['PRODUCT'],
  },
  {
    key: 'storefront',
    icon: Globe,
    color: 'from-blue-500 to-indigo-600',
    title: { fr: 'Vitrine publique en ligne', en: 'Public Online Storefront' },
    description: {
      fr: 'Une page web avec tout ton catalogue. Tes clients remplissent un panier et la commande arrive dans Commandes et sur ton WhatsApp. Offre BUSINESS (gratuite pendant l’essai).',
      en: 'A web page with your full catalog. Customers fill a cart and the order lands in Orders and on your WhatsApp. BUSINESS plan (free during the trial).',
    },
    steps: {
      fr: [
        'Mets ton numéro WhatsApp dans Paramètres → Boutique (obligatoire pour recevoir les messages).',
        'Copie ton lien depuis le tableau de bord (« Copier vitrine ») ou Paramètres : kabrak-store.kabrakeng.com/storefront/TON-NOM.',
        'Partage-le sur WhatsApp, ton statut, Instagram, Facebook ou par SMS.',
        'La vitrine s’ouvre dans la langue de ta boutique (Paramètres) ; le client peut passer en français ou en anglais avec le bouton FR / EN.',
        'Le client touche une photo pour voir toutes les photos du produit en grand.',
        'Le client choisit ses produits, la taille (seulement celles en stock) et la couleur, puis la quantité.',
        'Il met son nom et son téléphone et valide : la commande est créée « En attente » dans Commandes, avec une notification 🔔, et le stock est réservé.',
        'WhatsApp s’ouvre avec le récapitulatif (articles, tailles, total, référence) pour qu’il te l’envoie.',
        'Confirme la commande dans Commandes, encaisse le paiement, puis livre. Si le client ne vient pas, annule : le stock revient.',
        'Après l’essai, la vitrine ne marche qu’avec l’offre BUSINESS. Sinon tes clients voient « boutique indisponible ».',
      ],
      en: [
        'Set your WhatsApp number in Settings → Store (required to receive messages).',
        'Copy your link from the dashboard (“Copy link”) or Settings: kabrak-store.kabrakeng.com/storefront/YOUR-NAME.',
        'Share it on WhatsApp, your status, Instagram, Facebook or SMS.',
        'The storefront opens in your shop language (Settings); customers can switch between French and English with the FR / EN button.',
        'Customers tap a photo to see all the product photos in full size.',
        'The customer picks products, size (only sizes in stock) and colour, then quantity.',
        'They enter name and phone and confirm: the order is created “Pending” in Orders with a 🔔 notification, and stock is reserved.',
        'WhatsApp opens with the summary (items, sizes, total, reference) for them to send to you.',
        'Confirm the order in Orders, collect payment, then deliver. If the customer never comes, cancel it: stock comes back.',
        'After the trial, the storefront only works on the BUSINESS plan. Otherwise customers see “store unavailable”.',
      ],
    },
    link: '/settings',
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
      fr: 'Ajoute ton équipe et choisis les modules que chaque employé peut voir.',
      en: 'Add your team and choose which modules each employee can see.',
    },
    steps: {
      fr: [
        'Crée un compte employé depuis la page Employés.',
        'Choisis « Accès complet » ou « Choisir les modules » et coche seulement ce qu’il doit voir (ex : Caisse, Clients).',
        'Donne-lui son email et son mot de passe : à la connexion, il arrive directement sur la Caisse.',
        'Chaque vente est tracée par employé dans les rapports.',
      ],
      en: [
        'Create an employee account from the Employees page.',
        'Choose “Full access” or “Choose modules” and tick only what they should see (e.g. POS, Clients).',
        'Give them their email and password: after login they land straight on the POS.',
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
        'Accède aux Rapports IA depuis la sidebar (éclair violet).',
        'Choisis la période : 7 jours ou ce mois.',
        'Clique sur "Générer le rapport" — l\'IA analyse tes ventes, dépenses et stock.',
        'Tu reçois des recommandations concrètes : produits à valoriser, périodes creuses, alertes.',
        'Réservé à l’offre BUSINESS (illimité).',
      ],
      en: [
        'Access AI Reports from the sidebar (purple spark icon).',
        'Choose the period: 7 days or this month.',
        'Click "Generate report" — AI analyzes your sales, expenses and stock.',
        'You receive concrete recommendations: products to promote, slow periods, alerts.',
        'BUSINESS plan only (unlimited).',
      ],
    },
    link: '/ai-reports',
    plans: ['SHOP', 'BUSINESS'],
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
  {
    key: 'billing',
    icon: CreditCard,
    color: 'from-orange-500 to-orange-600',
    title: { fr: 'Abonnement et paiement', en: 'Subscription and payment' },
    description: {
      fr: 'Choisis ton offre (STORE, SHOP, BUSINESS) et paie par Orange Money.',
      en: 'Choose your plan (STORE, SHOP, BUSINESS) and pay with Orange Money.',
    },
    steps: {
      fr: [
        'Va dans Abonnement, choisis l’offre et la durée, puis clique sur « Payer ».',
        'Une référence KBS-… s’affiche. Compose le code Orange Money indiqué, entre le montant exact et mets cette référence.',
        'Envoie la capture du SMS de confirmation sur WhatsApp : ton abonnement est activé dès que le paiement est validé.',
        'Si tu cliques plusieurs fois sur « Payer » pour la même offre, tu gardes la même référence : tu ne paies qu’une fois.',
        '3 jours avant la fin, un bandeau te prévient. Le jour de la fin, l’app se bloque jusqu’au renouvellement.',
      ],
      en: [
        'Go to Subscription, choose the plan and duration, then click “Pay”.',
        'A KBS-… reference is shown. Dial the Orange Money code shown, enter the exact amount and use this reference.',
        'Send the confirmation SMS screenshot on WhatsApp: your subscription is activated as soon as the payment is approved.',
        'If you click “Pay” several times for the same plan, you keep the same reference: you only pay once.',
        '3 days before the end, a banner warns you. On the end date the app locks until you renew.',
      ],
    },
    link: '/billing',
  },
  {
    key: 'settings',
    icon: Settings,
    color: 'from-gray-500 to-gray-600',
    title: { fr: 'Paramètres', en: 'Settings' },
    description: {
      fr: 'Les informations de ta boutique utilisées sur les factures, les reçus et la vitrine.',
      en: 'Your shop details used on invoices, receipts and the storefront.',
    },
    steps: {
      fr: [
        'Ma boutique : nom, téléphone WhatsApp, adresse et logo. Ils apparaissent sur les factures et la vitrine.',
        'Choisis la devise et la « Langue de l’app » : c’est aussi la langue des factures et la langue par défaut de ta vitrine.',
        'Copie ou ouvre le lien de ta vitrine en ligne.',
        'Mets à jour ton profil et change ton mot de passe.',
      ],
      en: [
        'My shop: name, WhatsApp phone, address and logo. They appear on invoices and the storefront.',
        'Choose the currency and the “App language”: it is also the language of invoices and the default language of your storefront.',
        'Copy or open your online storefront link.',
        'Update your profile and change your password.',
      ],
    },
    link: '/settings',
  },
];

interface PathStep {
  key: string;
  title: { fr: string; en: string };
  why: { fr: string; en: string };
}

const SHOP_PATH: PathStep[] = [
  { key: 'settings', title: { fr: 'Régler ma boutique', en: 'Set up my shop' }, why: { fr: 'Nom, téléphone et logo : ils sortent sur chaque ticket et facture.', en: 'Name, phone and logo: they appear on every receipt and invoice.' } },
  { key: 'products', title: { fr: 'Enregistrer mes produits', en: 'Add my products' }, why: { fr: 'Prix d’achat, prix de vente, tailles et stock. Sans produits, on ne peut rien vendre.', en: 'Cost, selling price, sizes and stock. Without products there is nothing to sell.' } },
  { key: 'cash-drawer', title: { fr: 'Ouvrir la caisse le matin', en: 'Open the drawer in the morning' }, why: { fr: 'Tu notes la monnaie dans le tiroir. Le soir, l’app saura combien d’argent tu dois avoir.', en: 'You note the change in the drawer. At night the app knows how much money you should have.' } },
  { key: 'pos', title: { fr: 'Vendre et imprimer le ticket', en: 'Sell and print the receipt' }, why: { fr: 'Chaque vente retire le stock, calcule le bénéfice et donne un ticket à la cliente.', en: 'Each sale removes stock, computes profit and gives the client a receipt.' } },
  { key: 'clients', title: { fr: 'Enregistrer mes clientes', en: 'Save my clients' }, why: { fr: 'Pour suivre ce qu’elles achètent, leurs dettes et les relancer sur WhatsApp.', en: 'To follow what they buy, their debts and remind them on WhatsApp.' } },
  { key: 'invoices', title: { fr: 'Factures et retours', en: 'Invoices and returns' }, why: { fr: 'Retrouver une vente, encaisser un reste à payer ou reprendre un article.', en: 'Find a sale, collect a balance or take an item back.' } },
  { key: 'cash-drawer', title: { fr: 'Fermer la caisse le soir', en: 'Close the drawer at night' }, why: { fr: 'Tu comptes l’argent : l’app montre s’il manque ou s’il y a trop, et ce que chaque vendeur a vendu.', en: 'You count the money: the app shows any shortage or surplus, and what each seller sold.' } },
  { key: 'reports', title: { fr: 'Voir mon bénéfice', en: 'See my profit' }, why: { fr: 'Ventes, dépenses et bénéfice net de la semaine ou du mois.', en: 'Sales, expenses and net profit for the week or month.' } },
];

const ORDER_PATH: PathStep[] = [
  SHOP_PATH[0],
  SHOP_PATH[1],
  { key: 'orders', title: { fr: 'Prendre une commande', en: 'Take an order' }, why: { fr: 'Date de retrait, acompte et reste à payer : tout est noté.', en: 'Pickup date, deposit and balance: everything is recorded.' } },
  { key: 'agenda', title: { fr: 'Voir l’agenda', en: 'Check the agenda' }, why: { fr: 'Les commandes à préparer jour par jour, pour ne rien oublier.', en: 'Orders to prepare day by day, so nothing is forgotten.' } },
  { key: 'debts', title: { fr: 'Suivre les restes à payer', en: 'Follow balances due' }, why: { fr: 'Qui doit encore combien, avec un rappel WhatsApp.', en: 'Who still owes how much, with a WhatsApp reminder.' } },
  SHOP_PATH[7],
];

const SERVICE_PATH: PathStep[] = [
  SHOP_PATH[0],
  { key: 'services', title: { fr: 'Enregistrer mes services', en: 'Add my services' }, why: { fr: 'Tes prestations et leurs prix.', en: 'Your services and their prices.' } },
  SHOP_PATH[4],
  { key: 'projects', title: { fr: 'Suivre un projet', en: 'Follow a project' }, why: { fr: 'Étapes, délais et paiements de chaque client.', en: 'Steps, deadlines and payments for each client.' } },
  SHOP_PATH[5],
  SHOP_PATH[7],
];

const ORDER_BASED_CATS = new Set(['CAKES', 'FOOD_BUSINESS']);
const PATH_DONE_KEY = 'kabrak_guide_path_done';

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

  const cats = (tenant?.businessCategories || []) as string[];
  const orderBased = cats.length > 0 && cats.every((c) => ORDER_BASED_CATS.has(c));
  const path = (mode === 'SERVICE' ? SERVICE_PATH : orderBased ? ORDER_PATH : SHOP_PATH)
    .filter((st) => visibleModules.some((m) => m.key === st.key));
  const [pathDone, setPathDone] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(PATH_DONE_KEY) || '[]'); } catch { return []; }
  });
  const togglePath = (i: number) => {
    const next = pathDone.includes(i) ? pathDone.filter((x) => x !== i) : [...pathDone, i];
    setPathDone(next);
    localStorage.setItem(PATH_DONE_KEY, JSON.stringify(next));
  };
  const nextStep = path.findIndex((_, i) => !pathDone.includes(i));
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

      {/* Start path */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 dark:text-white text-lg">
          {fr ? 'Bienvenue dans le guide KABRAK Store' : 'Welcome to the KABRAK Store guide'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {fr
            ? 'Suivez ces étapes dans l’ordre. Touchez une étape pour voir comment faire, puis cochez-la quand c’est fait.'
            : 'Follow these steps in order. Tap a step to see how, then tick it when done.'}
        </p>
        <ol className="mt-4 space-y-2">
          {path.map((st, i) => {
            const isDone = pathDone.includes(i);
            const isNext = i === nextStep;
            return (
              <li
                key={`${st.key}-${i}`}
                className={`flex items-start gap-3 rounded-xl border p-3 ${isNext ? 'border-blue-300 bg-blue-50/60 dark:border-blue-700 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700'}`}
              >
                <button
                  onClick={() => togglePath(i)}
                  aria-label={fr ? 'Marquer comme fait' : 'Mark as done'}
                  className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-500 dark:border-gray-600'}`}
                >
                  <span>{isDone ? '✓' : i + 1}</span>
                </button>
                <button onClick={() => setSelected(st.key)} className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-semibold ${isDone ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {st.title[fr ? 'fr' : 'en']}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{st.why[fr ? 'fr' : 'en']}</p>
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400 mt-1.5 shrink-0" />
              </li>
            );
          })}
        </ol>
        {nextStep === -1 && path.length > 0 && (
          <p className="mt-3 text-sm font-medium text-green-600">
            {fr ? 'Bravo, votre boutique est prête. Les autres modules sont expliqués plus bas.' : 'Well done, your shop is ready. The other modules are explained below.'}
          </p>
        )}
      </div>

      <h2 className="font-bold text-gray-900 dark:text-white">{fr ? 'Tous les modules' : 'All modules'}</h2>

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

              {selectedModule.videoUrl ? (
                <a
                  href={selectedModule.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">▶️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">{fr ? 'Voir la démo vidéo' : 'Watch video demo'}</p>
                    <p className="text-[11px] text-red-400">{fr ? 'Cliquez pour regarder' : 'Click to watch'}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">{fr ? 'Vidéo' : 'Video'}</span>
                </a>
              ) : (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🎥</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{fr ? 'Démo vidéo' : 'Video demo'}</p>
                    <p className="text-[11px] text-gray-400">{fr ? 'Bientôt disponible' : 'Coming soon'}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-600 font-medium">{fr ? 'Bientôt' : 'Soon'}</span>
                </div>
              )}

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
