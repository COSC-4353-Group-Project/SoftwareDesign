import { db } from "../data/db.js";
import { getServiceById } from "./serviceLogic.js";

// JUSTIN (A4+): SMART FEATURE: surge pricing for skips.
// Before, a skip always cost the same for a service's priority (SKIP_PRICES below).
// Now the price goes up when skipping is worth more, using two simple rules on live data:
//   1. Long line: every party waiting past the first 3 adds 10% (up to +50%).
//      A longer line means a skip saves you more time, so it's worth more.
//   2. Hot demand: every skip bought in this line in the last hour adds 15% (up to +45%).
//      Lots of people bribing = the line is in demand. As those skips get older than an hour
//      they stop counting, so the price drops back down by itself.
// Both get added together, so the most a price can go up is +95% (just under double).
// It's rules-based on purpose, the assignment says simple well-designed logic is enough.

// base prices for each priority level (set on AdminServicesPage). Whole dollars.
const SKIP_PRICES = {
  high: { perSpot: 6, front: 40 },
  medium: { perSpot: 5, front: 30 },
  low: { perSpot: 3, front: 20 },
};

// the surge rules, in one place so they're easy to change
const FREE_LINE_LENGTH = 3; // lines this short or shorter don't add anything
const PERCENT_PER_EXTRA_PARTY = 10;
const MAX_LINE_PERCENT = 50;
const PERCENT_PER_RECENT_SKIP = 15;
const MAX_DEMAND_PERCENT = 45;
const DEMAND_WINDOW_MINUTES = 60;

// base prices for a priority, low prices if the priority is missing
export function getSkipPrices(priority) {
  return SKIP_PRICES[priority] ?? SKIP_PRICES.low;
}

// how many percent the line length adds, e.g. 6 parties waiting -> 3 extra -> 30
export function lineSurgePercent(partiesWaiting) {
  const extraParties = Math.max(0, partiesWaiting - FREE_LINE_LENGTH);
  return Math.min(MAX_LINE_PERCENT, extraParties * PERCENT_PER_EXTRA_PARTY);
}

// how many percent recent skips add, e.g. 2 skips in the last hour -> 30
export function demandSurgePercent(recentSkips) {
  return Math.min(MAX_DEMAND_PERCENT, recentSkips * PERCENT_PER_RECENT_SKIP);
}

// raise a base price by a percent and round UP to a whole dollar, so any surge shows on the page.
// The math stays in whole numbers (price * 130 / 100 instead of price * 1.3) because
// decimals like 1.1 aren't exact in JavaScript and 20 * 1.1 comes out as 22.000000000000004.
export function applySurge(basePrice, percent) {
  return Math.ceil((basePrice * (100 + percent)) / 100);
}

// what one skip costs with these prices: front of line is one flat price, spots are per spot.
// purchaseQueueAdvance and the /advance route both use this, so they can't disagree on a price.
export function priceForSkip(prices, mode, spots) {
  if (mode === "front") {
    return prices.front;
  }
  return spots * prices.perSpot;
}

// parties waiting in this service's line right now (including the person looking)
function countPartiesWaiting(serviceId) {
  const row = db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM queue_entries
    WHERE service_id = ? AND status = 'waiting'
  `,
    )
    .get(serviceId);

  return row.count;
}

// skips bought in this service's line in the last hour.
// created_at is saved in two formats ('2026-11-10T16:00:00.000Z' from JS, '2026-09-19 19:07:00' from
// the seed data), so datetime() turns both sides into the same format before comparing them.
function countRecentSkips(serviceId) {
  const cutoff = new Date(
    Date.now() - DEMAND_WINDOW_MINUTES * 60_000,
  ).toISOString();

  const row = db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM queue_skips
    JOIN queue_entries ON queue_entries.id = queue_skips.queue_entry_id
    WHERE queue_entries.service_id = ?
      AND datetime(queue_skips.created_at) >= datetime(?)
  `,
    )
    .get(serviceId, cutoff);

  return row.count;
}

// The prices someone in this line pays right now, plus why, for the Queue Status page.
// Returns { perSpot, front, surgePercent, reasons }
//   perSpot, front: what a skip costs right now (after surge)
//   surgePercent: how much higher than normal, 0 = normal prices
//   reasons: short sentences explaining the surge, empty when there's no surge
export function getSurgeSkipPrices(serviceId) {
  const base = getSkipPrices(getServiceById(serviceId)?.priority);
  const partiesWaiting = countPartiesWaiting(serviceId);
  const recentSkips = countRecentSkips(serviceId);

  const linePercent = lineSurgePercent(partiesWaiting);
  const demandPercent = demandSurgePercent(recentSkips);
  const surgePercent = linePercent + demandPercent;

  const reasons = [];
  if (linePercent > 0) {
    reasons.push(`${partiesWaiting} parties in line (+${linePercent}%)`);
  }
  if (demandPercent > 0) {
    reasons.push(
      `${recentSkips} skip${recentSkips === 1 ? "" : "s"} bought in the last hour (+${demandPercent}%)`,
    );
  }

  return {
    perSpot: applySurge(base.perSpot, surgePercent),
    front: applySurge(base.front, surgePercent),
    surgePercent,
    reasons,
  };
}
