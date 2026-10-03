"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getPricePeriod } from "@/utils/helper";
import { getCurrentUser } from "./user";

const requireUser = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please sign in to open your dashboard.");
  return user;
};

const revalidateDashboard = async (listingId?: string) => {
  revalidatePath("/dashboard");
  revalidatePath("/trips");
  revalidatePath("/reservations");
  if (listingId) revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
};

const normalizeListing = <T extends {
  pricePeriod?: string | null;
  priceType?: string | null;
  depositAmount?: number | null;
  furnished?: boolean | null;
  status?: string | null;
  isHidden?: boolean | null;
}>(listing: T) => ({
  ...listing,
  pricePeriod: getPricePeriod(listing.pricePeriod, listing.priceType),
  depositAmount: listing.depositAmount ?? 0,
  furnished: listing.furnished ?? false,
  status: listing.status ?? "available",
  isHidden: listing.isHidden ?? false,
});

export const getDashboardData = async () => {
  const sessionUser = await requireUser();
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, image: true, phone: true, favoriteIds: true },
  });
  if (!user) throw new Error("User account not found.");

  const [ownedListings, reservations] = await Promise.all([
    db.listing.findMany({
      where: { userId: user.id },
      include: {
        reservations: {
          orderBy: { startDate: "asc" },
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.reservation.findMany({
      where: { userId: user.id },
      include: { listing: true },
      orderBy: { startDate: "desc" },
    }),
  ]);
  const favoriteListings = user.favoriteIds.length
    ? await db.listing.findMany({
        where: {
          id: { in: user.favoriteIds },
          OR: [{ isHidden: false }, { isHidden: null }],
        },
      })
    : [];

  const listings = ownedListings.map((listing) => ({
    ...normalizeListing(listing),
    reservations: listing.reservations.map((reservation) => ({
      ...reservation,
      status: reservation.status ?? "accepted",
    })),
  }));

  const bookings = reservations.map((reservation) => ({
    ...reservation,
    status: reservation.status ?? "accepted",
    listing: normalizeListing(reservation.listing),
  }));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
    },
    listings,
    bookings,
    favorites: favoriteListings.map(normalizeListing),
    hasListings: listings.length > 0,
  };
};

export const updateProfile = async (input: {
  name: string;
  phone?: string;
  image?: string | null;
}) => {
  const user = await requireUser();
  const parsed = z.object({
    name: z.string().trim().min(1).max(80),
    phone: z
      .string()
      .trim()
      .max(32)
      .regex(/^[+()\d\s-]*$/)
      .optional()
      .default(""),
    image: z.string().url().nullable().optional(),
  }).safeParse(input);
  if (!parsed.success) throw new Error("Enter a valid name, phone number, and profile photo.");

  const data: { name: string; phone: string; image?: string | null } = {
    name: parsed.data.name,
    phone: parsed.data.phone,
  };
  if (parsed.data.image !== undefined) data.image = parsed.data.image;

  const updatedUser = await db.user.update({ where: { id: user.id }, data });
  await revalidateDashboard();
  return { name: updatedUser.name, phone: updatedUser.phone, image: updatedUser.image };
};

export const setListingHidden = async (listingId: string, isHidden: boolean) => {
  const user = await requireUser();
  if (!z.string().min(1).safeParse(listingId).success || typeof isHidden !== "boolean") {
    throw new Error("Invalid listing visibility update.");
  }
  const result = await db.listing.updateMany({
    where: { id: listingId, userId: user.id },
    data: { isHidden },
  });
  if (!result.count) throw new Error("Listing not found or access denied.");
  await revalidateDashboard(listingId);
  return { isHidden };
};

export const setListingStatus = async (
  listingId: string,
  status: "available" | "rented"
) => {
  const user = await requireUser();
  if (!listingId || !["available", "rented"].includes(status)) {
    throw new Error("Invalid listing status.");
  }
  const result = await db.listing.updateMany({
    where: { id: listingId, userId: user.id },
    data: { status },
  });
  if (!result.count) throw new Error("Listing not found or access denied.");
  await revalidateDashboard(listingId);
  return { status };
};

export const deleteOwnedListing = async (listingId: string) => {
  const user = await requireUser();
  if (!listingId) throw new Error("Invalid listing ID.");

  const listing = await db.listing.findFirst({
    where: { id: listingId, userId: user.id },
    select: { id: true },
  });
  if (!listing) throw new Error("Listing not found or access denied.");

  const activeReservation = await db.reservation.findFirst({
    where: {
      listingId,
      endDate: { gt: new Date() },
      OR: [{ status: "pending" }, { status: "accepted" }, { status: null }],
    },
    select: { id: true },
  });
  if (activeReservation) {
    throw new Error("This listing has an active or upcoming booking and cannot be deleted.");
  }

  await db.listing.deleteMany({ where: { id: listingId, userId: user.id } });
  await revalidateDashboard(listingId);
  return { success: true };
};

export const cancelOwnBooking = async (reservationId: string) => {
  const user = await requireUser();
  if (!reservationId) throw new Error("Invalid reservation ID.");

  const reservation = await db.reservation.findFirst({
    where: { id: reservationId, userId: user.id },
  });
  if (!reservation) throw new Error("Reservation not found or access denied.");

  const status = reservation.status ?? "accepted";
  if (status !== "pending" && !(status === "accepted" && reservation.startDate > new Date())) {
    throw new Error("Only pending or upcoming bookings can be cancelled.");
  }

  const result = await db.reservation.updateMany({
    where: { id: reservationId, userId: user.id },
    data: { status: "cancelled" },
  });
  if (!result.count) throw new Error("Reservation could not be cancelled.");
  await revalidateDashboard(reservation.listingId);
  return { status: "cancelled" as const };
};

export const respondToReservation = async (
  reservationId: string,
  status: "accepted" | "rejected"
) => {
  const user = await requireUser();
  if (!reservationId || !["accepted", "rejected"].includes(status)) {
    throw new Error("Invalid reservation response.");
  }

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: { listing: { select: { userId: true } } },
  });
  if (!reservation || reservation.listing.userId !== user.id) {
    throw new Error("Reservation not found or access denied.");
  }
  if ((reservation.status ?? "accepted") !== "pending") {
    throw new Error("This request has already been handled.");
  }

  if (status === "accepted") {
    const overlap = await db.reservation.findFirst({
      where: {
        listingId: reservation.listingId,
        id: { not: reservationId },
        startDate: { lt: reservation.endDate },
        endDate: { gt: reservation.startDate },
        OR: [{ status: "accepted" }, { status: null }],
      },
      select: { id: true },
    });
    if (overlap) {
      throw new Error("These dates overlap an accepted booking on this listing.");
    }
  }

  const result = await db.reservation.updateMany({
    where: { id: reservationId, listingId: reservation.listingId, status: "pending" },
    data: { status },
  });
  if (!result.count) throw new Error("This request has already changed.");
  await revalidateDashboard(reservation.listingId);
  return { status };
};