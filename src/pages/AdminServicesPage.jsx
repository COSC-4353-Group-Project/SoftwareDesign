import { useEffect, useState } from 'react'
import { Clock, Pencil, Trash2, Users } from 'lucide-react'
import './AdminServicesPage.css'

// Services now come from the backend (GET /api/services, see server/routes/services.js).
// They live in the services table (server/data/db.js seeds the starting ones).

// Priority level does two things:
// 1. the order of the list on this page (high first)
// 2. how much bribing costs in that service's line, high costs the most
//    (SKIP_PRICES in server/logic/queueLogic.js)
// The assignment 2 checklist requires the field but never explains it, so still worth checking with the prof.
// Lower number = shown higher up the list. kinda mid but whatever
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

// Limits from the assignment checklist (service name max 100 characters), so they cant spam a letter
const NAME_MAX = 100
const DESCRIPTION_MAX = 300
const DURATION_MIN = 1
const DURATION_MAX = 240

// What the form looks like when nothing is typed in yet, dummy text
const EMPTY_FORM = { name: '', description: '', duration: '', priority: '', isOpen: true }

// Checks every field and returns an object of error messages.
// An empty string means that field is fine.
// The backend checks the same rules again (server/validators/serviceValidator.js); this copy
// just gives instant feedback without waiting on the server.
function validate(form, services, editingId) {
  const errors = { name: '', description: '', duration: '', priority: '' }

  const name = form.name.trim()
  if (name === '') {
    errors.name = 'Service name is required.'
  } else if (name.length > NAME_MAX) {
    errors.name = `Service name must be ${NAME_MAX} characters or fewer.`
  } else {
    // no two services can share a name (ignoring upper/lower case), but a service can keep its own name when edited, helps duplicates..
    for (const service of services) {
      if (service.id !== editingId && service.name.toLowerCase() === name.toLowerCase()) {
        errors.name = 'Another service already has this name.'
      }
    }
  }

  const description = form.description.trim()
  if (description === '') {
    errors.description = 'Description is required.'
  } else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`
  }

  const duration = Number(form.duration)
  if (form.duration === '') {
    errors.duration = 'Expected duration is required.'
  } else if (!Number.isInteger(duration)) {
    errors.duration = 'Expected duration must be a whole number of minutes.'
  } else if (duration < DURATION_MIN || duration > DURATION_MAX) {
    errors.duration = `Expected duration must be between ${DURATION_MIN} and ${DURATION_MAX} minutes.`
  }

  if (form.priority === '') {
    errors.priority = 'Choose a priority level.'
  }

  return errors
}

// Service management: staff create and edit the services guests can queue for.
function AdminServicesPage() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  // id of the service being edited, or null when the form is making a new service, prevents a crash i had happen...
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // message under the save button when the server says no (or can't be reached)
  const [saveError, setSaveError] = useState('')

  // Load the services once, when the page first shows up, backend stoof finally 
  // The empty [] at the end means "only run this on the first render".
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch('/api/services')
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`)
        }
        setServices(await res.json())
      } catch {
        setLoadError('Could not load services. Is the backend running? (npm run server)')
      }
      setLoading(false)
    }
    loadServices()
  }, [])

  // runs on every keystroke / checkbox click, copies the form and changes the one field
  function handleChange(field, value) {
    setForm({ ...form, [field]: value })
  }

  // Edit button on a card: put that service's info into the form, amkes it easier to hotswap
  function startEdit(service) {
    setEditingId(service.id)
    setForm({
      name: service.name,
      description: service.description,
      duration: String(service.duration), // inputs hold text, so turn the number into a string
      priority: service.priority,
      isOpen: service.isOpen,
    })
    setErrors({})
  }

  // Cancel button, or after saving: go back to an empty "New service" form
  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setSaveError('')
  }

  async function handleSubmit(e) {
    e.preventDefault() // stop the browser from reloading the page, had this issue come up twice during testing.

    const newErrors = validate(form, services, editingId)
    setErrors(newErrors)
    setSaveError('')
    if (newErrors.name || newErrors.description || newErrors.duration || newErrors.priority) {
      return // something is wrong, don't save
    }

    const fields = {
      name: form.name.trim(),
      description: form.description.trim(),
      duration: Number(form.duration),
      priority: form.priority,
      isOpen: form.isOpen,
    }
// BACKEND STOOF


    // new service: POST /api/services. editing: PUT /api/services/:id
    let url = '/api/services'
    let method = 'POST'
    if (editingId !== null) {
      url = `/api/services/${editingId}`
      method = 'PUT'
    }

    let res
    let data
    try {
      res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          // saving is staff-only, so send the token from the login page (no token = 401)
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(fields),
      })
      data = await res.json()
    } catch {
      // fetch failed
      setSaveError('Could not reach the server. Is the backend running?')
      return
    }

    if (!res.ok) {
      // the server sends one message per field in the same shape as our errors object
      if (data.fields) {
        setErrors(data.fields)
      }
      setSaveError(data.error)
      return
    }

    // data is the saved service, exactly as the server stored it
    if (editingId === null) {
      setServices([...services, data])
    } else {
      // editing: replace the matching service
      setServices(services.map((service) =>
        service.id === editingId ? data : service
      ))
    }

    resetForm()
  }

  // Delete button, only shows while editing. Asks first since there's no undo.
  async function handleDelete() {
    const service = services.find((s) => s.id === editingId)
    if (!window.confirm(`Delete "${service.name}"? This can't be undone.`)) {
      return
    }
    setSaveError('')

    let res
    let data
    try {
      res = await fetch(`/api/services/${editingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      data = await res.json()
    } catch {
      setSaveError('Could not reach the server. Is the backend running?')
      return
    }

    // e.g. 409 when guests have already queued for it, the server says to close it instead
    if (!res.ok) {
      setSaveError(data.error)
      return
    }

    // keep every service except the deleted one
    setServices(services.filter((s) => s.id !== editingId))
    resetForm()
  }
//END BACKEND STOOF

  // copy of the list sorted high to medium to low. makes a copy first
  // because .sort() changes the array it's called on, and i can't change state directly, mdiness
  const sortedServices = [...services].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])

  return (
    <div className="services-page">
      <div className="services-header">
        <h1>Service Management</h1>
      </div>

      <div className="services-layout">
        {/* left column: one card per service */}
        <section className="services-list">
          <h2 className="services-count">{services.length} services</h2>

          {loading && <p className="service-hint">Loading services…</p>}
          {loadError && <p className="service-error">{loadError}</p>}

          {sortedServices.map((service) => (
            // purple outline on the card that's currently in the form
            <div key={service.id} className={service.id === editingId ? 'service-box editing' : 'service-box'}>
              <div className="service-info">
                {/* name + open/closed pill on the same line */}
                <div className="service-top">
                  <p className="service-name">{service.name}</p>
                  {service.isOpen ? (
                    <span className="service-pill open">Open</span>
                  ) : (
                    <span className="service-pill closed">Closed</span>
                  )}
                </div>

                <p className="service-desc">{service.description}</p>

                <div className="service-stats">
                  <span className="service-stat"><Clock size={14} /> {service.duration} min per party</span>
                  {/* waiting is counted from queue_entries in serviceLogic.js */}
                  <span className="service-stat"><Users size={14} /> {service.waiting ?? 0} waiting</span>
                </div>
              </div>

              <button type="button" className="service-edit-button" onClick={() => startEdit(service)}>
                <Pencil size={14} /> Edit
              </button>
            </div>
          ))}
        </section>

        {/* right column: one form for both making a new service and editing an existing one */}
        <aside className="services-form-box">
          <h2 className="service-form-title">
            {editingId === null ? 'New service' : `Edit ${services.find((s) => s.id === editingId).name}`}
          </h2>

          {/* noValidate turns off the browser's own popups, had to google this one, never heard of it befoer */}
          <form className="service-form" onSubmit={handleSubmit} noValidate>
            <div className="service-field">
              <label htmlFor="service-name" className="service-label">
                Service name <span className="service-required">*</span>
              </label>
              <input
                id="service-name"
                type="text"
                className={errors.name ? 'service-input invalid' : 'service-input'}
                maxLength={NAME_MAX}
                placeholder="Chef's counter"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              {errors.name ? (
                <p className="service-error">{errors.name}</p>
              ) : (
                <p className="service-hint">{form.name.length}/{NAME_MAX} characters</p>
              )}
            </div>

            <div className="service-field">
              <label htmlFor="service-description" className="service-label">
                Description <span className="service-required">*</span>
              </label>
              <textarea
                id="service-description"
                className={errors.description ? 'service-input service-textarea invalid' : 'service-input service-textarea'}
                maxLength={DESCRIPTION_MAX}
                placeholder="Six seats facing the kitchen. Tasting menu only."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
              {errors.description ? (
                <p className="service-error">{errors.description}</p>
              ) : (
                <p className="service-hint">{form.description.length}/{DESCRIPTION_MAX} · shown to guests when they pick a service</p>
              )}
            </div>

            <div className="service-field">
              <label htmlFor="service-duration" className="service-label">
                Expected duration <span className="service-required">*</span>
              </label>
              <input
                id="service-duration"
                type="number"
                className={errors.duration ? 'service-input invalid' : 'service-input'}
                min={DURATION_MIN}
                max={DURATION_MAX}
                step={1}
                placeholder="45"
                value={form.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
              />
              {errors.duration ? (
                <p className="service-error">{errors.duration}</p>
              ) : (
                <p className="service-hint">Minutes per party, used for wait estimates</p>
              )}
            </div>

            {/* priority = list order + bribe price (see the comment at the top) */}
            <div className="service-field">
              <label htmlFor="service-priority" className="service-label">
                Priority level <span className="service-required">*</span>
              </label>
              <select
                id="service-priority"
                className={errors.priority ? 'service-input invalid' : 'service-input'}
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              >
                <option value="">Choose…</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {errors.priority ? (
                <p className="service-error">{errors.priority}</p>
              ) : (
                <p className="service-hint">Higher priority is listed first and costs more to skip the line</p>
              )}
            </div>

            <label className="service-checkbox-row">
              <input
                type="checkbox"
                checked={form.isOpen}
                onChange={(e) => handleChange('isOpen', e.target.checked)}
              />
              <span>
                Open for guests
                <span className="service-hint service-checkbox-hint">Closed services stay visible to staff but guests can't join them.</span>
              </span>
            </label>

            <div className="service-form-buttons">
              <button type="submit" className="service-save-button">
                {editingId === null ? 'Create service' : 'Save changes'}
              </button>
              {/* only show Cancel while editing, a new service has nothing to cancel */}
              {editingId !== null && (
                <button type="button" className="service-cancel-button" onClick={resetForm}>Cancel</button>
              )}
              {editingId !== null && (
                <button type="button" className="service-delete-button" onClick={handleDelete}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
            {saveError && <p className="service-error">{saveError}</p>}
          </form>
        </aside>
      </div>
    </div>
  )
}

export default AdminServicesPage
