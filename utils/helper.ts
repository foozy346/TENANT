import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
} from "date-fns";

export type PricePeriod = "nightly" | "weekly" | "monthly";

export const getPricePeriod = (
  pricePeriod?: string | null,
  legacyPriceType?: string | null
): PricePeriod => {
  const value = pricePeriod ?? legacyPriceType;
  return value === "monthly" || value === "weekly" || value === "nightly"
    ? value
    : "nightly";
};

export const getPricePeriodLabel = (period: PricePeriod) =>
  period === "monthly" ? "month" : period === "weekly" ? "week" : "night";

export const getListingStatusLabel = (
  status?: string | null,
  isHidden?: boolean | null
) => {
  if (isHidden) return "Hidden";
  if (status === "rented") return "Rented";
  if (status === "reserved") return "Reserved";
  return "Available";
};

export const formatPrice = (price: number): string => {
  return `EGP ${new Intl.NumberFormat("en-EG").format(price)}`;
};

export const calculateReservationPrice = (
  price: number,
  priceType: string | null,
  startDate: Date,
  endDate: Date
) => {
  const billableNights = Math.max(
    differenceInCalendarDays(endDate, startDate),
    1
  );

  if (priceType === "monthly") {
    const billableMonths = Math.max(
      differenceInCalendarMonths(endDate, startDate),
      1
    );
    return billableMonths * price;
  }

  if (priceType === "weekly") {
    return Math.ceil(billableNights / 7) * price;
  }

  return billableNights * price;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
