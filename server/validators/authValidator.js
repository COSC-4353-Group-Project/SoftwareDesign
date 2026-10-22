// Validation for register and login. Same rules as RegistrationPage.jsx and LoginPage.jsx,
// plus type checks, since the API can be sent anything, not just our forms.

export const NAME_MAX = 60

// Turns any US phone format into 10 digits: "(713) 555-0123" and "1-713-555-0123"
// both become "7135550123". Returns null if it isn't a valid US number. had to copy paste this one ngl
export function normalizePhone(value) {
  const digits = value.replace(/\D/g, '') // keep only 0-9
  let ten = digits
  if (digits.length === 11 && digits.startsWith('1')) {
    ten = digits.slice(1) // drop the leading country code
  }
  // 10 digits, and area codes never start with 0 or 1
  if (/^[2-9]\d{9}$/.test(ten)) {
    return ten
  }
  return null
}

function checkName(name) {
  if (name === undefined || name === null) {
    return 'Name is required come on.'
  }
  if (typeof name !== 'string') {
    return 'Name must be text dont be special.'
  }
  const trimmed = name.trim()
  if (trimmed === '') {
    return 'Name is required come on.'
  }
  if (trimmed.length > NAME_MAX) {
    return `Name must be ${NAME_MAX} characters or fewer, why such a long name.`
  }
  // \p{L} = a letter in any language, so names like "José" pass
  if (!/^[\p{L}\s'.-]+$/u.test(trimmed)) {
    return 'Name can only contain letters, dont be special..'
  }
  return ''
}

function checkPhone(phone) {
  if (phone === undefined || phone === null || phone === '') {
    return 'Phone number is required.'
  }
  if (typeof phone !== 'string') {
    return 'Phone number must be text.'
  }
  if (normalizePhone(phone) === null) {
    return 'Enter a valid 10-digit US phone number.'
  }
  return ''
}

// POST /api/auth/register   body: { name, phone, smsOptIn }
// Returns one message per field. An empty string means that field is fine.
export function validateRegister(body) {
  if (typeof body !== 'object' || body === null) {
    body = {}
  }

  let smsOptIn = ''
  if (body.smsOptIn !== undefined && typeof body.smsOptIn !== 'boolean') {
    smsOptIn = 'Text updates must be true or false.'
  }

  return {
    name: checkName(body.name),
    phone: checkPhone(body.phone),
    smsOptIn,
  }
}

// POST /api/auth/login   body: { name, phone }
export function validateLogin(body) {
  if (typeof body !== 'object' || body === null) {
    body = {}
  }
  return {
    name: checkName(body.name),
    phone: checkPhone(body.phone),
  }
}

// True if any field has an error message.
export function hasErrors(errors) {
  return Object.values(errors).some((message) => message !== '')
}
