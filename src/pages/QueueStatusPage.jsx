import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // useLocation to read queue info from JoinQueue
import { Check, ChevronDown, Clock, Crown, Users, Zap } from "lucide-react";
import "./QueueStatusPage.css";

// JUSTIN BACKEND STOOF: MOCK_ENTRY is gone. The page asks GET /api/queues/me for the
// logged-in user's spot, and shows "not in a queue" if they don't have one.

const ALMOST_READY_AT = 3; // positions 1-3 count as "almost ready"

//  Helpers for the minutes format and waittime.

function estimateWait(position, minutesPerParty) {
  return Math.max(0, position) * minutesPerParty;
}

function formatMinutes(min) {
  if (min <= 0) return "Now";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

function statusForPosition(position) {
  if (position <= 0) return "served";
  if (position <= ALMOST_READY_AT) return "almost-ready";
  return "waiting";
}

//  Status stepper

const STEPS = [
  { key: "waiting", label: "Waiting" },
  { key: "almost-ready", label: "Almost ready" },
  { key: "served", label: "Table ready" },
];

function StatusStepper({ status }) {
  // Once served, every step (including the last) is complete.
  const current =
    status === "served"
      ? STEPS.length
      : STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="stepper">
      {STEPS.map((step, i) => {
        const state =
          i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={step.key} className={`stepper-step ${state}`}>
            <span className="stepper-dot">
              {state === "done" ? <Check size={14} /> : i + 1}
            </span>
            <span className="stepper-label">{step.label}</span>
            {i < STEPS.length - 1 && <span className="stepper-line" />}
          </li>
        );
      })}
    </ol>
  );
}

//  Status badge (top right of the header)

const STATUS_LABELS = {
  waiting: "Waiting",
  "almost-ready": "Almost ready",
  served: "Table ready",
};

function StatusBadge({ status }) {
  // the status = css class
  return (
    <span className={`status-badge ${status}`}>{STATUS_LABELS[status]}</span>
  );
}

//  Position card

function PositionCard({ entry }) {
  // THU: use the wait estimate returned by backend
  const wait =
    entry.estimatedWaitMinutes ??
    estimateWait(entry.position, entry.minutesPerParty);
  const status = statusForPosition(entry.position);
  const almostReady = status === "almost-ready";
  // how far through the line they are, 0-100
  const progress =
    entry.initialPosition > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((entry.initialPosition - entry.position) /
                entry.initialPosition) *
                100,
            ),
          ),
        )
      : 0;

  return (
    <section
      className={almostReady ? "position-card almost-ready" : "position-card"}
    >
      <p className="position-label">Your position</p>
      <p className="position-number">#{entry.position}</p>

      <div className="position-meta">
        <span>
          <Clock size={16} /> ~{formatMinutes(wait)}
        </span>
        <span>
          <Users size={16} /> Party of {entry.partySize}
        </span>
      </div>

      {almostReady && (
        <p className="position-alert">
          Almost your turn. go bother the host stand.
        </p>
      )}

      <div className="progress-track" role="progressbar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <StatusStepper status={status} />
    </section>
  );
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(n) {
  return `$${n.toFixed(0)}`;
}

//  Details card

function Details({ entry }) {
  const isReservation = entry.type === "reservation";
  const totalPaid = entry.skips.reduce((sum, s) => sum + s.price, 0);

  return (
    <section className="details-card">
      <h2 className="details-title">Details</h2>

      <dl className="details-list">
        <div className="details-row">
          <dt>Service</dt>
          <dd>{entry.serviceName}</dd>
        </div>
        <div className="details-row">
          <dt>Party size</dt>
          <dd>{entry.partySize}</dd>
        </div>
        <div className="details-row">
          <dt>Type</dt>
          <dd>{isReservation ? "Reservation" : "Walk-in"}</dd>
        </div>
        <div className="details-row">
          <dt>{isReservation ? "Booked" : "Joined"}</dt>
          <dd>{formatTime(entry.joinedAt)}</dd>
        </div>
        {entry.notes && (
          <div className="details-row">
            <dt>Notes</dt>
            <dd>{entry.notes}</dd>
          </div>
        )}
      </dl>

      {entry.skips.length > 0 && (
        <div className="details-skips">
          <p className="details-skips-title">
            <Zap size={14} /> Skips purchased · {formatPrice(totalPaid)} total
          </p>
          <ul>
            {entry.skips.map((s) => (
              <li key={s.at}>
                <span>
                  {s.label} (#{s.from} → #{s.to})
                </span>
                <strong>{formatPrice(s.price)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

//  Skip panel (pay to move up, bribetime)
// JUSTIN: prices come from the backend now (entry.skipPrices), they depend on the service's
// priority level. To change them, edit SKIP_PRICES in server/logic/queueLogic.js.

// "#5 goes into #3 · 30 min 18 min" line under each option
function WaitChange({ from, to, minutesPerParty }) {
  return (
    <span className="skip-wait">
      #{from} → <strong>#{to}</strong> ·{" "}
      <s>{formatMinutes(estimateWait(from, minutesPerParty))}</s>{" "}
      <strong>{formatMinutes(estimateWait(to, minutesPerParty))}</strong>
    </span>
  );
}

function SkipPanel({ position, minutesPerParty, prices, onPurchase }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(""); // '', 'spots', or 'front'
  const [spots, setSpots] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  // already at the front, nothing to skip
  if (position <= 1) {
    return null;
  }

  // Most spots you can buy one at a time: you can't land on #1 (that's "front of line" so give us 20$),
  //
  const maxSpots = Math.min(
    position - 2,
    Math.ceil(prices.front / prices.perSpot) - 1,
  );
  // the line keeps moving so a number picked earlier might be too big now
  const spotCount = Math.min(spots, maxSpots);

  // what the pay button would buy right now
  let skip = null;
  if (choice === "spots" && maxSpots > 0) {
    skip = {
      label: `Skip ${spotCount} spot${spotCount === 1 ? "" : "s"}`,
      from: position,
      to: position - spotCount,
      price: spotCount * prices.perSpot,
    };
  } else if (choice === "front") {
    skip = {
      label: "Front of line",
      from: position,
      to: 1,
      price: prices.front,
    };
  }
  // THU:
  async function handlePurchase() {
    if (!skip || purchasing) return;

    setPurchasing(true);

    try {
      const success = await onPurchase(skip);

      if (success) {
        setChoice("");
        setOpen(false);
      }
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <section className="skip-panel">
      {/* header doubles as the open/close button for the neatness */}
      <button
        type="button"
        className="skip-toggle"
        onClick={() => setOpen(!open)}
      >
        <span className="skip-icon">
          <Zap size={16} />
        </span>
        <span className="skip-heading">
          <span className="skip-title">Move up in line</span>
          <span className="skip-subtitle">
            {maxSpots > 0 ? `${formatPrice(prices.perSpot)} per spot · ` : ""}
            {formatPrice(prices.front)} for front of line
          </span>
        </span>
        <ChevronDown
          size={20}
          className={open ? "skip-chevron open" : "skip-chevron"}
        />
      </button>

      {open && (
        <div className="skip-body">
          <fieldset className="skip-options">
            <legend className="visually-hidden">Skip options</legend>

            {maxSpots > 0 && (
              <label
                className={
                  choice === "spots" ? "skip-option selected" : "skip-option"
                }
              >
                <input
                  type="radio"
                  name="skip"
                  value="spots"
                  checked={choice === "spots"}
                  onChange={() => setChoice("spots")}
                />
                <span className="skip-option-text">
                  <span className="skip-option-title">
                    Choose how many spots
                  </span>
                  <WaitChange
                    from={position}
                    to={position - spotCount}
                    minutesPerParty={minutesPerParty}
                  />
                  <span className="skip-slider-row">
                    <input
                      type="range"
                      min={1}
                      max={maxSpots}
                      value={spotCount}
                      disabled={maxSpots === 1}
                      onChange={(e) => {
                        setSpots(Number(e.target.value));
                        setChoice("spots"); // moving the slider selects this option
                      }}
                    />
                    <span className="skip-slider-count">
                      {spotCount} spot{spotCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>
                <span className="skip-price">
                  {formatPrice(spotCount * prices.perSpot)}
                </span>
              </label>
            )}

            <label
              className={
                choice === "front" ? "skip-option selected" : "skip-option"
              }
            >
              <input
                type="radio"
                name="skip"
                value="front"
                checked={choice === "front"}
                onChange={() => setChoice("front")}
              />
              <span className="skip-option-text">
                <span className="skip-option-title">
                  <Crown size={14} /> Front of line
                </span>
                <WaitChange
                  from={position}
                  to={1}
                  minutesPerParty={minutesPerParty}
                />
              </span>
              <span className="skip-price">
                {formatPrice(prices.front)}
              </span>
            </label>
          </fieldset>

          <button
            type="button"
            className="skip-pay"
            disabled={!skip || purchasing}
            onClick={handlePurchase}
          >
            {skip
              ? `Pay ${formatPrice(skip.price)} & move to #${skip.to}`
              : "Choose an option"}
          </button>
          <p className="skip-note">Demo only: no real payment is taken.</p>
        </div>
      )}
    </section>
  );
}

//  Leave queue button (asks before doing anything)

function CancelButton({ label, onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="cancel-btn"
        onClick={() => setConfirming(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="cancel-confirm" role="alertdialog">
      <p>Are you sure? You'll lose your spot and any skips you paid for.</p>
      <div className="cancel-actions">
        <button
          type="button"
          className="cancel-yes"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          Yes, {label.toLowerCase()}
        </button>
        <button
          type="button"
          className="cancel-no"
          onClick={() => setConfirming(false)}
        >
          Keep my spot
        </button>
      </div>
    </div>
  );
}

//  Page

export default function QueueStatusPage() {
  // state instead of const so buying a skip can change the position on screen
  // JUSTIN BACKEND STOOF: start with what Join Queue passed in (if anything), null = no spot yet
  const location = useLocation();
  const [entry, setEntry] = useState(location.state?.entry ?? null);
  // true until the server answers, so we don't flash "not in a queue" while loading
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // THU:
  const [statusError, setStatusError] = useState("");

  // JUSTIN BACKEND STOOF: always ask the server for MY current spot (GET /api/queues/me),
  // so the page works from the "My Queue" tab too, not only right after joining
  useEffect(() => {
    const controller = new AbortController();

    async function fetchQueueStatus() {
      try {
        const response = await fetch("/api/queues/me", {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await response.json();

        if (response.status === 404) {
          // not in any queue: show the empty message below
          setEntry(null);
        } else if (!response.ok) {
          throw new Error(data.error || "Unable to retrieve queue status.");
        } else {
          setEntry(data);
          setStatusError("");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setStatusError(err.message || "Something went wrong.");
        }
      }
      setLoading(false);
    }

    fetchQueueStatus();

    return () => controller.abort();
  }, []);

  // no backend yet, so just update the local copy new position add to the skips list
  // function handleSkip(skip) {
  //   const purchase = { ...skip, at: new Date().toISOString() };
  //   setEntry({
  //     ...entry,
  //     position: skip.to,
  //     skips: [...entry.skips, purchase],
  //   });
  // }

  // THU: request paid advancement from backend
  async function handleSkip(skip) {
    if (!entry.id || !skip) {
      setStatusError("No active queue entry found.");
      return false;
    }

    setStatusError("");

    const mode = skip.to === 1 ? "front" : "spots";

    try {
      const response = await fetch(`/api/queues/${entry.id}/advance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          mode,
          ...(mode === "spots" ? { spots: skip.from - skip.to } : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to advance queue.");
      }

      setEntry(result);
      return true;
    } catch (err) {
      setStatusError(err.message || "Something went wrong.");
      return false;
    }
  }

  // no backend yet, so "leaving" just sends them to the dashboard YET, waiting on this
  // async function handleLeave() {
  //   navigate("/dashboard");
  // }

  // THU: cancel user's queue entry
  async function handleLeave() {
    if (!entry.id) {
      setStatusError("No active queue entry was found.");
      return;
    }

    setStatusError("");

    try {
      const response = await fetch(`/api/queues/${entry.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to leave queue.");
      }

      // leave status page after cancellation
      navigate("/dashboard");
    } catch (err) {
      setStatusError(err.message || "Something went wrong.");
    }
  }

  // JUSTIN BACKEND STOOF: still waiting on the server
  if (loading) {
    return (
      <div className="queue-page">
        <p className="queue-subtitle">Loading your spot…</p>
      </div>
    );
  }

  // JUSTIN BACKEND STOOF: logged in but not in any line (or not logged in at all)
  if (!entry) {
    return (
      <div className="queue-page">
        {statusError && <p role="alert">{statusError}</p>}
        <h1 className="queue-title">Queue status</h1>
        <p className="queue-subtitle">You're not in a queue right now.</p>
        <p className="back-link">
          <Link to="/join-queues">Join the waitlist</Link> ·{" "}
          <Link to="/dashboard">Back to dashboard</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="queue-page">
      {/* THU: just in case if request fails */}
      {statusError && <p role="alert">{statusError}</p>}
      {/* header: title & service name on the left, status badge on the right */}
      <div className="queue-header">
        <div>
          <h1 className="queue-title">Queue status</h1>
          <p className="queue-subtitle">{entry.serviceName}</p>
        </div>
        <StatusBadge status={statusForPosition(entry.position)} />
      </div>

      <div className="queue-layout">
        {/* main column */}
        <div className="queue-main">
          <PositionCard entry={entry} />
          <SkipPanel
            position={entry.position}
            minutesPerParty={entry.minutesPerParty}
            prices={entry.skipPrices}
            onPurchase={handleSkip}
          />
        </div>

        {/* sidebar, should expand with more info if needed (downwards) */}
        <aside className="queue-sidebar">
          <Details entry={entry} />
          <CancelButton label="Leave queue" onConfirm={handleLeave} />
          <p className="back-link">
            <Link to="/dashboard">Back to dashboard</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
