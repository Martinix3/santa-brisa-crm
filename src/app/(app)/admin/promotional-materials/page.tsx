import { redirect } from 'next/navigation';

export default function DeprecatedPromotionalMaterialsPage() {
  redirect('/admin/inventory');
  return null;
}
