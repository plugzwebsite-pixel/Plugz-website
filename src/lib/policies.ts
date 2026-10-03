/**
 * The Privacy Policy and Cookie Policy, as supplied by the client.
 *
 * Kept as data rather than markup so the wording can be updated without
 * touching the page layout. Each section is a heading followed by blocks: a
 * paragraph, a subheading, or a bulleted list.
 */

export type PolicyBlock = string | { subheading: string } | { list: string[] };
export type PolicySection = { heading: string; blocks: PolicyBlock[] };

/** Shown at the top of both policies. Update when the wording changes. */
export const POLICY_EFFECTIVE_DATE = "3 October 2026";

export const POLICY_CONTACT_EMAIL = "hello@pluggzofficial.co.uk";

export const PRIVACY_POLICY: PolicySection[] = [
  {
    heading: "1. Who We Are",
    blocks: [
      "Pluggz is operated by CEO Live Ltd. This Privacy Policy explains how we collect, use, store and protect your personal information when you use the Pluggz website and services.",
    ],
  },
  {
    heading: "2. Information We Collect",
    blocks: [
      "We may collect your name, email address, telephone number, username, social media handles, account information, creator profile information, brand information, IP address, device information and analytics data.",
    ],
  },
  {
    heading: "3. How We Use Your Information",
    blocks: [
      "We use your information to create and manage accounts, provide our services, process applications, operate the affiliate platform, improve our services, communicate with you, prevent fraud and comply with legal obligations.",
    ],
  },
  {
    heading: "4. Affiliate Tracking",
    blocks: [
      "Pluggz operates an affiliate marketing platform and may use cookies and tracking technologies to attribute clicks, referrals and qualifying purchases.",
    ],
  },
  {
    heading: "5. Sharing Information",
    blocks: [
      "We may share information with brands you interact with, payment providers, hosting providers, analytics providers, professional advisers and regulators where required by law. We do not sell your personal information.",
    ],
  },
  {
    heading: "6. Cookies",
    blocks: [
      "We use cookies to improve website functionality, remember your preferences, analyse website traffic and support affiliate tracking. You can manage cookies through your browser settings. Full details are set out in our Cookie Policy.",
    ],
  },
  {
    heading: "7. Data Security",
    blocks: [
      "We implement reasonable technical and organisational measures to protect your information from unauthorised access, loss or misuse.",
    ],
  },
  {
    heading: "8. Data Retention",
    blocks: [
      "We retain personal information only for as long as necessary to provide our services, meet legal obligations and resolve disputes.",
    ],
  },
  {
    heading: "9. Your Rights",
    blocks: [
      "Subject to applicable law, you may request access to your personal information, correction, deletion, restriction of processing, object to processing, withdraw consent where applicable and request a copy of your data.",
    ],
  },
  {
    heading: "10. Third-Party Websites",
    blocks: [
      "When you leave Pluggz to visit a brand website, that website's own privacy policy applies.",
    ],
  },
  {
    heading: "11. Children's Privacy",
    blocks: ["Pluggz is not intended for children under 18."],
  },
  {
    heading: "12. Changes",
    blocks: [
      "We may update this Privacy Policy from time to time. The latest version will always be published on the Pluggz website.",
    ],
  },
];

export const COOKIE_POLICY: PolicySection[] = [
  {
    heading: "1. Introduction",
    blocks: [
      "This Cookie Policy explains how Pluggz, operated by CEO Live Ltd, uses cookies and similar technologies when you visit our website or use our services.",
      "By continuing to use Pluggz, you consent to our use of cookies in accordance with this Cookie Policy, unless you disable them through your browser or cookie preferences.",
    ],
  },
  {
    heading: "2. What Are Cookies?",
    blocks: [
      "Cookies are small text files placed on your device when you visit a website. They help websites function correctly, improve user experience and provide analytical information.",
    ],
  },
  {
    heading: "3. Types of Cookies We Use",
    blocks: [
      { subheading: "Essential Cookies" },
      "These cookies are necessary for the operation of the Pluggz platform. They enable features such as:",
      {
        list: [
          "Logging into your account",
          "Keeping you signed in",
          "Security and fraud prevention",
          "Website functionality",
        ],
      },
      "These cookies cannot be switched off.",
      { subheading: "Performance and Analytics Cookies" },
      "These cookies help us understand how visitors use our website. Examples include:",
      {
        list: [
          "Number of visitors",
          "Popular pages",
          "Time spent on pages",
          "Device and browser information",
          "Website performance",
        ],
      },
      { subheading: "Functionality Cookies" },
      "These cookies remember your preferences, such as:",
      {
        list: [
          "Login details",
          "Language preferences",
          "User settings",
          "Recently viewed content",
        ],
      },
      { subheading: "Affiliate Tracking Cookies" },
      "As Pluggz operates an affiliate marketing platform, affiliate tracking cookies may be used to:",
      {
        list: [
          "Track clicks on affiliate links",
          "Attribute qualifying purchases",
          "Calculate creator commissions",
          "Calculate Pluggz commission",
          "Measure campaign performance",
        ],
      },
      "These cookies do not increase the price you pay for products.",
      { subheading: "Marketing Cookies" },
      "Marketing cookies may be used to:",
      {
        list: [
          "Show relevant advertisements",
          "Measure advertising effectiveness",
          "Personalise marketing content",
        ],
      },
    ],
  },
  {
    heading: "4. Third-Party Cookies",
    blocks: [
      "Some cookies may be placed by trusted third parties, including:",
      {
        list: [
          "Google Analytics",
          "Cloudflare",
          "Payment providers",
          "Affiliate partners",
          "Social media platforms",
          "Advertising providers",
        ],
      },
      "These third parties have their own privacy and cookie policies.",
    ],
  },
  {
    heading: "5. Managing Cookies",
    blocks: [
      "You can control or disable cookies through your browser settings, or change your choice at any time using the Cookie settings link at the foot of every page.",
      "Please note that disabling essential cookies may affect the functionality of the Pluggz platform.",
    ],
  },
  {
    heading: "6. Changes to This Cookie Policy",
    blocks: [
      "We may update this Cookie Policy from time to time. The latest version will always be published on the Pluggz website.",
    ],
  },
];
