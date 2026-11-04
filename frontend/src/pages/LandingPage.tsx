import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowRight, Check, ChevronDown, ChevronUp, Globe, MessageCircle, Minus,
  WifiOff, Ruler, HandCoins, ClipboardCheck, Receipt, TrendingUp, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const WHATSAPP = 'https://wa.me/237653561862';

const faqsFR = [
  { q: 'Ça marche sans internet ?', a: 'Oui pour la caisse. Si la connexion coupe, vous continuez à vendre : les ventes sont gardées sur le téléphone et envoyées toutes seules quand internet revient, sans doublon. Il faut avoir ouvert l\'app une fois avec internet sur l\'appareil.' },
  { q: 'C\'est pour quel type de commerce ?', a: 'Boutiques de vêtements, chaussures, sacs, bijoux, hijabs, pagnes, pâtisseries, restauration, mini-marchés, cosmétiques, quincailleries, grossistes, et aussi prestataires de services (agences, freelances, salons). Vous pouvez choisir plusieurs activités.' },
  { q: 'Je dois installer quelque chose ?', a: 'Non. KABRAK s\'ouvre dans le navigateur et s\'ajoute à l\'écran d\'accueil du téléphone comme une application, sans Play Store.' },
  { q: 'Comment je paie l\'abonnement ?', a: 'Par Orange Money, depuis la page Abonnement de l\'application.' },
  { q: 'Combien de personnes peuvent l\'utiliser ?', a: 'STORE : 1 personne. SHOP : 3 personnes. BUSINESS : sans limite, avec plusieurs magasins. Chaque vendeuse a son propre accès.' },
  { q: 'Si je perds mon téléphone, je perds tout ?', a: 'Non. Vos données sont enregistrées sur nos serveurs, pas seulement sur le téléphone. Vous vous reconnectez sur un autre appareil et vous retrouvez tout. Vous pouvez aussi exporter vos données à tout moment.' },
  { q: 'Y a-t-il un essai gratuit ?', a: '7 jours gratuits avec toutes les fonctions. Aucune carte bancaire.' },
];
const faqsEN = [
  { q: 'Does it work without internet?', a: 'Yes for the cash register. If the connection drops you keep selling: sales are kept on the phone and sent automatically when internet is back, without duplicates. The app must have been opened once online on that device.' },
  { q: 'What kind of business is it for?', a: 'Clothing, shoes, bags, jewelry, hijab and fabric shops, bakeries, food businesses, mini-markets, cosmetics, hardware stores, wholesalers, and service providers (agencies, freelancers, salons). You can pick several activities.' },
  { q: 'Do I need to install anything?', a: 'No. KABRAK opens in the browser and can be added to your phone home screen like an app, without the Play Store.' },
  { q: 'How do I pay for the subscription?', a: 'With Orange Money, from the Billing page in the app.' },
  { q: 'How many people can use it?', a: 'STORE: 1 person. SHOP: 3 people. BUSINESS: unlimited, with several stores. Each seller has their own login.' },
  { q: 'If I lose my phone, do I lose everything?', a: 'No. Your data is stored on our servers, not only on the phone. Log in on another device and everything is there. You can also export your data at any time.' },
  { q: 'Is there a free trial?', a: '7 days free with every feature. No bank card.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left">
        <span className="font-semibold text-gray-900 text-sm sm:text-base pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  );
}

function Screenshot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}

type Cell = boolean | 'partial';

export function LandingPage() {
  const { language, setLanguage } = useAuthStore();
  const fr = language === 'fr';
  const faqs = fr ? faqsFR : faqsEN;

  const features = [
    { icon: WifiOff, title: fr ? 'Caisse qui marche sans internet' : 'A register that works offline', text: fr ? 'Coupure de réseau ? Vous vendez quand même. Tout se synchronise au retour de la connexion.' : 'Network down? Keep selling. Everything syncs when the connection is back.' },
    { icon: Ruler, title: fr ? 'Stock par taille et couleur' : 'Stock by size and colour', text: fr ? 'Robe M : 4, L : 2. La vente d\'une taille baisse son stock, l\'annulation le remet.' : 'Dress M: 4, L: 2. Selling a size lowers its stock, cancelling puts it back.' },
    { icon: HandCoins, title: fr ? 'Dettes clients et rappel WhatsApp' : 'Client debts and WhatsApp reminders', text: fr ? 'Qui vous doit combien, depuis quand. Un clic pour envoyer un rappel poli sur WhatsApp.' : 'Who owes you what, since when. One tap to send a polite WhatsApp reminder.' },
    { icon: ClipboardCheck, title: fr ? 'Clôture du jour' : 'Daily closing', text: fr ? 'Ventes, espèces, Orange Money, MTN, dépenses et bénéfice du jour, par vendeuse. À envoyer à la patronne sur WhatsApp.' : 'Sales, cash, Orange Money, MTN, expenses and profit of the day, per seller. Send it to the owner on WhatsApp.' },
    { icon: Receipt, title: fr ? 'Factures et tickets' : 'Invoices and receipts', text: fr ? 'Facture PDF avec votre logo, reçu WhatsApp, ticket pour imprimante 80 mm.' : 'PDF invoice with your logo, WhatsApp receipt, 80 mm printer ticket.' },
    { icon: TrendingUp, title: fr ? 'Votre vrai bénéfice' : 'Your real profit', text: fr ? 'Prix d\'achat enregistré à chaque vente, moins le loyer, le transport et les salaires.' : 'Purchase price saved with every sale, minus rent, transport and salaries.' },
  ];

  const businesses = fr
    ? ['Vêtements', 'Chaussures & sacs', 'Bijoux', 'Hijabs & abayas', 'Pagnes & tissus', 'Pâtisserie', 'Restauration', 'Mini-marché', 'Cosmétiques', 'Quincaillerie', 'Grossiste', 'Agence & freelance']
    : ['Clothing', 'Shoes & bags', 'Jewelry', 'Hijabs & abayas', 'Fabrics', 'Bakery', 'Food', 'Mini-market', 'Cosmetics', 'Hardware', 'Wholesale', 'Agency & freelance'];

  const comparison: Array<{ label: string; cahier: Cell; excel: Cell; kabrak: Cell }> = [
    { label: fr ? 'Le stock se calcule tout seul' : 'Stock updates itself', cahier: false, excel: 'partial', kabrak: true },
    { label: fr ? 'Marche sans internet' : 'Works without internet', cahier: true, excel: true, kabrak: true },
    { label: fr ? 'Utilisable sur téléphone' : 'Usable on a phone', cahier: true, excel: 'partial', kabrak: true },
    { label: fr ? 'Liste des dettes + rappel WhatsApp' : 'Debt list + WhatsApp reminder', cahier: false, excel: false, kabrak: true },
    { label: fr ? 'Bénéfice réel (achats et dépenses déduits)' : 'Real profit (cost and expenses deducted)', cahier: false, excel: 'partial', kabrak: true },
    { label: fr ? 'Plusieurs vendeuses, chacune son accès' : 'Several sellers, each with a login', cahier: false, excel: false, kabrak: true },
    { label: fr ? 'Rien n\'est perdu si le téléphone est perdu' : 'Nothing lost if the phone is lost', cahier: false, excel: 'partial', kabrak: true },
  ];

  const plans = [
    {
      name: 'STORE', price: '4 900', perDay: fr ? 'soit 163 FCFA par jour' : 'about 163 FCFA a day',
      who: fr ? 'Pour une vendeuse seule' : 'For a single seller', users: fr ? '1 utilisateur' : '1 user',
      features: fr
        ? ['Caisse, hors ligne compris', 'Produits, tailles et stock', 'Clients et dettes', 'Factures et reçus WhatsApp', 'Clôture du jour', 'Dépenses et bénéfice net', 'Agenda des commandes']
        : ['Register, offline included', 'Products, sizes and stock', 'Clients and debts', 'Invoices and WhatsApp receipts', 'Daily closing', 'Expenses and net profit', 'Order agenda'],
    },
    {
      name: 'SHOP', price: '9 900', perDay: fr ? 'soit 330 FCFA par jour' : 'about 330 FCFA a day', popular: true,
      who: fr ? 'Pour une boutique avec employées' : 'For a shop with staff', users: fr ? '3 utilisateurs' : '3 users',
      features: fr
        ? ['Tout STORE', 'Scanner de code-barres', 'Employées et vendeurs', 'Livraisons', 'Fidélité clients', 'Fournisseurs', 'Rapports détaillés']
        : ['Everything in STORE', 'Barcode scanner', 'Staff and sellers', 'Deliveries', 'Customer loyalty', 'Suppliers', 'Detailed reports'],
    },
    {
      name: 'BUSINESS', price: '14 900', perDay: fr ? 'soit 497 FCFA par jour' : 'about 497 FCFA a day',
      who: fr ? 'Pour plusieurs magasins' : 'For several stores', users: fr ? 'Utilisateurs illimités' : 'Unlimited users',
      features: fr
        ? ['Tout SHOP', 'Plusieurs magasins', 'Vitrine en ligne et commande WhatsApp', 'Rapports IA']
        : ['Everything in SHOP', 'Several stores', 'Online catalogue and WhatsApp ordering', 'AI reports'],
    },
  ];

  const renderCell = (v: Cell) =>
    v === true ? <Check className="w-5 h-5 text-blue-600 mx-auto" aria-label="oui" />
      : v === 'partial' ? <Minus className="w-5 h-5 text-gray-400 mx-auto" aria-label="partiel" />
        : <X className="w-5 h-5 text-gray-300 mx-auto" aria-label="non" />;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center"><img src="/logo.png" alt="KABRAK" className="h-12 sm:h-14 object-contain" /></Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setLanguage(fr ? 'en' : 'fr')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-medium">
              <Globe className="w-3.5 h-3.5" /> {fr ? 'EN' : 'FR'}
            </button>
            <Link to="/login" className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-gray-900">{fr ? 'Connexion' : 'Login'}</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">{fr ? 'Essai gratuit' : 'Free trial'}</Link>
          </div>
        </div>
      </nav>

      <section className="pt-28 sm:pt-32 pb-16 px-5">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              {fr ? 'Vendez, suivez votre stock et vos dettes, même sans internet.' : 'Sell, track your stock and your debts, even without internet.'}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-600 max-w-xl">
              {fr
                ? 'Fini le cahier. Encaissez en espèces, Orange Money ou MTN, suivez chaque taille en stock, relancez les clientes qui vous doivent et voyez votre vrai bénéfice chaque soir, depuis votre téléphone.'
                : 'No more notebook. Take cash, Orange Money or MTN, track every size in stock, remind customers who owe you and see your real profit every evening, from your phone.'}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                {fr ? 'Essayer gratuitement 7 jours' : 'Try free for 7 days'} <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={`${WHATSAPP}?text=${encodeURIComponent(fr ? 'Bonjour, je veux une démo de KABRAK' : 'Hello, I would like a KABRAK demo')}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-gray-300 font-semibold text-gray-800 hover:bg-gray-50">
                <MessageCircle className="w-4 h-4" /> {fr ? 'Démo sur WhatsApp' : 'WhatsApp demo'}
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500">{fr ? 'Sans carte bancaire. Paiement par Orange Money. À partir de 4 900 FCFA par mois.' : 'No bank card. Pay with Orange Money. From 4,900 FCFA a month.'}</p>
          </div>
          <div className="relative">
            <Screenshot src="/screens/dashboard.png" alt={fr ? 'Tableau de bord KABRAK' : 'KABRAK dashboard'} className="w-full rounded-xl border border-gray-200 shadow-xl" />
            <Screenshot src="/screens/pos-mobile.png" alt={fr ? 'Caisse KABRAK sur téléphone' : 'KABRAK register on a phone'} className="hidden sm:block absolute -bottom-8 -left-6 w-40 rounded-2xl border-4 border-gray-900 shadow-2xl" />
          </div>
        </div>
      </section>

      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">{fr ? 'Ce que vous faites chaque jour, en plus simple' : 'What you do every day, made simpler'}</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-200 p-6">
                <Icon className="w-6 h-6 text-blue-600" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">{fr ? 'Fait pour votre activité' : 'Built for your trade'}</h2>
          <p className="mt-2 text-gray-600">{fr ? 'À l\'inscription, cochez une ou plusieurs activités : les fiches produits s\'adaptent (tailles, couleurs, parfums, métrage…).' : 'At sign-up, tick one or more activities: product forms adapt (sizes, colours, flavours, length…).'}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {businesses.map((b) => <span key={b} className="px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700">{b}</span>)}
          </div>
        </div>
      </section>

      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">{fr ? 'Cahier, Excel ou KABRAK ?' : 'Notebook, Excel or KABRAK?'}</h2>
          <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="text-left font-medium p-4" />
                  <th className="font-medium p-4 w-24">{fr ? 'Cahier' : 'Notebook'}</th>
                  <th className="font-medium p-4 w-24">Excel</th>
                  <th className="font-semibold p-4 w-24 text-blue-700">KABRAK</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 last:border-0">
                    <td className="p-4 text-gray-800">{row.label}</td>
                    <td className="p-4">{renderCell(row.cahier)}</td>
                    <td className="p-4">{renderCell(row.excel)}</td>
                    <td className="p-4 bg-blue-50/50">{renderCell(row.kabrak)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">{fr ? 'Tarifs' : 'Pricing'}</h2>
          <p className="mt-2 text-gray-600">{fr ? '7 jours gratuits sur toutes les offres. Factures WhatsApp et mode hors ligne inclus partout.' : '7 days free on every plan. WhatsApp invoices and offline mode included everywhere.'}</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-xl border p-6 flex flex-col ${plan.popular ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">KABRAK {plan.name}</span>
                  {plan.popular && <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">{fr ? 'Le plus choisi' : 'Most popular'}</span>}
                </div>
                <p className="mt-1 text-sm text-gray-500">{plan.who}</p>
                <p className="mt-5"><span className="text-3xl font-extrabold">{plan.price}</span><span className="text-gray-500 text-sm"> FCFA / {fr ? 'mois' : 'month'}</span></p>
                <p className="text-xs text-gray-500">{plan.perDay}</p>
                <p className="mt-4 text-sm font-medium">{plan.users}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700"><Check className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className={`mt-6 block text-center py-3 rounded-lg text-sm font-semibold ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 hover:bg-gray-50'}`}>
                  {fr ? 'Commencer l\'essai gratuit' : 'Start free trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">{fr ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>
          <div className="mt-6">{faqs.map((f) => <FaqItem key={f.q} {...f} />)}</div>
          <p className="mt-8 text-sm text-gray-600">
            {fr ? 'Une autre question ? ' : 'Another question? '}
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">{fr ? 'Écrivez-nous sur WhatsApp' : 'Message us on WhatsApp'}</a>
          </p>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">{fr ? 'Fermez le cahier ce soir.' : 'Close the notebook tonight.'}</h2>
          <p className="mt-3 text-gray-600">{fr ? 'Créez votre compte en 2 minutes et faites votre première vente.' : 'Create your account in 2 minutes and make your first sale.'}</p>
          <Link to="/register" className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            {fr ? 'Essayer gratuitement 7 jours' : 'Try free for 7 days'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© 2025 KABRAK Store</span>
          <div className="flex gap-5">
            <Link to="/register" className="hover:text-gray-900">{fr ? 'Essai gratuit' : 'Free trial'}</Link>
            <Link to="/login" className="hover:text-gray-900">{fr ? 'Connexion' : 'Login'}</Link>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="hover:text-gray-900">WhatsApp</a>
          </div>
        </div>
      </footer>

      <a href={`${WHATSAPP}?text=${encodeURIComponent(fr ? 'Bonjour, je veux en savoir plus sur KABRAK' : 'Hello, I want to know more about KABRAK')}`} target="_blank" rel="noreferrer"
        aria-label="WhatsApp" className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg hover:bg-green-700">
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
}
