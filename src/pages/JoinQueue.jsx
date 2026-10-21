import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./JoinQueue.css";

const MOCK_QUEUES = {
  small: {
    serviceName: "Dine-in · Party of 1–2",
    description: "Standard table seating for dates.",
    partiesAhead: 9,
    waitMinutes: 60,
    waitLabel: "~1 hr",
  },
  large: {
    serviceName: "Dine-in · Party of 3–6",
    description: "Larger tables and booths. Longer Wait-Time.",
    partiesAhead: 14,
    waitMinutes: 135,
    waitLabel: "~2 hr 15 min",
  },
  bar: {
    serviceName: "Bar Seating",
    description: "First-come bar stools. Bartender Service",
    partiesAhead: 5,
    waitMinutes: 24,
    waitLabel: "~24 min",
  },
};

function JoinQueue() {
  const navigate = useNavigate();
  const [partySize, setPartySize] = useState(2);
  const [seating, setSeating] = useState("Dine-in");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // changing the summary based on the number of guests, only changes with Dine-in option
  const queue =
    seating === "Bar Seating"
      ? MOCK_QUEUES.bar
      : partySize <= 2
        ? MOCK_QUEUES.small
        : MOCK_QUEUES.large;

  // send user's selection to the backend to join the queue
  async function handleJoin(event) {
    event.preventDefault();

    if (joining) return;

    setJoining(true);
    setError("");

    // pick service based on user's input
    const serviceId = seating === "Bar Seating" ? 3 : partySize <= 2 ? 1 : 2;

    try {
      // submit queue requests
      const response = await fetch("/api/queues/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
                {["Dine-in", "Bar Seating"].map((option) => (
                  <label
                    key={option}
                    className={`join-queue-option${seating === option ? " selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="seating"
                      value={option}
                      checked={seating === option}
                      onChange={() => setSeating(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        </div>

        <aside className="join-queue-sidebar">
          {/* display a summary of the queue selection */}
          <section className="join-queue-card" aria-live="polite">
            <div className="join-queue-summary-heading">
              <h2>{queue.serviceName}</h2>
              <span className="join-queue-open">Open</span>
            </div>
            <p className="join-queue-description">{queue.description}</p>
            <dl className="join-queue-stats">
              <div>
                <dt>Estimated wait</dt>
                <dd>{queue.waitLabel}</dd>
              </div>
              <div>
                <dt>Parties ahead</dt>
                <dd>{queue.partiesAhead}</dd>
              </div>
            </dl>
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
            disabled={joining}
          >
            {joining ? "Joining..." : "Confirm & Join Queue"}
          </button>
        </aside>
      </form>
    </div>
  );
}

export default JoinQueue;
