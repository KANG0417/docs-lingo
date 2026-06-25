"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { HistoryCalendarMonth } from "@/components/molecules/document/history-calendar-month";
import { isKoreanPublicHoliday } from "@/lib/date/korean-public-holidays";
import {
  dateKeyToDate,
  dateToDateKey,
  getHistoryDateBounds,
} from "@/lib/translation/history/translation-history-date";

interface HistoryDatePickerProps {
  selectedDateKey: string;
  historyDateKeys: string[];
  onDateKeyChange: (dateKey: string) => void;
}

export const HistoryDatePicker = ({
  selectedDateKey,
  historyDateKeys,
  onDateKeyChange,
}: HistoryDatePickerProps): ReactElement => {
  const { minDate, maxDate } = useMemo(() => getHistoryDateBounds(), []);
  const selectedDate = useMemo(
    () => dateKeyToDate(selectedDateKey),
    [selectedDateKey],
  );
  const historyDates = useMemo(
    () => historyDateKeys.map((dateKey) => dateKeyToDate(dateKey)),
    [historyDateKeys],
  );
  const [displayMonth, setDisplayMonth] = useState<Date>(selectedDate);

  useEffect(() => {
    setDisplayMonth(selectedDate);
  }, [selectedDate]);

  const handleSelect = (date: Date | undefined): void => {
    if (!date) {
      return;
    }

    onDateKeyChange(dateToDateKey(date));
  };

  return (
    <div className="history-day-picker history-memo-calendar mt-2 rounded-md border p-2.5">
      <DayPicker
        mode="single"
        locale={ko}
        timeZone="Asia/Seoul"
        selected={selectedDate}
        onSelect={handleSelect}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        disabled={{ before: minDate, after: maxDate }}
        startMonth={minDate}
        endMonth={maxDate}
        hideNavigation
        showOutsideDays={false}
        modifiers={{
          sunday: { dayOfWeek: 0 },
          saturday: { dayOfWeek: 6 },
          holiday: isKoreanPublicHoliday,
          hasHistory: historyDates,
        }}
        modifiersClassNames={{
          sunday: "history-day-picker-sunday",
          saturday: "history-day-picker-saturday",
          holiday: "history-day-picker-holiday",
          hasHistory: "history-day-picker-has-history",
        }}
        components={{
          Month: HistoryCalendarMonth,
        }}
        classNames={{
          root: "rdp-root w-full",
          months: "rdp-months w-full",
          month: "rdp-month w-full",
          month_caption: "rdp-month_caption mb-0 flex items-center justify-center",
          caption_label:
            "rdp-caption_label history-calendar-caption font-doc-title text-sm font-bold",
          month_grid: "rdp-month_grid w-full",
          weekdays: "rdp-weekdays mb-1.5",
          weekday:
            "rdp-weekday font-doc-aux history-calendar-weekday text-center text-[0.6875rem] font-semibold",
          week: "rdp-week mt-1 gap-0.5",
          day: "rdp-day history-day-picker-cell p-0.5 text-center",
          day_button: "rdp-day_button history-day-picker-day",
          selected: "rdp-selected history-day-picker-selected",
          today: "rdp-today history-day-picker-today",
          disabled: "rdp-disabled history-day-picker-disabled",
          outside: "rdp-outside history-day-picker-outside",
        }}
      />
    </div>
  );
};
