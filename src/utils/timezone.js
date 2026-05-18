import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Company timezone
export const COMPANY_TIMEZONE = 'Asia/Dubai';
// export const COMPANY_TIMEZONE = 'Africa/Tunis';

export const tz = (date) => {
  if (!date) return null;
  return dayjs(date).tz(COMPANY_TIMEZONE);
};

export const fmtTime = (date, format = 'HH:mm') => {
  if (!date) return '—';
  return tz(date).format(format);
};

export const fmtDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '—';
  return tz(date).format(format);
};

export default dayjs;