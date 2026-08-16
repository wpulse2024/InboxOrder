export interface ParseResult {
  intent: 'order' | 'question' | 'spam' | 'unknown';
  product?: string;
  quantity?: number;
  phone?: string;
  address?: string;
  confidence: number;
}

// ── Phone ─────────────────────────────────────────────────────────────────────
// Bangladesh mobile: 01[3-9] followed by exactly 8 digits
const PHONE_REGEX = /\b(01[3-9]\d{8})\b/;

// ── Quantity ──────────────────────────────────────────────────────────────────
const QUANTITY_PATTERNS: RegExp[] = [
  // "3 টা", "3 টি", "3 পিস", "3 pcs", "3 pieces", "3 units", "3 nos"
  /(\d+)\s*(?:টা|টি|পিস|pcs|pieces?|units?|nos?\.?)/i,
  // "2 ta", "2 ti" (romanised Bangla)
  /(\d+)\s+(?:ta|ti)\b/i,
  // "qty: 5", "quantity: 5", "পরিমাণ: 5"
  /(?:qty|quantity|পরিমাণ|পরিমান)[:\s]+(\d+)/i,
];

// ── Intent keywords ───────────────────────────────────────────────────────────
const ORDER_KEYWORDS_BN = [
  'অর্ডার', 'নিব', 'নেব', 'চাই', 'দিন', 'দাও', 'দিবেন',
  'পাঠান', 'কিনব', 'কিনবো', 'পাই', 'দরকার', 'লাগবে', 'নিতে চাই',
];
const ORDER_KEYWORDS_EN = [
  'order', 'want', 'need', 'buy', 'purchase', 'send', 'deliver', 'get me',
];

const QUESTION_KEYWORDS_BN = [
  'দাম', 'কত', 'আছে', 'পাওয়া', 'জানতে', 'বলুন', 'জানাবেন',
];
const QUESTION_KEYWORDS_EN = [
  'price', 'how much', 'available', 'stock', 'what', 'when', 'can i',
  'do you have', 'is it',
];

const SPAM_KEYWORDS = [
  'spam', 'advertisement', 'বিজ্ঞাপন', 'প্রচার',
  'click here', 'free gift', 'you have won', 'win prize',
];

// ── Address ───────────────────────────────────────────────────────────────────
// Patterns ranked by specificity; all matches are combined into one address.
const ADDRESS_PATTERNS: RegExp[] = [
  // Major Bangladeshi cities (Bangla script)
  /ঢাকা|চট্টগ্রাম|সিলেট|রাজশাহী|খুলনা|বরিশাল|ময়মনসিংহ|রংপুর|নারায়ণগঞ্জ|গাজীপুর|কুমিল্লা/,
  // Major Bangladeshi cities (romanised)
  /\b(?:dhaka|chittagong|sylhet|rajshahi|khulna|barishal|mymensingh|rangpur|narayanganj|gazipur|comilla)\b/i,
  // Structural address words (Bangla)
  /(?:গ্রাম|বাড়ি|বাসা|রোড|মহল্লা|পাড়া|এলাকা|থানা|উপজেলা|ইউনিয়ন|জেলা)[:\s#\-]*[\u0980-\u09FFa-zA-Z\d\s]{1,40}/,
  // Structural address words (English)
  /(?:house|road|sector|block|flat|apartment|village|gram|para|mohalla|thana|upazila|union|district)[:\s#\-]*[\u0980-\u09FFa-zA-Z\d\s]{1,40}/i,
  // "No. 12, some street" style
  /\b(?:no|number|নং|নম্বর)[:\s.]*\d+[,\s]+[\u0980-\u09FFa-zA-Z\s]{2,40}/i,
];

// ── Product ───────────────────────────────────────────────────────────────────
// Patterns tried in order; first non-trivial capture wins.
const PRODUCT_PATTERNS: RegExp[] = [
  // "N টা/pcs/ta X" — quantity precedes product (includes romanised "ta"/"ti")
  /\d+\s*(?:টা|টি|পিস|pcs|pieces?|ta|ti)\s+([a-zA-Z\u0980-\u09FF][a-zA-Z\u0980-\u09FF\s]{1,40}?)(?=\s+order\b|\s+korte\b|\s+(?:চাই|নিব|নেব|কিনব|কিনবো|লাগবে|দিন|দাও|দিবেন|পাঠান)(?![a-zA-Zঀ-৿])|\s*[,।]|\s*$)/i,
  // After "order" / "অর্ডার" keyword
  /(?:order|অর্ডার)\s+(?:for\s+)?([a-zA-Z\u0980-\u09FF][a-zA-Z\u0980-\u09FF\s]{1,40}?)(?=\s*\d|\s*টা|\s*টি|\s*pcs|\s*[,।]|\s*$)/i,
  // "X চাই / নিব / নেব / কিনব / লাগবে"
  /([a-zA-Z\u0980-\u09FF][a-zA-Z\u0980-\u09FF\s]{1,40}?)\s+(?:চাই|নিব|নেব|কিনব|কিনবো|লাগবে)(?![a-zA-Zঀ-৿])/,
  // "X দিন / দাও / দিবেন / পাঠান"
  /([a-zA-Z\u0980-\u09FF][a-zA-Z\u0980-\u09FF\s]{1,40}?)\s+(?:দিন|দাও|দিবেন|পাঠান)(?![a-zA-Zঀ-৿])/,
  // "want / need / buy / get [a/an/some] X"
  /(?:want|need|buy|get)\s+(?:to\s+(?:buy|order|purchase|get)\s+)?(?:a\s+|an\s+|some\s+)?([a-zA-Z][a-zA-Z\s]{1,40}?)(?=\s*\d|\s*pcs|\s*[,.]|\s+(?:please|from|for)|\s*$)/i,
];

// ── Main parser ───────────────────────────────────────────────────────────────
export function ruleBasedParse(text: string): ParseResult {
  const lower = text.toLowerCase();
  let confidence = 0;

  // 1. Intent ─────────────────────────────────────────────────────────────────
  let intent: ParseResult['intent'] = 'unknown';

  if (SPAM_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) {
    // Spam: high confidence, skip remaining extraction
    return { intent: 'spam', confidence: 0.9 };
  }

  const isOrder =
    ORDER_KEYWORDS_BN.some((k) => text.includes(k)) ||
    ORDER_KEYWORDS_EN.some((k) => lower.includes(k));

  const isQuestion =
    lower.includes('?') ||
    QUESTION_KEYWORDS_BN.some((k) => text.includes(k)) ||
    QUESTION_KEYWORDS_EN.some((k) => lower.includes(k));

  if (isOrder) {
    intent = 'order';
    confidence += 0.2; // intent found
  } else if (isQuestion) {
    intent = 'question';
    confidence += 0.2; // intent found
  }

  // 2. Phone ──────────────────────────────────────────────────────────────────
  const phoneMatch = text.match(PHONE_REGEX);
  const phone = phoneMatch ? phoneMatch[1] : undefined;
  if (phone) confidence += 0.3;

  // 3. Quantity ───────────────────────────────────────────────────────────────
  let quantity: number | undefined;

  for (const pattern of QUANTITY_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      quantity = parseInt(m[1], 10);
      break;
    }
  }

  // Fallback: bare number 2–999 that is not part of the phone number
  if (!quantity) {
    const stripped = phone ? text.replace(phone, '') : text;
    const m = stripped.match(/\b([2-9]\d{0,2})\b/);
    if (m) quantity = parseInt(m[1], 10);
  }

  // 4. Address ────────────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const fragments: string[] = [];

  for (const pattern of ADDRESS_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const fragment = m[0].trim();
      if (!seen.has(fragment)) {
        seen.add(fragment);
        fragments.push(fragment);
      }
    }
  }

  const address = fragments.length > 0 ? fragments.join(', ') : undefined;
  if (address) confidence += 0.2;

  // 5. Product ────────────────────────────────────────────────────────────────
  let product: string | undefined;

  for (const pattern of PRODUCT_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const candidate = m[1].trim();
      // Reject empty strings, bare digits, or stray punctuation
      if (candidate.length >= 2 && !/^\d+$/.test(candidate)) {
        product = candidate;
        confidence += 0.3;
        break;
      }
    }
  }

  // 6. Clamp ──────────────────────────────────────────────────────────────────
  confidence = Math.min(confidence, 1);

  return { intent, product, quantity, phone, address, confidence };
}
