import { Card, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/AdminForms";
import { getSettings } from "@/lib/pricing";

export default async function AdminSettings() {
  return (
    <>
      <PageHeader title="Settings" sub="Shipping, tax and payment rules used at checkout" />
      <Card><SettingsForm values={await getSettings()} /></Card>
    </>
  );
}
