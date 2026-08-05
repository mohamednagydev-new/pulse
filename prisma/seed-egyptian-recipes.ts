/**
 * Egyptian food.
 *
 * The library we shipped with was good international healthy cooking — hummus,
 * quinoa tabbouleh, salmon, brussels sprouts. None of it is what anyone in Cairo
 * actually eats, and there was no breakfast category at all. A meal planner built on
 * that library would hand a user in Shubra a plan of dishes they have never cooked,
 * which is the single fastest way to lose them.
 *
 * This is the local layer: twenty dishes people here eat every week, written with
 * realistic portions and honest macros, so the planner can build a day out of fuul,
 * koshari and molokhia instead of pretending everyone shops at an organic market.
 *
 * Portions are per serving and lean on the lighter side of how these are normally
 * cooked (less ghee, less oil in the fuul, brown rice where it works) — the point is
 * to make the food people love fit the numbers, not to replace it.
 *
 * Idempotent: matched by title, updated in place if already seeded.
 * Run: npx tsx prisma/seed-egyptian-recipes.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type R = {
  cat: 'breakfast' | 'main' | 'snack';
  title: string;
  titleAr: string;
  about: string;
  aboutAr: string;
  ing: string[];
  ingAr: string[];
  steps: string[];
  stepsAr: string[];
  prep: number;
  cook: number;
  servings: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  slots: string[];
  tags: string[];
  difficulty: string;
};

const B = 'breakfast', L = 'lunch', D = 'dinner', S = 'snack';

const RECIPES: R[] = [
  /* ----------------------------- BREAKFAST ----------------------------- */
  {
    cat: 'breakfast',
    title: 'Classic Fuul Medames with Olive Oil and Lemon',
    titleAr: 'فول مدمس بزيت الزيتون والليمون',
    about:
      'The breakfast half the country eats. Fuul is genuinely good food — high in fibre and protein and cheap — and the only thing that usually ruins it is how much oil goes in at the end. This keeps the flavour and controls the pour.',
    aboutAr:
      'فطار نص البلد. الفول أكل كويس فعلاً — ألياف وبروتين وسعره رخيص — واللي بيبوّظه غالباً كمية الزيت في الآخر. الوصفة دي بتحافظ على الطعم وبتظبط الزيت.',
    ing: [
      '2 cups cooked fuul (fava beans), with a little of their liquid',
      '1 tbsp olive oil',
      'Juice of 1 lemon',
      '2 cloves garlic, crushed',
      '1 tsp ground cumin',
      '1 tomato, finely diced',
      'Salt, to taste',
      'Chopped parsley to finish',
    ],
    ingAr: [
      'كوبين فول مدمس مستوي بشوية من مياهه',
      'معلقة كبيرة زيت زيتون',
      'عصير ليمونة',
      'فصين توم مهروس',
      'معلقة صغيرة كمون',
      'طماطم واحدة مقطعة ناعم',
      'ملح حسب الرغبة',
      'بقدونس مفروم للتزيين',
    ],
    steps: [
      'Warm the fuul in a pot with a splash of its liquid and mash about half of it against the side — you want texture, not paste.',
      'Stir in the garlic, cumin and salt while it is hot so the garlic softens.',
      'Off the heat, add the lemon juice and olive oil. Adding the oil at the end means you taste it and use less.',
      'Top with the tomato and parsley. Serve with baladi bread and a boiled egg if you need more protein.',
    ],
    stepsAr: [
      'سخّن الفول في حلة مع شوية من مياهه واهرس نصه على جنب الحلة — عايزينه فيه قوام مش معجون.',
      'قلّب التوم والكمون والملح وهو سخن عشان التوم يستوي.',
      'اطفي النار وضيف عصير الليمون وزيت الزيتون. لما تحط الزيت في الآخر بتحس بطعمه وبتستخدم أقل.',
      'زيّن بالطماطم والبقدونس. قدّمه مع عيش بلدي وبيضة مسلوقة لو محتاج بروتين أكتر.',
    ],
    prep: 5,
    cook: 10,
    servings: 2,
    kcal: 310,
    p: 16,
    c: 42,
    f: 9,
    slots: [B],
    tags: ['vegan', 'high-fiber', 'high-protein', 'plant-based', 'budget'],
    difficulty: 'Easy',
  },
  {
    cat: 'breakfast',
    title: 'Baked Ta’meya (Egyptian Falafel)',
    titleAr: 'طعمية مخبوزة في الفرن',
    about:
      'Ta’meya fried properly drinks its weight in oil. Baked, it keeps the herb-heavy Egyptian character — this is fava bean ta’meya, not chickpea falafel — at roughly a third of the fat.',
    aboutAr:
      'الطعمية المقلية بتشرب زيت كتير جداً. في الفرن بتحافظ على طعم الطعمية المصري المليان خضرة — دي طعمية فول مش فلافل حمص — بتلت كمية الدهون تقريباً.',
    ing: [
      '2 cups dried split fava beans, soaked overnight (not cooked)',
      '1 bunch parsley',
      '1 bunch coriander',
      '1 bunch dill',
      '1 onion, quartered',
      '4 cloves garlic',
      '1 tsp ground coriander',
      '1 tsp cumin',
      '1/2 tsp baking soda',
      '2 tbsp sesame seeds',
      '1 tbsp olive oil for brushing',
    ],
    ingAr: [
      'كوبين فول مدشوش ناشف منقوع من الليلة (مش مسلوق)',
      'باقة بقدونس',
      'باقة كزبرة خضرا',
      'باقة شبت',
      'بصلة مقطعة أرباع',
      '٤ فصوص توم',
      'معلقة صغيرة كزبرة ناشفة',
      'معلقة صغيرة كمون',
      'نص معلقة صغيرة بيكربونات',
      '٢ معلقة كبيرة سمسم',
      'معلقة كبيرة زيت زيتون للدهان',
    ],
    steps: [
      'Drain the soaked beans well and blitz with the herbs, onion and garlic until it looks like coarse green sand. Do not add water.',
      'Mix in the spices and salt, then rest the mix in the fridge for 30 minutes — this is what stops it falling apart.',
      'Stir in the baking soda right before shaping. Form small flat discs and press one side into the sesame.',
      'Brush both sides with oil and bake at 200°C for 20–25 minutes, flipping once, until the edges are properly brown.',
    ],
    stepsAr: [
      'صفّي الفول المنقوع كويس واضربه مع الخضرة والبصل والتوم لحد ما يبقى شكله زي الرملة الخضرا الخشنة. متضيفش مياه.',
      'قلّب البهارات والملح وسيب الخليط في التلاجة نص ساعة — ده اللي بيمنعه إنه يتفتفت.',
      'حط البيكربونات قبل التشكيل على طول. اعمل أقراص صغيرة مفلطحة واغمس وش واحد في السمسم.',
      'ادهن الوشين بالزيت واخبز على ٢٠٠ درجة لمدة ٢٠–٢٥ دقيقة مع التقليب مرة، لحد ما الأطراف تحمرّ كويس.',
    ],
    prep: 20,
    cook: 25,
    servings: 4,
    kcal: 250,
    p: 14,
    c: 30,
    f: 8,
    slots: [B, S],
    tags: ['vegan', 'high-fiber', 'high-protein', 'plant-based', 'baked'],
    difficulty: 'Medium',
  },
  {
    cat: 'breakfast',
    title: 'Eggs with Pastirma',
    titleAr: 'بيض بالبسطرمة',
    about:
      'A protein-dense Egyptian breakfast that takes six minutes. Pastirma is salty and strong, so a little goes far — the point is to use it as seasoning rather than as the main event.',
    aboutAr:
      'فطار مصري مليان بروتين وبياخد ٦ دقايق. البسطرمة مالحة وقوية، فالشوية بتعمل حاجة كتير — استخدمها كتتبيلة مش كطبق رئيسي.',
    ing: [
      '3 eggs',
      '40 g pastirma, sliced thin and trimmed of most of the fat',
      '1 tsp ghee or olive oil',
      'Black pepper',
      'Chopped rocket or parsley to finish',
    ],
    ingAr: [
      '٣ بيضات',
      '٤٠ جرام بسطرمة شرايح رفيعة ومنزوع أغلب الدهن',
      'معلقة صغيرة سمنة أو زيت زيتون',
      'فلفل أسود',
      'جرجير أو بقدونس مفروم للتزيين',
    ],
    steps: [
      'Warm the pastirma in a dry pan for 30 seconds a side until the edges curl — it releases its own fat, so you need almost no oil.',
      'Add the ghee, then crack the eggs straight in.',
      'Cook on a low flame until the whites set but the yolks are still soft.',
      'Black pepper, a handful of rocket, and eat it immediately.',
    ],
    stepsAr: [
      'سخّن البسطرمة في طاسة ناشفة ٣٠ ثانية على كل وش لحد ما الأطراف تتكرمش — بتطلع دهنها لوحدها فمش هتحتاج زيت تقريباً.',
      'ضيف السمنة وبعدين اكسر البيض على طول.',
      'اطبخ على نار هادية لحد ما البياض يتماسك والصفار لسه طري.',
      'فلفل أسود وحبة جرجير وكُله في الحال.',
    ],
    prep: 3,
    cook: 6,
    servings: 1,
    kcal: 330,
    p: 27,
    c: 2,
    f: 24,
    slots: [B],
    tags: ['high-protein', 'low-carb', 'quick', 'gluten-free'],
    difficulty: 'Easy',
  },
  {
    cat: 'breakfast',
    title: 'Egyptian Shakshuka',
    titleAr: 'شكشوكة مصرية',
    about:
      'Eggs poached in a tomato and pepper base. One pan, cheap year-round, and the vegetables carry the volume so it fills you up for the calories.',
    aboutAr:
      'بيض مسلوق في صلصة طماطم وفلفل. طاسة واحدة، ورخيصة طول السنة، والخضار بيملى المعدة فبتشبع بسعرات قليلة.',
    ing: [
      '4 eggs',
      '4 tomatoes, chopped (or 400 g tinned)',
      '1 green pepper, diced',
      '1 onion, diced',
      '3 cloves garlic',
      '1 tbsp olive oil',
      '1 tsp cumin',
      '1/2 tsp chilli flakes',
      'Salt and pepper',
      'Coriander to finish',
    ],
    ingAr: [
      '٤ بيضات',
      '٤ طماطم مقطعة (أو ٤٠٠ جرام معلبة)',
      'فلفل أخضر مقطع',
      'بصلة مقطعة',
      '٣ فصوص توم',
      'معلقة كبيرة زيت زيتون',
      'معلقة صغيرة كمون',
      'نص معلقة صغيرة شطة ناعمة',
      'ملح وفلفل',
      'كزبرة خضرا للتزيين',
    ],
    steps: [
      'Soften the onion and pepper in the oil for 5 minutes, then add the garlic and spices for 30 seconds.',
      'Add the tomatoes and simmer 10–12 minutes until the sauce thickens and stops being watery. This step is the whole dish — do not rush it.',
      'Make four wells, crack in the eggs, cover and cook 4–5 minutes until the whites set.',
      'Coriander on top. Serve with one loaf of baladi bread, not three.',
    ],
    stepsAr: [
      'شوّح البصل والفلفل في الزيت ٥ دقايق، وبعدين ضيف التوم والبهارات ٣٠ ثانية.',
      'ضيف الطماطم وسيبها تغلي ١٠–١٢ دقيقة لحد ما الصلصة تتقل وتبطل تكون سايحة. الخطوة دي هي الأكلة كلها — متستعجلش فيها.',
      'اعمل ٤ حفر واكسر فيهم البيض، غطي واطبخ ٤–٥ دقايق لحد ما البياض يتماسك.',
      'كزبرة فوق. قدّمها مع رغيف عيش بلدي واحد، مش تلاتة.',
    ],
    prep: 10,
    cook: 20,
    servings: 2,
    kcal: 280,
    p: 17,
    c: 20,
    f: 15,
    slots: [B, D],
    tags: ['vegetarian', 'high-protein', 'gluten-free', 'one-pan'],
    difficulty: 'Easy',
  },
  {
    cat: 'breakfast',
    title: 'Belila with Warm Milk and Cinnamon',
    titleAr: 'بليلة باللبن والقرفة',
    about:
      'Whole wheat berries simmered in milk. A slow-release breakfast that keeps you full to lunch, and it costs almost nothing.',
    aboutAr:
      'قمح كامل مسلوق في اللبن. فطار بيفضل شغال معاك لحد الغدا، وسعره تقريباً ولا حاجة.',
    ing: [
      '1 cup whole wheat berries, soaked overnight',
      '2 cups milk',
      '1 tbsp honey',
      '1/2 tsp cinnamon',
      '2 tbsp chopped nuts',
      'Pinch of salt',
    ],
    ingAr: [
      'كوب قمح كامل منقوع من الليلة',
      'كوبين لبن',
      'معلقة كبيرة عسل',
      'نص معلقة صغيرة قرفة',
      '٢ معلقة كبيرة مكسرات مفرومة',
      'رشة ملح',
    ],
    steps: [
      'Boil the soaked wheat in water with a pinch of salt for about 45 minutes until the grains split open and go soft.',
      'Drain, return to the pot and add the milk. Simmer 10 minutes on low so it thickens.',
      'Sweeten with honey off the heat — added while boiling, honey just becomes sugar.',
      'Serve warm with cinnamon and nuts on top.',
    ],
    stepsAr: [
      'اسلق القمح المنقوع في مياه مع رشة ملح حوالي ٤٥ دقيقة لحد ما الحبة تتفتح وتطرى.',
      'صفّيه ورجّعه للحلة وضيف اللبن. سيبه على نار هادية ١٠ دقايق لحد ما يتقل.',
      'حلّيه بالعسل بعد ما تطفي النار — لو حطيته وهو بيغلي بيبقى سكر عادي.',
      'قدّمه دافي والقرفة والمكسرات فوق.',
    ],
    prep: 5,
    cook: 55,
    servings: 3,
    kcal: 290,
    p: 12,
    c: 48,
    f: 6,
    slots: [B, S],
    tags: ['vegetarian', 'high-fiber', 'whole-grain', 'budget'],
    difficulty: 'Easy',
  },

  /* ------------------------------- MAINS ------------------------------- */
  {
    cat: 'main',
    title: 'Koshari, Portioned',
    titleAr: 'كشري مصري بالمقادير الصح',
    about:
      'Koshari is not the problem — the plate size is. Built from rice, lentils and pasta, it is a complete plant protein. This is the same dish with the ratios fixed: more lentils, less pasta, and the fried onion measured rather than piled.',
    aboutAr:
      'الكشري مش هو المشكلة — حجم الطبق هو المشكلة. رز وعدس ومكرونة يعني بروتين نباتي كامل. دي نفس الأكلة بنسب مظبوطة: عدس أكتر، مكرونة أقل، وبصل محمر بالمقدار مش كومة.',
    ing: [
      '1 cup brown lentils',
      '1 cup rice',
      '1 cup small pasta',
      '1 large onion, sliced thin',
      '2 tbsp oil (for the onions)',
      '400 g tomato passata',
      '3 cloves garlic',
      '2 tbsp vinegar',
      '1 tsp cumin',
      '1 can chickpeas, drained',
      'Chilli to taste',
    ],
    ingAr: [
      'كوب عدس بجبة',
      'كوب رز',
      'كوب مكرونة صغيرة',
      'بصلة كبيرة مقطعة شرايح رفيعة',
      '٢ معلقة كبيرة زيت (للبصل)',
      '٤٠٠ جرام صلصة طماطم',
      '٣ فصوص توم',
      '٢ معلقة كبيرة خل',
      'معلقة صغيرة كمون',
      'علبة حمص مصفاة',
      'شطة حسب الرغبة',
    ],
    steps: [
      'Fry the onion slowly in the oil until deep brown, then lift onto kitchen paper. Keep a spoon of that oil — it is where the flavour is.',
      'Boil the lentils 20 minutes until tender but not collapsing. Cook the rice and pasta separately.',
      'For the sauce: garlic in the reserved oil, then passata, vinegar, cumin and chilli. Simmer 10 minutes.',
      'Layer lentils, rice, pasta, chickpeas. One ladle of sauce and one small handful of onion per plate — that is the portion.',
    ],
    stepsAr: [
      'حمّر البصل على نار هادية لحد ما يبقى بني غامق، وبعدين شيله على ورق مطبخ. سيب معلقة من الزيت ده — الطعم كله فيه.',
      'اسلق العدس ٢٠ دقيقة لحد ما يطرى من غير ما يتهرّى. اسلق الرز والمكرونة كل واحد لوحده.',
      'للصلصة: توم في الزيت المحجوز، وبعدين الصلصة والخل والكمون والشطة. سيبها تغلي ١٠ دقايق.',
      'رصّ العدس فالرز فالمكرونة فالحمص. مغرفة صلصة وحفنة بصل صغيرة للطبق — دي البورشن الصح.',
    ],
    prep: 15,
    cook: 40,
    servings: 5,
    kcal: 420,
    p: 17,
    c: 72,
    f: 8,
    slots: [L, D],
    tags: ['vegan', 'high-fiber', 'high-protein', 'plant-based', 'budget'],
    difficulty: 'Medium',
  },
  {
    cat: 'main',
    title: 'Molokhia with Chicken',
    titleAr: 'ملوخية بالفراخ',
    about:
      'Molokhia leaves are one of the most nutrient-dense greens available here — high in iron, calcium and vitamin A. Cooked in a real chicken stock with the ghee measured, it is a lean, high-protein meal.',
    aboutAr:
      'ورق الملوخية من أغنى الخضروات المتاحة عندنا — حديد وكالسيوم وفيتامين أ. لما تتعمل في شوربة فراخ حقيقية والسمنة بالمقدار، بتبقى وجبة خفيفة ومليانة بروتين.',
    ing: [
      '500 g chicken pieces, skin removed',
      '400 g frozen or fresh molokhia leaves',
      '1.5 L water',
      '1 onion, 1 bay leaf, 4 cardamom pods (for the stock)',
      '6 cloves garlic, crushed',
      '1 tbsp ghee',
      '1 tbsp ground coriander',
      'Salt to taste',
    ],
    ingAr: [
      '٥٠٠ جرام فراخ مقطعة منزوعة الجلد',
      '٤٠٠ جرام ملوخية مفرومة مجمدة أو طازة',
      'لتر ونص مياه',
      'بصلة وورقة لورا و٤ حبات حبهان (للشوربة)',
      '٦ فصوص توم مهروس',
      'معلقة كبيرة سمنة',
      'معلقة كبيرة كزبرة ناشفة',
      'ملح حسب الرغبة',
    ],
    steps: [
      'Simmer the chicken with the onion, bay and cardamom for 35 minutes. Skim the foam — that is what makes stock taste clean. Strain and keep the liquid.',
      'Bring 1 litre of the stock to a gentle boil and stir in the molokhia. Never let it hit a rolling boil or it separates.',
      'For the ta’‘leya: fry the garlic and coriander in the ghee until it smells sharp and just starts to colour, then tip it in and cover immediately.',
      'Serve with the chicken, over rice or with bread.',
    ],
    stepsAr: [
      'اسلق الفراخ مع البصل واللورا والحبهان ٣٥ دقيقة. شيل الرغوة — دي اللي بتخلي الشوربة طعمها نضيف. صفّي واحتفظ بالمرقة.',
      'سخّن لتر من المرقة لحد الغليان الهادي وقلّب الملوخية. متسيبهاش تغلي غليان قوي أبداً وإلا هتفصل.',
      'للتقلية: حمّر التوم والكزبرة في السمنة لحد ما ريحتها تطلع وتبدأ تتحمر، وبعدين اسكبها وغطي على طول.',
      'قدّمها مع الفراخ على رز أو مع العيش.',
    ],
    prep: 10,
    cook: 45,
    servings: 4,
    kcal: 290,
    p: 32,
    c: 10,
    f: 13,
    slots: [L, D],
    tags: ['high-protein', 'low-carb', 'gluten-free', 'iron-rich'],
    difficulty: 'Medium',
  },
  {
    cat: 'main',
    title: 'Bamia with Lean Beef',
    titleAr: 'بامية باللحمة',
    about:
      'Okra stew with beef. Slow-cooked so the meat goes tender on a cheaper cut, and the okra does the thickening so there is no flour or extra fat.',
    aboutAr:
      'بامية باللحمة. بتتطبخ على مهلها فاللحمة بتطرى حتى لو قطعة رخيصة، والبامية هي اللي بتتقل الصلصة من غير دقيق ولا دهون زيادة.',
    ing: [
      '400 g stewing beef, cubed and trimmed',
      '500 g okra, tops trimmed',
      '400 g tomato passata',
      '1 onion, diced',
      '5 cloves garlic',
      '1 tbsp oil',
      '1 tbsp coriander',
      'Juice of half a lemon',
      'Salt and pepper',
    ],
    ingAr: [
      '٤٠٠ جرام لحمة بتلو مكعبات منظفة',
      '٥٠٠ جرام بامية مقرّطة',
      '٤٠٠ جرام صلصة طماطم',
      'بصلة مقطعة',
      '٥ فصوص توم',
      'معلقة كبيرة زيت',
      'معلقة كبيرة كزبرة ناشفة',
      'عصير نص ليمونة',
      'ملح وفلفل',
    ],
    steps: [
      'Brown the beef hard in the oil, in batches. Crowding the pan steams the meat instead of colouring it.',
      'Add the onion, then the passata and enough water to cover. Simmer covered for 60–75 minutes until the beef gives way.',
      'Add the okra whole and cook 15 minutes more — stir gently and rarely, or it turns slimy.',
      'Finish with garlic fried in a little oil with the coriander, plus the lemon juice.',
    ],
    stepsAr: [
      'حمّر اللحمة على نار عالية في الزيت على دفعات. لو زحمت الطاسة اللحمة هتسلق مش هتتحمر.',
      'ضيف البصل وبعدين الصلصة ومياه تغطي. غطي وسيبها ٦٠–٧٥ دقيقة لحد ما اللحمة تطرى.',
      'ضيف البامية صحيحة واطبخ ١٥ دقيقة كمان — قلّب برفق وعلى فترات، وإلا هتلزّج.',
      'كمّل بتقلية توم في شوية زيت مع الكزبرة، وعصير الليمون.',
    ],
    prep: 15,
    cook: 80,
    servings: 4,
    kcal: 320,
    p: 28,
    c: 22,
    f: 13,
    slots: [L, D],
    tags: ['high-protein', 'high-fiber', 'gluten-free', 'iron-rich'],
    difficulty: 'Medium',
  },
  {
    cat: 'main',
    title: 'Stuffed Courgettes (Mahshi Kousa)',
    titleAr: 'محشي كوسة',
    about:
      'Mahshi is usually written off as heavy, but the weight comes from the oil in the filling and the size of the plate. With brown rice, plenty of herbs and a measured spoon of oil, it is a balanced meal.',
    aboutAr:
      'المحشي بيتقال عليه تقيل، بس التقل جاي من الزيت في الحشو ومن حجم الطبق. برز بني وخضرة كتير ومعلقة زيت بالمقدار، بيبقى وجبة متوازنة.',
    ing: [
      '8 medium courgettes, hollowed',
      '1 cup brown rice, rinsed',
      '1 bunch parsley + 1 bunch dill, chopped',
      '1 onion, finely diced',
      '2 tomatoes, grated',
      '1 tbsp olive oil',
      '1 tsp cumin, salt, pepper',
      '400 g tomato passata for the pot',
    ],
    ingAr: [
      '٨ كوسات وسط مفرّغة',
      'كوب رز بني مغسول',
      'باقة بقدونس وباقة شبت مفرومين',
      'بصلة مفرومة ناعم',
      'طماطمتين مبشورين',
      'معلقة كبيرة زيت زيتون',
      'معلقة صغيرة كمون وملح وفلفل',
      '٤٠٠ جرام صلصة للحلة',
    ],
    steps: [
      'Mix the rice, herbs, onion, grated tomato, oil and spices. The filling should look wet — dry filling gives you dry mahshi.',
      'Fill each courgette about three-quarters full. Rice expands, and over-stuffing is how they split.',
      'Stand them in a pot, pour over the passata and enough water to just cover.',
      'Cover and simmer 40–45 minutes on low until the rice is soft.',
    ],
    stepsAr: [
      'اخلط الرز والخضرة والبصل والطماطم المبشورة والزيت والبهارات. الحشو لازم يبان مبلول — الحشو الناشف بيدّي محشي ناشف.',
      'املا كل كوسة تلات أرباع بس. الرز بيكبر، والزنق هو اللي بيفقّعهم.',
      'رصّهم واقفين في الحلة، وصب عليهم الصلصة ومياه تغطي بالعافية.',
      'غطي وسيبهم على نار هادية ٤٠–٤٥ دقيقة لحد ما الرز يستوي.',
    ],
    prep: 30,
    cook: 45,
    servings: 4,
    kcal: 340,
    p: 9,
    c: 58,
    f: 9,
    slots: [L, D],
    tags: ['vegan', 'high-fiber', 'plant-based', 'whole-grain'],
    difficulty: 'Medium',
  },
  {
    cat: 'main',
    title: 'Grilled Bolti (Tilapia) with Cumin and Lemon',
    titleAr: 'سمك بلطي مشوي بالكمون والليمون',
    about:
      'The cheapest high-protein meal in the country. Grilled instead of fried, a whole bolti is nearly all protein for very little fat.',
    aboutAr:
      'أرخص وجبة بروتين في البلد. مشوي مش مقلي، البلطية الكاملة كلها بروتين تقريباً بدهون قليلة جداً.',
    ing: [
      '2 whole tilapia, cleaned and scored',
      '2 tbsp cumin',
      '1 tbsp ground coriander',
      '4 cloves garlic, crushed',
      'Juice of 2 lemons',
      '1 tbsp olive oil',
      'Salt',
    ],
    ingAr: [
      'سمكتين بلطي منظفين ومشرشرين',
      '٢ معلقة كبيرة كمون',
      'معلقة كبيرة كزبرة ناشفة',
      '٤ فصوص توم مهروس',
      'عصير ٢ ليمونة',
      'معلقة كبيرة زيت زيتون',
      'ملح',
    ],
    steps: [
      'Mix everything except the fish into a paste and rub it into the scores and the cavity.',
      'Leave 30 minutes. Any longer in this much lemon and the flesh starts to cure and go firm.',
      'Grill 7–8 minutes a side over a medium heat — high heat burns the cumin before the fish is done.',
      'Serve with salad and lemon. Rice optional depending on your day.',
    ],
    stepsAr: [
      'اخلط كل حاجة ماعدا السمك لحد ما تبقى عجينة وادهن بيها الشرشرة وجوه السمكة.',
      'سيبها ٣٠ دقيقة. أكتر من كده في كمية الليمون دي واللحمة هتبدأ تنشف وتتقل.',
      'اشوي ٧–٨ دقايق لكل وش على نار متوسطة — النار العالية بتحرق الكمون قبل ما السمك يستوي.',
      'قدّمها مع سلطة وليمون. الرز حسب يومك.',
    ],
    prep: 35,
    cook: 16,
    servings: 2,
    kcal: 260,
    p: 38,
    c: 3,
    f: 10,
    slots: [L, D],
    tags: ['high-protein', 'low-carb', 'gluten-free', 'budget', 'omega-3'],
    difficulty: 'Easy',
  },
  {
    cat: 'main',
    title: 'Egyptian Lentil Soup (Shorbet Ads)',
    titleAr: 'شوربة عدس مصرية',
    about:
      'Yellow split lentils blended smooth with cumin. Cheap, filling, and one of the few things that is genuinely as good for you as everyone claims.',
    aboutAr:
      'عدس أصفر مضروب ناعم بالكمون. رخيصة وبتشبع، ومن الحاجات القليلة اللي فعلاً مفيدة زي ما الناس بتقول.',
    ing: [
      '1.5 cups yellow split lentils, rinsed',
      '1 onion, 1 carrot, 1 tomato, roughly chopped',
      '1.5 L water or stock',
      '2 tsp cumin',
      '1 tbsp olive oil',
      'Salt, lemon to serve',
    ],
    ingAr: [
      'كوب ونص عدس أصفر مغسول',
      'بصلة وجزرة وطماطمة مقطعين خشن',
      'لتر ونص مياه أو مرقة',
      'معلقتين صغيرين كمون',
      'معلقة كبيرة زيت زيتون',
      'ملح، وليمون للتقديم',
    ],
    steps: [
      'Soften the onion in the oil, add the carrot and tomato for a couple of minutes.',
      'Add the lentils and water, bring to a boil then simmer 30 minutes until the lentils fall apart.',
      'Blend smooth. Add the cumin after blending — blitzing it in early flattens the flavour.',
      'Season and serve with lemon. A squeeze of lemon on lentils also helps you absorb the iron.',
    ],
    stepsAr: [
      'شوّح البصل في الزيت، ضيف الجزر والطماطم دقيقتين.',
      'ضيف العدس والمياه، سيبها تغلي وبعدين نار هادية ٣٠ دقيقة لحد ما العدس يتهرّى.',
      'اضربها في الخلاط. حط الكمون بعد الضرب — لو ضربته بدري طعمه بيروح.',
      'ملح وقدّمها مع ليمون. عصرة الليمون على العدس كمان بتساعد جسمك يمتص الحديد.',
    ],
    prep: 10,
    cook: 35,
    servings: 4,
    kcal: 250,
    p: 15,
    c: 38,
    f: 5,
    slots: [L, D],
    tags: ['vegan', 'high-fiber', 'high-protein', 'plant-based', 'budget'],
    difficulty: 'Easy',
  },
  {
    cat: 'main',
    title: 'Sayadeya Fish with Brown Rice',
    titleAr: 'صيادية سمك برز بني',
    about:
      'Coastal Egyptian fish and rice. The rice takes its colour and flavour from caramelised onion and fish stock rather than from oil.',
    aboutAr:
      'سمك ورز على الطريقة الساحلية. الرز بياخد لونه وطعمه من البصل المحمر ومرقة السمك مش من الزيت.',
    ing: [
      '600 g firm white fish fillets',
      '2 cups brown rice',
      '3 onions, sliced',
      '2 tbsp oil',
      '1 tsp cumin, 1 tsp coriander, 1/2 tsp turmeric',
      '4 cups fish or vegetable stock',
      'Lemon',
    ],
    ingAr: [
      '٦٠٠ جرام فيليه سمك أبيض متماسك',
      'كوبين رز بني',
      '٣ بصلات شرايح',
      '٢ معلقة كبيرة زيت',
      'معلقة صغيرة كمون، معلقة صغيرة كزبرة، نص معلقة كركم',
      '٤ كوب مرقة سمك أو خضار',
      'ليمون',
    ],
    steps: [
      'Cook the onions slowly in the oil for 20 minutes until deep brown and sweet. This is the whole flavour base — do not shortcut it.',
      'Take out half the onions for the top. Add the rice and spices to the pot and toast for 2 minutes.',
      'Add the stock, cover and cook 35–40 minutes until the brown rice is done.',
      'Season and pan-sear the fish separately, 3 minutes a side, and lay it over the rice with the reserved onions and lemon.',
    ],
    stepsAr: [
      'اطبخ البصل في الزيت على نار هادية ٢٠ دقيقة لحد ما يبقى بني غامق وحلو. ده أساس الطعم كله — متختصرهاش.',
      'شيل نص البصل للتزيين. ضيف الرز والبهارات للحلة وشوّحهم دقيقتين.',
      'ضيف المرقة، غطي واطبخ ٣٥–٤٠ دقيقة لحد ما الرز البني يستوي.',
      'تبّل السمك واقليه في طاسة لوحده ٣ دقايق لكل وش، وحطه فوق الرز مع البصل المحجوز والليمون.',
    ],
    prep: 15,
    cook: 60,
    servings: 4,
    kcal: 450,
    p: 36,
    c: 52,
    f: 11,
    slots: [L, D],
    tags: ['high-protein', 'whole-grain', 'dairy-free'],
    difficulty: 'Medium',
  },
  {
    cat: 'main',
    title: 'Alexandrian Liver (Kebda Eskandarani), Lightened',
    titleAr: 'كبدة إسكندراني خفيفة',
    about:
      'Liver is the most iron-dense food you can buy cheaply, which matters in a population where anaemia is common. The street version swims in oil; this one uses a hot pan and a single spoon.',
    aboutAr:
      'الكبدة أغنى أكل بالحديد وسعره رخيص، وده مهم في بلد الأنيميا فيها منتشرة. نسخة الشارع عايمة في الزيت؛ دي بتعتمد على طاسة سخنة ومعلقة واحدة.',
    ing: [
      '500 g beef liver, sliced thin',
      '1 tbsp oil',
      '1 green pepper + 1 chilli, sliced',
      '6 cloves garlic, sliced',
      '1 tsp cumin, 1/2 tsp chilli powder',
      '2 tbsp vinegar',
      'Lemon, salt, pepper',
    ],
    ingAr: [
      '٥٠٠ جرام كبدة بتلو شرايح رفيعة',
      'معلقة كبيرة زيت',
      'فلفل أخضر وفلفل حار مقطعين',
      '٦ فصوص توم شرايح',
      'معلقة صغيرة كمون، نص معلقة شطة',
      '٢ معلقة كبيرة خل',
      'ليمون وملح وفلفل',
    ],
    steps: [
      'Get the pan properly hot before anything goes in. Liver cooked slowly turns to rubber.',
      'Sear the liver 90 seconds a side in the oil and take it out. It should still be pink inside.',
      'In the same pan cook the garlic, peppers and spices for a minute, add the vinegar to lift the pan.',
      'Return the liver, toss for 30 seconds, salt at the very end — salting early draws the water out and toughens it.',
    ],
    stepsAr: [
      'سخّن الطاسة كويس قبل أي حاجة. الكبدة لو اتطبخت على مهلها بتبقى زي الأستيك.',
      'حمّر الكبدة ٩٠ ثانية لكل وش في الزيت وشيلها. لازم تفضل وردي من جوه.',
      'في نفس الطاسة اطبخ التوم والفلفل والبهارات دقيقة، وضيف الخل عشان يشيل اللي على الطاسة.',
      'رجّع الكبدة، قلّب ٣٠ ثانية، وحط الملح في الآخر خالص — الملح بدري بيطلع المياه وبيقسّيها.',
    ],
    prep: 10,
    cook: 10,
    servings: 3,
    kcal: 240,
    p: 30,
    c: 8,
    f: 10,
    slots: [L, D],
    tags: ['high-protein', 'low-carb', 'iron-rich', 'quick', 'budget'],
    difficulty: 'Medium',
  },
  {
    cat: 'main',
    title: 'Torly — Baked Vegetable Casserole',
    titleAr: 'طورلي خضار في الفرن',
    about:
      'Everything roasted in one tray in tomato. High volume, low calorie, and it works as a side for a protein or as a full meal with bread.',
    aboutAr:
      'كل الخضار في صينية واحدة بالطماطم. حجم كبير وسعرات قليلة، وبتنفع طبق جانبي مع بروتين أو وجبة كاملة مع العيش.',
    ing: [
      '2 potatoes, 2 courgettes, 1 aubergine, 2 carrots — all cubed',
      '1 onion, 4 cloves garlic',
      '400 g passata',
      '2 tbsp olive oil',
      '1 tsp cumin, salt, pepper',
    ],
    ingAr: [
      'بطاطستين وكوستين وباذنجانة وجزرتين — كله مكعبات',
      'بصلة و٤ فصوص توم',
      '٤٠٠ جرام صلصة',
      '٢ معلقة كبيرة زيت زيتون',
      'معلقة صغيرة كمون وملح وفلفل',
    ],
    steps: [
      'Toss everything except the passata with the oil and spices.',
      'Roast at 200°C for 25 minutes on its own first — this browns the vegetables instead of stewing them.',
      'Pour over the passata, cover with foil, and bake 25 minutes more.',
      'Uncover for the last 10 minutes so the top catches.',
    ],
    stepsAr: [
      'قلّب كل حاجة ماعدا الصلصة مع الزيت والبهارات.',
      'اخبز على ٢٠٠ درجة ٢٥ دقيقة لوحدها الأول — كده الخضار هيتحمر مش هيتسلق.',
      'صب الصلصة، غطي بالفويل، واخبز ٢٥ دقيقة كمان.',
      'شيل الغطا آخر ١٠ دقايق عشان الوش يتحمر.',
    ],
    prep: 20,
    cook: 60,
    servings: 5,
    kcal: 210,
    p: 5,
    c: 34,
    f: 7,
    slots: [L, D],
    tags: ['vegan', 'high-fiber', 'plant-based', 'gluten-free', 'budget'],
    difficulty: 'Easy',
  },
  {
    cat: 'main',
    title: 'Egyptian Grilled Chicken with Dakka Marinade',
    titleAr: 'فراخ مشوية بتتبيلة الدقة المصرية',
    about:
      'The marinade every Egyptian griller uses — garlic, cumin, coriander, vinegar, yoghurt. The yoghurt tenderises without any added fat.',
    aboutAr:
      'التتبيلة اللي كل مشوّاتي مصري بيستخدمها — توم وكمون وكزبرة وخل وزبادي. الزبادي بيطري الفراخ من غير أي دهون زيادة.',
    ing: [
      '800 g chicken pieces, skin removed',
      '1 cup plain yoghurt',
      '8 cloves garlic, crushed',
      '2 tbsp cumin, 1 tbsp coriander, 1 tsp paprika',
      '3 tbsp vinegar',
      'Juice of 1 lemon',
      '1 tbsp oil, salt, pepper',
    ],
    ingAr: [
      '٨٠٠ جرام فراخ مقطعة منزوعة الجلد',
      'كوب زبادي',
      '٨ فصوص توم مهروس',
      '٢ معلقة كبيرة كمون، معلقة كزبرة، معلقة صغيرة بابريكا',
      '٣ معلقة كبيرة خل',
      'عصير ليمونة',
      'معلقة كبيرة زيت وملح وفلفل',
    ],
    steps: [
      'Mix the marinade and coat the chicken. Score the thick pieces so it gets inside.',
      'Marinate at least 4 hours, overnight if you can. Yoghurt marinades work slowly and do not turn the meat mushy the way lemon-only ones do.',
      'Grill or roast at 220°C for 35–40 minutes, turning once.',
      'Rest 5 minutes before serving — cutting straight away loses the juice onto the plate.',
    ],
    stepsAr: [
      'اخلط التتبيلة وغطي بيها الفراخ. شرشر القطع السميكة عشان التتبيلة تدخل جوه.',
      'سيبها ٤ ساعات على الأقل، والأحسن من الليلة. تتبيلة الزبادي بتشتغل على مهلها ومش بتهرّي اللحمة زي اللي بالليمون بس.',
      'اشوي أو اخبز على ٢٢٠ درجة ٣٥–٤٠ دقيقة مع التقليب مرة.',
      'سيبها ترتاح ٥ دقايق قبل التقديم — لو قطعتها على طول العصير هيسيح في الطبق.',
    ],
    prep: 15,
    cook: 40,
    servings: 4,
    kcal: 310,
    p: 42,
    c: 6,
    f: 13,
    slots: [L, D],
    tags: ['high-protein', 'low-carb', 'gluten-free'],
    difficulty: 'Easy',
  },
  {
    cat: 'main',
    title: 'Fattah with Lean Beef, Lightened',
    titleAr: 'فتة باللحمة خفيفة',
    about:
      'Fattah is the celebration dish, and it is usually built on fried bread and ghee. Toasting the bread instead of frying it takes out most of the fat without touching what makes it fattah.',
    aboutAr:
      'الفتة أكلة المناسبات، وغالباً بتتعمل بعيش مقلي وسمنة. لما تحمّص العيش بدل ما تقليه بتشيل أغلب الدهون من غير ما تلمس اللي بيخلي الفتة فتة.',
    ing: [
      '400 g stewing beef',
      '2 loaves baladi bread, torn and toasted',
      '2 cups cooked rice',
      '400 g passata',
      '6 cloves garlic',
      '3 tbsp vinegar',
      '1 tbsp ghee',
      'Salt, pepper',
    ],
    ingAr: [
      '٤٠٠ جرام لحمة بتلو',
      'رغيفين عيش بلدي مقطعين ومحمصين',
      'كوبين رز مسلوق',
      '٤٠٠ جرام صلصة',
      '٦ فصوص توم',
      '٣ معلقة كبيرة خل',
      'معلقة كبيرة سمنة',
      'ملح وفلفل',
    ],
    steps: [
      'Simmer the beef in water with salt and pepper for about 90 minutes until tender. Keep the broth.',
      'Toast the torn bread in the oven at 180°C until dry and crisp. This replaces frying entirely.',
      'Sauce: fry the garlic in the ghee, add the vinegar (stand back), then the passata and a ladle of broth. Simmer 10 minutes.',
      'Layer bread, a little broth to soften it, rice, sauce, then the beef on top.',
    ],
    stepsAr: [
      'اسلق اللحمة في مياه بملح وفلفل حوالي ساعة ونص لحد ما تطرى. احتفظ بالمرقة.',
      'حمّص العيش المقطع في الفرن على ١٨٠ درجة لحد ما ينشف ويقرمش. ده بيغني عن القلي خالص.',
      'الصلصة: حمّر التوم في السمنة، ضيف الخل (خد بالك)، وبعدين الصلصة ومغرفة مرقة. سيبها ١٠ دقايق.',
      'رصّ العيش، وشوية مرقة عشان يطرى، وبعدين الرز فالصلصة واللحمة فوق.',
    ],
    prep: 20,
    cook: 100,
    servings: 5,
    kcal: 430,
    p: 27,
    c: 55,
    f: 12,
    slots: [L, D],
    tags: ['high-protein', 'celebration'],
    difficulty: 'Medium',
  },

  /* ------------------------------- SNACKS ------------------------------ */
  {
    cat: 'snack',
    title: 'Hummus el Sham (Spiced Boiled Chickpeas)',
    titleAr: 'حمص الشام بالكمون',
    about:
      'The cart snack. Boiled chickpeas in cumin broth — high fibre, high protein, and it costs the price of nothing.',
    aboutAr:
      'سناك العربية. حمص مسلوق في مرقة كمون — ألياف وبروتين، وسعره ولا حاجة.',
    ing: [
      '2 cups dried chickpeas, soaked overnight',
      '2 tsp cumin',
      '1 tsp salt',
      'Lemon and chilli to serve',
    ],
    ingAr: [
      'كوبين حمص ناشف منقوع من الليلة',
      'معلقتين صغيرين كمون',
      'معلقة صغيرة ملح',
      'ليمون وشطة للتقديم',
    ],
    steps: [
      'Boil the soaked chickpeas in fresh water for 60–75 minutes until soft but still holding shape.',
      'Add salt and cumin in the last 10 minutes only — salting from the start keeps the skins tough.',
      'Serve warm in a cup with some of the broth, lemon and chilli.',
    ],
    stepsAr: [
      'اسلق الحمص المنقوع في مياه جديدة ٦٠–٧٥ دقيقة لحد ما يطرى وهو لسه محتفظ بشكله.',
      'حط الملح والكمون في آخر ١٠ دقايق بس — الملح من البداية بيخلي القشرة قاسية.',
      'قدّمه سخن في كوباية مع شوية من المرقة والليمون والشطة.',
    ],
    prep: 5,
    cook: 75,
    servings: 5,
    kcal: 180,
    p: 10,
    c: 28,
    f: 3,
    slots: [S],
    tags: ['vegan', 'high-fiber', 'high-protein', 'plant-based', 'budget'],
    difficulty: 'Easy',
  },
  {
    cat: 'snack',
    title: 'Baked Sweet Potato, Street-Cart Style',
    titleAr: 'بطاطا مشوية زي بتاعة العربية',
    about:
      'Winter on every corner. Slow-baked whole, the starch turns to sugar on its own — no honey, no butter, nothing added.',
    aboutAr:
      'الشتا على كل ناصية. لما تتخبز صحيحة على مهلها، النشا بيتحول لسكر لوحده — من غير عسل ولا زبدة ولا أي إضافات.',
    ing: ['2 medium sweet potatoes', 'Pinch of salt', 'Cinnamon, optional'],
    ingAr: ['٢ بطاطا وسط', 'رشة ملح', 'قرفة، اختياري'],
    steps: [
      'Wash, prick all over with a fork, and bake whole at 200°C for 45–55 minutes.',
      'The long bake is the point — the sugars only develop with time, so a microwave gives you a completely different, blander thing.',
      'Split, salt lightly, cinnamon if you like.',
    ],
    stepsAr: [
      'اغسل البطاطا، خرمها بشوكة من كل ناحية، واخبزها صحيحة على ٢٠٠ درجة ٤٥–٥٥ دقيقة.',
      'الخبز الطويل هو السر — السكر مبيتكوّنش غير مع الوقت، فالميكروويف بيديك حاجة تانية خالص وطعمها باهت.',
      'افتحها، رشة ملح، وقرفة لو حبيت.',
    ],
    prep: 3,
    cook: 55,
    servings: 2,
    kcal: 180,
    p: 4,
    c: 41,
    f: 0.5,
    slots: [S, B],
    tags: ['vegan', 'high-fiber', 'plant-based', 'gluten-free', 'budget'],
    difficulty: 'Easy',
  },
  {
    cat: 'snack',
    title: 'Dates with Walnuts and Labneh',
    titleAr: 'بلح بعين الجمل واللبنة',
    about:
      'Three ingredients, thirty seconds, and it covers the sweet craving with fibre, fat and protein instead of just sugar.',
    aboutAr:
      'تلات مكونات وتلاتين ثانية، وبتسد الوحام على الحلو بألياف ودهون وبروتين مش سكر وبس.',
    ing: ['6 dates, pitted', '6 walnut halves', '3 tbsp labneh', 'Pinch of cinnamon'],
    ingAr: ['٦ تمرات منزوعة النوى', '٦ نص حبة عين جمل', '٣ معلقة كبيرة لبنة', 'رشة قرفة'],
    steps: [
      'Split each date and fill with a little labneh and a walnut half.',
      'Dust with cinnamon.',
      'Six is a snack, not a starting point. The dates are where nearly all the sugar is.',
    ],
    stepsAr: [
      'افتح كل تمرة واحشيها بشوية لبنة ونص حبة عين جمل.',
      'رش قرفة.',
      'الستة دول سناك مش بداية. التمر هو اللي فيه السكر كله تقريباً.',
    ],
    prep: 5,
    cook: 0,
    servings: 2,
    kcal: 220,
    p: 6,
    c: 30,
    f: 9,
    slots: [S],
    tags: ['vegetarian', 'no-cook', 'quick', 'high-fiber'],
    difficulty: 'Easy',
  },
  {
    cat: 'snack',
    title: 'Lighter Roz bel Laban',
    titleAr: 'رز بلبن خفيف',
    about:
      'Rice pudding made with milk, less sugar and no cream. It stays a dessert — it just stops being a day’s worth of sugar in a bowl.',
    aboutAr:
      'رز بلبن باللبن، سكر أقل ومن غير كريمة. فضل تحلية زي ما هو — بس بطّل يبقى سكر يوم كامل في طبق.',
    ing: [
      '1/2 cup short-grain rice',
      '4 cups milk',
      '3 tbsp sugar',
      '1 tsp vanilla',
      '1 tbsp cornflour',
      'Cinnamon and crushed nuts to serve',
    ],
    ingAr: [
      'نص كوب رز قصير',
      '٤ كوب لبن',
      '٣ معلقة كبيرة سكر',
      'معلقة صغيرة فانيليا',
      'معلقة كبيرة نشا',
      'قرفة ومكسرات مجروشة للتقديم',
    ],
    steps: [
      'Boil the rice in a little water until almost soft, then add the milk.',
      'Simmer on low for 20 minutes, stirring so it does not catch on the base.',
      'Add the sugar and vanilla, then the cornflour slaked in cold milk. Cook 3 more minutes until it coats the spoon.',
      'Cool, then top with cinnamon and nuts.',
    ],
    stepsAr: [
      'اسلق الرز في شوية مياه لحد ما يقرب يستوي، وبعدين ضيف اللبن.',
      'سيبه على نار هادية ٢٠ دقيقة مع التقليب عشان ميلزقش في القاع.',
      'ضيف السكر والفانيليا، وبعدين النشا المذوب في لبن بارد. اطبخ ٣ دقايق كمان لحد ما يغلف المعلقة.',
      'سيبه يبرد وزيّنه بالقرفة والمكسرات.',
    ],
    prep: 5,
    cook: 30,
    servings: 5,
    kcal: 190,
    p: 7,
    c: 30,
    f: 4,
    slots: [S],
    tags: ['vegetarian', 'gluten-free', 'dessert'],
    difficulty: 'Easy',
  },
];

/** Categories the Egyptian dishes land in. "Breakfast" did not exist at all, which is
 *  the clearest sign the library was never built for people who eat here. */
const CATS: Record<R['cat'], { title: string; titleAr: string; icon: string; order: number }> = {
  breakfast: { title: 'Egyptian Breakfast', titleAr: 'الفطار المصري', icon: '🍳', order: 1 },
  main: { title: 'Egyptian Kitchen', titleAr: 'المطبخ المصري', icon: '🥘', order: 2 },
  snack: { title: 'Egyptian Snacks', titleAr: 'سناكس مصرية', icon: '🫘', order: 3 },
};

async function categoryFor(key: R['cat']) {
  const spec = CATS[key];
  const found = await prisma.category.findFirst({ where: { kind: 'recipe', title: spec.title } });
  if (found) return found.id;
  const made = await prisma.category.create({
    data: { kind: 'recipe', title: spec.title, titleAr: spec.titleAr, icon: spec.icon, order: spec.order },
  });
  console.log(`  + category: ${spec.title} / ${spec.titleAr}`);
  return made.id;
}

async function main() {
  const catIds: Partial<Record<R['cat'], string>> = {};
  for (const key of Object.keys(CATS) as R['cat'][]) catIds[key] = await categoryFor(key);

  let created = 0;
  let updated = 0;

  for (const [i, r] of RECIPES.entries()) {
    const data = {
      categoryId: catIds[r.cat]!,
      title: r.title,
      titleAr: r.titleAr,
      about: r.about,
      aboutAr: r.aboutAr,
      ingredients: JSON.stringify(r.ing),
      ingredientsAr: JSON.stringify(r.ingAr),
      steps: JSON.stringify(r.steps),
      stepsAr: JSON.stringify(r.stepsAr),
      prepTimeMin: r.prep,
      cookTimeMin: r.cook,
      servings: r.servings,
      calories: r.kcal,
      protein: r.p,
      carbs: r.c,
      fat: r.f,
      mealSlots: JSON.stringify(r.slots),
      cuisine: 'egyptian',
      difficulty: r.difficulty,
      tags: JSON.stringify(r.tags),
      order: i,
    };

    const existing = await prisma.recipe.findFirst({ where: { title: r.title } });
    if (existing) {
      await prisma.recipe.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.recipe.create({ data });
      created++;
    }
  }

  const total = await prisma.recipe.count();
  const egyptian = await prisma.recipe.count({ where: { cuisine: 'egyptian' } });
  const plannable = await prisma.recipe.count({ where: { protein: { not: null } } });
  const breakfast = await prisma.recipe.count({ where: { mealSlots: { contains: 'breakfast' } } });

  console.log(`\nEgyptian recipes: ${created} created · ${updated} updated`);
  console.log(`Library: ${total} recipes · ${egyptian} Egyptian · ${plannable} plannable · ${breakfast} breakfast-capable`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
