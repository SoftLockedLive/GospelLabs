import type { Metadata } from "next";
import { Suspense } from "react";
import { MapSkeleton, MapView } from "@/components/study/map/map-view";

export const metadata: Metadata = { title: "Discovery Map" };

/**
 * The Discovery Map is computed in the browser from personal data in
 * IndexedDB, so this is a static shell: the client reads ?node= and renders
 * everything. The map uses a wider frame than other pages.
 */
export default function MapPage() {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-10">
      <Suspense fallback={<MapSkeleton />}>
        <MapView />
      </Suspense>
    </div>
  );
}
