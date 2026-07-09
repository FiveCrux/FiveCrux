import { ReactNode } from 'react';
import { NavDataProvider } from '@/componentss/shared/nav-data-context';
import { getSharedNavData } from '@/lib/nav-data-server';

interface PublicLayoutProps {
  children: ReactNode;
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const { categories, sideBannersActive } = await getSharedNavData();
  return (
    <NavDataProvider categories={categories} sideBannersActive={sideBannersActive}>
      {children}
    </NavDataProvider>
  );
}

