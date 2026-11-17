import LandingBento from "@/components/landing/LandingBento";
import DocumentCatalog from "@/components/landing/DocumentCatalog";
import ProcessWorkflow from "@/components/landing/ProcessWorkflow";
import FAQSection from "@/components/landing/FAQSection";

export default function LandingSections({ classic, contained }) {
  return (
    <>
      <LandingBento classic={classic} contained={contained} />
      <ProcessWorkflow classic={classic} />
      <DocumentCatalog classic={classic} />
      <FAQSection classic={classic} />
    </>
  );
}
