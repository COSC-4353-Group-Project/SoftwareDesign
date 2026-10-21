import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LoginPage.css'

const NAME_MAX = 60
const EMAIL_MAX = 254
const PHONE_MAX = 20

//  Validation helpers 
// Each returns an error message, or '' when the value is valid.

/** Should help with user validation, used same process as regsiter page*/
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
//same goes for the return, that was rough. 
function validateEmail(value) {
  const email = value.trim()
  if (!email) return '' // optional
  if (email.length > EMAIL_MAX) return `Email must be ${EMAIL_MAX} characters or fewer.`
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Enter a valid email address.'
}

const validators = {
  name: (form) => validateName(form.name),
  phone: (form) => validatePhone(form.phone),
  email: (form) => validateEmail(form.email),
}

function isValid(errors) {
  return Object.values(errors).every((message) => !message)
}


function TextField({ id, label, required, error, ...inputProps }) {
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
      ) : null}
    </div>
  )
}

function LoginPage() {
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: ''
    })

    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)
    const navigate = useNavigate()

    // Updating the full name/phone fields
    const handleChange = (key) => e => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        const next = {...form, [key]: value}
        setForm(next)
        if (errors[key]) setErrors((prev) => ({...prev, [key]: validators[key](next)}))
    }

    const handleBlur = (key) => () => {
        setErrors((prev) => ({ ...prev, [key]: validators[key](form) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = Object.fromEntries(Object.entries(validators).map(([key, check]) => [key, check(form)]))
    setErrors(nextErrors)
    if (!isValid(nextErrors)) return

    setBusy(true)
    // this will be replaced when the backend is built. 
    // The data to send is: name, normalizePhone(form.phone), email.
    await new Promise((resolve) => setTimeout(resolve, 800))
    setBusy(false)
    navigate('/dashboard')
  }

    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">Sign In to BribeQueue</h1>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    <TextField
                    id="sign-name"
                    label="Full name"
                    required
                    error={errors.name}
                    type="text"
                    autoComplete="name"
                    maxLength={NAME_MAX}
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange('name')}
                    onBlur={handleBlur('name')}
                    />

                    <TextField
                    id="sign-phone"
                    label="Phone number"
                    required
                    error={errors.phone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={PHONE_MAX}
                    placeholder="(903) 420-1987"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    onBlur={handleBlur('phone')}
                    />

                    <button type="submit" className="login-btn-primary" disabled={busy}>
                        {busy ? "Signing In..." : "Sign In"}
                    </button>

                    <button className="goog-btn-primary">
                        {"Continue with Google"}
                    </button>


                </form>
                
            </div>
        </div>

    )
}

export default LoginPage