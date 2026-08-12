/**
 * The Egyptian food table.
 *
 * Calorie logging was free text: the user typed a name and a number they guessed.
 * Guessed numbers make the whole tracker decorative, and every global food database
 * — MyFitnessPal included — is missing كشري، فول، طعمية، محشي، عيش بلدي، حواوشي.
 * That absence is exactly the gap ElCoach built a business on, so we close it with
 * our own table rather than renting someone else's.
 *
 * Portions are written the way people actually eat: "رغيف", "طبق وسط", "كوباية".
 * Nobody weighs their fuul, and a database that demands grams is a database nobody
 * uses. Gram weights are carried alongside for anyone who does want them.
 *
 * Figures are per listed portion, from standard food composition tables adjusted to
 * Egyptian preparation — street fuul carries the oil it is actually served with, and
 * fried tilapia is costed as fried, not as fish.
 *
 * Idempotent: matched on the Arabic name.
 * Run: npx tsx prisma/seed-foods.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** [name, nameAr, category, portion, portionAr, grams, kcal, protein, carbs, fat, common?, aliases?] */
type F = [string, string, string, string, string, number, number, number, number, number, boolean?, string[]?];

const FOODS: F[] = [
  // ------------------------------- staples -------------------------------
  ['Baladi bread', 'عيش بلدي', 'staple', '1 loaf', 'رغيف', 90, 250, 8, 50, 1.5, true, ['aish baladi', 'eish']],
  ['Whole-wheat baladi bread', 'عيش بلدي سن', 'staple', '1 loaf', 'رغيف', 90, 240, 9, 46, 2, false],
  ['Fino roll', 'عيش فينو', 'staple', '1 roll', 'رغيف فينو', 60, 170, 5, 33, 2, false, ['fino']],
  ['Shami bread', 'عيش شامي', 'staple', '1 loaf', 'رغيف شامي', 70, 195, 6, 39, 1, false],
  ['White rice, cooked', 'رز أبيض مطبوخ', 'staple', '1 cup', 'كوب', 160, 205, 4, 45, 0.5, true, ['rice', 'roz']],
  ['Rice with vermicelli', 'رز بالشعرية', 'staple', '1 cup', 'كوب', 170, 240, 5, 46, 4, true],
  ['Brown rice, cooked', 'رز بني', 'staple', '1 cup', 'كوب', 160, 215, 5, 45, 1.8, false],
  ['Pasta, boiled', 'مكرونة مسلوقة', 'staple', '1 cup', 'كوب', 140, 200, 7, 40, 1, false],
  ['Macaroni béchamel', 'مكرونة بشاميل', 'staple', '1 medium plate', 'طبق وسط', 300, 550, 22, 55, 26, true, ['bechamel']],
  ['Freekeh, cooked', 'فريك مطبوخ', 'staple', '1 cup', 'كوب', 160, 230, 8, 44, 2, false],
  ['Bulgur, cooked', 'برغل مطبوخ', 'staple', '1 cup', 'كوب', 150, 190, 6, 38, 0.5, false],
  ['White toast', 'توست أبيض', 'staple', '1 slice', 'شريحة', 28, 75, 2.5, 14, 1, false],
  ['Brown toast', 'توست سن', 'staple', '1 slice', 'شريحة', 28, 70, 3, 13, 1, false],
  ['Oats, dry', 'شوفان', 'staple', '1/2 cup', 'نص كوب', 40, 150, 5, 27, 3, true, ['oats', 'shofan']],

  // ------------------------------- legumes -------------------------------
  ['Fuul medames, plain', 'فول مدمس سادة', 'protein', '1 medium plate', 'طبق وسط', 200, 220, 13, 36, 2, true, ['fool', 'ful']],
  ['Fuul with oil (street)', 'فول بالزيت', 'protein', '1 plate', 'طبق', 220, 330, 13, 37, 14, true],
  ['Ta’meya, fried', 'قرص طعمية مقلي', 'protein', '1 piece', 'قرص', 30, 95, 4, 7, 6, true, ['taameya', 'falafel']],
  ['Ta’meya, baked', 'قرص طعمية مخبوز', 'protein', '1 piece', 'قرص', 30, 60, 4, 7, 2, false],
  ['Koshari, medium plate', 'طبق كشري وسط', 'street', '1 medium plate', 'طبق وسط', 400, 620, 20, 110, 11, true, ['koshary', 'kushari']],
  ['Koshari, small plate', 'طبق كشري صغير', 'street', '1 small plate', 'طبق صغير', 250, 390, 13, 69, 7, false],
  ['Lentil soup', 'شوربة عدس', 'protein', '1 cup', 'كوب', 250, 190, 11, 30, 3, true, ['shorbet ads']],
  ['Chickpeas, boiled', 'حمص مسلوق', 'protein', '1 cup', 'كوب', 160, 270, 15, 45, 4, false],
  ['White bean stew with beef', 'فاصوليا بيضا باللحمة', 'protein', '1 plate', 'طبق', 250, 320, 18, 30, 13, false],
  ['Black-eyed peas', 'لوبيا', 'protein', '1 plate', 'طبق', 250, 280, 15, 38, 7, false],
  ['Yellow lentils, cooked', 'عدس أصفر مطبوخ', 'protein', '1 cup', 'كوب', 200, 230, 16, 38, 1, false],
  ['Lupini beans', 'ترمس', 'snack', '1 cup', 'كوب', 150, 180, 18, 15, 5, false, ['termis']],

  // ---------------------------- meat & fish ------------------------------
  ['Grilled chicken breast', 'صدور فراخ مشوية', 'protein', '150 g piece', 'قطعة ١٥٠ جرام', 150, 250, 46, 0, 6, true],
  ['Grilled chicken thigh', 'ورك فراخ مشوي', 'protein', '1 piece', 'قطعة', 130, 260, 32, 0, 14, false],
  ['Fried chicken piece', 'قطعة فراخ مقلية', 'protein', '1 piece', 'قطعة', 130, 380, 28, 12, 24, false],
  ['Grilled tilapia', 'بلطي مشوي', 'protein', '1 medium fish', 'سمكة وسط', 250, 290, 46, 0, 11, true, ['bolti']],
  ['Fried tilapia', 'بلطي مقلي', 'protein', '1 medium fish', 'سمكة وسط', 250, 480, 42, 14, 28, true],
  ['Grilled sea bream', 'دنيس مشوي', 'protein', '1 fish', 'سمكة', 250, 300, 45, 0, 13, false],
  ['Grilled shrimp', 'جمبري مشوي', 'protein', '10 pieces', '١٠ حبات', 150, 180, 34, 2, 4, false],
  ['Grilled kofta', 'كفتة مشوية', 'protein', '4 skewers', '٤ أصابع', 160, 380, 30, 4, 27, true],
  ['Beef shish kebab', 'شيش كباب لحمة', 'protein', '6 pieces', '٦ قطع', 150, 330, 35, 2, 20, false],
  ['Stewed beef', 'لحمة بتلو مطبوخة', 'protein', '100 g', '١٠٠ جرام', 100, 220, 28, 0, 12, false],
  ['Alexandrian liver', 'كبدة إسكندراني', 'street', '1 plate', 'طبق', 150, 330, 28, 8, 20, true, ['kebda']],
  ['Egyptian sausage', 'سجق مصري', 'protein', '5 pieces', '٥ قطع', 100, 300, 16, 6, 24, false, ['sogo2']],
  ['Pastirma', 'بسطرمة', 'protein', '5 slices', '٥ شرايح', 50, 130, 20, 1, 5, false, ['basterma']],
  ['Boiled egg', 'بيضة مسلوقة', 'protein', '1 egg', 'بيضة', 55, 78, 6.3, 0.6, 5.3, true, ['egg', 'beda']],
  ['Fried egg', 'بيضة مقلية', 'protein', '1 egg', 'بيضة', 60, 120, 6.3, 0.6, 10, true],
  ['Two-egg omelette', 'أومليت بيضتين', 'protein', '1 plate', 'طبق', 130, 220, 13, 2, 18, false],
  ['Tuna in oil, drained', 'تونة بالزيت مصفاة', 'protein', '1 tin', 'علبة', 80, 145, 22, 0, 6, true],
  ['Tuna in water', 'تونة بالمياه', 'protein', '1 tin', 'علبة', 80, 90, 20, 0, 1, false],
  ['Grilled quail', 'سمان مشوي', 'protein', '2 birds', 'سمانتين', 150, 280, 32, 0, 16, false],
  ['Stuffed pigeon', 'حمام محشي', 'protein', '1 pigeon', 'حمامة', 250, 450, 35, 30, 22, false],

  // ---------------------------- cooked dishes ----------------------------
  ['Molokhia with chicken', 'ملوخية بالفراخ', 'protein', '1 plate', 'طبق', 300, 300, 32, 10, 14, true],
  ['Molokhia, plain', 'ملوخية سادة', 'veg', '1 cup', 'كوب', 200, 90, 5, 9, 4, false],
  ['Stuffed courgettes', 'محشي كوسة', 'veg', '3 pieces', '٣ حبات', 240, 300, 7, 48, 9, true, ['mahshi']],
  ['Stuffed vine leaves', 'محشي ورق عنب', 'veg', '10 pieces', '١٠ حبات', 200, 320, 6, 40, 15, false],
  ['Okra with beef', 'بامية باللحمة', 'protein', '1 plate', 'طبق', 300, 330, 26, 22, 15, false],
  ['Okra in tomato sauce', 'بامية بالصلصة', 'veg', '1 plate', 'طبق', 250, 150, 5, 20, 6, false],
  ['Vegetable casserole', 'طورلي خضار', 'veg', '1 plate', 'طبق', 250, 210, 5, 34, 7, false],
  ['Cooked spinach', 'سبانخ مطبوخة', 'veg', '1 plate', 'طبق', 200, 120, 6, 12, 5, false],
  ['Fattah with beef', 'فتة باللحمة', 'staple', '1 plate', 'طبق', 350, 620, 28, 70, 24, false],

  // ------------------------------ dairy ---------------------------------
  ['Full-fat milk', 'لبن كامل الدسم', 'dairy', '1 cup', 'كوباية', 240, 150, 8, 12, 8, true],
  ['Skimmed milk', 'لبن خالي الدسم', 'dairy', '1 cup', 'كوباية', 240, 85, 8, 12, 0.3, false],
  ['Plain yoghurt', 'زبادي سادة', 'dairy', '1 pot', 'علبة', 170, 105, 9, 8, 4, true, ['zabadi']],
  ['Greek yoghurt', 'زبادي يوناني', 'dairy', '1 pot', 'علبة', 170, 145, 17, 8, 5, false],
  ['Labneh', 'لبنة', 'dairy', '2 tbsp', '٢ معلقة كبيرة', 60, 110, 5, 4, 9, false],
  ['White cheese', 'جبنة بيضا', 'dairy', '50 g', '٥٠ جرام', 50, 130, 8, 1.5, 10, true, ['gebna beida']],
  ['Low-salt white cheese', 'جبنة بيضا قليلة الملح', 'dairy', '50 g', '٥٠ جرام', 50, 90, 9, 2, 5, false],
  ['Roumy cheese', 'جبنة رومي', 'dairy', '40 g', '٤٠ جرام', 40, 160, 11, 1, 13, false],
  ['Processed cheese triangle', 'جبنة مثلثات', 'dairy', '1 triangle', 'مثلث', 17, 45, 2, 1, 4, false],
  ['Kariesh cheese', 'جبنة قريش', 'dairy', '50 g', '٥٠ جرام', 50, 50, 8, 2, 1, true, ['areesh', 'karish']],
  ['Mesh cheese', 'مش', 'dairy', '2 tbsp', 'معلقتين', 40, 70, 5, 1, 5, false],
  ['Clotted cream', 'قشطة', 'dairy', '2 tbsp', 'معلقتين', 40, 130, 2, 3, 12, false, ['eshta']],
  ['Laban rayeb', 'لبن رايب', 'dairy', '1 cup', 'كوباية', 250, 130, 8, 12, 5, false],

  // --------------------------- vegetables --------------------------------
  ['Green salad', 'سلطة خضرا', 'veg', '1 plate', 'طبق', 150, 45, 2, 8, 0.5, true],
  ['Baladi salad with oil', 'سلطة بلدي بالزيت', 'veg', '1 plate', 'طبق', 180, 130, 2, 9, 10, false],
  ['Tahini salad', 'سلطة طحينة', 'veg', '3 tbsp', '٣ معالق', 60, 170, 5, 6, 14, true],
  ['Baba ghanoush', 'بابا غنوج', 'veg', '3 tbsp', '٣ معالق', 80, 120, 3, 8, 9, false],
  ['Tomato', 'طماطم', 'veg', '1 piece', 'حبة', 120, 22, 1, 5, 0.2, false],
  ['Cucumber', 'خيار', 'veg', '1 piece', 'حبة', 100, 15, 0.7, 3.6, 0.1, false],
  ['Rocket', 'جرجير', 'veg', '1 plate', 'طبق', 60, 15, 1.5, 2, 0.4, false],
  ['Cabbage salad', 'سلطة كرنب', 'veg', '1 plate', 'طبق', 150, 60, 2, 10, 1.5, false],
  ['Fried aubergine', 'باذنجان مقلي', 'veg', '5 slices', '٥ شرايح', 100, 220, 1, 12, 19, false],
  ['Fried potatoes', 'بطاطس محمرة', 'veg', '1 small plate', 'طبق صغير', 150, 330, 4, 40, 17, true],
  ['Boiled potato', 'بطاطس مسلوقة', 'veg', '1 medium', 'حبة وسط', 150, 130, 3, 30, 0.2, false],
  ['Baked sweet potato', 'بطاطا مشوية', 'veg', '1 medium', 'حبة وسط', 150, 135, 2.5, 31, 0.2, true],
  ['Grilled vegetables', 'خضار مشوي', 'veg', '1 plate', 'طبق', 200, 140, 4, 20, 5, false],

  // ------------------------------ fruit ----------------------------------
  ['Banana', 'موزة', 'fruit', '1 piece', 'حبة', 120, 105, 1.3, 27, 0.4, true, ['moz']],
  ['Apple', 'تفاحة', 'fruit', '1 piece', 'حبة', 180, 95, 0.5, 25, 0.3, true],
  ['Orange', 'برتقالة', 'fruit', '1 piece', 'حبة', 150, 70, 1.3, 18, 0.2, true],
  ['Mango', 'مانجة', 'fruit', '1 medium', 'حبة وسط', 200, 135, 1.8, 35, 0.6, true],
  ['Grapes', 'عنب', 'fruit', '1 cup', 'كوب', 150, 105, 1.1, 27, 0.2, false],
  ['Watermelon', 'بطيخ', 'fruit', '1 slice', 'شريحة', 280, 85, 1.7, 21, 0.4, true],
  ['Dates', 'تمر', 'fruit', '3 pieces', '٣ حبات', 70, 200, 1.8, 53, 0.3, true, ['balah']],
  ['Guava', 'جوافة', 'fruit', '1 piece', 'حبة', 120, 80, 3, 17, 1, false],
  ['Figs', 'تين', 'fruit', '2 pieces', 'حبتين', 100, 74, 0.8, 19, 0.3, false],
  ['Strawberries', 'فراولة', 'fruit', '1 cup', 'كوب', 150, 50, 1, 12, 0.5, false],
  ['Dried apricot', 'قمر الدين مجفف', 'fruit', '5 pieces', '٥ حبات', 40, 95, 1.4, 25, 0.2, false],
  ['Pomegranate', 'رمان', 'fruit', 'half', 'نص حبة', 130, 110, 2, 26, 1.5, false],

  // ---------------------------- street food ------------------------------
  ['Chicken shawarma sandwich', 'سندوتش شاورما فراخ', 'street', '1 sandwich', 'سندوتش', 250, 550, 32, 55, 22, true],
  ['Beef shawarma sandwich', 'سندوتش شاورما لحمة', 'street', '1 sandwich', 'سندوتش', 250, 620, 30, 55, 30, false],
  ['Ta’meya sandwich', 'سندوتش طعمية', 'street', '1 sandwich', 'سندوتش', 150, 330, 11, 45, 12, true],
  ['Fuul sandwich', 'سندوتش فول', 'street', '1 sandwich', 'سندوتش', 150, 290, 12, 48, 6, true],
  ['Hawawshi', 'حواوشي', 'street', '1 piece', 'قطعة', 200, 520, 26, 48, 24, false],
  ['Feteer meshaltet, plain', 'فطير مشلتت سادة', 'street', 'quarter', 'ربع فطيرة', 120, 480, 8, 48, 28, false],
  ['Shish tawook sandwich', 'سندوتش شيش طاووق', 'street', '1 sandwich', 'سندوتش', 220, 450, 35, 48, 12, false],
  ['Liver sandwich', 'سندوتش كبدة', 'street', '1 sandwich', 'سندوتش', 180, 400, 24, 45, 14, false],
  ['Sausage sandwich', 'سندوتش سجق', 'street', '1 sandwich', 'سندوتش', 180, 480, 20, 46, 24, false],
  ['Potato sandwich', 'سندوتش بطاطس', 'street', '1 sandwich', 'سندوتش', 180, 420, 8, 62, 16, false],
  // Both spellings matter: users type ذرة (standard) as often as درة (colloquial).
  ['Grilled corn', 'درة مشوية', 'street', '1 cob', 'كوزة', 150, 130, 4, 28, 1.5, false, ['ذرة مشوية', 'corn', 'dora']],
  ['Boiled corn', 'درة مسلوقة', 'veg', '1 cob', 'كوزة', 150, 120, 4, 27, 1, false, ['ذرة مسلوقة', 'boiled corn']],
  ['Sweet corn, canned', 'درة معلبة', 'veg', '1/2 cup', 'نص كوب', 80, 70, 2, 15, 0.8, false, ['ذرة معلبة', 'sweet corn']],
  ['Cart sweet potato', 'بطاطا العربية', 'street', '1 large', 'حبة كبيرة', 250, 220, 4, 52, 0.3, false],

  // ------------------------------ drinks ---------------------------------
  ['Tea with 2 sugars', 'شاي بسكرتين', 'drink', '1 glass', 'كوباية', 200, 40, 0, 10, 0, true],
  ['Tea, no sugar', 'شاي سادة', 'drink', '1 glass', 'كوباية', 200, 2, 0, 0.4, 0, true],
  ['Turkish coffee with sugar', 'قهوة تركي بسكر', 'drink', '1 cup', 'فنجان', 80, 35, 0.2, 8, 0, false],
  ['Nescafé with milk and sugar', 'نسكافيه بلبن وسكر', 'drink', '1 mug', 'كوباية', 200, 110, 3, 17, 3, false],
  ['Sugarcane juice', 'عصير قصب', 'drink', '1 glass', 'كوباية', 300, 240, 0, 60, 0, true, ['asab']],
  ['Fresh mango juice', 'عصير مانجة', 'drink', '1 glass', 'كوباية', 300, 200, 1.5, 48, 0.8, false],
  ['Fresh orange juice', 'عصير برتقال', 'drink', '1 glass', 'كوباية', 300, 140, 2, 33, 0.5, false],
  ['Lemon with mint', 'ليمون بالنعناع', 'drink', '1 glass', 'كوباية', 300, 90, 0.3, 23, 0, false],
  ['Soft drink can', 'كانز مياه غازية', 'drink', '1 can', 'كانز', 330, 140, 0, 39, 0, true],
  ['Diet soft drink', 'مياه غازية دايت', 'drink', '1 can', 'كانز', 330, 1, 0, 0, 0, false],
  ['Sobia', 'سوبيا', 'drink', '1 glass', 'كوباية', 300, 260, 4, 50, 4, false],
  ['Sweetened hibiscus', 'كركديه بسكر', 'drink', '1 glass', 'كوباية', 300, 90, 0, 23, 0, false],
  ['Sahlab', 'سحلب', 'drink', '1 glass', 'كوباية', 250, 280, 7, 45, 8, false],
  ['Aniseed tea, no sugar', 'ينسون سادة', 'drink', '1 glass', 'كوباية', 200, 3, 0, 0.7, 0, false],
  // From a user ticket (Aug 2026): "ordered tea with milk and couldn't find it" —
  // the most-drunk beverage in Egypt was missing, plus shakes and packaged drinks.
  ['Tea with milk, 2 sugars', 'شاي بلبن بسكرتين', 'drink', '1 glass', 'كوباية', 200, 120, 4, 20, 3, true, ['shai bel laban', 'tea with milk']],
  ['Tea with milk, no sugar', 'شاي بلبن من غير سكر', 'drink', '1 glass', 'كوباية', 200, 60, 4, 6, 3, false],
  ['Tea with 1 sugar', 'شاي بمعلقة سكر', 'drink', '1 glass', 'كوباية', 200, 20, 0, 5, 0, false],
  ['Packaged juice box', 'عصير علبة', 'drink', '1 box', 'علبة', 250, 130, 0.5, 32, 0, true, ['juhayna', 'جهينة']],
  ['Guava juice', 'عصير جوافة', 'drink', '1 glass', 'كوباية', 300, 180, 2, 43, 0.5, false],
  ['Strawberry juice', 'عصير فراولة', 'drink', '1 glass', 'كوباية', 300, 150, 1.5, 36, 0.5, false],
  ['Banana milk smoothie', 'عصير موز بلبن', 'drink', '1 glass', 'كوباية', 300, 220, 7, 42, 4, true, ['موز باللبن', 'banana shake']],
  ['Date milk shake', 'تمر بلبن', 'drink', '1 glass', 'كوباية', 300, 260, 7, 52, 4, false],
  ['Protein shake (scoop + water)', 'بروتين شيك (سكوب بالمية)', 'drink', '1 shaker', 'شيكر', 350, 120, 24, 3, 1.5, true, ['whey', 'واي بروتين']],
  ['Protein shake (scoop + milk)', 'بروتين شيك بلبن', 'drink', '1 shaker', 'شيكر', 400, 220, 30, 12, 5, false],
  ['Oats & banana shake', 'شيك شوفان وموز', 'drink', '1 glass', 'كوباية', 350, 320, 12, 55, 7, false, ['oats shake']],
  ['Iced coffee, sweetened', 'آيس كوفي', 'drink', '1 cup', 'كوباية', 300, 180, 4, 28, 6, false],
  ['Energy drink', 'مشروب طاقة', 'drink', '1 can', 'كانز', 250, 110, 0, 28, 0, false],

  // ------------------------------ sweets ---------------------------------
  ['Basbousa', 'بسبوسة', 'sweet', '1 piece', 'قطعة', 80, 300, 4, 45, 12, true],
  ['Konafa', 'كنافة', 'sweet', '1 piece', 'قطعة', 100, 380, 6, 48, 18, true],
  ['Om Ali', 'أم علي', 'sweet', '1 bowl', 'طبق', 200, 480, 9, 55, 25, false],
  ['Rice pudding', 'رز بلبن', 'sweet', '1 bowl', 'طبق', 200, 290, 7, 48, 8, true],
  ['Mahalabeya', 'مهلبية', 'sweet', '1 bowl', 'طبق', 180, 200, 5, 33, 5, false],
  ['Baklava', 'بقلاوة', 'sweet', '2 pieces', 'قطعتين', 60, 290, 4, 33, 16, false],
  ['Zalabya', 'زلابية', 'sweet', '5 pieces', '٥ حبات', 80, 320, 4, 40, 16, false],
  ['Qatayef', 'قطايف', 'sweet', '2 pieces', 'قطعتين', 90, 340, 6, 46, 15, false],
  ['Ghorayeba', 'غريبة', 'sweet', '3 pieces', '٣ قطع', 45, 230, 2, 26, 13, false],
  ['Petit four', 'بيتي فور', 'sweet', '4 pieces', '٤ قطع', 60, 290, 4, 36, 14, false],
  ['Kahk', 'كحك', 'sweet', '2 pieces', 'قطعتين', 60, 300, 4, 34, 16, false],
  ['Chocolate bar', 'لوح شوكولاتة', 'sweet', '1 bar', 'لوح', 45, 240, 3, 27, 13, false],
  ['Ice cream', 'آيس كريم', 'sweet', '2 scoops', 'كورتين', 100, 210, 4, 25, 10, false],
  ['Molasses with tahini', 'عسل أسود بالطحينة', 'sweet', '2 tbsp', '٢ معلقة', 40, 190, 4, 20, 11, false],
  // Ticket additions: biscuits by type, ice cream variants, and a diet corner.
  ['Tea biscuits, plain', 'بسكوت شاي', 'snack', '4 pieces', '٤ قطع', 32, 150, 2, 22, 6, true, ['بسكويت', 'biscuits']],
  ['Sandwich biscuits (Oreo-style)', 'بسكوت ساندوتش', 'snack', '3 pieces', '٣ قطع', 33, 160, 1.5, 23, 7, false, ['oreo', 'أوريو', 'بوريو']],
  ['Chocolate wafer', 'ويفر شوكولاتة', 'snack', '1 bar', 'قطعة', 30, 160, 2, 18, 9, false],
  ['Cake slice, plain', 'قطعة كيك سادة', 'sweet', '1 slice', 'قطعة', 60, 220, 3, 30, 10, false],
  ['Cupcake', 'كب كيك', 'sweet', '1 piece', 'قطعة', 65, 250, 3, 33, 12, false],
  ['Ice cream cone', 'آيس كريم كورنيتو', 'sweet', '1 cone', 'كورنيتو', 75, 220, 3.5, 26, 11, false, ['cornetto']],
  ['Ice cream stick, chocolate-coated', 'آيس كريم ستيك', 'sweet', '1 stick', 'قطعة', 65, 200, 2.5, 20, 12, false],
  ['Sugar-free chocolate', 'شوكولاتة دايت', 'sweet', '4 squares', '٤ قطع', 30, 150, 2, 14, 10, false, ['diet chocolate']],
  ['Diet cupcake (stevia)', 'كب كيك دايت', 'sweet', '1 piece', 'قطعة', 55, 160, 4, 20, 7, false],
  ['Diet jam', 'مربى دايت', 'sweet', '1 tbsp', 'معلقة كبيرة', 20, 25, 0, 6, 0, false],
  ['Diet jelly', 'جيلي دايت', 'sweet', '1 bowl', 'طبق', 120, 10, 1.5, 1, 0, false],
  ['Sweetener sachet', 'سكر دايت', 'other', '1 sachet', 'كيس', 1, 2, 0, 0.5, 0, false, ['stevia', 'ستيفيا']],
  ['Oatmeal with milk & honey', 'شوفان بلبن وعسل', 'staple', '1 bowl', 'طبق', 250, 280, 10, 45, 7, true, ['oatmeal']],
  ['Peanut butter sandwich', 'سندوتش زبدة فول سوداني', 'snack', '1 sandwich', 'سندوتش', 80, 270, 9, 30, 13, false],
  ['Protein bar', 'بروتين بار', 'snack', '1 bar', 'قطعة', 50, 200, 15, 20, 7, false],
  ['Rice cakes', 'رايس كيك', 'snack', '2 pieces', 'قطعتين', 18, 70, 1.5, 15, 0.5, false],
  ['Fruit yogurt cup', 'زبادي بالفواكه', 'dairy', '1 cup', 'علبة', 150, 140, 5, 24, 2.5, false],
  ['Honey', 'عسل نحل', 'sweet', '1 tbsp', 'معلقة كبيرة', 21, 64, 0, 17, 0, false],

  // ------------------------- snacks, fats, extras ------------------------
  ['Crisps, small bag', 'شيبسي كيس صغير', 'snack', '1 bag', 'كيس', 30, 160, 2, 15, 10, true],
  ['Plain popcorn', 'فشار سادة', 'snack', '2 cups', 'كوبين', 25, 100, 3, 20, 1, false],
  ['Digestive biscuits', 'بسكوت دايجستيف', 'snack', '3 pieces', '٣ قطع', 45, 220, 3, 30, 10, false],
  ['Croissant', 'كرواسون', 'snack', '1 piece', 'قطعة', 60, 240, 5, 26, 13, false],
  ['Roasted peanuts', 'سوداني محمص', 'snack', '1 handful', 'حفنة', 30, 175, 8, 5, 15, false],
  ['Mixed nuts', 'مكسرات مشكلة', 'snack', '1 handful', 'حفنة', 30, 180, 5, 7, 15, false],
  ['Almonds', 'لوز', 'snack', '20 pieces', '٢٠ حبة', 25, 145, 5, 5, 13, false],
  ['Walnuts', 'عين جمل', 'snack', '7 halves', '٧ نص حبة', 25, 165, 4, 3.5, 16, false],
  ['Olives', 'زيتون', 'snack', '10 pieces', '١٠ حبات', 40, 60, 0.4, 3, 5.5, false],
  ['Halawa tehinia', 'حلاوة طحينية', 'sweet', '1 piece', 'قطعة', 40, 210, 5, 20, 13, false],
  ['Peanut butter', 'زبدة فول سوداني', 'other', '1 tbsp', 'معلقة كبيرة', 16, 95, 4, 3.5, 8, false],
  ['Tahini', 'طحينة', 'other', '1 tbsp', 'معلقة كبيرة', 15, 90, 2.6, 3, 8, false],
  ['Olive oil', 'زيت زيتون', 'other', '1 tbsp', 'معلقة كبيرة', 14, 120, 0, 0, 14, true],
  ['Ghee', 'سمنة', 'other', '1 tbsp', 'معلقة كبيرة', 14, 125, 0, 0, 14, true],
  ['Butter', 'زبدة', 'other', '1 tbsp', 'معلقة كبيرة', 14, 100, 0.1, 0, 11, false],
  ['Sunflower oil', 'زيت عباد الشمس', 'other', '1 tbsp', 'معلقة كبيرة', 14, 124, 0, 0, 14, false],
  ['Mayonnaise', 'مايونيز', 'other', '1 tbsp', 'معلقة كبيرة', 15, 100, 0.2, 0.6, 11, false],
  ['Sugar', 'سكر', 'other', '1 tsp', 'معلقة صغيرة', 4, 16, 0, 4, 0, true],
  ['Whey protein', 'بروتين واي', 'other', '1 scoop', 'سكوب', 30, 120, 24, 3, 1.5, false],
  ['Protein bar', 'بروتين بار', 'snack', '1 bar', 'قطعة', 60, 220, 20, 22, 6, false],
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const [i, f] of FOODS.entries()) {
    const [name, nameAr, category, portion, portionAr, grams, calories, protein, carbs, fat, common, aliases] = f;
    const data = {
      name,
      nameAr,
      category,
      portion,
      portionAr,
      grams,
      calories,
      protein,
      carbs,
      fat,
      common: common ?? false,
      order: i,
      aliases: aliases ? JSON.stringify(aliases) : null,
    };

    const existing = await prisma.food.findFirst({ where: { nameAr } });
    if (existing) {
      await prisma.food.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.food.create({ data });
      created++;
    }
  }

  const total = await prisma.food.count();
  const common = await prisma.food.count({ where: { common: true } });
  const groups = await prisma.food.groupBy({ by: ['category'], _count: true });

  console.log(`\nEgyptian foods: ${created} created · ${updated} updated · ${total} total (${common} everyday)`);
  console.log(groups.map((g) => `  ${g.category}: ${g._count}`).join('\n'));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
