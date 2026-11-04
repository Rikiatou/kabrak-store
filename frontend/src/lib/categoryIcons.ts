import {
  Shirt, Footprints, SprayCan, Sparkles, Gem, ShoppingBag, Smartphone, Home, CookingPot, Flower2,
  Store, Package, ShoppingCart, Cake, UtensilsCrossed, ClipboardList,
  Layers, TrendingUp, Laptop, Building2, Target, Palette, Code2, Share2, Printer, Briefcase, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  CLOTHING: Shirt, SHOES: Footprints, PERFUMES: SprayCan, COSMETICS: Sparkles, HIJABS_ABAYAS: Shirt, FABRICS: Layers,
  JEWELRY: Gem, BAGS: ShoppingBag, ELECTRONICS: Smartphone, HOUSE_PRODUCTS: Home, KITCHEN_PRODUCTS: CookingPot,
  DECORATION: Flower2, MINI_MARKET: Store, WHOLESALE: Package, MIXED_SHOP: ShoppingCart, CAKES: Cake,
  FOOD_BUSINESS: UtensilsCrossed,
  DIGITAL_MARKETING: TrendingUp, FREELANCER: Laptop, AGENCY: Building2,
  CONSULTANT: Target, DESIGNER: Palette, DEVELOPER: Code2, SOCIAL_MEDIA: Share2, PRINTING: Printer,
  BUSINESS_SERVICES: Briefcase, OTHER: ClipboardList,
};

export const PRODUCT_CATEGORY_GROUPS: { key: string; cats: string[] }[] = [
  { key: 'groupFashion', cats: ['CLOTHING', 'HIJABS_ABAYAS', 'FABRICS', 'SHOES', 'BAGS', 'JEWELRY'] },
  { key: 'groupBeauty', cats: ['PERFUMES', 'COSMETICS'] },
  { key: 'groupFood', cats: ['CAKES', 'FOOD_BUSINESS'] },
  { key: 'groupHome', cats: ['HOUSE_PRODUCTS', 'KITCHEN_PRODUCTS', 'DECORATION', 'ELECTRONICS'] },
  { key: 'groupGeneral', cats: ['MINI_MARKET', 'WHOLESALE', 'MIXED_SHOP', 'OTHER'] },
];

export const SERVICE_CATEGORIES = [
  'DIGITAL_MARKETING', 'FREELANCER', 'AGENCY', 'CONSULTANT', 'DESIGNER', 'DEVELOPER',
  'SOCIAL_MEDIA', 'PRINTING', 'BUSINESS_SERVICES', 'OTHER',
];
