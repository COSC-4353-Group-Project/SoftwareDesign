import { useState } from 'react'
import { Link } from 'react-router-dom'
import './RegistrationPage.css'

const NAME_MAX = 60
const PHONE_MAX = 20

//  Validation helpers 
// Each returns an error message, or '' when the value is valid.

/** Should help with user validation*/
function normalizePhone(value) {
  const digits = value.replace(/\D/g, '') // keep only 0-9
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return /^[2-9]\d{9}$/.test(ten) ? ten : null // area codes never start with 0 or 1
}

function validateName(value) {
  const name = value.trim()
  if (!name) return 'Name is required.'
  if (name.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer.`
  // \p{L} = a letter in any language, so names like "José" pass (had to look this one up)
  if (!/^[\p{L}\s'.-]+$/u.test(name)) return "Name can only contain letters, pick a better name."
  return ''
}

function validatePhone(value) {
  if (!value.trim()) return 'Phone number is required buddy.'
  return normalizePhone(value) ? '' : 'Enter a valid 10-digit US phone number.'
}
function validateTerms(checked) {
  return checked ? '' : 'You must accept the terms without reading to continue.'
}

const validators = {
  name: (form) => validateName(form.name),
  phone: (form) => validatePhone(form.phone),
  terms: (form) => validateTerms(form.terms),
}

function isValid(errors) {
  return Object.values(errors).every((message) => !message)
}

//  Reusable text field 

/** Label + input + (error or hint), with the accessibility wiring done once. */
function TextField({ id, label, required, hint, error, ...inputProps }) {
  const messageId = `${id}-msg`
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="required"> *</span>}
      </label>
      <input
        id={id}
        className={error ? 'field-input invalid' : 'field-input'}
        {...inputProps}
      />
      {error ? (
        <p id={messageId} className="field-error" role="alert">{error}</p>
      ) : hint ? (
        <p id={messageId} className="field-hint">{hint}</p>
      ) : null}
    </div>
  )
}

// Page 

/** Registration for users signing up with a phone number instead of Google. */
function RegistrationPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    smsOptIn: true,
    terms: false,
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  // message from the server, like "An account with this phone number already exists."
  const [serverError, setServerError] = useState('')

  // Update a field; if it's already showing an error, re-check it live so the error clears as they fix it.
  const handleChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    const next = { ...form, [key]: value }
    setForm(next)
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: validators[key](next) }))
  }

  // Check a field when the user leaves it.
  const handleBlur = (key) => () => {
    setErrors((prev) => ({ ...prev, [key]: validators[key](form) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = Object.fromEntries(Object.entries(validators).map(([key, check]) => [key, check(form)]))
    setErrors(nextErrors)
    if (!isValid(nextErrors)) return

    setBusy(true)
    setServerError('')

    // POST /api/auth/register (server/routes/auth.js). Terms is only checked here, the server doesn't need it.
    let res
    let data
    try {
      res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          smsOptIn: form.smsOptIn,
        }),
      })
      data = await res.json()
    } catch {
      setBusy(false)
      setServerError('Could not reach the server. Is the backend running?')
      return
    }
    setBusy(false)

    if (!res.ok) {
      // 400 = bad fields, 409 = phone already registered. Both send messages per field.
      if (data.fields) {
        setErrors({ ...errors, ...data.fields })
      }
      setServerError(data.error)
      return
    }

    // the server logs new accounts in right away, so save the token like the login page does
    localStorage.setItem('token', data.token)
    setDone(true)
  }

  if (done) {
    return (
      <div className="register-page">
        <div className="register-card">
          <h1 className="register-title">You're all set, {form.name.trim().split(' ')[0]}!</h1>
          <p className="register-subtitle">
            Your account is ready. We'll text {form.phone} when your table is ready.
          </p>
          {/* straight to the dashboard now that it's built, they just made an account so no need to sign in again */}
          <Link to="/dashboard" className="btn-primary btn-link">Continue to dashboard</Link>
        </div>
      </div>
    )
  }
//big stuff below.
  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-title">Create your account</h1>
        <p className="register-subtitle">No Google account? Sign up with your phone number.</p>

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <TextField
            id="reg-name"
            label="Full name"
            required
            error={errors.name}
            type="text"
            autoComplete="name"
            maxLength={NAME_MAX}
            placeholder="Jordan Lee"
            value={form.name}
            onChange={handleChange('name')}
            onBlur={handleBlur('name')}
          />
          <TextField
            id="reg-phone"
            label="Phone number"
            required
            hint="Used to sign in and for table-ready texts."
            error={errors.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={PHONE_MAX}
            placeholder="(713) 555-0123"
            value={form.phone}
            onChange={handleChange('phone')}
            onBlur={handleBlur('phone')}
          />

          <label className="checkbox-row">
            <input type="checkbox" checked={form.smsOptIn} onChange={handleChange('smsOptIn')} />
            <span>Text me queue updates (standard rates apply)</span>
          </label>

          <div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={handleChange('terms')}
              />
              <span>
                I agree to the Terms of Service and Privacy Policy<span className="required"> *</span>
              </span>
            </label>
            {errors.terms && (
              <p id="reg-terms-msg" className="field-error" role="alert">{errors.terms}</p>
            )}
          </div>

          {serverError && <p className="field-error">{serverError}</p>}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <p className="register-footer">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  )
}

export default RegistrationPage
