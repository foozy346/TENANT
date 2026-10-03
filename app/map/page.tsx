import EmptyState from "@/components/EmptyState";
import { db } from "@/lib/db";
import MapClient from "./MapClient";

export const dynamic = "force-dynamic";

const ApartmentMapPage = async () => {
  const listings = await db.listing.findMany({
    where: {
      category: "Apartments",
      OR: [{ isHidden: false }, { isHidden: null }],
    },
    select: {
      id: true,
      title: true,
      imageSrc: true,
      price: true,
      pricePeriod: true,
      priceType: true,
      country: true,
      region: true,
      latlng: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedListings = listings.filter(
    (listing) =>
      listing.latlng.length === 2 && listing.latlng.every(Number.isFinite)
  );

  return (
    <section className="main-container flex min-h-[calc(100dvh-6rem)] flex-col pb-4 md:pb-8">
      <header className="mb-4 shrink-0 sm:mb-5">
        <h1 className="break-words text-2xl font-bold text-neutral-900">
          Apartments in Alexandria
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mappedListings.length} places on the map
        </p>
      </header>
      {mappedListings.length ? (
        <div className="h-[calc(100dvh-13.5rem)] min-h-[18rem] overflow-hidden rounded-lg border border-neutral-200">
          <MapClient listings={mappedListings} />
        </div>
      ) : (
        <EmptyState
          title="No mapped apartments yet"
          subtitle="Apartments will appear here once they have saved map coordinates."
        />
      )}
    </section>
  );
};

export default ApartmentMapPage;