import { AppError } from "../../callable/app-error";

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const BIRTH_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

function parseCalendarDate(value: string): CalendarDate {
  const match = BIRTH_DATE_PATTERN.exec(value);

  if (!match) {
    throw new AppError("input_invalid");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AppError("input_invalid");
  }

  return { year, month, day };
}

function utcCalendarDate(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function compareCalendarDates(left: CalendarDate, right: CalendarDate): number {
  if (left.year !== right.year) {
    return left.year - right.year;
  }

  if (left.month !== right.month) {
    return left.month - right.month;
  }

  return left.day - right.day;
}

function ageInYears(birthDate: CalendarDate, currentDate: CalendarDate): number {
  let age = currentDate.year - birthDate.year;

  if (
    currentDate.month < birthDate.month ||
    (currentDate.month === birthDate.month && currentDate.day < birthDate.day)
  ) {
    age -= 1;
  }

  return age;
}

export function validateAdultBirthDate(value: string, now: Date): string {
  const birthDate = parseCalendarDate(value);
  const currentDate = utcCalendarDate(now);

  if (compareCalendarDates(birthDate, currentDate) > 0) {
    throw new AppError("input_invalid");
  }

  if (ageInYears(birthDate, currentDate) < 18) {
    throw new AppError("input_invalid");
  }

  return value;
}
