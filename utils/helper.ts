import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { differenceInCalendarDays, differenceInCalendarMonths } from "date-fns";

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

  return billableNights * price;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
