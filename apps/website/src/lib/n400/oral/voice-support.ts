// Decides how a learner can answer by voice on this device. Spec D6, D12, D14 (rev 3.3).

export type VoiceInput = 'mic' | 'typed' | 'none';

// In-app WebViews: the FB iOS WebView allows only the first recognition per
// session (Gate 0), and other in-app browsers are untested, so all of them
// get the typed fallback.
const IN_APP_RE = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Zalo|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview/i;

export function isInAppBrowser(ua: string): boolean {
  return IN_APP_RE.test(ua);
}

export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

export function voiceInputFor(o: {
  ua: string;
  apiPresent: boolean;
  enabled: boolean;
  androidOn: boolean;
}): VoiceInput {
  if (!o.enabled) return 'none';
  if (isInAppBrowser(o.ua)) return 'typed';
  if (!o.apiPresent) return 'none';
  if (isAndroid(o.ua) && !o.androidOn) return 'none';
  return 'mic';
}

/** Per question: voice only when chosen, available here, and gradable (a
 *  location-based question without a resolvable answer stays multiple choice). */
export function effectiveAnswerMode(
  chosen: 'choice' | 'voice',
  input: VoiceInput,
  hasConfig: boolean,
): 'choice' | 'voice' {
  return chosen === 'voice' && input !== 'none' && hasConfig ? 'voice' : 'choice';
}

/** Once a question is answered it keeps the surface it was answered on, even if
 *  flags or support change afterwards (no second grade for the same question). */
export function answerSurface(
  answeredVia: 'choice' | 'voice' | null,
  effective: 'choice' | 'voice',
): 'choice' | 'voice' {
  return answeredVia ?? effective;
}
