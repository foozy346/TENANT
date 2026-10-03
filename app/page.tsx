import React, { FC, Suspense } from "react";

import ListingCard from "@/components/ListingCard";
import LoadMore from "@/components/LoadMore";
import EmptyState from "@/components/EmptyState";

import { getListings } from "@/services/listing";
import { getFavorites } from "@/services/favorite";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams?: { [key: string]: string | undefined };
}

const Home: FC<HomeProps> = async ({ searchParams }) => {
  const { listings, nextCursor } = await getListings(searchParams);
  const favorites = await getFavorites();

  if (!listings || listings.length === 0) {
    return (
      <EmptyState
        title="No Listings found"
        subtitle="Looks like you have no properties."
      />
    );
  }

  return (
    <section className="main-container grid grid-cols-1 gap-5 pt-16 sm:grid-cols-2 md:grid-cols-3 lg:gap-8 lg:grid-cols-4">
      {listings.map((listing) => {
        const hasFavorited = favorites.includes(listing.id);
        return (
          <ListingCard
            key={listing.id}
            data={listing}
            hasFavorited={hasFavorited}
          />
        );
      })}
      {nextCursor ? (
        <Suspense fallback={<></>}>
          <LoadMore
            nextCursor={nextCursor}
            fnArgs={searchParams}
            queryFn={getListings}
            queryKey={["listings", searchParams]}
            favorites={favorites}
          />
        </Suspense>
      ) : null}
    </section>
  );
};

export default Home;
