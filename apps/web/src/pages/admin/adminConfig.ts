export interface Field {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'remote' | 'checkbox' | 'date';
  options?: string[];
  remote?: string; // resource key to fetch options from
  remoteLabel?: string; // field to display
}

/** Which section of the dashboard a resource lives under.
 *
 *  Nineteen resources in one flat grid is a wall, not a menu — you end up reading
 *  every label to find the one you want. Grouping them by the job you came to do
 *  turns it into four short lists. */
export type ResourceGroup = 'training' | 'wellness' | 'engagement' | 'business';

export const GROUP_LABEL: Record<ResourceGroup, string> = {
  training: 'Training',
  wellness: 'Wellness',
  engagement: 'Engagement',
  business: 'Partners & revenue',
};

export interface Resource {
  key: string;
  label: string;
  api: string; // /api/admin/<api>
  listLabel: string; // field shown in list
  group: ResourceGroup;
  fields: Field[];
  /** Which fields become columns in the desktop table (in order). Any field
   *  name is allowed — images render as thumbnails, booleans as dots.
   *  Omitted → first 4 text/number fields. */
  table?: string[];
}

/** Resolve the table columns for a resource: the explicit `table` list when
 *  present, otherwise the first four text/number fields. */
export function tableFields(r: Resource): Field[] {
  if (r.table?.length) {
    return r.table
      .map((name) => r.fields.find((f) => f.name === name))
      .filter((f): f is Field => !!f);
  }
  return r.fields.filter((f) => f.type === 'text' || f.type === 'number').slice(0, 4);
}

/** Field names whose values are image paths — thumbnails in the table,
 *  preview + upload button in the form. */
export const IMG_FIELDS = ['coverImage', 'image', 'avatarUrl', 'thumbnail', 'icon', 'svgAsset', 'logo', 'cover'];

export const RESOURCES: Resource[] = [
  {
    key: 'coaches', label: 'Coaches', api: 'coaches', listLabel: 'name', group: 'training',
    table: ['avatarUrl', 'name', 'nameAr', 'type', 'headline', 'order'],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'nameAr', label: 'Name (Arabic)', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['YOGA', 'WORKOUT'] },
      { name: 'headline', label: 'Headline', type: 'text' },
      { name: 'bio', label: 'Bio', type: 'textarea' },
      { name: 'avatarUrl', label: 'Avatar URL', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'programs', label: 'Programs', api: 'programs', listLabel: 'title', group: 'training',
    table: ['coverImage', 'title', 'titleAr', 'level', 'order'],
    fields: [
      { name: 'coachId', label: 'Coach', type: 'remote', remote: 'coaches', remoteLabel: 'name' },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'level', label: 'Level', type: 'select', options: ['', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'coverImage', label: 'Cover image', type: 'text' },
      { name: 'reelKeyword', label: 'Related-reels keyword (override)', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'lessons', label: 'Lessons', api: 'lessons', listLabel: 'title', group: 'training',
    table: ['thumbnail', 'title', 'durationSec', 'videoId', 'order'],
    fields: [
      { name: 'programId', label: 'Program', type: 'remote', remote: 'programs', remoteLabel: 'title' },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'videoId', label: 'Video ID (from Upload)', type: 'text' },
      { name: 'videoUrl', label: 'Video link (YouTube / MP4) - used when no Video ID', type: 'text' },
      { name: 'durationSec', label: 'Duration (sec)', type: 'number' },
      { name: 'thumbnail', label: 'Thumbnail', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'reelKeyword', label: 'Related-reels keyword (override)', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'muscle-groups', label: 'Muscle Groups', api: 'muscle-groups', listLabel: 'name', group: 'training',
    table: ['name', 'nameAr', 'bodySide', 'order'],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'nameAr', label: 'Name (Arabic)', type: 'text' },
      { name: 'bodySide', label: 'Side', type: 'select', options: ['front', 'back'] },
      { name: 'posX', label: 'Pos X (0-1)', type: 'number' },
      { name: 'posY', label: 'Pos Y (0-1)', type: 'number' },
      { name: 'reelKeyword', label: 'Related-reels keyword (override)', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'exercises', label: 'Exercises', api: 'exercises', listLabel: 'name', group: 'training',
    table: ['name', 'nameAr', 'level', 'sets', 'reps', 'order'],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'nameAr', label: 'Name (Arabic)', type: 'text' },
      { name: 'muscleGroupId', label: 'Muscle group', type: 'remote', remote: 'muscle-groups', remoteLabel: 'name' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'descriptionAr', label: 'Description (Arabic)', type: 'textarea' },
      { name: 'instructions', label: 'Instructions (JSON array)', type: 'textarea' },
      { name: 'instructionsAr', label: 'Instructions Arabic (JSON array)', type: 'textarea' },
      { name: 'sets', label: 'Sets', type: 'text' },
      { name: 'reps', label: 'Reps', type: 'text' },
      { name: 'equipment', label: 'Equipment (JSON array)', type: 'text' },
      { name: 'level', label: 'Level', type: 'select', options: ['', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
      { name: 'videoUrl', label: 'Video link (YouTube / MP4) - short form demo', type: 'text' },
      { name: 'contraindications', label: 'Hard on which joints? (knee, back, shoulder, wrist, neck)', type: 'text' },
      { name: 'saferAlternative', label: 'Gentler swap (exercise name shown when flagged)', type: 'text' },
      { name: 'svgAsset', label: 'SVG illustration', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'categories', label: 'Categories', api: 'categories', listLabel: 'title', group: 'wellness',
    table: ['image', 'kind', 'title', 'titleAr', 'order'],
    fields: [
      { name: 'kind', label: 'Kind', type: 'select', options: ['initiative', 'recipe', 'article'] },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'image', label: 'Image', type: 'text' },
      { name: 'reelKeyword', label: 'Related-reels keyword (override)', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'articles', label: 'Articles', api: 'articles', listLabel: 'title', group: 'wellness',
    table: ['coverImage', 'title', 'excerpt', 'readTimeMin', 'order'],
    fields: [
      { name: 'categoryId', label: 'Category', type: 'remote', remote: 'categories', remoteLabel: 'title' },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'excerpt', label: 'Excerpt', type: 'text' },
      { name: 'excerptAr', label: 'Excerpt (Arabic)', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea' },
      { name: 'bodyAr', label: 'Body (Arabic)', type: 'textarea' },
      { name: 'coverImage', label: 'Cover image', type: 'text' },
      { name: 'videoId', label: 'Video ID (from Upload)', type: 'text' },
      { name: 'videoUrl', label: 'Video link (YouTube / mp4)', type: 'text' },
      { name: 'readTimeMin', label: 'Read time (min)', type: 'number' },
      { name: 'reelKeyword', label: 'Related-reels keyword (override)', type: 'text' },
      // Medical review. Health content with a named reviewer reads as authority;
      // without one it reads as a blog. Leave blank and nothing is shown.
      { name: 'reviewedBy', label: 'Medically reviewed by', type: 'text' },
      { name: 'reviewedByAr', label: 'Reviewed by (Arabic)', type: 'text' },
      { name: 'reviewerTitle', label: "Reviewer's title", type: 'text' },
      { name: 'reviewerTitleAr', label: "Reviewer's title (Arabic)", type: 'text' },
      { name: 'reviewedOn', label: 'Reviewed on (YYYY-MM-DD)', type: 'text' },
      { name: 'sources', label: 'Sources — JSON [{"label":"…","url":"…"}]', type: 'textarea' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'recipes', label: 'Recipes', api: 'recipes', listLabel: 'title', group: 'wellness',
    table: ['coverImage', 'title', 'calories', 'protein', 'cuisine', 'servings', 'order'],
    fields: [
      { name: 'categoryId', label: 'Category', type: 'remote', remote: 'categories', remoteLabel: 'title' },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'about', label: 'About', type: 'textarea' },
      { name: 'aboutAr', label: 'About (Arabic)', type: 'textarea' },
      // English ingredients and steps had no field at all, so a recipe added here
      // could only ever be authored in Arabic - and the macro estimator has
      // nothing to read.
      { name: 'ingredients', label: 'Ingredients (JSON array)', type: 'textarea' },
      { name: 'ingredientsAr', label: 'Ingredients Arabic (JSON array)', type: 'textarea' },
      { name: 'steps', label: 'Steps (JSON array)', type: 'textarea' },
      { name: 'stepsAr', label: 'Steps Arabic (JSON array)', type: 'textarea' },
      { name: 'coverImage', label: 'Cover image', type: 'text' },
      { name: 'videoId', label: 'Video ID (from Upload)', type: 'text' },
      { name: 'videoUrl', label: 'Video link (YouTube / mp4)', type: 'text' },
      { name: 'calories', label: 'Calories (per serving)', type: 'number' },
      // Without macros a recipe cannot be used by the meal planner at all — it is
      // filtered out rather than guessed at.
      { name: 'protein', label: 'Protein g (per serving)', type: 'number' },
      { name: 'carbs', label: 'Carbs g (per serving)', type: 'number' },
      { name: 'fat', label: 'Fat g (per serving)', type: 'number' },
      { name: 'mealSlots', label: 'Meal slots — JSON ["breakfast","lunch","dinner","snack"] · use ["condiment"] for sauces', type: 'text' },
      { name: 'cuisine', label: 'Cuisine', type: 'select', options: ['international', 'egyptian', 'levantine'] },
      { name: 'prepTimeMin', label: 'Prep (min)', type: 'number' },
      { name: 'cookTimeMin', label: 'Cook (min)', type: 'number' },
      { name: 'servings', label: 'Servings', type: 'number' },
      { name: 'difficulty', label: 'Difficulty', type: 'text' },
      { name: 'affiliateUrl', label: 'Shop-ingredients affiliate link', type: 'text' },
      { name: 'affiliateLabel', label: 'Affiliate button label', type: 'text' },
      { name: 'reelKeyword', label: 'Related-reels keyword (override)', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'banners', label: 'Banners / Ads / Onboarding', api: 'banners', listLabel: 'title', group: 'engagement',
    table: ['image', 'section', 'title', 'impressions', 'clicks', 'order'],
    fields: [
      { name: 'section', label: 'Section (onboarding = intro slide backgrounds, order 0-3)', type: 'select', options: ['home_sponsor', 'feed_ad', 'workout_promo', 'onboarding'] },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'text' },
      { name: 'subtitleAr', label: 'Subtitle (Arabic)', type: 'text' },
      { name: 'image', label: 'Image', type: 'text' },
      { name: 'url', label: 'Sponsor / affiliate link (https://)', type: 'text' },
      { name: 'impressions', label: 'Impressions (stat)', type: 'number' },
      { name: 'clicks', label: 'Clicks (stat)', type: 'number' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'featured', label: 'Featured (home)', api: 'featured', listLabel: 'title', group: 'engagement',
    table: ['image', 'section', 'title', 'durationSec', 'order'],
    fields: [
      { name: 'section', label: 'Section', type: 'select', options: ['fit_for_life', 'meal_prep', 'challenge'] },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'image', label: 'Image', type: 'text' },
      { name: 'videoId', label: 'Video ID (plays on tap)', type: 'text' },
      { name: 'url', label: 'Link (internal /path or https://)', type: 'text' },
      { name: 'durationSec', label: 'Duration (sec)', type: 'number' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'plans', label: 'Membership Plans', api: 'plans', listLabel: 'name', group: 'business',
    table: ['name', 'priceCents', 'interval'],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'priceCents', label: 'Price (cents)', type: 'number' },
      { name: 'interval', label: 'Interval', type: 'select', options: ['month', 'year'] },
    ],
  },
  {
    key: 'challenges', label: 'Challenges', api: 'challenges', listLabel: 'title', group: 'engagement',
    table: ['title', 'goalType', 'goalValue', 'startsOn', 'endsOn', 'rewardXp'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'coverImage', label: 'Cover image (from Upload)', type: 'text' },
      { name: 'goalType', label: 'Goal type', type: 'select', options: ['lessons', 'streak', 'calories', 'water', 'lifts'] },
      { name: 'goalValue', label: 'Goal value', type: 'number' },
      { name: 'startsOn', label: 'Starts on', type: 'date' },
      { name: 'endsOn', label: 'Ends on', type: 'date' },
      { name: 'rewardXp', label: 'Reward XP (paid on completing the goal)', type: 'number' },
      { name: 'prizeText', label: 'Prizes (announced day after end)', type: 'textarea' },
      { name: 'prizeTextAr', label: 'Prizes (Arabic)', type: 'textarea' },
      { name: 'prizeMode', label: 'Prize mode: top3 = podium · raffle = draw among ALL completers · both', type: 'select', options: ['top3', 'raffle', 'both'] },
      { name: 'sponsorName', label: 'Sponsor name', type: 'text' },
      { name: 'sponsorUrl', label: 'Sponsor link (https://)', type: 'text' },
    ],
  },
  {
    key: 'partners', label: 'Partners / Sponsors', api: 'partners', listLabel: 'name', group: 'business',
    table: ['logo', 'name', 'type', 'city', 'country', 'featured', 'verified', 'foundingUntil', 'active', 'views'],
    fields: [
      { name: 'name', label: 'Partner name', type: 'text' },
      { name: 'nameAr', label: 'Name (Arabic)', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['store', 'gym', 'brand', 'clinic', 'coach_org'] },
      { name: 'managerUserId', label: 'Manager account (can edit page + work leads at /partner-hub)', type: 'remote', remote: 'users', remoteLabel: 'email' },
      { name: 'tagline', label: 'Tagline (short line)', type: 'text' },
      { name: 'taglineAr', label: 'Tagline (Arabic)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'descriptionAr', label: 'Description (Arabic)', type: 'textarea' },
      { name: 'logo', label: 'Logo', type: 'text' },
      { name: 'cover', label: 'Cover image', type: 'text' },
      // Where this business is, and what it bills in. Listings are filtered by
      // country, so a wrong value here hides the partner from its own market.
      { name: 'country', label: 'Country (EG, SA, AE…)', type: 'select', options: ['EG','SA','AE','KW','QA','BH','OM','JO','MA','DZ','TN'] },
      { name: 'currency', label: 'Currency', type: 'select', options: ['EGP','SAR','AED','KWD','QAR','BHD','OMR','JOD','MAD','DZD','TND'] },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'address', label: 'Address', type: 'text' },
      // Venue directory. lat/lng are what make "nearest gym" possible at all —
      // right-click a spot in Google Maps and it copies them in this exact order.
      { name: 'lat', label: 'Latitude (from Google Maps)', type: 'number' },
      { name: 'lng', label: 'Longitude (from Google Maps)', type: 'number' },
      { name: 'facilities', label: 'Facilities — JSON ["weights","cardio","classes","pool","sauna","parking","showers","lockers","pt","crossfit","boxing","kids"]', type: 'textarea' },
      { name: 'hours', label: 'Hours — JSON {"sat":"06:00-00:00","fri":"closed"}', type: 'textarea' },
      { name: 'ladiesOnly', label: 'Ladies only', type: 'checkbox' },
      { name: 'ladiesHours', label: 'Ladies hours (free text)', type: 'text' },
      { name: 'priceFromAmount', label: 'Price from — number only (formatted for the viewer)', type: 'number' },
      { name: 'priceFrom', label: 'Price from — text override (e.g. "First month free")', type: 'text' },
      { name: 'priceFromAr', label: 'Price from (Arabic)', type: 'text' },
      { name: 'gallery', label: 'Gallery — JSON ["images/a.jpg","images/b.jpg"]', type: 'textarea' },
      { name: 'phone', label: 'Phone (tel:)', type: 'text' },
      { name: 'whatsapp', label: 'WhatsApp (digits only, e.g. 201001234567)', type: 'text' },
      { name: 'website', label: 'Website (https://)', type: 'text' },
      { name: 'instagram', label: 'Instagram URL', type: 'text' },
      { name: 'mapUrl', label: 'Google Maps link', type: 'text' },
      { name: 'featured', label: 'Featured (top tier — home placement)', type: 'select', options: ['true', 'false'] },
      { name: 'verified', label: 'Verified (paid middle tier — badge + boost)', type: 'select', options: ['true', 'false'] },
      { name: 'foundingUntil', label: 'Founding free until (YYYY-MM-DD — renewal pitch date)', type: 'text' },
      { name: 'active', label: 'Active', type: 'select', options: ['true', 'false'] },
      { name: 'views', label: 'Views (stat)', type: 'number' },
      { name: 'contacts', label: 'Contacts (stat)', type: 'number' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'partner-products', label: 'Store Products', api: 'partner-products', listLabel: 'title', group: 'business',
    table: ['image', 'title', 'category', 'priceAmount', 'active', 'views', 'order'],
    fields: [
      { name: 'partnerId', label: 'Partner', type: 'remote', remote: 'partners', remoteLabel: 'name' },
      { name: 'category', label: 'Category', type: 'select', options: ['supplements', 'wear', 'equipment', 'food', 'membership', 'service'] },
      { name: 'title', label: 'Product title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'descriptionAr', label: 'Description (Arabic)', type: 'textarea' },
      { name: 'image', label: 'Product image', type: 'text' },
      { name: 'priceAmount', label: 'Price — number only (uses the partner currency)', type: 'number' },
      { name: 'oldPriceAmount', label: 'Old price — number only (strikethrough)', type: 'number' },
      { name: 'price', label: 'Price — text override, only if a number will not do', type: 'text' },
      { name: 'oldPrice', label: 'Old price — text override', type: 'text' },
      { name: 'badge', label: 'Badge (e.g. -20%)', type: 'text' },
      { name: 'url', label: 'Product link (https://)', type: 'text' },
      { name: 'active', label: 'Active', type: 'select', options: ['true', 'false'] },
      { name: 'views', label: 'Views (stat)', type: 'number' },
      { name: 'contacts', label: 'Contacts (stat)', type: 'number' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'partner-deals', label: 'Deals & Coupons', api: 'partner-deals', listLabel: 'title', group: 'business',
    table: ['image', 'title', 'discount', 'code', 'validUntil', 'active', 'redeems'],
    fields: [
      { name: 'partnerId', label: 'Partner', type: 'remote', remote: 'partners', remoteLabel: 'name' },
      { name: 'title', label: 'Deal title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'descriptionAr', label: 'Description (Arabic)', type: 'textarea' },
      { name: 'discount', label: 'Discount text (e.g. 20% off)', type: 'text' },
      { name: 'code', label: 'Coupon code (shown to users)', type: 'text' },
      { name: 'image', label: 'Image', type: 'text' },
      { name: 'validUntil', label: 'Valid until (YYYY-MM-DD)', type: 'text' },
      { name: 'active', label: 'Active', type: 'select', options: ['true', 'false'] },
      { name: 'views', label: 'Views (stat)', type: 'number' },
      { name: 'redeems', label: 'Code reveals (stat)', type: 'number' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'lead-forms', label: 'Lead Forms', api: 'lead-forms', listLabel: 'title', group: 'business',
    table: ['title', 'kind', 'cta', 'active', 'views'],
    fields: [
      { name: 'partnerId', label: 'Partner', type: 'remote', remote: 'partners', remoteLabel: 'name' },
      { name: 'kind', label: 'Kind', type: 'select', options: ['trial', 'consult', 'quote', 'membership', 'tour'] },
      { name: 'title', label: 'Offer title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'descriptionAr', label: 'Description (Arabic)', type: 'textarea' },
      { name: 'question', label: 'Extra question', type: 'text' },
      { name: 'questionAr', label: 'Extra question (Arabic)', type: 'text' },
      { name: 'cta', label: 'Button text', type: 'text' },
      { name: 'ctaAr', label: 'Button text (Arabic)', type: 'text' },
      { name: 'active', label: 'Active', type: 'select', options: ['true', 'false'] },
      { name: 'views', label: 'Views (stat)', type: 'number' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
  },
  {
    key: 'fit-events', label: 'Events Board', api: 'fit-events', listLabel: 'title', group: 'business',
    table: ['image', 'title', 'kind', 'date', 'city', 'featured', 'active'],
    fields: [
      { name: 'partnerId', label: 'Partner (optional)', type: 'remote', remote: 'partners', remoteLabel: 'name' },
      { name: 'kind', label: 'Kind', type: 'select', options: ['class', 'bootcamp', 'race', 'workshop', 'open_day'] },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'descriptionAr', label: 'Description (Arabic)', type: 'textarea' },
      { name: 'date', label: 'Date (YYYY-MM-DD)', type: 'text' },
      { name: 'time', label: 'Time (e.g. 6:00 AM)', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'venue', label: 'Venue', type: 'text' },
      { name: 'venueAr', label: 'Venue (Arabic)', type: 'text' },
      { name: 'mapUrl', label: 'Map URL', type: 'text' },
      { name: 'country', label: 'Country (EG, SA, AE…)', type: 'select', options: ['EG','SA','AE','KW','QA','BH','OM','JO','MA','DZ','TN'] },
      { name: 'currency', label: 'Currency', type: 'select', options: ['EGP','SAR','AED','KWD','QAR','BHD','OMR','JOD','MAD','DZD','TND'] },
      { name: 'priceAmount', label: 'Price — number only (0 = free)', type: 'number' },
      { name: 'price', label: 'Price — text override', type: 'text' },
      { name: 'url', label: 'Booking/ticket link', type: 'text' },
      { name: 'whatsapp', label: 'WhatsApp (digits only)', type: 'text' },
      { name: 'image', label: 'Image', type: 'text' },
      { name: 'sponsored', label: 'Sponsored', type: 'select', options: ['false', 'true'] },
      { name: 'featured', label: 'Featured', type: 'select', options: ['false', 'true'] },
      { name: 'active', label: 'Active', type: 'select', options: ['true', 'false'] },
      { name: 'views', label: 'Views (stat)', type: 'number' },
      { name: 'contacts', label: 'Link taps (stat)', type: 'number' },
    ],
  },
  {
    key: 'badges', label: 'Badges', api: 'badges', listLabel: 'title', group: 'engagement',
    table: ['icon', 'code', 'title', 'titleAr'],
    fields: [
      { name: 'code', label: 'Code (unique)', type: 'text' },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'titleAr', label: 'Title (Arabic)', type: 'text' },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'icon', label: 'Icon (emoji)', type: 'text' },
    ],
  },
];

export const NUMBER_FIELDS = new Set(['order', 'durationSec', 'readTimeMin', 'calories', 'prepTimeMin', 'cookTimeMin', 'servings', 'protein', 'carbs', 'fat', 'lat', 'lng', 'priceFromAmount', 'priceAmount', 'oldPriceAmount', 'posX', 'posY', 'priceCents', 'goalValue', 'impressions', 'clicks']);
export const BOOLEAN_FIELDS = new Set(['active', 'featured', 'ladiesOnly']);
