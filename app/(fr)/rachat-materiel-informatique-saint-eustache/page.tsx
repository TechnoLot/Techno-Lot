import LocalPage from "@/components/pages/local/LocalPage";
import { getLocalPage } from "@/lib/seo/local-pages";
import { pageMetadata } from "@/lib/seo/metadata";

const page = getLocalPage("saint-eustache", "fr");

export const metadata = pageMetadata({
  locale: "fr",
  frPath: page.frPath,
  title: page.service.name,
  description: page.service.description,
});

export default function Page() {
  return <LocalPage id="saint-eustache" locale="fr" />;
}
