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

// Returns the most recently PASSED Sunday 23:59:59 MYT.
// On a Sunday before midnight, the passed deadline is from last week.
// On any other day (or Sunday after midnight), it's this past Sunday.
const getMostRecentPassedDeadline = (): Date => {
  const now = getMalaysiaTime();
  const lastSunday = getLastSundayDeadline();
  return now >= lastSunday ? lastSunday : getPreviousSundayDeadline();
};

export type ReviewStatus =
  | "pending"        // reviewed this week ✅
  | "early_alert"    // Thu/Fri/Sat — not yet reviewed 🟡
  | "last_chance"    // Sunday — not yet reviewed 🟠
  | "needs_review"   // missed last Sunday 🔴
  | "critical_stale" // missed 2+ Sundays 🔴🔴
  | "resolved";      // sold/returned/completed

export interface StatusDisplay {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

const getSundayReviewStatus = (
  lastReviewedAt: string | null,
  loggedAt: string,
  itemStatus: string = "active",
): ReviewStatus => {
  if (itemStatus !== "active") return "resolved";

  const passedDeadline = getMostRecentPassedDeadline();
  const prevPassedDeadline = new Date(passedDeadline);
  prevPassedDeadline.setDate(passedDeadline.getDate() - 7);

  const nowMYT = getMalaysiaTime();
  const dayOfWeek = nowMYT.getDay();

  const rawDate = lastReviewedAt ?? loggedAt;
  const reviewMYT = new Date(
    new Date(rawDate).toLocaleString("en-US", { timeZone: TZ }),
  );

  // Reviewed after the most recently passed deadline → up to date
  if (reviewMYT >= passedDeadline) return "pending";

  // Not yet reviewed this week — check what day it is
  if (dayOfWeek >= 4 && dayOfWeek <= 6) return "early_alert"; // Thu-Sat: deadline approaching
  if (dayOfWeek === 0) return "last_chance";                   // Sunday: last chance today

  // Mon-Wed: Sunday deadline already missed — check how far overdue
  if (reviewMYT >= prevPassedDeadline) return "needs_review";
  return "critical_stale";
};

// How many days until the next Sunday (MYT). Returns 0 on Sunday.
const getDaysUntilSunday = (): number => {
  const nowMYT = getMalaysiaTime();
  const dayOfWeek = nowMYT.getDay();
  return dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
};

const getStatusDisplay = (status: ReviewStatus): StatusDisplay => {
  switch (status) {
    case "pending":
      return { label: "Reviewed",         color: "#16a34a", bgColor: "#dcfce7", borderColor: "#16a34a", icon: "check" };
    case "early_alert":
      return { label: "Review soon",      color: "#ca8a04", bgColor: "#fef9c3", borderColor: "#eab308", icon: "clock" };
    case "last_chance":
      return { label: "Review today!",    color: "#ea580c", bgColor: "#ffedd5", borderColor: "#ea580c", icon: "exclamation" };
    case "needs_review":
      return { label: "Missed Sunday",    color: "#dc2626", bgColor: "#fee2e2", borderColor: "#ef4444", icon: "x-circle" };
    case "critical_stale":
      return { label: "Overdue 2+ weeks", color: "#991b1b", bgColor: "#fee2e2", borderColor: "#991b1b", icon: "x-circle" };
    default:
      return { label: "Resolved",         color: "#94a3b8", bgColor: "#f1f5f9", borderColor: "#e2e8f0", icon: "check" };
  }
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
  getDaysUntilSunday,
  getStatusDisplay,
  getNextSundayDisplay,
  getLastSundayDisplay,
  getPreviousSundayDisplay,
};
