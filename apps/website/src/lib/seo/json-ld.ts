import { SITE_URL } from "./site";

// Pages that describe their own Service/Article point back here by @id.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const organization = {
  "@type": ["Organization", "LocalBusiness"],
  "@id": ORGANIZATION_ID,
  name: "Manna One Solution",
  alternateName: "MannaOS",
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.png`,
  telephone: "+13468524454",
  email: "Chris@mannaos.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Bellaire Blvd",
    addressLocality: "Houston",
    addressRegion: "TX",
    postalCode: "77036",
    addressCountry: "US",
  },
  sameAs: ["https://facebook.com/mannaonesolution"],
  // Online, nationwide (owner decision 2026-10-15). Insurance stays
  // Texas-only and immigration depends on state registration rules; both
  // are stated on their own pages.
  areaServed: { "@type": "Country", name: "United States" },
  knowsLanguage: ["vi", "en"],
};

const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Manna One Solution",
  url: SITE_URL,
  inLanguage: ["vi", "en"],
  publisher: { "@id": ORGANIZATION_ID },
};

export const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [organization, website] as Array<Record<string, unknown>>,
};
