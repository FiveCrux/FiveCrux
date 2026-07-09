import { ReactNode } from 'react';
import { NavDataProvider } from '@/componentss/shared/nav-data-context';
import { getSharedNavData } from '@/lib/nav-data-server';

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const { categories, sideBannersActive } = await getSharedNavData();
  return (
    <NavDataProvider categories={categories} sideBannersActive={sideBannersActive}>
      {children}
    </NavDataProvider>
  );
}









