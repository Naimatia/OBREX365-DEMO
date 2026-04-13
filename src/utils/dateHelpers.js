import moment from 'moment';

export const safeMoment = (date, label = 'unknown') => {
  console.log(`🟡 safeMoment INPUT [${label}] =>`, date);

  if (!date) {
    console.log(`🔴 safeMoment NULL [${label}]`);
    return null;
  }

  let m;

  // Firestore Timestamp
  if (date?.toDate) {
    const converted = date.toDate();
    console.log(`🟠 Firestore Timestamp [${label}] =>`, converted);
    m = moment(converted);
  }

  // JS Date
  else if (date instanceof Date) {
    console.log(`🟠 JS Date [${label}] =>`, date);
    m = moment(date);
  }

  // string / number
  else {
    console.log(`🟠 Raw value [${label}] =>`, date);
    m = moment(date);
  }

  console.log(`🟢 Moment result [${label}] =>`, m.format?.() , " valid:", m.isValid());

  return m.isValid() ? m : null;
};