"use client"

import { createContext, useContext, type ReactNode } from "react"

// Server-fetched-once data shared by every page via the route-group layout,
// so Navbar and SideAdsFrame don't each do their own client-side fetch (which
// was the "flash + late-loading on every refresh" complaint — every page hit
// /api/categories and /api/side-banners fresh, after hydration, every time).
type NavData = {
  categories: any[] | null
  sideBannersActive: Record<string, any> | null
}

const NavDataContext = createContext<NavData>({ categories: null, sideBannersActive: null })

export function NavDataProvider({
  categories,
  sideBannersActive,
  children,
}: NavData & { children: ReactNode }) {
  return (
    <NavDataContext.Provider value={{ categories, sideBannersActive }}>
      {children}
    </NavDataContext.Provider>
  )
}

export function useNavData() {
  return useContext(NavDataContext)
}
