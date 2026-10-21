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
      const expectedId =
        body.seatingPreference === "Bar Seating"
          ? 3
          : body.partySize <= 2
            ? 1
            : 2;

      if (body.serviceId !== expectedId) {
        errors.serviceId =
          "Service does not match the selected party size and seating.";
      }
    }
  }

  return errors;
}
