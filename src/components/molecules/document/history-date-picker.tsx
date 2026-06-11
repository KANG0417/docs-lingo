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
} from "@/lib/translation/translation-history-date";

interface HistoryDatePickerProps {
  selectedDateKey: string;
  onDateKeyChange: (dateKey: string) => void;
}

export const HistoryDatePicker = ({
  selectedDateKey,
  onDateKeyChange,
}: HistoryDatePickerProps): ReactElement => {
  const { minDate, maxDate } = useMemo(() => getHistoryDateBounds(), []);
  const selectedDate = useMemo(
    () => dateKeyToDate(selectedDateKey),
    [selectedDateKey],
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
    <div className="history-day-picker history-memo-calendar mt-2 rounded-sm border p-2">
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
        }}
        modifiersClassNames={{
          sunday: "history-day-picker-sunday",
          saturday: "history-day-picker-saturday",
          holiday: "history-day-picker-holiday",
        }}
        components={{
          Month: HistoryCalendarMonth,
        }}
        classNames={{
          root: "w-full",
          months: "w-full",
          month: "w-full",
          month_caption: "mb-2 flex items-center justify-center",
          caption_label: "font-doc-title text-sm font-bold text-amber-900",
          month_grid: "w-full",
          weekdays: "mb-1",
          weekday:
            "font-doc-aux text-center text-[0.65rem] font-semibold text-amber-800/70",
          week: "mt-0.5",
          day: "p-0 text-center",
          day_button: "history-day-picker-day",
          selected: "history-day-picker-selected",
          today: "history-day-picker-today",
          disabled: "history-day-picker-disabled",
          outside: "history-day-picker-outside",
        }}
      />
    </div>
  );
};
