const TZ = "Asia/Kuala_Lumpur";

const getMalaysiaTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
};

const getLastSundayDeadline = (): Date => {
  const now = getMalaysiaTime();
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
  const daysSinceSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - daysSinceSunday);
  lastSunday.setHours(23, 59, 59, 0);
  return lastSunday;
};

const getPreviousSundayDeadline = (): Date => {
  const lastSunday = getLastSundayDeadline();
  const prevSunday = new Date(lastSunday);
  prevSunday.setDate(lastSunday.getDate() - 7);
  return prevSunday;
};

const getSundayReviewStatus = (
  lastReviewedAt: string | null,
  loggedAt: string,
): "pending" | "needs_review" | "critical_stale" | "resolved" => {
  const lastSunday = getLastSundayDeadline();
  const prevSunday = getPreviousSundayDeadline();

  const reviewDate = lastReviewedAt
    ? new Date(lastReviewedAt)
    : new Date(loggedAt);

  const reviewMYT = new Date(
    reviewDate.toLocaleString("en-US", { timeZone: TZ }),
  );

  if (reviewMYT >= lastSunday) return "pending";
  if (reviewMYT >= prevSunday && reviewMYT < lastSunday) return "needs_review";
  return "critical_stale";
};

const getNextSundayDisplay = (): string => {
  const now = getMalaysiaTime();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  return nextSunday.toLocaleDateString("en-MY", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getLastSundayDisplay = (): string => {
  const lastSunday = getLastSundayDeadline();
  return lastSunday.toLocaleDateString("en-MY", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  });
};

const getPreviousSundayDisplay = (): string => {
  const prevSunday = getPreviousSundayDeadline();
  return prevSunday.toLocaleDateString("en-MY", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  });
};

export {
  getMalaysiaTime,
  getLastSundayDeadline,
  getPreviousSundayDeadline,
  getSundayReviewStatus,
  getNextSundayDisplay,
  getLastSundayDisplay,
  getPreviousSundayDisplay,
};
