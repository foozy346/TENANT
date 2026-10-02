"use client"
import React, { useState } from "react";
import { DateRange, Range, RangeKeyDict } from "react-date-range";
import {
  addDays,
  addMonths,
  format,
  isBefore,
  startOfMonth,
} from "date-fns";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import toast from "react-hot-toast";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface CalendarProps {
  value: Range;
  onChange: (fieldName: string, value: Range) => void;
  disabledDates?: Date[];
  priceType?: string;
}

const Calendar: React.FC<CalendarProps> = ({
  value,
  onChange,
  disabledDates,
  priceType = "nightly",
}) => {
  const [calendarYear, setCalendarYear] = useState(
    value.startDate?.getFullYear() ?? new Date().getFullYear()
  );
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);

  const handleChange = (value: RangeKeyDict) => {
    onChange("dateRange", value.selection);
  };

  if (priceType === "monthly") {
    const minimumMonth = addMonths(startOfMonth(new Date()), 1);
    const selectedStart = selectionStart ?? value.startDate;
    const selectedEnd = value.endDate
      ? startOfMonth(addDays(value.endDate, -1))
      : undefined;

    const selectMonth = (month: Date) => {
      const monthStart = startOfMonth(month);
      const monthEnd = addMonths(monthStart, 1);
      if (isBefore(monthStart, minimumMonth)) return;

      if (!selectionStart || isBefore(monthStart, selectionStart)) {
        setSelectionStart(monthStart);
        onChange("dateRange", {
          startDate: monthStart,
          endDate: monthEnd,
          key: "selection",
        });
        return;
      }

      const hasUnavailableMonth = disabledDates?.some(
        (date) => !isBefore(date, selectionStart) && isBefore(date, monthEnd)
      );
      if (hasUnavailableMonth) {
        toast.error("The selected month range includes unavailable dates.");
        return;
      }

      onChange("dateRange", {
        startDate: selectionStart,
        endDate: monthEnd,
        key: "selection",
      });
      setSelectionStart(null);
    };

    return (
      <div className="p-4" aria-label="Choose reservation months">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous year"
            onClick={() => setCalendarYear((year) => year - 1)}
            disabled={calendarYear <= minimumMonth.getFullYear()}
            className="rounded p-2 text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AiOutlineLeft />
          </button>
          <span className="font-semibold">{calendarYear}</span>
          <button
            type="button"
            aria-label="Next year"
            onClick={() => setCalendarYear((year) => year + 1)}
            className="rounded p-2 text-neutral-700 hover:bg-neutral-100"
          >
            <AiOutlineRight />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, index) => {
            const month = new Date(calendarYear, index, 1);
            const monthEnd = addMonths(month, 1);
            const isPast = isBefore(month, minimumMonth);
            const isUnavailable = disabledDates?.some(
              (date) => !isBefore(date, month) && isBefore(date, monthEnd)
            );
            const isSelected =
              selectedStart &&
              selectedEnd &&
              !isBefore(month, startOfMonth(selectedStart)) &&
              !isBefore(startOfMonth(selectedEnd), month);
            const isRangeEnd =
              selectedEnd &&
              month.getFullYear() === selectedEnd.getFullYear() &&
              month.getMonth() === selectedEnd.getMonth();
            const isRangeStart =
              selectedStart &&
              month.getFullYear() === selectedStart.getFullYear() &&
              month.getMonth() === selectedStart.getMonth();

            return (
              <button
                key={index}
                type="button"
                disabled={isPast || isUnavailable}
                onClick={() => selectMonth(month)}
                aria-pressed={!!isSelected}
                aria-label={format(month, "MMMM yyyy")}
                className={`rounded-md border px-2 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  isRangeStart || isRangeEnd
                    ? "border-primary bg-primary text-white"
                    : isSelected
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-neutral-200 text-neutral-700 hover:border-primary hover:text-primary"
                }`}
              >
                {format(month, "MMM")}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <DateRange
      rangeColors={["#262626"]}
      ranges={[value]}
      date={new Date()}
      onChange={handleChange}
      direction="vertical"
      showDateDisplay={false}
      minDate={new Date()}
      disabledDates={disabledDates}
    />
  );
};

export default Calendar;
