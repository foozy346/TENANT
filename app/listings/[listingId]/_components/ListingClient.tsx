"use client";
import React, {
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { addMonths, eachDayOfInterval, startOfMonth } from "date-fns";
import { Range } from "react-date-range";
import { User } from "next-auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import ListingReservation from "./ListingReservation";
import { createReservation } from "@/services/reservation";
import { calculateReservationPrice } from "@/utils/helper";

interface ListingClientProps {
  reservations?: {
    startDate: Date;
    endDate: Date;
  }[];
  children: ReactNode;
  id: string;
  title: string;
  price: number;
  priceType: string;
  user:
    | (User & {
        id: string;
      })
    | undefined;
}

const ListingClient: React.FC<ListingClientProps> = ({
  price,
  priceType,
  reservations = [],
  children,
  user,
  id,
  title,
}) => {
  const [totalPrice, setTotalPrice] = useState(price);
  const [dateRange, setDateRange] = useState<Range>(() => {
    if (priceType === "monthly") {
      const startDate = addMonths(startOfMonth(new Date()), 1);
      return {
        startDate,
        endDate: addMonths(startDate, 1),
        key: "selection",
      };
    }

    const today = new Date();
    return { startDate: today, endDate: today, key: "selection" };
  });
  const [isLoading, startTransition] = useTransition();
  const router = useRouter();
  const disabledDates = useMemo(() => {
    let dates: Date[] = [];
    reservations.forEach((reservation) => {
      const range = eachDayOfInterval({
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate),
      });

      dates = [...dates, ...range];
    });
    return dates;
  }, [reservations]);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      setTotalPrice(
        calculateReservationPrice(
          price,
          priceType,
          dateRange.startDate,
          dateRange.endDate
        )
      );
    }
  }, [dateRange.endDate, dateRange.startDate, price, priceType]);

  const onCreateReservation = () => {
    if (!user) return toast.error("Please log in to reserve listing.");
    startTransition(async () => {
      try {
        const { endDate, startDate } = dateRange;
        await createReservation({
          listingId: id,
          endDate,
          startDate,
        });
        toast.success("Reservation confirmed!");
        router.refresh();
        router.push("/trips");
      } catch (error: any) {
        toast.error(error?.message);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
      {children}

      <div className="order-first mb-10 md:order-last md:col-span-3">
        <ListingReservation
          price={price}
          priceType={priceType}
          totalPrice={totalPrice}
          onChangeDate={(name, value) => setDateRange(value)}
          dateRange={dateRange}
          onSubmit={onCreateReservation}
          isLoading={isLoading}
          disabledDates={disabledDates}
        />
      </div>
    </div>
  );
};

export default ListingClient;
