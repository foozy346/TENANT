import React from "react";
import Image from "@/components/Image";

import Heading from "@/components/Heading";
import HeartButton from "@/components/HeartButton";
import { getFavorites } from "@/services/favorite";

interface ListingHeadProps {
  title: string;
  country: string | null;
  region: string | null;
  image: string;
  imageUrls?: string[];
  id: string;
}

const ListingHead: React.FC<ListingHeadProps> = async ({
  title,
  country = "",
  region = "",
  image,
  imageUrls = [],
  id,
}) => {
  const favorites = await getFavorites();
  const hasFavorited = favorites.includes(id);
  const galleryImages = Array.from(new Set([image, ...imageUrls]));

  return (
    <>
      <Heading title={title} subtitle={`${region}, ${country}`} backBtn/>
      <div
        className={`w-full md:h-[420px] sm:h-[280px] bg-gray-100 h-[260px] overflow-hidden  rounded-xl relative transition duration-300`}
      >
        <Image imageSrc={image} fill className={`object-cover`} alt={title} sizes="100vw" />
        <div className="absolute top-5 right-5">
          <HeartButton listingId={id} hasFavorited={hasFavorited} />
        </div>
      </div>
      {galleryImages.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {galleryImages.slice(1).map((photo, index) => (
            <div
              key={photo}
              className="relative h-24 w-36 shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:h-28 sm:w-44"
            >
              <Image
                imageSrc={photo}
                fill
                className="object-cover"
                alt={`${title} photo ${index + 2}`}
                sizes="176px"
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ListingHead;
