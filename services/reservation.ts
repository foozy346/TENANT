"use server";
import { revalidatePath } from "next/cache";
import { Listing, Reservation } from "@prisma/client";

import { db } from "@/lib/db";
import { LISTINGS_BATCH } from "@/utils/constants";
import { getCurrentUser } from "./user";
import { calculateReservationPrice } from "@/utils/helper";

export const getReservations = async (args: Record<string, string>) => {
  try {
    const { listingId, userId, authorId, cursor } = args;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (listingId) {
      where.listingId = listingId;
    }

    if (authorId) {
      where.listing = { userId: authorId };
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

    const conflictingReservation = await db.reservation.findFirst({
      where: {
        listingId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      select: { id: true },
    });
    if (conflictingReservation) {
      throw new Error("These dates are no longer available.");
    }

    const totalPrice = calculateReservationPrice(
      listing.price,
      listing.priceType,
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

    await db.reservation.deleteMany({
      where: {
        id: reservationId,
        OR: [
          { userId: currentUser.id },
          { listing: { userId: currentUser.id } },
        ],
      },
    });

    revalidatePath("/reservations");
    revalidatePath(`/listings/${reservation.listingId}`);
    revalidatePath("/trips");
    return reservation;
  } catch (error: any) {
    throw new Error(error.message);
  }
};