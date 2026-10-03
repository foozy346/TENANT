"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { LISTINGS_BATCH } from "@/utils/constants";
import { getCurrentUser } from "./user";
import { getPricePeriod } from "@/utils/helper";

export const getListings = async (query?: {
  [key: string]: string | string[] | undefined | null;
}) => {
  try {
    const {
      userId,
      roomCount,
      guestCount,
      bathroomCount,
      country,
      startDate,
      endDate,
      category,
      cursor,
    } = query || {};

    let where: any = {
      OR: [{ isHidden: false }, { isHidden: null }],
    };

    if (userId) {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.id !== userId) {
        return { listings: [], nextCursor: null };
      }
      where.userId = currentUser.id;
    }

    if (category) {
      where.category = category;
    }

    if (roomCount) {
      where.roomCount = {
        gte: +roomCount,
      };
    }

    if (guestCount) {
      where.guestCount = {
        gte: +guestCount,
      };
    }

    if (bathroomCount) {
      where.bathroomCount = {
        gte: +bathroomCount,
      };
    }

    if (country) {
      where.country = country;
    }

    if (startDate && endDate) {
      where.NOT = {
        reservations: {
          some: {
              AND: [
                {
                  OR: [
                    { status: "pending" },
                    { status: "accepted" },
                    { status: null },
                  ],
                },
                {
                  OR: [
                    {
                      endDate: { gte: startDate },
                      startDate: { lte: startDate },
                    },
                    {
                      startDate: { lte: endDate },
                      endDate: { gte: endDate },
                    },
                  ],
                },
              ],
          },
        },
      };
    }

    const filterQuery: any = {
      where,
      take: LISTINGS_BATCH,
      orderBy: { createdAt: "desc" },
    };

    if (cursor) {
      filterQuery.cursor = { id: cursor };
      filterQuery.skip = 1;
    }

    const listings = await db.listing.findMany(filterQuery);

    const nextCursor =
      listings.length === LISTINGS_BATCH
        ? listings[LISTINGS_BATCH - 1].id
        : null;

    return {
      listings,
      nextCursor,
    };
  } catch (error) {
    return {
      listings: [],
      nextCursor: null,
    };
  }
};

export const getListingById = async (id: string) => {
  const listing = await db.listing.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
      reservations: {
        where: {
          OR: [
            { status: "pending" },
            { status: "accepted" },
            { status: null },
          ],
        },
        select: {
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!listing) return null;

  if (listing.isHidden) {
    const currentUser = await getCurrentUser();
    if (currentUser?.id !== listing.userId) return null;
  }

  return listing;
};

const normalizeListingInput = (data: Record<string, any>) => {
  const {
    category,
    location,
    guestCount,
    bathroomCount,
    roomCount,
    image: imageSrc,
    imageUrls: uploadedImageUrls,
    price,
    pricePeriod,
    priceType,
    depositAmount = 0,
    furnished = false,
    status = "available",
    isHidden = false,
    title,
    description,
  } = data;

  if (!location || typeof location !== "object") {
    throw new Error("Choose a location and pin it on the map.");
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof category !== "string" ||
    !category.trim()
  ) {
    throw new Error("Title, description, and category are required.");
  }

  const validCount = (value: unknown) =>
    Number.isInteger(Number(value)) && Number(value) > 0;
  if (![guestCount, roomCount, bathroomCount].every(validCount)) {
    throw new Error(
      "Guest, room, and bathroom counts must be positive whole numbers."
    );
  }

  const parsedPrice = Number(price);
  const parsedDeposit = Number(depositAmount);
  if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
    throw new Error("Enter a valid price.");
  }
  if (!Number.isInteger(parsedDeposit) || parsedDeposit < 0) {
    throw new Error("Enter a valid deposit amount.");
  }
  if (typeof furnished !== "boolean") {
    throw new Error("Choose whether the place is furnished.");
  }
  if (!["available", "reserved", "rented"].includes(status)) {
    throw new Error("Choose a valid listing status.");
  }
  if (typeof isHidden !== "boolean") {
    throw new Error("Choose whether the listing is visible.");
  }
  const normalizedPeriod = getPricePeriod(pricePeriod, priceType);

  const latlng = location.latlng;
  if (
    !Array.isArray(latlng) ||
    latlng.length !== 2 ||
    !latlng.every((coordinate: unknown) => Number.isFinite(Number(coordinate)))
  ) {
    throw new Error("Pin the location on the map.");
  }

  const imageUrls =
    Array.isArray(uploadedImageUrls) && uploadedImageUrls.length
      ? uploadedImageUrls
      : [imageSrc];
  if (
    typeof imageSrc !== "string" ||
    imageUrls.length > 10 ||
    !imageUrls.every(
      (url: unknown) => typeof url === "string" && url.startsWith("https://")
    ) ||
    !imageUrls.includes(imageSrc)
  ) {
    throw new Error("Choose a main photo from the uploaded photos (up to 10).");
  }

  return {
    title: title.trim(),
    description: description.trim(),
    imageSrc,
    imageUrls,
    category,
    roomCount: Number(roomCount),
    bathroomCount: Number(bathroomCount),
    guestCount: Number(guestCount),
    country: location.label,
    region: location.region,
    latlng: latlng.map(Number),
    price: parsedPrice,
    pricePeriod: normalizedPeriod,
    priceType:
      normalizedPeriod === "monthly" || normalizedPeriod === "nightly"
        ? normalizedPeriod
        : null,
    depositAmount: parsedDeposit,
    furnished,
    status,
    isHidden,
  };
};

export const createListing = async (data: Record<string, any>) => {
  const listingData = normalizeListingInput(data);
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized!");

  const listing = await db.listing.create({
    data: {
      ...listingData,
      status: "available",
      isHidden: false,
      userId: user.id,
    },
  });

  return listing;
};

export const updateListing = async (
  listingId: string,
  data: Record<string, any>
) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized!");
  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid listing ID.");
  }

  const listingData = normalizeListingInput(data);
  const result = await db.listing.updateMany({
    where: { id: listingId, userId: user.id },
    data: listingData,
  });
  if (!result.count) throw new Error("Listing not found or access denied.");

  await Promise.all([
    revalidatePath(`/listings/${listingId}`),
    revalidatePath("/dashboard"),
    revalidatePath("/"),
  ]);

  return db.listing.findUnique({ where: { id: listingId } });
};
