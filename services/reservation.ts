"use server";
import { revalidatePath } from "next/cache";
import { Listing, Reservation } from "@prisma/client";

import { db } from "@/lib/db";
import { LISTINGS_BATCH } from "@/utils/constants";
import { getCurrentUser } from "./user";
import { calculateReservationPrice, getPricePeriod } from "@/utils/helper";

export const getReservations = async (args: Record<string, string>) => {
  try {
    const { listingId, authorId, cursor } = args;
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const where: any = authorId
      ? { listing: { userId: currentUser.id } }
      : { userId: currentUser.id };

    if (listingId) {
      where.listingId = listingId;
    }

    const filterQuery: any = {
      where,
      take: LISTINGS_BATCH,
      include: {
        listing: true,
      },
      orderBy: { createdAt: "desc" },
    };

    if (cursor) {
      filterQuery.cursor = { id: cursor };
      filterQuery.skip = 1;
    }

    const reservations = (await db.reservation.findMany({
      ...filterQuery,
    })) as (Reservation & { listing: Listing })[];

    const nextCursor =
      reservations.length === LISTINGS_BATCH
        ? reservations[LISTINGS_BATCH - 1].id
        : null;

    const listings = reservations.map((reservation) => {
      const { id, startDate, endDate, totalPrice, listing } = reservation;

      return {
        ...listing,
        reservation: { id, startDate, endDate, totalPrice },
      };
    });

    return {
      listings,
      nextCursor,
    };
  } catch (error: any) {
    console.log(error?.message);
    return {
      listings: [],
      nextCursor: null,
    };
  }
};

export const createReservation = async ({
  listingId,
  startDate,
  endDate,
}: {
  listingId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}) => {
  try {
    if (
      !listingId ||
      !startDate ||
      !endDate ||
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      throw new Error("Invalid data");
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("Please log in to reserve!");

    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new Error("Listing not found!");
    if (listing.isHidden || listing.status === "rented") {
      throw new Error("This listing is not accepting new bookings.");
    }

    const conflictingReservation = await db.reservation.findFirst({
      where: {
        listingId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
        OR: [
          { status: "pending" },
          { status: "accepted" },
          { status: null },
        ],
      },
      select: { id: true },
    });
    if (conflictingReservation) {
      throw new Error("These dates are no longer available.");
    }

    const totalPrice = calculateReservationPrice(
      listing.price,
      getPricePeriod(listing.pricePeriod, listing.priceType),
      startDate,
      endDate
    );

    const reservation = await db.reservation.create({
      data: {
        listingId,
        userId: user.id,
        startDate,
        endDate,
        totalPrice,
        status: "pending",
      },
    });

    revalidatePath(`/listings/${listingId}`);
    revalidatePath("/trips");
    revalidatePath("/reservations");
    return reservation;
  } catch (error: any) {
    throw new Error(error?.message);
  }
};

export const deleteReservation = async (reservationId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");
    if (!reservationId || typeof reservationId !== "string") {
      throw new Error("Invalid ID");
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new Error("Reservation not found!");

    const status = reservation.status ?? "accepted";
    if (reservation.userId === currentUser.id) {
      if (
        status !== "pending" &&
        !(status === "accepted" && reservation.startDate > new Date())
      ) {
        throw new Error("Only pending or upcoming bookings can be cancelled.");
      }

      await db.reservation.updateMany({
        where: { id: reservationId, userId: currentUser.id },
        data: { status: "cancelled" },
      });
    } else {
      const listing = await db.listing.findFirst({
        where: { id: reservation.listingId, userId: currentUser.id },
        select: { id: true },
      });
      if (!listing || status !== "pending") {
        throw new Error("Reservation not found or access denied.");
      }

      await db.reservation.updateMany({
        where: { id: reservationId, listingId: listing.id, status: "pending" },
        data: { status: "rejected" },
      });
    }

    revalidatePath("/reservations");
    revalidatePath(`/listings/${reservation.listingId}`);
    revalidatePath("/trips");
    return reservation;
  } catch (error: any) {
    throw new Error(error.message);
  }
};