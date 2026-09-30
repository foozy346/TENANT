"use client";

import dynamic from "next/dynamic";
import type { MapListing } from "@/components/Map";

const ApartmentMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-neutral-100 text-sm text-neutral-500">
      Loading map...
    </div>
  ),
});

const MapClient = ({ listings }: { listings: MapListing[] }) => {
  return <ApartmentMap listings={listings} />;
};

export default MapClient;