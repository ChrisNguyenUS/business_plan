# Schema Markup Library

Ready-to-use JSON-LD schema templates. All schema goes inside a `<script>` tag
in the `<head>` of the page. Use the correct type for each page.

Schema markup is the primary technical bridge between SEO and GEO. The FAQPage
schema in particular is the most commonly extracted format by Google AI Overview.

---

## Table of Contents
1. Organization (all sites)
2. LocalBusiness (local service businesses)
3. Article / BlogPosting (content pages)
4. FAQPage (all content pages — highest GEO impact)
5. Product + Offer (e-commerce)
6. BreadcrumbList (all pages except homepage)
7. Person (personal brand, author pages)
8. ProfessionalService (licensed professionals)
9. HowTo (instructional content)
10. SoftwareApplication (SaaS / apps)
11. Event (time-based events)
12. VideoObject (video embeds)
13. Speakable (voice search + AI extraction)
14. Combining multiple schemas on one page

---

## 1. Organization

Use on: Every page (in site-wide header or layout file).

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Business Name",
  "url": "https://yoursite.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://yoursite.com/logo.png",
    "width": 300,
    "height": 100
  },
  "description": "One sentence describing what your business does.",
  "telephone": "+1-713-555-0100",
  "email": "contact@yoursite.com",
  "sameAs": [
    "https://www.facebook.com/yourbusiness",
    "https://www.linkedin.com/company/yourbusiness",
    "https://twitter.com/yourbusiness"
  ]
}
</script>
```

---

## 2. LocalBusiness

Use on: Homepage + all location/service pages for businesses with a physical location
or service area. Replaces or extends Organization.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Your Business Name",
  "image": "https://yoursite.com/storefront.jpg",
  "url": "https://yoursite.com",
  "telephone": "+1-713-555-0100",
  "email": "contact@yoursite.com",
  "priceRange": "$$",
  "description": "What you do and who you serve.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street, Suite 400",
    "addressLocality": "Houston",
    "addressRegion": "TX",
    "postalCode": "77002",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 29.7604,
    "longitude": -95.3698
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "10:00",
      "closes": "14:00"
    }
  ],
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": 29.7604,
      "longitude": -95.3698
    },
    "geoRadius": "50000"
  },
  "sameAs": [
    "https://www.facebook.com/yourbusiness",
    "https://g.page/yourbusiness"
  ]
}
</script>
```

**For service-area businesses without a storefront** (set "hasMap" to false, omit address streetAddress):
```json
"areaServed": ["Houston, TX", "Sugar Land, TX", "Stafford, TX", "Pearland, TX"]
```

---

## 3. Article / BlogPosting

Use on: All blog posts, guides, news articles, case studies.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Your Exact H1 Heading Here",
  "description": "Same as your meta description.",
  "image": {
    "@type": "ImageObject",
    "url": "https://yoursite.com/images/article-hero.jpg",
    "width": 1200,
    "height": 630
  },
  "author": {
    "@type": "Person",
    "name": "Author Full Name",
    "url": "https://yoursite.com/about/",
    "jobTitle": "Your Title or Credential"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Business Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yoursite.com/logo.png"
    }
  },
  "datePublished": "2026-01-15",
  "dateModified": "2026-03-01",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://yoursite.com/blog/article-slug/"
  }
}
</script>
```

---

## 4. FAQPage ⭐ Highest GEO Impact

Use on: Every content page that has a FAQ section. This is the schema type most
commonly extracted by Google AI Overview and AI answer engines.

Structure your page with a visible FAQ section (real H2/H3 + answers), then mark
it up with this schema. The questions and answers in the schema must match what is
actually on the page.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is [your service/product]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Direct, specific answer in 2–4 sentences. Include concrete facts, numbers, or locations. Avoid vague language."
      }
    },
    {
      "@type": "Question",
      "name": "How much does [your service/product] cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Specific pricing information. Example: Services start at $X for basic and $Y for comprehensive packages. Free consultations available."
      }
    },
    {
      "@type": "Question",
      "name": "Where is [your business] located?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Serving Houston, TX and surrounding areas including Sugar Land, Stafford, and Pearland. Virtual appointments available nationwide."
      }
    },
    {
      "@type": "Question",
      "name": "How do I get started with [your service]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Call us at [phone], message us on Facebook at [link], or complete the contact form. We respond within 24 hours on business days."
      }
    }
  ]
}
</script>
```

**GEO writing rule for FAQ answers:**
Every answer must contain at least one of: a specific number, a location name, a time
frame, a price, or a measurable fact. Vague answers are never cited by AI systems.

---

## 5. Product + Offer

Use on: Individual product pages in e-commerce or service package pages.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product or Service Name",
  "description": "What this product/service is and who it's for.",
  "image": "https://yoursite.com/images/product.jpg",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "sku": "SKU-001",
  "offers": {
    "@type": "Offer",
    "url": "https://yoursite.com/products/product-name/",
    "priceCurrency": "USD",
    "price": "99.00",
    "priceValidUntil": "2027-12-31",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Your Business Name"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "47"
  }
}
</script>
```

---

## 6. BreadcrumbList

Use on: Every page except the homepage. Helps Google understand site hierarchy.
Also appears visually in search results as "Home > Category > Page".

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://yoursite.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Services",
      "item": "https://yoursite.com/services/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Tax Preparation",
      "item": "https://yoursite.com/services/tax-preparation/"
    }
  ]
}
</script>
```

---

## 7. Person

Use on: About page, author bio pages, personal brand sites.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Your Full Name",
  "url": "https://yoursite.com/about/",
  "image": "https://yoursite.com/images/headshot.jpg",
  "jobTitle": "Your Title",
  "description": "One paragraph bio — credentials, experience, what you do.",
  "telephone": "+1-713-555-0100",
  "email": "you@yoursite.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Houston",
    "addressRegion": "TX",
    "addressCountry": "US"
  },
  "sameAs": [
    "https://www.linkedin.com/in/yourprofile",
    "https://www.facebook.com/yourprofile"
  ],
  "knowsAbout": [
    "Tax Preparation",
    "Life Insurance",
    "Immigration Document Preparation",
    "Business Automation"
  ]
}
</script>
```

---

## 8. ProfessionalService

Use on: Licensed professionals — tax preparers, insurance agents, lawyers, accountants.
Extends LocalBusiness with credential information.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Business Name",
  "description": "What licensed services you provide.",
  "url": "https://yoursite.com",
  "telephone": "+1-713-555-0100",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Houston",
    "addressRegion": "TX",
    "addressCountry": "US"
  },
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "license",
      "name": "PTIN — IRS Preparer Tax Identification Number"
    },
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "license",
      "name": "Texas Life Insurance License"
    }
  ],
  "serviceType": [
    "Tax Preparation",
    "Life Insurance",
    "Property and Casualty Insurance"
  ]
}
</script>
```

---

## 9. HowTo

Use on: Step-by-step instructional articles ("How to file your taxes", "How to apply for a green card").

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to [Do the Thing]",
  "description": "What this guide helps the reader accomplish.",
  "totalTime": "PT30M",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Step 1 Name",
      "text": "Full explanation of what to do in step 1. Be specific."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Step 2 Name",
      "text": "Full explanation of what to do in step 2."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Step 3 Name",
      "text": "Full explanation of what to do in step 3."
    }
  ]
}
</script>
```

---

## 10. SoftwareApplication

Use on: App landing pages, SaaS product pages.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "App Name",
  "operatingSystem": "Web, iOS, Android",
  "applicationCategory": "BusinessApplication",
  "description": "What the app does and who it's for.",
  "url": "https://yourapp.com",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "ratingCount": "200"
  }
}
</script>
```

---

## 11. Event

Use on: Webinar pages, workshop pages, live events.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Event Name",
  "startDate": "2026-04-15T18:00:00-05:00",
  "endDate": "2026-04-15T20:00:00-05:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "location": {
    "@type": "VirtualLocation",
    "url": "https://yoursite.com/webinar-link"
  },
  "organizer": {
    "@type": "Organization",
    "name": "Your Business Name",
    "url": "https://yoursite.com"
  },
  "description": "What this event is about and what attendees will learn.",
  "offers": {
    "@type": "Offer",
    "url": "https://yoursite.com/register",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

---

## 12. VideoObject

Use on: Any page embedding a YouTube video or hosting a video. Helps the video appear
in Google video search results and increases GEO citation potential for video content.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Video Title Here",
  "description": "What this video is about — same as the video's meta description.",
  "thumbnailUrl": "https://yoursite.com/images/video-thumbnail.jpg",
  "uploadDate": "2026-01-15",
  "duration": "PT5M30S",
  "contentUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "embedUrl": "https://www.youtube.com/embed/VIDEO_ID",
  "publisher": {
    "@type": "Organization",
    "name": "Your Business Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yoursite.com/logo.png"
    }
  }
}
</script>
```

**Duration format:** ISO 8601 — PT[hours]H[minutes]M[seconds]S
- 5 minutes 30 seconds = `PT5M30S`
- 1 hour 20 minutes = `PT1H20M`

**GEO note:** Videos with VideoObject schema and transcripts (add as text content below
the embed) are more likely to be cited by AI systems, because the transcript gives the
AI extractable text content alongside the video entity.

---

## 13. Speakable — Voice Search + AI Extraction

Use on: Pages with key definitions, FAQ answers, or summary paragraphs that are ideal
for voice assistants (Google Assistant, Siri) and AI extraction systems to read aloud
or cite. This schema tells search engines which parts of the page are most suitable
for text-to-speech and AI citation.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Title Here",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".page-summary", ".faq-answer", ".key-definition"]
  },
  "url": "https://yoursite.com/page-url/"
}
</script>
```

**How to choose speakable sections:**
- Page summary paragraphs (opening paragraph with the direct answer)
- FAQ answer blocks (the answer text, not the question)
- Key definitions (first paragraph under "What is [term]?" headings)
- Keep each speakable section under 200 words for best results

**CSS class approach:**
Add a CSS class (e.g., `speakable-content`) to the HTML elements you want marked:
```html
<p class="page-summary speakable-content">
  Tax preparation in Houston costs $60–$180 for personal returns...
</p>
```
Then reference it in the schema: `"cssSelector": [".speakable-content"]`

**GEO benefit:** Speakable markup helps AI systems identify exactly which part of your
page to extract and cite, increasing the precision and likelihood of citation.

---

## 13. Combining Multiple Schemas on One Page

Many pages need more than one schema type. Use a JSON-LD array or separate script tags.

**Example: Blog post page with FAQ section**
```html
<!-- Schema 1: Article -->
<script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "Article", ... }
</script>

<!-- Schema 2: FAQ -->
<script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "FAQPage", ... }
</script>

<!-- Schema 3: Breadcrumb -->
<script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "BreadcrumbList", ... }
</script>
```

Multiple separate `<script>` tags is perfectly valid and preferred for readability.

**Validation:** Always validate schema at https://validator.schema.org before deploying.
