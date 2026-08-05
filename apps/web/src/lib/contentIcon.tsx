import {
  Utensils, Soup, Croissant, Salad, Beef, Fish, Drumstick, Wheat, Cookie, Coffee,
  Apple, Carrot, Heart, HeartPulse, Brain, Bone, Activity, Droplet, Droplets, Moon,
  Baby, Plane, Dumbbell, Cigarette, Stethoscope, Pill, Leaf, Sparkles, BookOpen,
  Flame, Smile, Waves, type LucideIcon,
} from 'lucide-react';

const MAP: [RegExp, LucideIcon][] = [
  // Recipe categories
  [/appetizer|starter|snack/i, Utensils],
  [/soup|broth|stew/i, Soup],
  [/bread|bake|dough/i, Croissant],
  [/salad|vegetarian|vegetable|legume|greens/i, Salad],
  [/poultry|chicken|turkey/i, Drumstick],
  [/\bmeat\b|beef|lamb|pork|steak/i, Beef],
  [/seafood|fish|shrimp|salmon/i, Fish],
  [/grain|rice|oat|quinoa|pasta/i, Wheat],
  [/dessert|sweet|cake/i, Cookie],
  [/sauce|condiment|dressing|dip/i, Droplet],
  [/drink|smoothie|juice|coffee|tea/i, Coffee],

  // Wellness / health topics
  [/heart|blood pressure|cholesterol|cardio|circulat/i, HeartPulse],
  [/mental|stress|anxiety|mind|brain|wellbeing/i, Brain],
  [/sleep|rest|insomnia/i, Moon],
  [/arthritis|joint|bone|musculoskeletal|back|spine|posture/i, Bone],
  [/dental|teeth|tooth|oral/i, Smile],
  [/diabetes|sugar|glucose/i, Droplet],
  [/skin|derma/i, Sparkles],
  [/cancer|tumor/i, Stethoscope],
  [/digest|stomach|gut|bowel/i, Waves],
  [/medic|pill|drug|treatment/i, Pill],
  [/hydrat|water|fluid/i, Droplets],

  // Initiatives / lifestyle
  [/travel|trip|journey/i, Plane],
  [/child|kid|baby|maternal|pregnan/i, Baby],
  [/smoking|quit|tobacco/i, Cigarette],
  [/active|staying active|movement|walk|run/i, Activity],
  [/eat|nutrition|diet|weight|food|kitchen/i, Apple],
  [/veg|plant|green|nature/i, Leaf],
  [/article|read|learn|library/i, BookOpen],
  [/workout|train|strength|gym|fitness|exercise/i, Dumbbell],
  [/veget|carrot|produce/i, Carrot],
  [/energy|burn|calorie/i, Flame],
  [/love|heart/i, Heart],
];

export function contentIcon(text: string | null | undefined): LucideIcon {
  const t = text ?? '';
  for (const [re, Icon] of MAP) if (re.test(t)) return Icon;
  return Sparkles;
}
