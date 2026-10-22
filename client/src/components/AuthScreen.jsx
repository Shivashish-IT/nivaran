import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import '../styles/nivaran-reference-login.css';

const ASSET = '/nivaran-login-assets/';

export default function AuthScreen({ onAuthenticated }) {
  const googleButtonRef = useRef(null);
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).has('resetToken') ? 'reset' : 'login');
  const [success, setSuccess] = useState('');
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resetToken) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('resetToken');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [resetToken]);

  useEffect(() => {
    if (!['register', 'login'].includes(mode) || !googleButtonRef.current) return;
    let cancelled = false;
    let interval;
    api.googleConfig().then(({ clientId }) => {
      if (cancelled) return;
      const initialize = () => {
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return false;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async response => {
            setError(''); setBusy(true);
            try { onAuthenticated(await api.googleSignIn(response.credential)); }
            catch (err) { setError(err.message || 'Google sign-in failed. Please try again.'); }
            finally { setBusy(false); }
          }, auto_select: false, cancel_on_tap_outside: true,
        });
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: 320 });
        return true;
      };
      if (initialize()) return;
      let script = document.querySelector('script[data-nivaran-google="true"]');
      if (!script) {
        script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client';
        script.async = true; script.defer = true; script.dataset.nivaranGoogle = 'true'; document.head.appendChild(script);
      }
      interval = window.setInterval(() => { if (initialize()) window.clearInterval(interval); }, 150);
      window.setTimeout(() => window.clearInterval(interval), 10000);
    }).catch(err => { if (!cancelled) setError(err.message || 'Google sign-in is not available.'); });
    return () => { cancelled = true; if (interval) window.clearInterval(interval); };
  }, [mode, onAuthenticated]);

  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      if (mode === 'forgot') {
        const data = await api.requestPasswordReset(email);
        setSuccess(data.message || 'If an active account exists for that email, password reset instructions will be sent.');
      } else if (mode === 'reset') {
        await api.resetPassword({ token: resetToken, password });
        setSuccess('Password reset successfully. You can now sign in with your new password.');
        setPassword(''); setMode('login'); window.history.replaceState({}, '', window.location.pathname);
      } else {
        const data = mode === 'register'
          ? await api.register({ name, email, password, organizationName })
          : await api.login({ email, password });
        onAuthenticated(data);
      }
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="nivaran-reference">
    <div className="page-shell">
      <section className="showcase" aria-label="Nivaran campus maintenance portal">
        <div className="campus-photo" aria-hidden="true" />
        <div className="brand" id="home"><img src={ASSET + 'nivaran-n-logo.png'} alt="Nivaran N logo" className="brand-mark" /><div><div className="brand-name">Nivaran</div><div className="brand-tagline">Report <span>|</span> Track <span>|</span> Resolve</div></div></div>
        <div className="hero-copy" id="about"><h1>A Better Campus<br/><span>Starts with You</span></h1>
          <div className="features">
            <div className="feature"><span className="feature-icon" aria-hidden="true">▤<b>＋</b></span><span>Report<br/>Issues</span></div>
            <div className="feature"><Search className="feature-search-icon" size={30} strokeWidth={2.5} aria-hidden="true" /><span>Track<br/>Progress</span></div>
            <div className="feature"><span className="feature-icon tools-icon" aria-hidden="true">⚒</span><span>Quick<br/>Resolution</span></div>
            <div className="feature"><span className="feature-icon people-icon" aria-hidden="true">♧</span><span>Improved<br/>Campus Facilities</span></div>
          </div>
        </div>
        <div className="issue-grid" aria-label="Example campus maintenance issues">
          <article className="issue-card"><img src={ASSET+'projector.jpg'} alt="Classroom projector"/><span>Projector<br/>Not Working</span></article>
          <article className="issue-card"><img src={ASSET+'desk-chair.jpg'} alt="Classroom desks and chairs"/><span>Broken Desk<br/>or Chair</span></article>
          <article className="issue-card"><img src={ASSET+'tt-table.jpg'} alt="Table tennis table"/><span>TT Table<br/>Damaged</span></article>
          <article className="issue-card"><img src={ASSET+'washroom.jpg'} alt="Washroom tap and basin"/><span>Water Leakage<br/>in Washroom</span></article>
          <article className="issue-card"><img src={ASSET+'corridor-lights.jpg'} alt="College corridor lights"/><span>Lights / Fans<br/>Not Working</span></article>
          <article className="issue-card"><img src={ASSET+'electrical.jpg'} alt="Electrical wiring and panel"/><span>Electrical<br/>Issues</span></article>
        </div>
      </section>
      <section className="auth-area" aria-label="Login">
        <div className="auth-card">
          <div className="mobile-brand"><img src={ASSET+'nivaran-n-logo.png'} alt="Nivaran logo"/><span>Nivaran</span></div>
          <h2>{mode === 'register' ? <>Create your <span>workspace</span></> : mode === 'forgot' ? <>Reset your <span>password</span></> : mode === 'reset' ? <>Choose a new <span>password</span></> : <>Welcome to <span>Nivaran</span></>}</h2>
          <p className="subtitle">{mode === 'register' ? 'Set up your account and organization in a few steps.' : mode === 'forgot' ? 'Enter your account email to receive a reset link if an account exists.' : mode === 'reset' ? 'Choose a strong password to secure your account.' : <>Login to report and track campus<br className="desktop-break"/> maintenance issues</>}</p>
          {['login','register'].includes(mode) && <div className="mode-switch"><button type="button" className={mode==='login'?'selected':''} onClick={()=>{setMode('login');setError('');setSuccess('');}}>Login</button><button type="button" className={mode==='register'?'selected':''} onClick={()=>{setMode('register');setError('');setSuccess('');}}>Sign Up</button></div>}
          <form id="login-form" onSubmit={submit}>
            {mode === 'register' && <label className="field"><span className="field-icon" aria-hidden="true">♙</span><input type="text" name="name" placeholder="Full name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} required/></label>}
            {mode !== 'reset' && <label className="field"><span className="field-icon" aria-hidden="true">✉</span><input type="email" name="email" placeholder="Email address" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required/></label>}
            {mode !== 'forgot' && <label className="field"><span className="field-icon lock" aria-hidden="true">♙</span><input type={showPassword?'text':'password'} name="password" placeholder={mode==='register'?'At least 10 characters':'Password'} autoComplete={mode==='register'||mode==='reset'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={mode==='register'||mode==='reset'?10:1} maxLength={128} required/><button type="button" className="show-password" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></label>}
            {mode === 'register' && <label className="field"><span className="field-icon" aria-hidden="true">⌂</span><input type="text" name="organization" placeholder="Organization name" value={organizationName} onChange={e=>setOrganizationName(e.target.value)} minLength={2} maxLength={120} required/></label>}
            <div className="form-links">{mode==='login' ? <><label className="remember"><input type="checkbox" name="remember"/> <span>Remember me</span></label><a href="#forgot" onClick={e=>{e.preventDefault();setMode('forgot');setError('');setSuccess('');}}>Forgot Password?</a></> : mode==='forgot' ? <a href="#login" onClick={e=>{e.preventDefault();setMode('login');setError('');setSuccess('');}}>Back to Login</a> : mode==='reset' ? <span>Use a strong, unique password</span> : null}</div>
            {error && <div className="form-message form-error" role="alert">{error}</div>}{success && <div className="form-message" role="status">{success}</div>}
            <button className="login-button" type="submit" disabled={busy || (mode==='reset'&&!resetToken)}>{busy?'Please wait…':mode==='login'?'Login':mode==='register'?'Create workspace':mode==='forgot'?'Send reset link':'Reset password'} {!busy&&<ArrowRight size={17}/>}</button>
            {mode === 'reset' && !resetToken && <p className="form-message form-error">This reset link is missing or invalid. Request a new password reset link.</p>}
            {['login','register'].includes(mode) && <><div className="or-divider"><span/><b>OR</b><span/></div><div className="google-wrap" ref={googleButtonRef}/><p className="google-caption">Continue securely with your Google account</p></>}
            {mode==='login' && <p className="signup">Don't have an account? <a href="#signup" onClick={e=>{e.preventDefault();setMode('register');setError('');setSuccess('');}}>Sign Up</a></p>}
            {mode==='register' && <p className="signup">Already have an account? <a href="#login" onClick={e=>{e.preventDefault();setMode('login');setError('');setSuccess('');}}>Login</a></p>}
          </form>
        </div>
      </section>
    </div>
  </main>;
}
