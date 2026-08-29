/**
 * Bodyweight / home-equipment exercises for EVERY muscle group.
 *
 * Why this exists: the intake asks what equipment you own, but several muscle
 * groups had nothing you could do without a gym — Biceps, for instance, shipped
 * five movements that all needed dumbbells, a barbell or a pull-up bar. A user
 * who answered "no equipment" was handed a list they could not use.
 *
 * Every movement here needs NOTHING but the body (a towel, chair or wall at
 * most), so `equipment: []` → tier 0 → always shown first to home trainees.
 * No videoUrl: the app falls back to its animated figure, and real demos are
 * filled in separately by seed-exercise-videos.ts once verified.
 *
 * Idempotent — skips any exercise whose name already exists in that group.
 * Run:  node node_modules/tsx/dist/cli.mjs prisma/seed-bodyweight.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Ex = {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  instructions: string[];
  instructionsAr: string[];
  sets: string;
  reps: string;
  level: string;
  /** Household props are still "no equipment" — everyone has a chair or towel. */
  props?: string[];
  contraindications?: string[];
};

/** Keyed by muscle-group NAME as seeded (English). */
const PLAN: Record<string, Ex[]> = {
  Chest: [
    {
      name: 'Knee Push-Up', nameAr: 'ضغط على الركبتين',
      description: 'The push-up scaled down — same movement, less load, real chest work from day one.',
      descriptionAr: 'الضغط بنسخة أسهل — نفس الحركة بحمل أقل، وشغل حقيقي للصدر من أول يوم.',
      instructions: ['Kneel and place your hands slightly wider than your shoulders.', 'Keep a straight line from knees to head — no sagging hips.', 'Lower your chest toward the floor, elbows about 45°.', 'Push back up and squeeze your chest at the top.'],
      instructionsAr: ['اركع وحط إيديك أوسع شوية من كتفك.', 'خلي جسمك خط مستقيم من الركبة للراس — من غير ما وسطك ينزل.', 'انزل بصدرك ناحية الأرض والكوع مايل ٤٥ درجة.', 'اطلع تاني واعصر صدرك فوق.'],
      sets: '3', reps: '8-15', level: 'BEGINNER', contraindications: ['wrist', 'shoulder'],
    },
    {
      name: 'Incline Push-Up', nameAr: 'ضغط مائل على مرتفع',
      description: 'Hands on a chair, table or wall — the easiest way in, and you lower the surface as you get stronger.',
      descriptionAr: 'إيديك على كرسي أو ترابيزة أو حيطة — أسهل بداية، وكل ما تقوى نزّل المستوى.',
      instructions: ['Place both hands on a sturdy chair, table or wall.', 'Step your feet back until your body is one straight line.', 'Lower your chest to the surface, then press away.', 'The lower the surface, the harder it gets.'],
      instructionsAr: ['حط إيديك على كرسي ثابت أو ترابيزة أو حيطة.', 'ارجع برجلك لورا لحد ما جسمك يبقى خط واحد.', 'نزّل صدرك للسطح وبعدين ادفع.', 'كل ما السطح يبقى أوطى، كل ما التمرين يصعب.'],
      sets: '3', reps: '10-15', level: 'BEGINNER', props: ['Chair or wall'], contraindications: ['wrist'],
    },
    {
      name: 'Wide Push-Up', nameAr: 'ضغط واسع',
      description: 'Hands wider than usual to push the work onto the outer chest.',
      descriptionAr: 'إيديك أوسع من العادي عشان الشغل يروح لأطراف الصدر.',
      instructions: ['Set your hands noticeably wider than your shoulders.', 'Keep your body in one line, core tight.', 'Lower under control until your chest is just above the floor.', 'Press up without letting your hips drop.'],
      instructionsAr: ['حط إيديك أوسع من كتفك بوضوح.', 'خلي جسمك خط واحد وبطنك مشدودة.', 'انزل بالراحة لحد ما صدرك يقرب من الأرض.', 'اطلع من غير ما وسطك ينزل.'],
      sets: '3', reps: '8-12', level: 'INTERMEDIATE', contraindications: ['shoulder', 'wrist'],
    },
  ],
  Biceps: [
    {
      name: 'Towel Biceps Curl', nameAr: 'مرجحة بايسبس بفوطة',
      description: 'Self-resistance curl: one arm pulls, the other resists through a towel. No weights, real tension.',
      descriptionAr: 'مرجحة بمقاومة ذاتية: إيد بتشد وإيد بتقاوم من خلال فوطة. من غير أوزان، وبشد حقيقي.',
      instructions: ['Loop a towel under one foot and hold both ends with one hand.', 'Curl your hand toward your shoulder while your foot resists.', 'Take 3 seconds to lower back down against the pull.', 'Keep your elbow pinned to your side the whole time.'],
      instructionsAr: ['حط فوطة تحت رجلك وامسك طرفيها بإيد واحدة.', 'اسحب إيدك ناحية كتفك ورجلك بتقاوم.', 'انزل في ٣ ثواني وانت بتقاوم الشد.', 'خلي كوعك ملزوق في جنبك طول الوقت.'],
      sets: '3', reps: '10-12 each arm', level: 'BEGINNER', props: ['Towel'],
    },
    {
      name: 'Isometric Towel Curl', nameAr: 'ثبات بايسبس بفوطة',
      description: 'A hold instead of a lift — the biceps works hard while nothing moves.',
      descriptionAr: 'ثبات بدل الرفع — البايسبس بيشتغل بقوة وانت مش بتتحرك.',
      instructions: ['Hold a towel with both hands, arms bent at 90°.', 'Pull outward hard as if tearing it — nothing should move.', 'Hold the tension for 20-30 seconds, breathing normally.', 'Rest and repeat.'],
      instructionsAr: ['امسك فوطة بإيديك الاتنين والكوع مثني ٩٠ درجة.', 'اشد براه بقوة كأنك بتقطعها — من غير ما حاجة تتحرك.', 'ثبت الشد ٢٠–٣٠ ثانية وانت بتتنفس عادي.', 'ارتاح وكرر.'],
      sets: '3', reps: '20-30 sec', level: 'BEGINNER', props: ['Towel'],
    },
  ],
  Triceps: [
    {
      name: 'Chair Dip', nameAr: 'متوازي على كرسي',
      description: 'Hands behind you on a chair — the most effective triceps movement you can do at home.',
      descriptionAr: 'إيديك وراك على كرسي — أقوى تمرين ترايسبس تقدر تعمله في البيت.',
      instructions: ['Sit on the edge of a sturdy chair, hands beside your hips.', 'Slide your hips forward off the seat.', 'Bend your elbows straight back and lower your body.', 'Press through your palms to rise; keep shoulders down.'],
      instructionsAr: ['اقعد على طرف كرسي ثابت وإيديك جنب وسطك.', 'زحلق وسطك لقدام بره الكرسي.', 'اثني كوعك لورا مباشرة وانزل بجسمك.', 'ادفع بكفوفك واطلع، وخلي كتفك نازل.'],
      sets: '3', reps: '8-12', level: 'BEGINNER', props: ['Chair'], contraindications: ['shoulder', 'wrist'],
    },
    {
      name: 'Diamond Push-Up', nameAr: 'ضغط ماسي',
      description: 'Hands together under your chest — shifts the push-up onto the triceps.',
      descriptionAr: 'إيديك مع بعض تحت صدرك — بينقل شغل الضغط للترايسبس.',
      instructions: ['Form a diamond with your thumbs and index fingers under your chest.', 'Keep your elbows tucked close to your ribs as you lower.', 'Touch your chest to your hands, then press up.', 'Do it from the knees if the full version is too hard.'],
      instructionsAr: ['اعمل شكل ماسة بإبهامك وسبابتك تحت صدرك.', 'خلي كوعك قريب من جنبك وانت نازل.', 'لمّس صدرك لإيديك وبعدين اطلع.', 'اعملها من على ركبتيك لو صعبة عليك.'],
      sets: '3', reps: '6-12', level: 'INTERMEDIATE', contraindications: ['wrist', 'shoulder'],
    },
  ],
  Shoulders: [
    {
      name: 'Pike Push-Up', nameAr: 'ضغط الهرم',
      description: 'Hips high, head down — the bodyweight answer to the shoulder press.',
      descriptionAr: 'وسطك لفوق وراسك لتحت — بديل ضغط الكتف من غير أوزان.',
      instructions: ['From a push-up position, walk your feet in and lift your hips into an upside-down V.', 'Lower the crown of your head toward the floor.', 'Press back up through your shoulders.', 'Raise your feet on a step to make it harder.'],
      instructionsAr: ['من وضع الضغط، قرّب رجلك وارفع وسطك لفوق زي حرف V مقلوب.', 'نزّل بقمة راسك ناحية الأرض.', 'ادفع لفوق بكتفك.', 'ارفع رجلك على درجة عشان تصعّبها.'],
      sets: '3', reps: '6-10', level: 'INTERMEDIATE', contraindications: ['shoulder', 'neck', 'wrist'],
    },
    {
      name: 'Prone Y Raise', nameAr: 'رفرفة Y على البطن',
      description: 'Face down, arms sweeping into a Y — wakes up the shoulders and upper back.',
      descriptionAr: 'على بطنك وإيديك بتفتح على شكل Y — بتصحّي الكتف وأعلى الضهر.',
      instructions: ['Lie face down, arms overhead in a Y, thumbs up.', 'Lift both arms and your chest a few centimetres off the floor.', 'Pause for two seconds and squeeze between the shoulder blades.', 'Lower slowly and repeat.'],
      instructionsAr: ['نام على بطنك وإيديك فوق راسك على شكل Y وإبهامك لفوق.', 'ارفع إيديك وصدرك سنتيمترات قليلة عن الأرض.', 'ثبت ثانيتين واعصر بين لوحي كتفك.', 'انزل بالراحة وكرر.'],
      sets: '3', reps: '12-15', level: 'BEGINNER',
    },
    {
      name: 'Wall Angel', nameAr: 'ملاك الحيطة',
      description: 'Posture work against a wall — undoes hours of sitting.',
      descriptionAr: 'تمرين قوام على الحيطة — بيعالج ساعات القعدة.',
      instructions: ['Stand with your back, head and hips touching a wall.', 'Put your arms up in a goalpost shape, backs of hands on the wall.', 'Slide your arms up and down without losing contact.', 'Move slowly; stop where contact breaks.'],
      instructionsAr: ['اقف وضهرك وراسك ووسطك ملازقين الحيطة.', 'ارفع إيديك على شكل قايم مرمى وضهر كفك على الحيطة.', 'زحلق إيديك لفوق وتحت من غير ما تسيب الحيطة.', 'اتحرك بالراحة، ولما اللمس يقطع قف.'],
      sets: '2', reps: '10-12', level: 'BEGINNER', props: ['Wall'],
    },
  ],
  Forearm: [
    {
      name: 'Towel Wring', nameAr: 'عصر الفوطة',
      description: 'Twist a towel as hard as you can — grip and forearm work with zero kit.',
      descriptionAr: 'لف الفوطة بأقصى قوة — شغل قبضة وساعد من غير أي أدوات.',
      instructions: ['Hold a towel with both hands, arms in front of you.', 'Twist in opposite directions as hard as you can.', 'Keep twisting for 20-30 seconds.', 'Swap directions and repeat.'],
      instructionsAr: ['امسك فوطة بإيديك الاتنين قدامك.', 'لفها في اتجاهين متعاكسين بأقصى قوة.', 'فضل بتلف ٢٠–٣٠ ثانية.', 'اعكس الاتجاه وكرر.'],
      sets: '3', reps: '20-30 sec', level: 'BEGINNER', props: ['Towel'],
    },
    {
      name: 'Fingertip Push-Up', nameAr: 'ضغط على أطراف الأصابع',
      description: 'A push-up held on the fingertips — serious grip and forearm strength.',
      descriptionAr: 'ضغط على أطراف صوابعك — قوة قبضة وساعد حقيقية.',
      instructions: ['Start from your knees with your fingertips on the floor.', 'Spread the fingers wide and keep them firm.', 'Lower a short way, then press back up.', 'Build up slowly — the tendons need time.'],
      instructionsAr: ['ابدأ من على ركبتيك وأطراف صوابعك على الأرض.', 'فرد صوابعك وخليها ثابتة.', 'انزل مسافة قصيرة وبعدين اطلع.', 'زوّد بالراحة — الأوتار محتاجة وقت.'],
      sets: '3', reps: '5-10', level: 'ADVANCED', contraindications: ['wrist'],
    },
  ],
  Abs: [
    {
      name: 'Reverse Crunch', nameAr: 'كرنش عكسي',
      description: 'Knees to chest — hits the lower abs without straining the neck.',
      descriptionAr: 'الركب ناحية الصدر — بيشغّل أسفل البطن من غير تعب للرقبة.',
      instructions: ['Lie on your back, hands flat beside you, knees bent.', 'Curl your knees toward your chest, lifting your hips off the floor.', 'Lower slowly — do not drop.', 'Keep your lower back pressed down throughout.'],
      instructionsAr: ['نام على ضهرك وإيديك جنبك والركب مثنية.', 'لف ركبك ناحية صدرك وارفع وسطك عن الأرض.', 'انزل بالراحة — متوقعش.', 'خلي أسفل ضهرك ملزوق في الأرض طول الوقت.'],
      sets: '3', reps: '12-15', level: 'BEGINNER', contraindications: ['back'],
    },
    {
      name: 'Hollow Hold', nameAr: 'ثبات القارب',
      description: 'The gymnastics core hold — the whole midsection working at once.',
      descriptionAr: 'ثبات الجمباز للبطن — كل عضلات الوسط بتشتغل مع بعض.',
      instructions: ['Lie on your back and press your lower back into the floor.', 'Lift your shoulders and legs a few centimetres up.', 'Hold, breathing shallow but steady.', 'Bend your knees if your back lifts off the floor.'],
      instructionsAr: ['نام على ضهرك واضغط أسفل ضهرك في الأرض.', 'ارفع كتفك ورجليك سنتيمترات قليلة.', 'ثبت وانت بتتنفس بهدوء.', 'اثني ركبك لو ضهرك بدأ يرتفع عن الأرض.'],
      sets: '3', reps: '20-40 sec', level: 'INTERMEDIATE', contraindications: ['back', 'neck'],
    },
  ],
  Obliques: [
    {
      name: 'Side Plank', nameAr: 'بلانك جانبي',
      description: 'The safest, strongest way to train the sides of your core.',
      descriptionAr: 'أأمن وأقوى طريقة تشتغل بيها جوانب البطن.',
      instructions: ['Lie on your side, elbow under your shoulder.', 'Lift your hips so your body makes one straight line.', 'Hold without letting your hips sag.', 'Drop to the bottom knee to make it easier.'],
      instructionsAr: ['نام على جنبك والكوع تحت كتفك بالظبط.', 'ارفع وسطك لحد ما جسمك يبقى خط مستقيم.', 'ثبت من غير ما وسطك ينزل.', 'انزل على الركبة السفلية عشان تسهّلها.'],
      sets: '3', reps: '20-40 sec each side', level: 'BEGINNER', contraindications: ['shoulder'],
    },
  ],
  Quads: [
    {
      name: 'Wall Squat Hold', nameAr: 'ثبات السكوات على الحيطة',
      description: 'Sit against a wall and hold — brutal on the quads, easy on the joints.',
      descriptionAr: 'اقعد على الحيطة وثبت — قاسي على الفخد وسهل على المفاصل.',
      instructions: ['Stand with your back flat against a wall.', 'Slide down until your knees are bent about 90°.', 'Keep your knees over your ankles, weight in your heels.', 'Hold, then stand up slowly.'],
      instructionsAr: ['اقف وضهرك ملزوق في الحيطة.', 'انزل لحد ما ركبك تبقى مثنية ٩٠ درجة.', 'خلي ركبك فوق كعبك وثقلك على الكعب.', 'ثبت وبعدين اطلع بالراحة.'],
      sets: '3', reps: '30-60 sec', level: 'BEGINNER', props: ['Wall'], contraindications: ['knee'],
    },
    {
      name: 'Split Squat', nameAr: 'سكوات مقسوم',
      description: 'One leg at a time — twice the work per leg, and it fixes side-to-side imbalance.',
      descriptionAr: 'رجل واحدة في المرة — ضعف الشغل لكل رجل، وبيعالج فرق القوة بين الرجلين.',
      instructions: ['Take a long step forward into a staggered stance.', 'Lower your back knee straight down toward the floor.', 'Keep your front shin close to vertical.', 'Push through the front heel to stand.'],
      instructionsAr: ['خد خطوة واسعة لقدام ووقفتك مقسومة.', 'نزّل ركبتك الخلفية لتحت ناحية الأرض.', 'خلي ساق الرجل الأمامية عمودية تقريباً.', 'ادفع بكعب الرجل الأمامية واطلع.'],
      sets: '3', reps: '8-12 each leg', level: 'BEGINNER', contraindications: ['knee'],
    },
  ],
  Hamstrings: [
    {
      name: 'Single-Leg Romanian Deadlift', nameAr: 'رفعة رومانية على رجل واحدة',
      description: 'Hinge on one leg — hamstrings and balance in one movement, no weight needed.',
      descriptionAr: 'ميل لقدام على رجل واحدة — خلفية الفخد والتوازن في حركة واحدة، من غير أوزان.',
      instructions: ['Stand on one leg with a soft knee.', 'Hinge forward at the hips, letting the free leg lift behind you.', 'Keep your back flat and hips level.', 'Squeeze the hamstring to stand back up.'],
      instructionsAr: ['اقف على رجل واحدة وركبتك مثنية شوية.', 'ميل لقدام من وسطك والرجل التانية تطلع لورا.', 'خلي ضهرك مفرود ووسطك متوازي.', 'اعصر خلفية الفخد واطلع تاني.'],
      sets: '3', reps: '8-12 each leg', level: 'INTERMEDIATE', contraindications: ['back'],
    },
    {
      name: 'Nordic Hamstring Curl', nameAr: 'كيرل نورديك',
      description: 'The hardest bodyweight hamstring movement there is — go slow and use your hands.',
      descriptionAr: 'أصعب تمرين خلفية فخد من غير أوزان — انزل بالراحة واستعن بإيديك.',
      instructions: ['Kneel down and have someone hold your ankles (or wedge them under a couch).', 'Keep your body in one line from knees to head.', 'Lower forward as slowly as you can control.', 'Catch yourself with your hands and push back up.'],
      instructionsAr: ['اركع وخلي حد يمسك كعبك (أو ثبتهم تحت كنبة).', 'خلي جسمك خط واحد من الركبة للراس.', 'انزل لقدام بأبطأ ما تقدر تتحكم.', 'استند بإيديك وادفع نفسك ترجع.'],
      sets: '3', reps: '5-8', level: 'ADVANCED', contraindications: ['knee'],
    },
  ],
  Glutes: [
    {
      name: 'Glute Bridge', nameAr: 'جسر المؤخرة',
      description: 'The foundation glute exercise — safe for backs, and it works from the first rep.',
      descriptionAr: 'أساس تمارين المؤخرة — آمن للضهر وشغال من أول عدة.',
      instructions: ['Lie on your back, knees bent, feet flat and hip-width apart.', 'Press through your heels and lift your hips.', 'Squeeze your glutes hard at the top for a second.', 'Lower without resting fully between reps.'],
      instructionsAr: ['نام على ضهرك والركب مثنية والقدم مفرودة على الأرض بعرض وسطك.', 'ادفع بكعبك وارفع وسطك.', 'اعصر مؤخرتك بقوة فوق لثانية.', 'انزل من غير ما ترتاح تماماً بين العدات.'],
      sets: '3', reps: '12-20', level: 'BEGINNER',
    },
    {
      name: 'Single-Leg Glute Bridge', nameAr: 'جسر المؤخرة على رجل واحدة',
      description: 'One leg doing the work of two — the natural progression from the bridge.',
      descriptionAr: 'رجل واحدة بتشيل شغل الاتنين — التطور الطبيعي بعد الجسر العادي.',
      instructions: ['Set up as a glute bridge, then extend one leg straight.', 'Push through the planted heel and lift your hips.', 'Keep your hips level — do not let one side drop.', 'Finish all reps, then swap legs.'],
      instructionsAr: ['ابدأ زي الجسر العادي وبعدين افرد رجل واحدة.', 'ادفع بكعب الرجل الثابتة وارفع وسطك.', 'خلي وسطك متوازي — متسيبش جنب ينزل.', 'خلّص العدات وبعدين بدّل الرجل.'],
      sets: '3', reps: '8-12 each leg', level: 'INTERMEDIATE',
    },
    {
      name: 'Glute Kickback', nameAr: 'رفرفة المؤخرة للخلف',
      description: 'On all fours, driving one heel to the ceiling — direct glute work, zero equipment.',
      descriptionAr: 'على أربعة وبتدفع كعبك ناحية السقف — شغل مباشر للمؤخرة من غير أدوات.',
      instructions: ['Start on hands and knees, back flat.', 'Drive one heel up toward the ceiling, knee bent.', 'Stop when your thigh is in line with your body — do not arch your back.', 'Lower with control and repeat.'],
      instructionsAr: ['ابدأ على إيديك وركبك وضهرك مفرود.', 'ادفع كعب رجل ناحية السقف والركبة مثنية.', 'قف لما فخدك يبقى في خط جسمك — متقوّسش ضهرك.', 'انزل بالراحة وكرر.'],
      sets: '3', reps: '12-15 each leg', level: 'BEGINNER', contraindications: ['back'],
    },
  ],
  'Lower Back': [
    {
      name: 'Superman', nameAr: 'سوبرمان',
      description: 'Face down, lifting arms and legs — strengthens the whole back chain gently.',
      descriptionAr: 'على بطنك وبترفع إيديك ورجليك — بيقوّي سلسلة الضهر كلها بلطف.',
      instructions: ['Lie face down, arms stretched in front of you.', 'Lift your arms, chest and legs a few centimetres up.', 'Hold for two seconds, looking at the floor.', 'Lower everything slowly together.'],
      instructionsAr: ['نام على بطنك وإيديك مفرودة قدامك.', 'ارفع إيديك وصدرك ورجليك سنتيمترات قليلة.', 'ثبت ثانيتين وعينك على الأرض.', 'نزّل كل حاجة بالراحة مع بعض.'],
      sets: '3', reps: '10-15', level: 'BEGINNER', contraindications: ['back'],
    },
    {
      name: 'Prone Swimmer', nameAr: 'السباحة على البطن',
      description: 'Alternating arm and leg lifts — back endurance without any load.',
      descriptionAr: 'رفع متبادل لإيد ورجل — تحمّل للضهر من غير أي حمل.',
      instructions: ['Lie face down with arms overhead.', 'Lift your right arm and left leg together.', 'Lower and switch to the other pair.', 'Keep the movement small and steady.'],
      instructionsAr: ['نام على بطنك وإيديك فوق راسك.', 'ارفع إيدك اليمين ورجلك الشمال مع بعض.', 'نزّل وبدّل للطرف التاني.', 'خلي الحركة صغيرة وثابتة.'],
      sets: '3', reps: '20 alternating', level: 'BEGINNER',
    },
  ],
  Lats: [
    {
      name: 'Bear Crawl', nameAr: 'زحف الدب',
      description: 'Crawling on hands and toes — the whole upper back and core working together.',
      descriptionAr: 'زحف على الإيدين والأصابع — أعلى الضهر والبطن بيشتغلوا مع بعض.',
      instructions: ['Start on hands and knees, then lift your knees a few centimetres.', 'Crawl forward moving the opposite hand and foot together.', 'Keep your hips low and your back flat.', 'Crawl forward, then backward.'],
      instructionsAr: ['ابدأ على إيديك وركبك وبعدين ارفع ركبك سنتيمترات قليلة.', 'ازحف لقدام وحرّك الإيد والرجل المتعاكسين مع بعض.', 'خلي وسطك واطي وضهرك مفرود.', 'ازحف لقدام وبعدين لورا.'],
      sets: '3', reps: '20-30 sec', level: 'INTERMEDIATE', contraindications: ['wrist', 'shoulder'],
    },
  ],
  Traps: [
    {
      name: 'Bodyweight Shrug', nameAr: 'هز الأكتاف بوزن الجسم',
      description: 'Shrugging while supporting your own weight — traps without a single weight.',
      descriptionAr: 'هز الأكتاف وانت شايل وزن جسمك — ترابيس من غير ولا وزن.',
      instructions: ['Get into a push-up position, arms locked straight.', 'Without bending your elbows, let your chest sink between your shoulders.', 'Push the floor away and lift your upper back to the ceiling.', 'Move slowly — this is a small range.'],
      instructionsAr: ['خد وضع الضغط وإيديك مفرودة.', 'من غير ما تثني كوعك، سيب صدرك ينزل بين كتفك.', 'ادفع الأرض وارفع أعلى ضهرك ناحية السقف.', 'اتحرك بالراحة — المدى صغير.'],
      sets: '3', reps: '12-15', level: 'BEGINNER', contraindications: ['wrist'],
    },
  ],
  Calves: [
    {
      name: 'Standing Calf Raise', nameAr: 'رفع السمانة وقوف',
      description: 'Up on your toes and down — calves need nothing but a floor.',
      descriptionAr: 'اطلع على أطراف صوابعك وانزل — السمانة مش محتاجة غير أرض.',
      instructions: ['Stand tall, feet hip-width apart.', 'Rise onto the balls of your feet as high as you can.', 'Pause at the top for one second.', 'Lower slowly until your heels touch the floor.'],
      instructionsAr: ['اقف مفرود والقدم بعرض وسطك.', 'اطلع على مشط رجلك لأعلى ما تقدر.', 'ثبت فوق ثانية واحدة.', 'انزل بالراحة لحد ما كعبك يلمس الأرض.'],
      sets: '3', reps: '15-25', level: 'BEGINNER',
    },
    {
      name: 'Single-Leg Calf Raise', nameAr: 'رفع السمانة على رجل واحدة',
      description: 'All your weight on one calf — the progression once doubles get easy.',
      descriptionAr: 'كل وزنك على سمانة واحدة — التطور لما العادية تبقى سهلة.',
      instructions: ['Stand on one foot, holding a wall for balance only.', 'Rise as high onto the ball of that foot as you can.', 'Lower slowly, feeling the stretch at the bottom.', 'Finish the set, then swap feet.'],
      instructionsAr: ['اقف على رجل واحدة ومسكة خفيفة في الحيطة للتوازن بس.', 'اطلع على مشط الرجل دي لأعلى ما تقدر.', 'انزل بالراحة وحس بالشد تحت.', 'خلّص المجموعة وبدّل الرجل.'],
      sets: '3', reps: '10-15 each leg', level: 'INTERMEDIATE', props: ['Wall'],
    },
  ],
  Abductors: [
    {
      name: 'Side-Lying Hip Abduction', nameAr: 'رفع الرجل جانبي على الجنب',
      description: 'Lying on your side, lifting the top leg — the classic hip-strength move.',
      descriptionAr: 'نايم على جنبك وبترفع الرجل العليا — تمرين قوة الورك الكلاسيكي.',
      instructions: ['Lie on one side with your legs stacked and straight.', 'Lift the top leg toward the ceiling.', 'Keep your toes pointing forward, not up.', 'Lower slowly without letting the leg rest.'],
      instructionsAr: ['نام على جنبك ورجليك فوق بعض ومفرودة.', 'ارفع الرجل العليا ناحية السقف.', 'خلي صوابعك مواجهة لقدام مش لفوق.', 'انزل بالراحة من غير ما الرجل ترتاح.'],
      sets: '3', reps: '15-20 each side', level: 'BEGINNER',
    },
  ],
  Adductors: [
    {
      name: 'Standing Hip Adduction', nameAr: 'سحب الرجل للداخل وقوف',
      description: 'Sweeping one leg across the body — inner thigh work with no machine.',
      descriptionAr: 'مرجحة الرجل ناحية الجسم — شغل باطن الفخد من غير جهاز.',
      instructions: ['Stand tall, holding a wall for balance.', 'Sweep one leg across the front of your body.', 'Squeeze the inner thigh at the end of the movement.', 'Return under control and repeat.'],
      instructionsAr: ['اقف مفرود ومسكة في الحيطة للتوازن.', 'مرجح رجل ناحية قدام جسمك.', 'اعصر باطن الفخد في آخر الحركة.', 'رجّع بالراحة وكرر.'],
      sets: '3', reps: '12-15 each leg', level: 'BEGINNER', props: ['Wall'],
    },
  ],
  Cardio: [
    {
      name: 'Jumping Jack', nameAr: 'نط مفتوح',
      description: 'The warm-up everyone knows — gets the heart going in seconds.',
      descriptionAr: 'التسخين اللي الكل يعرفه — بيرفع ضربات قلبك في ثواني.',
      instructions: ['Stand with feet together, arms at your sides.', 'Jump your feet wide while raising your arms overhead.', 'Jump back to the start.', 'Keep a steady rhythm and breathe.'],
      instructionsAr: ['اقف ورجليك مع بعض وإيديك جنبك.', 'نط وافتح رجليك وارفع إيديك فوق راسك.', 'نط ارجع للوضع الأول.', 'خلي إيقاعك ثابت وتنفس.'],
      sets: '3', reps: '30-60 sec', level: 'BEGINNER', contraindications: ['knee'],
    },
    {
      name: 'High Knees', nameAr: 'رفع الركب',
      description: 'Running on the spot with the knees up — big effort, no space needed.',
      descriptionAr: 'جري في مكانك والركب لفوق — مجهود عالي ومش محتاج مساحة.',
      instructions: ['Run on the spot, driving each knee up to hip height.', 'Stay on the balls of your feet.', 'Pump your arms with the rhythm.', 'Keep your chest tall, do not lean back.'],
      instructionsAr: ['اجري في مكانك وارفع كل ركبة لمستوى وسطك.', 'فضل على مشط رجلك.', 'حرّك إيديك مع الإيقاع.', 'خلي صدرك مفرود ومتميلش لورا.'],
      sets: '3', reps: '30-45 sec', level: 'BEGINNER', contraindications: ['knee'],
    },
    {
      name: 'Mountain Climber', nameAr: 'متسلق الجبل',
      description: 'Push-up position, knees driving in — cardio and core at the same time.',
      descriptionAr: 'وضع الضغط والركب بتيجي لقدام — كارديو وبطن في نفس الوقت.',
      instructions: ['Start in a push-up position, body in one line.', 'Drive one knee toward your chest, then swap quickly.', 'Keep your hips low — do not let them bounce up.', 'Move as fast as you can hold the form.'],
      instructionsAr: ['ابدأ في وضع الضغط وجسمك خط واحد.', 'قرّب ركبة ناحية صدرك وبدّل بسرعة.', 'خلي وسطك واطي — متخليهوش يطلع وينزل.', 'اتحرك بأسرع ما تقدر تحافظ على الشكل.'],
      sets: '3', reps: '30-45 sec', level: 'INTERMEDIATE', contraindications: ['wrist'],
    },
    {
      name: 'Burpee', nameAr: 'بيربي',
      description: 'The whole body in one rep — the most demanding thing you can do without kit.',
      descriptionAr: 'الجسم كله في عدة واحدة — أصعب حاجة تقدر تعملها من غير أدوات.',
      instructions: ['From standing, squat down and place your hands on the floor.', 'Jump or step your feet back into a push-up position.', 'Come back in and jump up with your arms overhead.', 'Step instead of jumping to make it easier.'],
      instructionsAr: ['من الوقوف، انزل سكوات وحط إيديك على الأرض.', 'نط أو امشي برجلك لورا لوضع الضغط.', 'ارجع تاني ونط لفوق وإيديك فوق راسك.', 'امشي بدل النط عشان تسهّلها.'],
      sets: '3', reps: '8-15', level: 'INTERMEDIATE', contraindications: ['knee', 'wrist'],
    },
    {
      name: 'Inchworm', nameAr: 'دودة القياس',
      description: 'Walking your hands out and back — mobility and core, gentle on the joints.',
      descriptionAr: 'مشي بإيديك لقدام ورجوع — مرونة وبطن ولطيف على المفاصل.',
      instructions: ['Stand tall, then bend and place your hands on the floor.', 'Walk your hands forward into a plank.', 'Walk your feet up to meet your hands.', 'Stand and repeat.'],
      instructionsAr: ['اقف مفرود وبعدين ميل وحط إيديك على الأرض.', 'امشي بإيديك لقدام لحد وضع البلانك.', 'امشي برجلك لحد ما توصل لإيديك.', 'اقف وكرر.'],
      sets: '3', reps: '8-10', level: 'BEGINNER',
    },
  ],
};

async function main() {
  const clear = process.argv.includes('--clear');
  const groups = await prisma.muscleGroup.findMany({ select: { id: true, name: true } });
  const byName = new Map(groups.map((g) => [g.name.toLowerCase(), g.id]));

  let created = 0;
  let skipped = 0;
  let removed = 0;

  for (const [groupName, list] of Object.entries(PLAN)) {
    const groupId = byName.get(groupName.toLowerCase());
    if (!groupId) {
      console.warn(`! muscle group "${groupName}" not found — skipping ${list.length} exercise(s)`);
      continue;
    }

    for (const ex of list) {
      const existing = await prisma.exercise.findFirst({
        where: { muscleGroupId: groupId, name: ex.name },
        select: { id: true },
      });

      if (clear) {
        if (existing) {
          await prisma.exercise.delete({ where: { id: existing.id } });
          removed++;
        }
        continue;
      }

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.exercise.create({
        data: {
          muscleGroupId: groupId,
          name: ex.name,
          nameAr: ex.nameAr,
          description: ex.description,
          descriptionAr: ex.descriptionAr,
          instructions: JSON.stringify(ex.instructions),
          instructionsAr: JSON.stringify(ex.instructionsAr),
          sets: ex.sets,
          reps: ex.reps,
          // Household props still read as "no equipment" to the tier logic —
          // a towel or a chair is not a barrier to training.
          equipment: JSON.stringify(ex.props ?? []),
          level: ex.level,
          contraindications: ex.contraindications ? JSON.stringify(ex.contraindications) : null,
          // No videoUrl on purpose: the animated figure covers the movement
          // until a verified demo link is added by seed-exercise-videos.ts.
          order: 100, // after the existing equipment-based movements
        },
      });
      created++;
    }
  }

  console.log(clear ? `Removed ${removed} bodyweight exercise(s).` : `Created ${created}, already present ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
