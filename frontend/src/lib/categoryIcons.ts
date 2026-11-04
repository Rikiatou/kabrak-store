import {
  Shirt, Footprints, SprayCan, Sparkles, Gem, ShoppingBag, Smartphone, Home, CookingPot, Flower2,
  Store, Package, ShoppingCart, Cake, UtensilsCrossed, Bike, Soup, MessageCircle, Scissors, ClipboardList,
  TrendingUp, Laptop, Building2, Target, Palette, Code2, Share2, Printer, Briefcase, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  CLOTHING: Shirt, SHOES: Footprints, PERFUMES: SprayCan, COSMETICS: Sparkles, HIJABS_ABAYAS: Shirt,
  JEWELRY: Gem, BAGS: ShoppingBag, ELECTRONICS: Smartphone, HOUSE_PRODUCTS: Home, KITCHEN_PRODUCTS: CookingPot,
  DECORATION: Flower2, MINI_MARKET: Store, WHOLESALE: Package, MIXED_SHOP: ShoppingCart, CAKES: Cake,
  FOOD_BUSINESS: UtensilsCrossed, FOOD_DELIVERY: Bike, HOME_COOKING: Soup, WHATSAPP_SELLER: MessageCircle,
  MADE_TO_ORDER: Scissors, DIGITAL_MARKETING: TrendingUp, FREELANCER: Laptop, AGENCY: Building2,
  CONSULTANT: Target, DESIGNER: Palette, DEVELOPER: Code2, SOCIAL_MEDIA: Share2, PRINTING: Printer,
  BUSINESS_SERVICES: Briefcase, OTHER: ClipboardList,
};
