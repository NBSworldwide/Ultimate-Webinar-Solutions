import type { Metadata } from "next";
import { StorePolicyPage } from "@/components/store-policy-page";
import { getSiteSettings, siteAddressLines, siteContactEmail } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the site collects, uses, and protects customer and attendee information.",
};

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const settings = await getSiteSettings();
  const brandName = settings.displayName || "Webinar Studio";
  const contactEmail = siteContactEmail(settings);
  const address = siteAddressLines(settings).join(", ");

  return (
    <StorePolicyPage
      eyebrow="Privacy & compliance"
      title="Privacy Policy"
      intro={`This Privacy Policy explains how ${brandName} collects, uses, and protects information provided through this website, webinar registration forms, customer accounts, and product orders.`}
      sections={[
        {
          heading: "Information we collect",
          body: `${brandName} may collect information that visitors and customers provide directly, including name, email address, phone number, account details, webinar registration details, order and shipping information, and communication preferences. We use this information to provide requested sessions and products, operate customer accounts, process orders, provide support, and maintain security and delivery records.`,
        },
        {
          heading: "Webinar and product communications",
          body: `Customers can choose whether to receive transactional SMS notifications during registration. Those notifications may include a registration confirmation, an upcoming-session reminder, or a winner notification after an optional drawing. SMS consent is optional and is not required to browse the site or complete a purchase. Email and account communications may be used to deliver the service requested by the customer.`,
        },
        {
          heading: "SMS privacy statement",
          body: "We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes. SMS consent records are used to honor the communication choice made by the customer and to deliver the transactional notifications described at registration. Recipients can reply STOP to opt out or HELP for assistance.",
        },
        {
          heading: "Data choices and contact",
          body: `You may contact ${brandName} to ask about your account information, communication preferences, or a request related to your personal information.${contactEmail ? ` Contact: ${contactEmail}.` : " Use the support contact published on this website."}${address ? ` Mailing address: ${address}.` : ""}`,
        },
      ]}
    />
  );
}
