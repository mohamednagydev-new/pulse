/**
 * Give every recipe per-serving macros and the meal slots it belongs in.
 *
 * The meal planner cannot use a recipe that only carries a calorie count: a day can
 * hit 2,200 kcal and still miss protein by 60g, which is exactly how "personalised"
 * meal plans end up useless. Slots matter for the same reason in the other direction
 * — nobody eats a lentil tagine for breakfast, and a planner that suggests it once
 * loses the user for good.
 *
 * Figures are per serving, estimated from the ingredient list and standard food
 * composition values. They are close enough to plan against and are deliberately
 * rounded — pretending to two decimal places would imply a precision that does not
 * exist in home cooking.
 *
 * Sauces get the slot "condiment", which matches no meal slot, so the planner never
 * serves someone a bowl of tzatziki and calls it dinner.
 *
 * Idempotent. Run: npx tsx prisma/seed-recipe-macros.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Row = {
  match: string; // exact title
  p: number;
  c: number;
  f: number;
  slots: string[];
  cuisine?: string;
};

const B = 'breakfast', L = 'lunch', D = 'dinner', S = 'snack', X = 'condiment';

const ROWS: Row[] = [
  // ---- Appetizers: small plates, so snacks ----
  { match: 'Smoky Roasted Red Pepper Hummus', p: 6, c: 18, f: 8, slots: [S], cuisine: 'levantine' },
  { match: 'Baked Zucchini Fritters with Herbed Yogurt', p: 9, c: 16, f: 10, slots: [S, B] },
  { match: 'Spiced Chickpea and Sweet Potato Bites', p: 7, c: 26, f: 5, slots: [S] },
  { match: 'Cucumber Cups with Whipped Feta', p: 7, c: 6, f: 10, slots: [S] },
  { match: 'Edamame and Avocado Smash Toasts', p: 10, c: 22, f: 10, slots: [S, B] },
  { match: 'Stuffed Mini Peppers with Herbed Ricotta', p: 7, c: 8, f: 6, slots: [S] },

  // ---- Soups ----
  { match: 'Golden Lentil and Turmeric Soup', p: 17, c: 48, f: 7, slots: [L, D] },
  { match: 'Roasted Tomato and White Bean Soup', p: 12, c: 36, f: 6, slots: [L, D] },
  { match: 'Ginger Chicken and Bok Choy Broth', p: 24, c: 10, f: 8, slots: [L, D] },
  { match: 'Creamy Roasted Cauliflower Soup', p: 7, c: 20, f: 8, slots: [L, D] },
  { match: 'Hearty Barley and Vegetable Soup', p: 8, c: 40, f: 4, slots: [L, D] },
  { match: 'Spicy Black Bean and Corn Soup', p: 15, c: 48, f: 6, slots: [L, D] },

  // ---- Breads: breakfast and snacks ----
  { match: 'Whole-Wheat Seeded Sandwich Loaf', p: 6, c: 28, f: 3.5, slots: [B, S] },
  { match: 'Oat and Banana Breakfast Bread', p: 6, c: 32, f: 5, slots: [B, S] },
  { match: 'No-Knead Whole-Grain Focaccia', p: 6, c: 30, f: 5, slots: [B, S] },
  { match: 'Spelt and Yogurt Flatbreads', p: 7, c: 30, f: 3, slots: [B, S] },
  { match: 'Rye and Caraway Soda Bread', p: 5, c: 29, f: 2, slots: [B, S] },
  { match: 'Sweet Potato Dinner Rolls', p: 5, c: 31, f: 4, slots: [B, S] },

  // ---- Vegetarian salads ----
  { match: 'Quinoa Tabbouleh with Herbs', p: 7, c: 33, f: 8, slots: [L, D], cuisine: 'levantine' },
  { match: 'Roasted Beet and Lentil Salad', p: 14, c: 42, f: 10, slots: [L, D] },
  { match: 'Chickpea and Avocado Power Salad', p: 12, c: 30, f: 13, slots: [L, D] },
  { match: 'Kale and Apple Crunch Salad', p: 6, c: 28, f: 12, slots: [L, D] },
  { match: 'Mediterranean Farro Salad', p: 10, c: 45, f: 10, slots: [L, D] },
  { match: 'Shaved Fennel and Orange Salad', p: 3, c: 20, f: 8, slots: [L, D, S] },

  // ---- Meatless mains ----
  { match: 'Chickpea and Spinach Coconut Curry', p: 15, c: 44, f: 16, slots: [L, D] },
  { match: 'Stuffed Bell Peppers with Quinoa and Beans', p: 14, c: 50, f: 9, slots: [L, D] },
  { match: 'Mushroom and Lentil Bolognese', p: 20, c: 62, f: 11, slots: [L, D] },
  { match: 'Baked Falafel Bowl with Tahini', p: 15, c: 42, f: 15, slots: [L, D], cuisine: 'levantine' },
  { match: 'Eggplant and Chickpea Tagine', p: 12, c: 44, f: 11, slots: [L, D] },
  { match: 'Spinach and Ricotta Whole-Wheat Frittata', p: 21, c: 14, f: 17, slots: [B, L, D] },

  // ---- Poultry ----
  { match: 'Herb-Marinated Grilled Chicken Breast', p: 42, c: 2, f: 11, slots: [L, D] },
  { match: 'Baked Chicken and Vegetable Traybake', p: 35, c: 24, f: 12, slots: [L, D] },
  { match: 'Turkey and Spinach Meatballs in Tomato Sauce', p: 30, c: 14, f: 15, slots: [L, D] },
  { match: 'Lemon Garlic Chicken and Broccoli Stir-Fry', p: 36, c: 12, f: 12, slots: [L, D] },
  { match: 'Moroccan Spiced Chicken Skewers', p: 38, c: 6, f: 12, slots: [L, D] },
  { match: 'Slow-Cooked Chicken and White Bean Stew', p: 34, c: 30, f: 11, slots: [L, D] },

  // ---- Meat ----
  { match: 'Lean Beef and Vegetable Stir-Fry', p: 33, c: 18, f: 13, slots: [L, D] },
  { match: 'Herb-Crusted Roast Beef Tenderloin', p: 36, c: 2, f: 12, slots: [L, D] },
  { match: 'Beef and Barley Stew', p: 28, c: 36, f: 10, slots: [L, D] },
  { match: 'Grilled Lamb and Mint Yogurt Kebabs', p: 30, c: 8, f: 19, slots: [L, D] },
  { match: 'Stuffed Cabbage Rolls with Lean Beef and Rice', p: 20, c: 32, f: 10, slots: [L, D] },
  { match: 'Spiced Beef and Lentil Lettuce Wraps', p: 24, c: 20, f: 9, slots: [L, D] },

  // ---- Seafood ----
  { match: 'Baked Lemon Herb Salmon', p: 34, c: 2, f: 20, slots: [L, D] },
  { match: 'Garlic Shrimp and Zucchini Noodles', p: 28, c: 10, f: 8, slots: [L, D] },
  { match: 'Mediterranean Baked Cod with Tomatoes', p: 32, c: 8, f: 9, slots: [L, D] },
  { match: 'Seared Tuna with Sesame and Ginger Slaw', p: 34, c: 12, f: 11, slots: [L, D] },
  { match: 'Spiced Fish Tacos with Cabbage Slaw', p: 26, c: 30, f: 10, slots: [L, D] },
  { match: 'Steamed Mussels in Tomato Broth', p: 28, c: 14, f: 9, slots: [L, D] },

  // ---- Vegetables & legumes ----
  { match: 'Roasted Balsamic Brussels Sprouts', p: 5, c: 16, f: 8, slots: [L, D, S] },
  { match: 'Smoky Braised White Beans and Greens', p: 14, c: 34, f: 7, slots: [L, D] },
  { match: 'Curried Cauliflower and Chickpeas', p: 10, c: 30, f: 8, slots: [L, D] },
  { match: 'Garlicky Sauteed Green Beans and Almonds', p: 5, c: 11, f: 9, slots: [L, D, S] },
  { match: 'Spiced Red Lentil Dal', p: 16, c: 42, f: 7, slots: [L, D] },
  { match: 'Honey-Roasted Carrots with Cumin', p: 2, c: 24, f: 6, slots: [L, D, S] },

  // ---- Grains ----
  { match: 'Herbed Lemon Quinoa Pilaf', p: 6, c: 34, f: 6, slots: [L, D] },
  { match: 'Brown Rice and Vegetable Buddha Bowl', p: 14, c: 66, f: 12, slots: [L, D] },
  { match: 'Mushroom and Spinach Barley Risotto', p: 11, c: 50, f: 8, slots: [L, D] },
  { match: 'Warm Freekeh and Roasted Vegetable Salad', p: 10, c: 46, f: 9, slots: [L, D], cuisine: 'levantine' },
  { match: 'Overnight Oats with Chia and Berries', p: 12, c: 46, f: 10, slots: [B, S] },
  { match: 'Spiced Bulgur with Chickpeas and Herbs', p: 11, c: 46, f: 7, slots: [L, D], cuisine: 'levantine' },

  // ---- Sauces: never a meal ----
  { match: 'Classic Lemon Tahini Sauce', p: 3, c: 4, f: 7, slots: [X], cuisine: 'levantine' },
  { match: 'Fresh Basil and Walnut Pesto', p: 2, c: 2, f: 8, slots: [X] },
  { match: 'Roasted Tomato Salsa', p: 1, c: 5, f: 0.5, slots: [X] },
  { match: 'Greek Yogurt Tzatziki', p: 4, c: 4, f: 1.5, slots: [X] },
  { match: 'Quick Pickled Red Onions', p: 0.4, c: 5, f: 0, slots: [X] },
  { match: 'Roasted Red Pepper and Almond Romesco', p: 2, c: 5, f: 6, slots: [X] },

  // ---- Desserts: snacks ----
  { match: 'Greek Yogurt Berry Bark', p: 8, c: 12, f: 3, slots: [S] },
  { match: 'Baked Cinnamon Apples with Oats', p: 4, c: 38, f: 5, slots: [S, B] },
  { match: 'Dark Chocolate Avocado Mousse', p: 4, c: 22, f: 14, slots: [S] },
  { match: 'Chia Seed Pudding with Mango', p: 6, c: 26, f: 7, slots: [S, B] },
  { match: 'Flourless Almond and Banana Cookies', p: 4, c: 16, f: 6, slots: [S] },
  { match: 'Poached Pears in Spiced Tea', p: 1, c: 36, f: 0.5, slots: [S] },
];

/**
 * One recipe in the library was pork tenderloin, in an app whose entire audience is
 * Egyptian. Nobody would have cooked it, and seeing it at all costs trust. Swapped to
 * beef, which is the cut people here actually roast.
 */
async function fixPork() {
  const pork = await prisma.recipe.findFirst({ where: { title: { contains: 'Pork' } } });
  if (!pork) return 0;
  await prisma.recipe.update({
    where: { id: pork.id },
    data: {
      title: 'Herb-Crusted Roast Beef Tenderloin',
      titleAr: 'فيليه بتلو بالأعشاب في الفرن',
      ingredients: JSON.stringify([
        '600 g beef tenderloin, trimmed',
        '2 tbsp olive oil',
        '3 cloves garlic, crushed',
        '1 tbsp chopped rosemary',
        '1 tbsp chopped thyme',
        '1 tsp coarse salt',
        '1 tsp cracked black pepper',
      ]),
      ingredientsAr: JSON.stringify([
        '٦٠٠ جرام فيليه بتلو منظف',
        '٢ معلقة كبيرة زيت زيتون',
        '٣ فصوص توم مهروس',
        'معلقة كبيرة روزماري مفروم',
        'معلقة كبيرة زعتر أخضر مفروم',
        'معلقة صغيرة ملح خشن',
        'معلقة صغيرة فلفل أسود مجروش',
      ]),
    },
  });
  return 1;
}

async function main() {
  const fixed = await fixPork();
  if (fixed) console.log('  · replaced the pork recipe with beef');

  let applied = 0;
  const missing: string[] = [];

  for (const r of ROWS) {
    const res = await prisma.recipe.updateMany({
      where: { title: r.match },
      data: {
        protein: r.p,
        carbs: r.c,
        fat: r.f,
        mealSlots: JSON.stringify(r.slots),
        ...(r.cuisine ? { cuisine: r.cuisine } : {}),
      },
    });
    if (res.count === 0) missing.push(r.match);
    else applied += res.count;
  }

  const total = await prisma.recipe.count();
  const withMacros = await prisma.recipe.count({ where: { protein: { not: null } } });

  console.log(`\nRecipe macros: ${applied} applied · ${withMacros}/${total} recipes now plannable`);
  if (missing.length) {
    console.log(`  not found (title changed?): ${missing.length}`);
    for (const m of missing) console.log(`    - ${m}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
