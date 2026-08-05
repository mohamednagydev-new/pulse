/**
 * Arabic → canonical (English, lowercase) muscle-group names.
 *
 * The API localises `name` to `nameAr` when the app runs in Arabic, but several
 * client features match on the English name: the animated icons (TrainingAnim),
 * the body-map regions (BodySvg), and the schedule→group lookup. Without this
 * translation every Arabic card fell back to the same default icon and the
 * schedule's Start button lost its target.
 *
 * Keys cover the seeded names plus common spelling variants (ذ/د, ظ/ض swaps
 * and the with/without-ال forms).
 */
const AR_TO_EN: Record<string, string> = {
  'الأكتاف': 'shoulders', 'أكتاف': 'shoulders', 'الاكتاف': 'shoulders', 'كتف': 'shoulders',
  'الصدر': 'chest', 'صدر': 'chest',
  'البايسبس': 'biceps', 'بايسبس': 'biceps', 'الباي': 'biceps',
  'الساعد': 'forearm', 'ساعد': 'forearm',
  'عضلات البطن': 'abs', 'البطن': 'abs', 'بطن': 'abs',
  'جوانب البطن': 'obliques', 'الجوانب': 'obliques',
  'مقدمة الفخد': 'quads', 'مقدمة الفخذ': 'quads',
  'مبعدات الفخد': 'abductors', 'مبعدات الفخذ': 'abductors',
  'مقربات الفخد': 'adductors', 'مقربات الفخذ': 'adductors',
  'كارديو': 'cardio', 'الكارديو': 'cardio',
  'الترايسبس': 'triceps', 'ترايسبس': 'triceps', 'التراي': 'triceps',
  'الترابيس': 'traps', 'ترابيس': 'traps',
  'اللاتس': 'lats', 'لاتس': 'lats',
  'أسفل الضهر': 'lower back', 'أسفل الظهر': 'lower back', 'اسفل الضهر': 'lower back', 'اسفل الظهر': 'lower back',
  'عضلات المؤخرة': 'glutes', 'المؤخرة': 'glutes',
  'خلفية الفخد': 'hamstrings', 'خلفية الفخذ': 'hamstrings',
  'السمانة': 'calves', 'سمانة': 'calves',
};

/** Canonical lowercase name for matching — Arabic input comes back English. */
export function canonicalMuscle(name?: string | null): string {
  const raw = (name ?? '').trim();
  if (!raw) return '';
  return (AR_TO_EN[raw] ?? raw).toLowerCase();
}

/** True when two group names refer to the same muscle, across languages. */
export function sameMuscle(a?: string | null, b?: string | null): boolean {
  const ca = canonicalMuscle(a);
  return ca !== '' && ca === canonicalMuscle(b);
}
