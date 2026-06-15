"use client";

import clsx from "clsx";
import { Children, useCallback } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { useDayPicker } from "react-day-picker";
import type { CalendarMonth } from "react-day-picker";

interface HistoryCalendarMonthProps extends HTMLAttributes<HTMLDivElement> {
  calendarMonth: CalendarMonth;
  displayIndex: number;
  children?: ReactNode;
}

export const HistoryCalendarMonth = ({
  children,
  className,
  calendarMonth: _calendarMonth,
  displayIndex: _displayIndex,
  ...divProps
}: HistoryCalendarMonthProps): ReactElement => {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker();
  const childrenArray = Children.toArray(children);
  const monthCaption = childrenArray[0];
  const monthGrid = childrenArray.at(-1);
  const isPreviousDisabled = !previousMonth;
  const isNextDisabled = !nextMonth;

  const handlePreviousClick = useCallback((): void => {
    if (!previousMonth) {
      return;
    }

    goToMonth(previousMonth);
  }, [goToMonth, previousMonth]);

  const handleNextClick = useCallback((): void => {
    if (!nextMonth) {
      return;
    }

    goToMonth(nextMonth);
  }, [goToMonth, nextMonth]);

  return (
    <div className={clsx("history-calendar-month-body", className)} {...divProps}>
      <div className="history-calendar-nav-row">
        <button
          type="button"
          onClick={handlePreviousClick}
          disabled={isPreviousDisabled}
          aria-label="이전 달"
          aria-disabled={isPreviousDisabled}
          className={clsx(
            "history-day-picker-side-nav",
            isPreviousDisabled && "history-day-picker-side-nav-disabled",
          )}
        >
          ‹
        </button>

        <div className="history-calendar-caption-wrap">{monthCaption}</div>

        <button
          type="button"
          onClick={handleNextClick}
          disabled={isNextDisabled}
          aria-label="다음 달"
          aria-disabled={isNextDisabled}
          className={clsx(
            "history-day-picker-side-nav",
            isNextDisabled && "history-day-picker-side-nav-disabled",
          )}
        >
          ›
        </button>
      </div>

      <div className="history-calendar-grid-wrap history-calendar-grid-full">
        {monthGrid}
      </div>
    </div>
  );
};
