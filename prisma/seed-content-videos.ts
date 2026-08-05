/**
 * Recipe and article video links - YouTube embeds, not copies.
 *
 * Sourced by searching per title, keeping only results whose own title matches the
 * item, then confirming each id through YouTube oEmbed. The titles and channels
 * recorded below are the real ones oEmbed returned, so this file can be audited
 * without opening a browser.
 *
 * ARTICLES ARE HELD TO A HIGHER BAR. They cover blood pressure, cancer screening,
 * diabetes, spinal discs. A reader cannot spot a wrong medical claim the way they
 * can spot a bad squat, and a video sitting beside our own article reads as our
 * endorsement. So only institutional sources were accepted - hospitals, national
 * health services, universities, disease charities. Where no institution had a
 * matching video the article simply gets none. An empty section beats a wrong one.
 *
 * Idempotent: only fills rows with no video at all.
 * Run:    npx tsx prisma/seed-content-videos.ts
 * Undo:   npx tsx prisma/seed-content-videos.ts --clear
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Pick = { id: string; title: string; channel: string };

const RECIPES: Record<string, Pick> = {
  "Baked Chicken and Vegetable Traybake": { id: "XPcL8oUWFhY", title: "Baked Chicken & Vegetables | Easy Healthy One Pot Dish", channel: "Butterweekends by Jubs" },
  "Baked Cinnamon Apples with Oats": { id: "4dM6UBHbG30", title: "Cinnamon baked apples with an oat & pecan topping - just like mini apple crisis! | FeelGoodFoodie", channel: "Feelgoodfoodie" },
  "Baked Falafel Bowl with Tahini": { id: "F1gK8JMDSnk", title: "Oven Baked Falafels / Cilantro Tahini Yogurt Sauce", channel: "VeggiEngine" },
  "Baked Lemon Herb Salmon": { id: "XiTJWYDD0Fg", title: "A quick, easy, and simple recipe for Baked Lemon Herb Salmon #shorts", channel: "EatingGoodBusy" },
  "Baked Zucchini Fritters with Herbed Yogurt": { id: "tBJG73tRqdU", title: "How To Make Oven Baked Zucchini Fritters – Easy To Follow Recipe", channel: "Minimalist Gourmet" },
  "Beef and Barley Stew": { id: "y-9hNSZWmZI", title: "Beef and Barley Stew Recipe - How to Make Stewed Beef Shank with Barley", channel: "Food Wishes" },
  "Brown Rice and Vegetable Buddha Bowl": { id: "FUW7hnjDan0", title: "Buddha Bowl with brown rice and peanut sauce", channel: "Nico's Recipes" },
  "Chia Seed Pudding with Mango": { id: "gaDPnboUPH0", title: "Mango Chia Pudding|Chia Seeds Pudding|Mango Dessert|How to make Mango chia pudding|chia Dessert", channel: "Basumati mohanta's kitchen" },
  "Chickpea and Avocado Power Salad": { id: "Gr_qd5gV8As", title: "Making Healthy High-Protein Chickpea Avocado Salad 🥗🥑 | Easy Healthy Salad", channel: "Easy Healthy Salads" },
  "Chickpea and Spinach Coconut Curry": { id: "g3UzeaU_pYA", title: "Spinach and Chickpea Coconut Curry 🍛 🥥🍃 #shorts", channel: "Cook with Chris" },
  "Classic Lemon Tahini Sauce": { id: "krqWf4qK8qo", title: "Tahini Lemon Garlic Sauce 👌", channel: "The Low-Carb Chef  - Pablo Munoz" },
  "Creamy Roasted Cauliflower Soup": { id: "NNUdZ_R9Pfo", title: "Creamy Roasted Cauliflower Soup Recipe 🥣 | Easy Vegan Comfort Food!", channel: "Ahmad Noori" },
  "Cucumber Cups with Whipped Feta": { id: "rxVpzBshB8o", title: "SMASHED CUCUMBER SALAD WITH WHIPPED LEMONY FETA", channel: "KALEJUNKIE by Nicole K. Modic" },
  "Curried Cauliflower and Chickpeas": { id: "bP8thzDOSaI", title: "Curry spice roasted cauliflower and chickpeas ✨ #shorts", channel: "Christina Bedetta" },
  "Dark Chocolate Avocado Mousse": { id: "Vu7WHYYbC2Q", title: "Dark Chocolate Avocado Mousse 🥑🍫", channel: "Elemental Superfood" },
  "Edamame and Avocado Smash Toasts": { id: "vpCyIU5a8qI", title: "The best high-protein Edamame Avocado Smash Toast 🤤🥑 #avocado #avocadotoast #highprotein #vegan", channel: "The Conscious Cook" },
  "Eggplant and Chickpea Tagine": { id: "n_Yq3Jxb_o8", title: "Eggplant Chickpea Tagine", channel: "Feasting at Home" },
  "Flourless Almond and Banana Cookies": { id: "IJT4p5lbro4", title: "Almond Flour Banana cookies with 4 ingredients #shorts #healthyrecipe #cookies #glutenfree  #vegan", channel: "The Conscious Plant Kitchen" },
  "Fresh Basil and Walnut Pesto": { id: "5eoRfzTp1l4", title: "CLASSIC BASIL PESTO SAUCE | HOMEMADE WALNUT PESTO | FRESH PESTO RECIPE | VEGAN RECIPE", channel: "Feast window" },
  "Garlic Shrimp and Zucchini Noodles": { id: "YZ4mDcPbCvk", title: "Garlic Shrimp Zucchini Noodles - Healthy & Delicious!", channel: "Best Recipe Box" },
  "Garlicky Sauteed Green Beans and Almonds": { id: "Ph988jeeL1Q", title: "Thanksgiving dinner easy side dish 🤎 sauteed green beans with garlic and toasted almonds.", channel: "The homebody diary" },
  "Ginger Chicken and Bok Choy Broth": { id: "Ov8125PfO98", title: "Poached Chicken and Bok Choy in Ginger Broth - Eat Clean with Shira Bocar", channel: "Everyday Food" },
  "Golden Lentil and Turmeric Soup": { id: "qv-Lvj9DnM8", title: "Golden Turmeric Lentil Soup for Busy Lifestyles", channel: "FrugalHealthTales" },
  "Greek Yogurt Berry Bark": { id: "BJvv-6Vw4lk", title: "Chocolate-Covered Strawberry Greek Yogurt Bark! 🍓🍫 recipe: hannahmageerd.com #proteindessert", channel: "Hannah Magee" },
  "Greek Yogurt Tzatziki": { id: "LWPcRySCKIc", title: "How to make Tzatziki (Greek Yogurt Cucumber Dip)", channel: "Nico's Recipes" },
  "Grilled Lamb and Mint Yogurt Kebabs": { id: "TxcpMwbBNJU", title: "Easy Grilled Lamb Kebabs with Garlic Yogurt Sauce", channel: "Tatyana's Everyday Food" },
  "Hearty Barley and Vegetable Soup": { id: "AP9_F1mjcdQ", title: "Hearty Vegetable Barley Soup (meatless!)", channel: "Fork in the Kitchen" },
  "Herb-Crusted Roast Pork Tenderloin": { id: "-ksM3XmokyI", title: "Herb-crusted Pork Tenderloin | Oven Roasted with Potatoes & Mushrooms", channel: "Cee Fade" },
  "Herb-Marinated Grilled Chicken Breast": { id: "9YVq7q7kZKs", title: "Grilled Lemon Garlic Herb Chicken Breast Recipe | Juicy and Easy to Make! #easyrecipe  #chicken", channel: "Casting and Cooking BBQ" },
  "Herbed Lemon Quinoa Pilaf": { id: "EoXYzGvGxQA", title: "Top Recipe! Baked Lemon Salmon Dijon & Herbed Quinoa Pilaf!  #shorts", channel: "The Healthier Munch" },
  "Honey-Roasted Carrots with Cumin": { id: "rPY12B-Cgw0", title: "honey roasted carrots 🥕", channel: "Offenhoppin" },
  "Kale and Apple Crunch Salad": { id: "ImaNdBF6zh8", title: "Kale and Apple Crunch Salad #holidaysalad", channel: "House of Yumm" },
  "Lean Beef and Vegetable Stir-Fry": { id: "ui3g23vyFKs", title: "Easy 30-Minute Beef Stir Fry with Vegetables | Quick & Delicious Dinner Recipe", channel: "Quick & Easy Recipe Guides" },
  "Lemon Garlic Chicken and Broccoli Stir-Fry": { id: "EntjyRpOK0I", title: "Making the  broccoli lemon garlic chicken prep!", channel: "mommaskitchen" },
  "Mediterranean Baked Cod with Tomatoes": { id: "GngufPyEed4", title: "Mediterranean Baked Fish with Tomatoes & Olives | Easy and Delicious!", channel: "Atycook" },
  "Mediterranean Farro Salad": { id: "qJYjnbqSqbo", title: "Mediterranean Farro Salad Recipe", channel: "Ain't Too Proud to Meg" },
  "Moroccan Spiced Chicken Skewers": { id: "pChrPiHKdN8", title: "Mastering Savory Moroccan Spiced Chicken Skewers", channel: "Flavor in a Flash" },
  "Mushroom and Lentil Bolognese": { id: "wFUCxmgjB6w", title: "Vegan Bolognese with Mushrooms & Red Lentils | Minimalist Baker Recipes", channel: "Minimalist Baker" },
  "Mushroom and Spinach Barley Risotto": { id: "R_JegOT2rMg", title: "Barley Risotto Recipe | Mushroom Spinach Risotto | Creamy Risotto Recipe | Homemade Risotto", channel: "Narayani's Sinfully Scrumptious" },
  "No-Knead Whole-Grain Focaccia": { id: "FNHtCVfHFCM", title: "100% Whole Wheat No-Knead Cold Fermented Focaccia Recipe | So Tasty and Simple", channel: "ChainBaker" },
  "Oat and Banana Breakfast Bread": { id: "S5jtgTYrbbc", title: "This Healthy Banana Oatmeal Bread is the best for weight loss #shorts", channel: "HungryHappens" },
  "Overnight Oats with Chia and Berries": { id: "7sVgXutE9Lk", title: "Overnight Chia seeds Oats! ( Video caption I wrote a Sesame seeds, instead CHIA SEEDS )", channel: "Mitch Cuisine" },
  "Poached Pears in Spiced Tea": { id: "uhjJcNbIYhs", title: "How to make Masala Chai Poached pears", channel: "Kitchen Kreations" },
  "Quick Pickled Red Onions": { id: "AijO82OleiE", title: "Quick Pickled Onions", channel: "Cooking With Ayeh" },
  "Quinoa Tabbouleh with Herbs": { id: "Kq5yh3-4rwg", title: "Quinoa Tabbouleh - easy, light, nutritious, summery salad with fresh herbs #cooking #vegan #healthy", channel: "Labours of Love" },
  "Roasted Balsamic Brussels Sprouts": { id: "0kkX8sZmdfA", title: "Honey Balsamic Roasted Brussels Sprouts", channel: "TipHero" },
  "Roasted Beet and Lentil Salad": { id: "0pXaBh64PXg", title: "Roasted beetroot and lentil salad. Recipe in my cookbook link in the description ✌️ #shorts", channel: "Andy Cooks" },
  "Roasted Red Pepper and Almond Romesco": { id: "L1fg2GOb7HI", title: "The Ultimate Romesco - Roasted Peppers & Almonds Sauce", channel: "CookingChefs" },
  "Roasted Tomato Salsa": { id: "U8-S1xNmA30", title: "Roasted Tomato Salsa #mexicanfood #salsa", channel: "Isabel Eats" },
  "Roasted Tomato and White Bean Soup": { id: "NTmLauoOhEo", title: "Soup for the Soul: Roasted Tomato & White Bean Delight 🥣", channel: "The Brain Docs" },
  "Rye and Caraway Soda Bread": { id: "Q1Hpwiv3FHE", title: "Irish Soda Bread with Caraway by Touch of Spice", channel: "Touch of Spice" },
  "Seared Tuna with Sesame and Ginger Slaw": { id: "bjkFHLU5WSA", title: "Pan Seared Ahi Tuna with Sesame Ginger Slaw Quick Fix", channel: "SnapKitchen" },
  "Shaved Fennel and Orange Salad": { id: "2LhJoH0ebjM", title: "The Perfect Winter Salad: Shaved Fennel and Orange Salad", channel: "Pistou and Pastis" },
  "Slow-Cooked Chicken and White Bean Stew": { id: "GRDZR8abvrI", title: "Slow Cooker Chicken & White Bean Soup #familymealsideas #budgetfriendly", channel: "Jules The Lazy Cook" },
  "Smoky Braised White Beans and Greens": { id: "MrsZzZriBIw", title: "Healthy Comfort! Braised White Beans & Greens with Parmesan – So Cozy & Nutritious! #nytcooking", channel: "Robin & Willow Delicious Living" },
  "Smoky Roasted Red Pepper Hummus": { id: "I06UpUGlejQ", title: "Roasted Red Bell Pepper Hummus | Mediterranean Dip | Creamy Smoky and Delicious", channel: "Shobha's Food Mazaa" },
  "Spelt and Yogurt Flatbreads": { id: "RFWzhmdJwv4", title: "Stovetop Spelt Yogurt Flatbread (without yeast)", channel: "Jernej Kitchen" },
  "Spiced Beef and Lentil Lettuce Wraps": { id: "BxvlgSfV1ME", title: "Spicy pepper beef lettuce wraps for lunch!  #spicybeef #lettucewraps  #recipe", channel: "Eat, Live, Explore with Yadin" },
  "Spiced Bulgur with Chickpeas and Herbs": { id: "aYHx4pl0akM", title: "Bulgur Pilaf with Tomatoes and Chickpeas in 20 Minutes", channel: "Foolproof Living" },
  "Spiced Chickpea and Sweet Potato Bites": { id: "zKXT7RbnOyk", title: "Chickpea Sweet Potato Patties (Quick and Healthy)", channel: "Savoury Time" },
  "Spiced Fish Tacos with Cabbage Slaw": { id: "hH5kqEO1YEo", title: "Fish Tacos with Red Cabbage SLAW #shorts", channel: "HappyandFull" },
  "Spiced Red Lentil Dal": { id: "MYA7FY5f12A", title: "الوصفة اللي خلتني احب العدس لذذذيذة وطريقتها سهله مرة 😋 Easy Red Lentil Curry", channel: "مطبخنا اليمني Our Yemeni Kitchen" },
  "Spicy Black Bean and Corn Soup": { id: "cILhON4iwX0", title: "Spicy black bean and corn soup", channel: "Cityline" },
  "Spinach and Ricotta Whole-Wheat Frittata": { id: "Ofe6mWU45T4", title: "Spinach & Ricotta Frittata", channel: "Lotus Weight Loss" },
  "Steamed Mussels in Tomato Broth": { id: "nuGk4fyEF5w", title: "Steamed Mussels With White Wine Tomato Broth Recipe", channel: "Simply Elegant Home Cooking" },
  "Stuffed Bell Peppers with Quinoa and Beans": { id: "wUe7B3MrjFE", title: "Beans and Quinoa Stuffed Bell Peppers", channel: "Navi's Healthy Kitchen" },
  "Stuffed Cabbage Rolls with Lean Beef and Rice": { id: "URjQXrQQz1s", title: "Easy Stuffed Cabbage Rolls Recipe with Beef and Rice That Are Insanely Delicious #stuffedcabbage", channel: "Urban Mamaz" },
  "Stuffed Mini Peppers with Herbed Ricotta": { id: "_lPJ-pBItGc", title: "Ricotta Stuffed Mini Sweet Peppers with Cilantro Pesto Sauce", channel: "Randy Brittell" },
  "Sweet Potato Dinner Rolls": { id: "olDKDvyFQv0", title: "Moist And Fluffy Sweet Potato Dinner Rolls Recipe", channel: "Pastry Living with Aya" },
  "Turkey and Spinach Meatballs in Tomato Sauce": { id: "SAeOkJtYcZE", title: "How to make Turkey Meatballs in Tomato Basil Sauce | Meatballs | Tomato Sauce | Food Culture #shorts", channel: "Food Culture" },
  "Warm Freekeh and Roasted Vegetable Salad": { id: "p1YyQgJDMa8", title: "Easy and Delicious FREEKEH Salad with Roasted Vegetables | VEGAN | Recipes for Two", channel: "Big Healthy Plate" },
  "Whole-Wheat Seeded Sandwich Loaf": { id: "KiTgPLLi1Ck", title: "Whole wheat sandwich bread recipe #recipes #baking #bread", channel: "Recipes with Jay" },
};

/** Institutional sources only - see the note at the top of this file. */
const ARTICLES: Record<string, Pick> = {
  "8 Tips For Healthy Eating": { id: "fy01O3jkWKo", title: "Healthy Eating", channel: "nhswestminster" },
  "Atrial Fibrillation and Irregular Heartbeats": { id: "X-9aaGah7Bg", title: "Atrial Fibrillation: Risk Factors, Symptoms, and Treatment | Mass General Brigham", channel: "Mass General Brigham" },
  "Beyond the Mouth: Oral Health and Overall Wellness": { id: "H_4b8BNzG0A", title: "Brushing Your Way to Better Health: How Oral and Dental Health Go Beyond the Mouth", channel: "Mayo Clinic" },
  "Building Better Sleep Habits": { id: "qH4kXnmfpok", title: "Starting Well Partnership - Better sleeping habits for children over 10 years", channel: "Herefordshire & Worcestershire Health and Care NHS (HWHCT_NHS)" },
  "Building Everyday Resilience": { id: "3bI-mBbO_sg", title: "Building Stress Resilience in Ourselves and Our UCSF Community", channel: "UCSF Dept. of Psychiatry and Behavioral Sciences" },
  "Caffeine, Alcohol and Sleep": { id: "6B10k1W89Uk", title: "Does alcohol help you sleep? | @DoctorSooj NHS #shorts", channel: "NHS" },
  "Checking Your Skin for Warning Signs": { id: "ux0pyNsuMis", title: "Signs of melanoma skin cancer | @DoctorSooj NHS #shorts", channel: "NHS" },
  "Cholesterol 101: Good, Bad, and Why It Matters": { id: "PBrEBuB7ZZ8", title: "Good Vs. Bad Cholesterol: What You NEED to Know", channel: "Healthline" },
  "Designing the Perfect Sleep Environment": { id: "nss4TXaJZuo", title: "Your sleep environment", channel: "Manchester University NHS Foundation Trust" },
  "Eating Well in Later Life": { id: "WDuv9dQq38g", title: "SPECIAL EPISODE! Diet for Longevity: Eating Well to Age Well", channel: "Mayo Clinic Press" },
  "Eczema and Dry, Irritated Skin": { id: "UIhTpKFkLYc", title: "Eczema - Itchy, Dry Skin and How to Get Relief", channel: "Mayo Clinic" },
  "Familial Hypercholesterolemia: Inherited High Cholesterol": { id: "0L3SRi3dSAk", title: "Lipids Series-Familial Hypercholesterolemia", channel: "Mayo Clinic" },
  "Foods That Help Manage Cholesterol": { id: "gnudf5IjfFQ", title: "The Best Foods for Managing High Cholesterol", channel: "Healthline" },
  "Gum Disease: From Gingivitis to Periodontitis": { id: "B35jRf4EKPA", title: "Gingivitis and periodontitis - causes, symptoms, diagnosis, treatment, pathology", channel: "Osmosis from Elsevier" },
  "Home Blood Pressure Monitoring Done Right": { id: "xdhYY4uxzaU", title: "How to use your blood pressure monitor at home", channel: "NHS Herts and West Essex Integrated Care Board" },
  "How Much Sleep Do You Need?": { id: "zO-YCbGHtxk", title: "How much sleep do you really need? (S1) | The Power of Good Health", channel: "Mount Sinai Health System" },
  "How to Tell If You Are Drinking Enough": { id: "l93BXHdyd00", title: "Ask Mayo Clinic Health System – Hydration Matters: Are You Drinking Enough Water?", channel: "Mayo Clinic Health System" },
  "Hypertension: The Silent Threat to Your Arteries": { id: "IguTk7mXU7Q", title: "High blood pressure: the silent threat #Hypertension #HeartHealth #BloodPressure", channel: "Kauvery Hospitals Bangalore" },
  "Irritable Bowel Syndrome: Living With a Sensitive Gut": { id: "0JzOyqMP-_Q", title: "Irritable Bowel Syndrome (IBS)", channel: "Wellstar MCG Health Medical Center" },
  "Living Well With Chronic Arthritis Pain": { id: "wc9pxkO0UOE", title: "Living Well with Inflammatory Arthritis", channel: "Arthritis Foundation" },
  "Looking After Your Mental Health in Pregnancy and Beyond": { id: "Vvsbqrldb2w", title: "The pregnancy mental health crisis nobody talks about #pregnancy #awareness #health", channel: "Rainbow Children’s Hospital & BirthRight" },
  "Low Blood Pressure: When Readings Run Too Low": { id: "48OolwRxRyQ", title: "What's a normal blood pressure range?", channel: "Cleveland Clinic" },
  "Lowering Blood Pressure Through Diet": { id: "0rxsjNSHD_M", title: "High Blood Pressure? What to Eat & Avoid (DASH Diet Guide)", channel: "Mayo Clinic" },
  "Managing Emotional Eating": { id: "tGim1aQpdZY", title: "Taking Control of Emotional Eating | Susan Albers, PsyD", channel: "Cleveland Clinic" },
  "Managing Screen Time": { id: "z2yLM9HBvdw", title: "Managing Screen Time for Children Ages 0–5 | Tips for Healthy Tech Use | SickKids", channel: "AboutKidsHealth - The Hospital for Sick Children" },
  "Managing Stress Before It Manages You": { id: "3TPfi3t7HcE", title: "Tips to managing stress.", channel: "Cleveland Clinic" },
  "Nurturing Children's Emotional Wellbeing": { id: "gs9Qut0iRww", title: "All about the Solihull Approach and its training in emotional health and wellbeing for children", channel: "Togetherness NHS" },
  "Nutrition Before and During Pregnancy": { id: "cYimwZ67mBc", title: "Eating Well During Pregnancy", channel: "NHS Ayrshire & Arran" },
  "Posture in the Modern World": { id: "MY8HSwh4tsk", title: "Improve Posture & Shoulder Health: Expert Tips by Dr. Banarji B.H. | Sakra World Hospital", channel: "Sakra World Hospital" },
  "Preventing Common Exercise Injuries": { id: "jpHNHpvlWYU", title: "4 Most Common Sports Injuries & How To Prevent Them | Dr. Karan Mehta", channel: "Navin Orthopaedic Hospital" },
  "Preventing Falls": { id: "LU5yEEWc5zc", title: "Tips on preventing falls at home", channel: "Mayo Clinic" },
  "Protecting Your Skin From the Sun": { id: "ki_emYA6nYs", title: "What to wear to protect your skin from the sun", channel: "American Academy of Dermatology" },
  "Recognizing High and Low Blood Sugar": { id: "bdfk3WmsF4E", title: "Diabetes and Hypoglycaemia (Low blood sugar) | Symptoms, management and treatment", channel: "University College London Hospitals NHS Foundation Trust" },
  "Recognizing a Heart Attack: Act Fast": { id: "HeDwK99SU2Q", title: "Heart attack signs and symptoms | NHS", channel: "NHS" },
  "Restless Legs and Other Sleep Disruptors": { id: "TYhgbE_84MA", title: "Restless Legs Syndrome and Sleep - Diagnosis and Treatments", channel: "Johns Hopkins Howard County Medical Center" },
  "Setting Realistic Weight Goals": { id: "6JT6w99kjto", title: "Dr. Donald Hensrud speaks about setting realistic weight-loss goals.", channel: "The New Mayo Clinic Diet" },
  "Simple Breathing Techniques for Calm": { id: "tEmt1Znux58", title: "Box breathing relaxation technique: how to calm feelings of stress or anxiety", channel: "Sunnybrook Hospital" },
  "Sleep Apnea: When Breathing Stops at Night": { id: "slLP3ZxGXHU", title: "Excess Deaths at Night - Obstructive Sleep Apnea Explained Clearly", channel: "MedCram - Medical Lectures Explained CLEARLY" },
  "Smart Snacking Strategies": { id: "tz3Xauqe898", title: "Smart Snacking: Tips for healthy snacking | AboutKidsHealth at The Hospital for Sick Children", channel: "AboutKidsHealth - The Hospital for Sick Children" },
  "Spinal Stenosis in Older Adults": { id: "WAeSJ4sxTvo", title: "Spinal stenosis: Mayo Clinic Radio", channel: "Mayo Clinic" },
  "Statins and Other Cholesterol Medications": { id: "zlRaKves_E4", title: "Mayo Clinic Minute: Do cholesterol medications work for older people?", channel: "Mayo Clinic" },
  "Staying Active During Pregnancy": { id: "2AIK-KHX0uI", title: "Is Stress Harmful During Pregnancy? Here's What Doctors Say", channel: "Rainbow Children’s Hospital & BirthRight" },
  "Staying Active on the Road": { id: "HvDj3_jFBog", title: "Travel Tips for Staying Healthy While Traveling Abroad", channel: "University Hospitals" },
  "Staying Smoke-Free for Good": { id: "kyiiPg_cIsU", title: "Proud To Be Smoke Free", channel: "Chesterfield Royal Hospital" },
  "Strength Training Basics": { id: "tVCdGe4wIMo", title: "Let's start strength training!", channel: "DAISY HOSPITAL" },
  "Support and Tools to Help You Quit": { id: "qvfGT8dowcs", title: "Supporting you to quit smoking", channel: "Guy's and St Thomas' NHS Foundation Trust" },
  "Supporting Children's Sleep": { id: "SDKU3nZS9_A", title: "Sleep Habits in Children | FAQ with Pediatric Sleep Center Director Dr. Laura Sterni", channel: "Johns Hopkins Medicine" },
  "The Benefits of Quitting Start Immediately": { id: "jcwiZo6k8gw", title: "Donna's story - the benefits of quitting smoking", channel: "NHS Devon " },
  "The Gut Microbiome and Your Health": { id: "rEC9eAVKjkE", title: "Do's and Don'ts for Keeping Your Microbiome Healthy", channel: "Mayo Clinic" },
  "The Mental Health Benefits of Exercise": { id: "CKIMRaRlCqY", title: "Exercise and mental health | @DoctorSooj NHS #shorts", channel: "NHS" },
  "The Right Way to Brush and Floss": { id: "2yxa67n5JR4", title: "Oral Hygiene Instruction Video: Brushing, Flossing, Braces Cleaning Tips", channel: "Harvard School of Dental Medicine" },
  "The Science of Sleep: Why Rest Matters": { id: "MQHNT6VUX5c", title: "The Science of Sleep: Exploring the connection between rest and health", channel: "Harvard T.H. Chan School of Public Health" },
  "Type 1 vs Type 2 Diabetes: Key Differences": { id: "-B-RVybvffU", title: "Diabetes mellitus (type 1, type 2) & diabetic ketoacidosis (DKA)", channel: "Osmosis from Elsevier" },
  "Understanding Acid Reflux and GERD": { id: "TdK0jRFpWPQ", title: "Heartburn, Acid Reflux, GERD-Mayo Clinic", channel: "Mayo Clinic" },
  "Understanding Acne at Any Age": { id: "HFf3UBdgzyk", title: "Adult Acne - Mayo Clinic", channel: "Mayo Clinic" },
  "Understanding Blood Pressure Numbers": { id: "4YNdp3pRjig", title: "Understanding Blood Pressure (Subtitles)", channel: "British Heart Foundation" },
  "Understanding Cancer Treatment Options": { id: "z4pW9RvgoWo", title: "Prostate Cancer Treatment: Understanding Your Options", channel: "Mayo Clinic Press" },
  "Understanding Depression: More Than Feeling Sad": { id: "d7NPnvKFs2Y", title: "Understanding Depression: Symptoms, Causes and Treatments", channel: "Mayo Clinic" },
  "Understanding Energy Balance": { id: "-WRgBCnIEeQ", title: "Obesity and Energy Balance", channel: "IARC WHO" },
  "Understanding Food Labels": { id: "Pp6MX1ZksZo", title: "Understanding Food Labels", channel: "Kent Community Health NHS Foundation Trust" },
  "Understanding Heart Failure": { id: "q2t9sFITAIY", title: "Understanding Heart Failure: Visual Explanation for Students", channel: "Zero To Finals" },
  "Understanding Stress and Its Effects": { id: "R6LEt7N2gvc", title: "Understanding Post-Traumatic Stress Disorder - Symptoms, Causes, and Treatments", channel: "Mayo Clinic" },
  "What to Do When You Cannot Sleep": { id: "z4IIqNo9xMw", title: "Can you \"catch up\" on your sleep debt?", channel: "Mayo Clinic Press" },
  "When Digestive Symptoms Warrant a Doctor": { id: "IgP3wwJN6f4", title: "The doctor who will solve all your digestive health issues.—#arihantsuperspecialityhospital", channel: "Arihant Superspeciality Hospital" },
  "Why Hydration Matters": { id: "l93BXHdyd00", title: "Ask Mayo Clinic Health System – Hydration Matters: Are You Drinking Enough Water?", channel: "Mayo Clinic Health System" },
};

/** Ids shipped by earlier revisions, kept so --clear can still undo them. */
const RETIRED: string[] = ["XPcL8oUWFhY", "4dM6UBHbG30", "F1gK8JMDSnk", "XiTJWYDD0Fg", "tBJG73tRqdU", "y-9hNSZWmZI", "FUW7hnjDan0", "gaDPnboUPH0", "Gr_qd5gV8As", "g3UzeaU_pYA", "krqWf4qK8qo", "NNUdZ_R9Pfo", "rxVpzBshB8o", "bP8thzDOSaI", "Vu7WHYYbC2Q", "vpCyIU5a8qI", "n_Yq3Jxb_o8", "IJT4p5lbro4", "5eoRfzTp1l4", "YZ4mDcPbCvk", "Ph988jeeL1Q", "Ov8125PfO98", "qv-Lvj9DnM8", "BJvv-6Vw4lk", "LWPcRySCKIc", "TxcpMwbBNJU", "AP9_F1mjcdQ", "-ksM3XmokyI", "9YVq7q7kZKs", "EoXYzGvGxQA", "rPY12B-Cgw0", "ImaNdBF6zh8", "ui3g23vyFKs", "EntjyRpOK0I", "GngufPyEed4", "qJYjnbqSqbo", "pChrPiHKdN8", "wFUCxmgjB6w", "R_JegOT2rMg", "FNHtCVfHFCM", "S5jtgTYrbbc", "7sVgXutE9Lk", "uhjJcNbIYhs", "AijO82OleiE", "Kq5yh3-4rwg", "0kkX8sZmdfA", "0pXaBh64PXg", "L1fg2GOb7HI", "U8-S1xNmA30", "NTmLauoOhEo", "Q1Hpwiv3FHE", "bjkFHLU5WSA", "2LhJoH0ebjM", "GRDZR8abvrI", "MrsZzZriBIw", "I06UpUGlejQ", "RFWzhmdJwv4", "BxvlgSfV1ME", "aYHx4pl0akM", "zKXT7RbnOyk", "hH5kqEO1YEo", "MYA7FY5f12A", "cILhON4iwX0", "Ofe6mWU45T4", "nuGk4fyEF5w", "wUe7B3MrjFE", "URjQXrQQz1s", "_lPJ-pBItGc", "olDKDvyFQv0", "SAeOkJtYcZE", "p1YyQgJDMa8", "KiTgPLLi1Ck", "fy01O3jkWKo", "X-9aaGah7Bg", "H_4b8BNzG0A", "qH4kXnmfpok", "3bI-mBbO_sg", "6B10k1W89Uk", "ux0pyNsuMis", "PBrEBuB7ZZ8", "nss4TXaJZuo", "WDuv9dQq38g", "UIhTpKFkLYc", "0L3SRi3dSAk", "gnudf5IjfFQ", "B35jRf4EKPA", "xdhYY4uxzaU", "zO-YCbGHtxk", "l93BXHdyd00", "IguTk7mXU7Q", "0JzOyqMP-_Q", "wc9pxkO0UOE", "Vvsbqrldb2w", "48OolwRxRyQ", "0rxsjNSHD_M", "tGim1aQpdZY", "z2yLM9HBvdw", "3TPfi3t7HcE", "gs9Qut0iRww", "cYimwZ67mBc", "MY8HSwh4tsk", "jpHNHpvlWYU", "LU5yEEWc5zc", "ki_emYA6nYs", "bdfk3WmsF4E", "HeDwK99SU2Q", "TYhgbE_84MA", "6JT6w99kjto", "tEmt1Znux58", "slLP3ZxGXHU", "tz3Xauqe898", "WAeSJ4sxTvo", "zlRaKves_E4", "2AIK-KHX0uI", "HvDj3_jFBog", "kyiiPg_cIsU", "tVCdGe4wIMo", "qvfGT8dowcs", "SDKU3nZS9_A", "jcwiZo6k8gw", "rEC9eAVKjkE", "CKIMRaRlCqY", "2yxa67n5JR4", "MQHNT6VUX5c", "-B-RVybvffU", "TdK0jRFpWPQ", "HFf3UBdgzyk", "4YNdp3pRjig", "z4pW9RvgoWo", "d7NPnvKFs2Y", "-WRgBCnIEeQ", "Pp6MX1ZksZo", "q2t9sFITAIY", "R6LEt7N2gvc", "z4IIqNo9xMw", "IgP3wwJN6f4"];

const url = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function allIds(): Set<string> {
  return new Set([
    ...Object.values(RECIPES).map((v) => v.id),
    ...Object.values(ARTICLES).map((v) => v.id),
    ...RETIRED,
  ].map(url));
}

async function clear() {
  const ids = allIds();
  let n = 0;

  // Handled separately rather than in a loop: the two delegates are different
  // Prisma types, and a union of them has no callable findMany signature.
  for (const r of await prisma.recipe.findMany({ where: { videoUrl: { not: null } }, select: { id: true, videoUrl: true } })) {
    if (!ids.has(r.videoUrl as string)) continue;
    await prisma.recipe.update({ where: { id: r.id }, data: { videoUrl: null } });
    n++;
  }
  for (const a of await prisma.article.findMany({ where: { videoUrl: { not: null } }, select: { id: true, videoUrl: true } })) {
    if (!ids.has(a.videoUrl as string)) continue;
    await prisma.article.update({ where: { id: a.id }, data: { videoUrl: null } });
    n++;
  }
  console.log(`Cleared ${n} link(s) set by this seed. Links set by hand were left alone.`);
}

async function run() {
  if (process.argv.includes('--clear')) return clear();

  let recipes = 0;
  const recipeRows = await prisma.recipe.findMany({ select: { id: true, title: true, videoId: true, videoUrl: true } });
  for (const r of recipeRows) {
    const v = RECIPES[r.title];
    if (!v || r.videoId || r.videoUrl) continue;
    await prisma.recipe.update({ where: { id: r.id }, data: { videoUrl: url(v.id) } });
    recipes++;
  }

  let articles = 0;
  const articleRows = await prisma.article.findMany({ select: { id: true, title: true, videoId: true, videoUrl: true } });
  for (const a of articleRows) {
    const v = ARTICLES[a.title];
    if (!v || a.videoId || a.videoUrl) continue;
    await prisma.article.update({ where: { id: a.id }, data: { videoUrl: url(v.id) } });
    articles++;
  }

  const rTotal = await prisma.recipe.count();
  const rHas = await prisma.recipe.count({ where: { OR: [{ videoId: { not: null } }, { videoUrl: { not: null } }] } });
  const aTotal = await prisma.article.count();
  const aHas = await prisma.article.count({ where: { OR: [{ videoId: { not: null } }, { videoUrl: { not: null } }] } });
  console.log(`Linked ${recipes} recipe(s) and ${articles} article(s).`);
  console.log(`Coverage: recipes ${rHas}/${rTotal}, articles ${aHas}/${aTotal}.`);
  console.log(`  ${aTotal - aHas} article(s) have no video on purpose - no institutional source matched.`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
