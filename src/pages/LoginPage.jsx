import { useState } from 'react'
import './LoginPage.css'

function TextField({id, label, required}){
    return (
        <div className="login-field">
            <label htmlFor={id} className="login-field-label">
                {label}
                {required && <span className="required"> *</span>}
            </label>

            <input
            id={id}
            className="login-field-input"/>
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
                <h1 className="login-title">Sign In to Bribequeue</h1>

                <form className="login-form">
                    <TextField
                    id="sign-name"
                    label="Full name"
                    required
                    type="text"
                    value={form.name}
                    />

                    <TextField
                    id="sign-phone"
                    label="Phone number"
                    required
                    type="tel"
                    value={form.phone}
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