import React from "react";
import { Range } from "react-date-range";
import dynamic from "next/dynamic";

import Button from "@/components/Button";
import SpinnerMini from "@/components/Loader";
import { formatPrice, getPricePeriod, getPricePeriodLabel } from "@/utils/helper";

interface ListingReservationProps {
  price: number;
  priceType: string;
  dateRange: Range;
  totalPrice: number;
  onChangeDate: (name: string, value: Range) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabledDates: Date[];
}

const Calendar = dynamic(() => import("@/components/Calender"), {
  ssr: false
})

const ListingReservation: React.FC<ListingReservationProps> = ({
  price,
  priceType,
  dateRange,
  totalPrice,
  onChangeDate,
  onSubmit,
  disabledDates,
  isLoading,
}) => {
    return (
    <div className="bg-white rounded-xl border-[1px] border-neutral-200 overflow-hidden">
      <div className="flex flex-row items-center gap-1 p-4">
        <span className="text-lg font-semibold">{formatPrice(price)}</span>
        <span className="font-light text-neutral-600">
          {getPricePeriodLabel(getPricePeriod(priceType))}
        </span>
      </div>
      <hr />
      <Calendar
        value={dateRange}
        disabledDates={disabledDates}
        priceType={priceType}
        onChange={onChangeDate}
      />
      <hr />
      <div className="hidden p-4 md:block">
        <Button
          type="button"
          disabled={isLoading}
          onClick={onSubmit}
          className="flex flex-row items-center justify-center h-[42px] "
          size="large"
        >
          {isLoading ? <SpinnerMini /> : <span>Reserve</span>}
        </Button>
      </div>
      <hr />
      <div className="p-4 flex flex-row items-center justify-between font-semibold text-lg">
        <span>Total</span>
        <span>{formatPrice(totalPrice)}</span>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="main-container flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-xs font-medium text-neutral-500">
              Total
            </span>
            <span className="block truncate text-base font-bold text-neutral-900">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <Button
            type="button"
            disabled={isLoading}
            onClick={onSubmit}
            className="h-11 w-auto min-w-32 px-5"
          >
            {isLoading ? <SpinnerMini /> : "Reserve"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListingReservation;
