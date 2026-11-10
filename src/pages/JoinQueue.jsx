import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./JoinQueue.css";

// JUSTIN BUG FIX (11-06): the seating choices used to be a fixed list (Dine-in, Bar Seating),
// so opening Patio, closing the bar, or adding a service on the admin page never showed up here.
// Now they're built from the services that are open right now:
// - "Dine-in" is services 1 and 2, picked by party size (1–2 guests -> 1, 3–6 -> 2),
//   and only shows if the one for this party size is open
// - every other open service (Bar Seating, Patio, anything the admin adds) is its own choice
function seatingOptions(services, partySize) {
  const options = [];

  const dineInId = partySize <= 2 ? 1 : 2;
  const dineIn = services.find((service) => service.id === dineInId);
  if (dineIn && dineIn.isOpen) {
    options.push({ label: "Dine-in", serviceId: dineInId, seating: "Dine-in" });
  }

  for (const service of services) {
    if (service.isOpen && service.id !== 1 && service.id !== 2) {
      options.push({
        label: service.name,
        serviceId: service.id,
        // the database only knows 2 kinds of seating: the bar, or a table (which Patio etc. are)
        seating: service.id === 3 ? "Bar Seating" : "Dine-in",
      });
    }
  }

  return options;
}

function JoinQueue() {
  const navigate = useNavigate();
  const [partySize, setPartySize] = useState(2);
  // the label of the seating choice the guest clicked
  const [choice, setChoice] = useState("Dine-in");
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState("");

  // JUSTIN: load the services once so the choices match what's open
  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch("/api/services");
        if (response.ok) {
          setServices(await response.json());
        }
      } catch {
        // server is off: no choices, the page says nothing is open
      }
      setLoadingServices(false);
    }
    loadServices();
  }, []);

  const options = seatingOptions(services, partySize);
  // if the clicked choice isn't available anymore (e.g. party got bigger and that Dine-in is closed),
  // fall back to the first open one
  const selected = options.find((option) => option.label === choice) || options[0];
  // pick service based on user's selection (undefined when nothing is open)
  const serviceId = selected ? selected.serviceId : undefined;
  const seating = selected ? selected.seating : "Dine-in";

  // retrieve queue info when service changes
  useEffect(() => {
    // nothing open to show
    if (!serviceId) {
      setQueue(null);
      setLoadingQueue(false);
      return;
    }

    const controller = new AbortController();

    async function fetchQueueSummary() {
      setLoadingQueue(true);
      setQueue(null);
      setQueueError("");

      try {
        const response = await fetch(`/api/queues/summary/${serviceId}`, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to retrieve queue.");
        }

        setQueue(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setQueueError(err.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingQueue(false);
        }
      }
    }

    fetchQueueSummary();

    return () => controller.abort();
  }, [serviceId]);

  // send user's selection to the backend to join the queue
  async function handleJoin(event) {
    event.preventDefault();

    if (joining) return;

    setJoining(true);
    setError("");

    try {
      // submit queue requests
      const response = await fetch("/api/queues/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          serviceId,
          partySize,
          seatingPreference: seating,
        }),
      });

      const data = await response.json();

      // error check
      if (!response.ok) {
        const message = data.fields
          ? Object.values(data.fields)[0]
          : data.error;

        throw new Error(message || "Unable to join queue.");
      }

      // Pass created entry to existing Status page
      navigate("/status", { state: { entry: data } });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="join-queue-page">
      <div className="join-queue-header">
        <div>
          <h1>Join Queue</h1>
          <p>Choose your party size and seating preference.</p>
        </div>
        <Link className="join-queue-back" to="/dashboard">
          Back to dashboard
        </Link>
      </div>

      <form className="join-queue-layout" onSubmit={handleJoin}>
        <div className="join-queue-main">
          {/* only 1-6 guests rn */}
          <section className="join-queue-card">
            <h2>Party size</h2>
            <p className="join-queue-description">
              How many people are dining?
            </p>
            <div className="join-queue-stepper">
              <button
                type="button"
                className="join-queue-step-button"
                aria-label="Remove one guest"
                disabled={partySize === 1}
                onClick={() => setPartySize((size) => Math.max(1, size - 1))}
              >
                <span aria-hidden="true">−</span>
              </button>
              <span className="join-queue-party" aria-live="polite">
                <strong>{partySize}</strong>
                <span>{partySize === 1 ? "guest" : "guests"}</span>
              </span>
              <button
                type="button"
                className="join-queue-step-button"
                aria-label="Add one guest"
                disabled={partySize === 6}
                onClick={() => setPartySize((size) => Math.min(6, size + 1))}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </section>

          {/* only one seating at a time */}
          <section className="join-queue-card">
            <fieldset className="join-queue-preferences">
              <legend>Seating preference</legend>
              <p className="join-queue-description">
                We’ll do our best to accommodate you. For larger party, please
                select Dine-in.
              </p>
              <div className="join-queue-options">
                {options.map((option) => (
                  <label
                    key={option.label}
                    className={`join-queue-option${selected === option ? " selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="seating"
                      value={option.label}
                      checked={selected === option}
                      onChange={() => setChoice(option.label)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {!loadingServices && options.length === 0 && (
                <p className="join-queue-description" role="alert">
                  Nothing is open for a party of {partySize} right now.
                </p>
              )}
            </fieldset>
          </section>
        </div>

        <aside className="join-queue-sidebar">
          {/* display a summary of the queue selection */}
          <section className="join-queue-card" aria-live="polite">
            {loadingQueue ? (
              <p className="join-queue-description">
                Loading queue information...
              </p>
            ) : queueError ? (
              <p className="join-queue-description" role="alert">
                {queueError}
              </p>
            ) : queue ? (
              <>
                <div className="join-queue-summary-heading">
                  <h2>{queue.serviceName}</h2>
                  <span className="join-queue-open">
                    {queue.isOpen ? "Open" : "Closed"}
                  </span>
                </div>

                <p className="join-queue-description">{queue.description}</p>

                <dl className="join-queue-stats">
                  <div>
                    <dt>Estimated wait</dt>
                    <dd>~{queue.estimatedWaitMinutes} min</dd>
                  </div>
                  <div>
                    <dt>Parties ahead</dt>
                    <dd>{queue.partiesAhead}</dd>
                  </div>
                </dl>
              </>
            ) : null}
          </section>

          {/* lol */}
          <div className="join-queue-note">
            <p>
              <strong>No charge to join.</strong> Save the bribe for later, you
              can pay to move up the queue!
            </p>
          </div>

          {/* submits and sends to status page. */}
          {error && (
            <p className="join-queue-description" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="join-queue-confirm"
            disabled={joining || loadingQueue || !queue || !queue.isOpen}
          >
            {joining ? "Joining..." : "Confirm & Join Queue"}
          </button>
        </aside>
      </form>
    </div>
  );
}

export default JoinQueue;
