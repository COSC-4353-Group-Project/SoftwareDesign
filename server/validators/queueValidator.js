import { getServiceById } from "../logic/serviceLogic.js";

// validates info from the Join Queue form
export function validateJoinQueue(body) {
  const errors = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { request: "Request body must be an object." };
  }

  // check service ID, party size, seating preference, and if service exists/is open
  if (!Number.isInteger(body.serviceId) || body.serviceId < 1) {
    errors.serviceId = "Service ID must be a positive whole number.";
  }

  if (
    !Number.isInteger(body.partySize) ||
    body.partySize < 1 ||
    body.partySize > 6
  ) {
    errors.partySize = "Party size must be between 1 and 6.";
  }

  if (
    typeof body.seatingPreference !== "string" ||
    !["Dine-in", "Bar Seating"].includes(body.seatingPreference)
  ) {
    errors.seatingPreference = "Invalid seating preference.";
  }

  if (!errors.serviceId) {
    const service = getServiceById(body.serviceId);

    if (!service) {
      errors.serviceId = "Service not found.";
    } else if (!service.isOpen) {
      errors.serviceId = "This service is currently closed.";
    } else if (!errors.partySize && !errors.seatingPreference) {
      // match service to seating and party size
      // JUSTIN BUG FIX (11-06): this only allowed services 1, 2 and 3, so an open Patio or a
      // service the admin added could never be joined. Any open service works now:
      // - Dine-in (1 and 2) still has to match the party size
      // - the bar (3) is Bar Seating, every other service is a table (Dine-in)
      const isDineIn = body.serviceId === 1 || body.serviceId === 2;
      const expectedSeating = body.serviceId === 3 ? "Bar Seating" : "Dine-in";

      if (isDineIn) {
        const expectedId = body.partySize <= 2 ? 1 : 2;
        if (body.serviceId !== expectedId || body.seatingPreference !== "Dine-in") {
          errors.serviceId =
            "Service does not match the selected party size and seating.";
        }
      } else if (body.seatingPreference !== expectedSeating) {
        errors.serviceId =
          "Service does not match the selected party size and seating.";
      }
    }
  }

  return errors;
}
