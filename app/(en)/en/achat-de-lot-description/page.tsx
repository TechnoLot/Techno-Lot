import AchatPage from "@/components/pages/AchatPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/achat-de-lot-description",
  title:
    "What We Buy: Bulk IT and Electronic Equipment",
  description:
    "Computers, servers, networking, storage, telecom, monitors: all the equipment Techno Lot buys from businesses, even partially working.",
  absoluteTitle: true,
});

export default function Page() {
  return <AchatPage locale="en" />;
}
