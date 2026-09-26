import { useState } from 'react'
import './LoginPage.css'

function TextField({id, label, required, hint, ...inputProps}){
    // const messageId = `${id}-msg` testing purposes, will reinstate later
    return (
        <div className="login-field">
            <label htmlFor={id} className="login-field-label">
                {label}
                {required && <span className="required"> *</span>}
            </label>

            <input
            id={id}
            className={"login-field-input"}
            // aria-describedby={hint ? messageId : undefined} used for testing--we'll deal with that later
            {...inputProps} // gets the funny hint messages showing in the input boxes
            />
            {/* {hint ? (
                <p id={messageId} className="login-field-hint">{hint}</p>
            ): null} */} {/** used for testing--we'll also deal with this later*/}
        </div>
    )
}

function LoginPage() {
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: ''
    })

    // const [errors, setErrors] = useState({})
    // const [busy, setBusy] = useState(false)
    // const [done, setDone] = useState(false)
    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">Sign In to BribeQueue</h1>

                <form className="login-form">
                    <TextField
                    id="sign-name"
                    label="Full name"
                    required
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    />

                    <TextField
                    id="sign-phone"
                    label="Phone number"
                    required
                    type="tel"
                    value={form.phone}
                    placeholder="(903) 420-1987"
                    />

                    <button className="login-btn-primary">
                        {"Sign In"}
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