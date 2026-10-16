import { SITE_URL } from "./site";

// /llms.txt (llmstxt.org): a plain-markdown map of the site for AI tools.
// Google Search ignores it; ChatGPT/Perplexity-style agents may read it.
// Keep it factual and in step with the pages it links: no prices (they are
// hidden on the site), and never name the EB-3 white-label partner.
export function buildLlmsTxt(): string {
  const en = (path: string) => `${SITE_URL}/en${path}`;
  const vi = (path: string) => `${SITE_URL}/vi${path}`;

  return `# Manna One Solution

> Manna One Solution (MannaOS) is a bilingual Vietnamese–English service business based in Houston, Texas. It works with clients online across the United States on USCIS immigration forms, taxes and small-business setup, and AI automation, and offers insurance to Texas residents. It also runs N400 Ready, a practice app for the U.S. citizenship interview.

- Languages: Vietnamese and English.
- Office: Bellaire Blvd, Houston, TX 77036. Phone: +1 346-852-4454. Email: Chris@mannaos.com.
- Service area: online, nationwide. Insurance is for Texas residents only (Texas-licensed agent, NPN 21024561).
- Manna One Solution is not a law firm and its staff are not attorneys. It prepares USCIS forms at the client's direction and does not give legal advice. Some states require non-attorney immigration document preparers to register with the state, so MannaOS confirms the client's state before accepting an immigration case. Cases with prior denials, criminal history or removal proceedings belong with a licensed immigration attorney.

## Services

- [Immigration document preparation](${en("/services/immigration")}): USCIS forms such as the N-400 citizenship application and green card forms, prepared online in Vietnamese or English.
- [EB-3 Other Workers green card](${en("/services/immigration/eb3")}): free eligibility check for the EB-3 unskilled-worker path, for applicants in Vietnam or already in the U.S.; legal filings are handled by licensed U.S. immigration attorneys.
- [Tax & business](${en("/services/tax")}): tax preparation, extension filing, LLC setup and business registration.
- [AI & automation](${en("/services/ai")}): workflow automation and AI tools for small businesses.
- [Insurance & finance](${en("/services/insurance")}): life insurance, annuities and retirement planning for Texas residents.

## Tools

- [N400 Ready](${SITE_URL}/n400ready): bilingual practice for the U.S. naturalization interview: the 2025 civics test (128 questions), speaking and writing practice, and full mock interviews.

## Tiếng Việt

- [Trang chủ](${vi("")})
- [Dịch vụ di trú](${vi("/services/immigration")})
- [Định cư Mỹ diện EB-3](${vi("/services/immigration/eb3")})
- [Thuế & doanh nghiệp](${vi("/services/tax")})
- [Bài viết: quốc tịch, di trú, thuế](${vi("/blog")})
- [Liên hệ](${vi("/contact")})

## Optional

- [About](${en("/about")})
- [Contact](${en("/contact")})
- [Privacy policy](${en("/privacy-policy")})
`;
}
