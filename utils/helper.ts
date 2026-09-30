import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const formatPrice = (price: number): string => {
  return `EGP ${new Intl.NumberFormat("en-EG").format(price)}`;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
