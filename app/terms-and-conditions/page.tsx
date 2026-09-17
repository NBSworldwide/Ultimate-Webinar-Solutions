import type { Metadata } from "next";
import { StorePolicyPage } from "@/components/store-policy-page";
import { getSiteSettings, siteAddressLines, siteContactEmail } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms for using the site, registering for sessions, receiving notifications, and ordering products.",
};

export const dynamic = "force-dynamic";

export default async function TermsAndConditionsPage() {
  const settings = await getSiteSettings();
  const brandName = settings.displayName || "Webinar Studio";
  const contactEmail = siteContactEmail(settings);
  const address = siteAddressLines(settings).join(", ");

  return (
    <StorePolicyPage
      eyebrow="Customer terms"
      title="Terms & Conditions"
      intro={`These Terms & Conditions describe the general rules for using ${brandName}, registering for webinar sessions, receiving optional text notifications, and purchasing products.`}
      sections={[
        {
          heading: "Using this website",
          body: `By using this website, you agree to use the public pages, customer account, session registration, and product features lawfully and not to interfere with the operation or security of ${brandName}. Specific session, product, payment, shipping, refund, and return terms may also be shown at the point of registration or checkout.`,
        },
        {
          heading: "SMS Terms",
          body: `By checking the optional SMS consent box and submitting your mobile number, you agree to receive transactional text messages from ${brandName} about the webinar session you registered for, such as registration confirmations, upcoming-session reminders, and a winner notification when a drawing is completed. Message frequency varies. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out of SMS messages or HELP for assistance.`,
        },
        {
          heading: "Registration and customer accounts",
          body: "A customer account may be required before a seat can be reserved. Seat availability is confirmed by the server, and a temporary seat hold can expire if registration is not completed within the stated hold period. Customers are responsible for keeping account information current and for protecting their sign-in credentials.",
        },
        {
          heading: "Contact",
          body: `Questions about these terms can be directed to ${brandName}.${contactEmail ? ` Contact: ${contactEmail}.` : " Use the support contact published on this website."}${address ? ` Mailing address: ${address}.` : ""}`,
        },
      ]}
    />
  );
}
