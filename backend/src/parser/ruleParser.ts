export interface ParseResult {
  intent: 'order' | 'question' | 'spam' | 'unknown';
  product?: string;
  quantity?: number;
  phone?: string;
  address?: string;
  confidence: number;
}

// Bangladesh phone: 01[3-9] followed by 8 digits
const PHONE_REGEX = /\b(01[3-9]\d{8})\b/;

// Common quantity patterns in Bangla/English
const QUANTITY_PATTERNS = [
  /(\d+)\s*(?:টা|টি|পিস|pcs|pieces?|units?|nos?)/i,
  /(\d+)\s+(?:ta|ti|piece|unit|no)/i,
  /(?:qty|quantity|পরিমাণ)[:\s]+(\d+)/i,
];

// Intent keywords
const ORDER_KEYWORDS_BN = ['অর্ডার', 'নিব', 'নেব', 'চাই', 'দিন', 'পাঠান', 'কিনব', 'কিনবো'];
const ORDER_KEYWORDS_EN = ['order', 'want', 'need', 'buy', 'purchase', 'send', 'deliver'];
const QUESTION_KEYWORDS = ['price', 'দাম', 'কত', 'how much', 'available', 'আছে', '?'];
const SPAM_KEYWORDS = ['spam', 'advertisement', 'বিজ্ঞাপন'];

// Address fragments in Bangla/English
const ADDRESS_PATTERNS = [
  /ঢাকা|চট্টগ্রাম|সিলেট|রাজশাহী|খুলনা|বরিশাল|ময়মনসিংহ|রংপুর/,
  /(?:house|road|sector|block|flat|village|gram|গ্রাম|বাড়ি|রোড)[:\s#\d]+/i,
  /(?:dhaka|chittagong|sylhet|rajshahi|khulna|barishal|mymensingh|rangpur)/i,
  /thana|upazila|union|district|jela|থানা|উপজেলা|জেলা/i,
];

export function ruleBasedParse(text: string): ParseResult {
  const lower = text.toLowerCase();
  let confidence = 0;

  // Detect intent
  let intent: ParseResult['intent'] = 'unknown';

  if (SPAM_KEYWORDS.some((k) => lower.includes(k))) {
    return { intent: 'spam', confidence: 0.9 };
  }

  if (QUESTION_KEYWORDS.some((k) => lower.includes(k))) {
    intent = 'question';
  }

  if (
    ORDER_KEYWORDS_BN.some((k) => text.includes(k)) ||
    ORDER_KEYWORDS_EN.some((k) => lower.includes(k))
  ) {
    intent = 'order';
    confidence += 0.2;
  }

  // Extract phone
  const phoneMatch = text.match(PHONE_REGEX);
  const phone = phoneMatch ? phoneMatch[1] : undefined;
  if (phone) confidence += 0.3;

  // Extract quantity
  let quantity: number | undefined;
  for (const pattern of QUANTITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      quantity = parseInt(match[1], 10);
      break;
    }
  }

  // Extract address
  let address: string | undefined;
  for (const pattern of ADDRESS_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      address = match[0];
      confidence += 0.2;
      break;
    }
  }

  // Extract product (heuristic: noun phrase before order keyword or quantity)
  let product: string | undefined;
  const productPatterns = [
    /(?:order|অর্ডার)\s+(?:for\s+)?([a-zA-Z\u0980-\u09FF\s]{2,30}?)(?:\s*\d|\s*টা|\s*$)/i,
    /([a-zA-Z\u0980-\u09FF]{3,20}(?:\s+[a-zA-Z\u0980-\u09FF]{2,20})?)\s+(?:চাই|নিব|want|need|order)/i,
  ];
  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match) {
      product = match[1].trim();
      confidence += 0.3;
      break;
    }
  }

  // Clamp confidence
  confidence = Math.min(confidence, 1);

  return { intent, product, quantity, phone, address, confidence };
}
