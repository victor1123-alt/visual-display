import { useEffect, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const defaultWsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:5000/ws/markets`;
const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

function App() {
  const [page, setPage] = useState(getPageFromPath());
  const [apiStatus, setApiStatus] = useState('Checking API...');
  const [session, setSession] = useState(() => localStorage.getItem('visualdisplay-session') === 'active');

  useEffect(() => {
    const onPopState = () => setPage(getPageFromPath());

    window.addEventListener('popstate', onPopState);
    fetch(`${apiUrl}/health`)
      .then((response) => {
        if (!response.ok) throw new Error('API request failed');
        setApiStatus('API connected');
      })
      .catch(() => setApiStatus('API unavailable'));

    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(nextPage) {
    window.history.pushState({}, '', nextPage === 'home' ? '/' : `/${nextPage}`);
    setPage(nextPage);
    window.scrollTo(0, 0);
  }

  function login() {
    localStorage.setItem('visualdisplay-session', 'active');
    setSession(true);
    navigate('dashboard');
  }

  function logout() {
    localStorage.removeItem('visualdisplay-session');
    setSession(false);
    navigate('home');
  }

  return <>
    <Navbar page={page} session={session} navigate={navigate} logout={logout} />
    {page === 'about' && <AboutPage navigate={navigate} />}
    {page === 'login' && <LoginPage login={login} navigate={navigate} />}
    {page === 'dashboard' && session && <DashboardPage apiStatus={apiStatus} />}
    {page === 'dashboard' && !session && <LoginPage login={login} navigate={navigate} gated />}
    {page === 'home' && <HomePage navigate={navigate} />}
  </>;
}

function Navbar({ page, session, navigate, logout }) {
  return <nav className="navbar navbar-expand-lg navbar-dark app-nav sticky-top">
    <div className="container">
      <button className="navbar-brand fw-bold brand-button" onClick={() => navigate('home')}>
        <span className="brand-mark">V</span>VisualDisplay
      </button>
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Toggle navigation">
        <span className="navbar-toggler-icon" />
      </button>
      <div className="collapse navbar-collapse" id="mainNav">
        <div className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
          <button className={`nav-link ${page === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}>Overview</button>
          <button className={`nav-link ${page === 'about' ? 'active' : ''}`} onClick={() => navigate('about')}>How it works</button>
          {session
            ? <><button className={`nav-link ${page === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}>Dashboard</button><button className="btn btn-light btn-sm px-3 ms-lg-2" onClick={logout}>Log out</button></>
            : <button className="btn btn-primary btn-sm px-3 ms-lg-2" onClick={() => navigate('login')}>Log in</button>}
        </div>
      </div>
    </div>
  </nav>;
}

function HomePage({ navigate }) {
  return <main className="app-shell">
    <section className="container hero-section">
      <div className="row align-items-center g-5">
        <div className="col-lg-7">
          <div className="eyebrow-row"><span className="eyebrow-dot" /> Real-time odds intelligence</div>
          <h1 className="display-3 fw-bold mb-4">Turn market noise into your next clear move.</h1>
          <p className="lead text-secondary mb-4 hero-copy">VisualDisplay brings bookmaker prices, probability and market movement into one focused workspace—so you can spot value before it disappears.</p>
          <div className="d-flex flex-wrap gap-3">
            <button className="btn btn-primary btn-lg px-4" onClick={() => navigate('login')}>Open your dashboard <span aria-hidden="true">→</span></button>
            <button className="btn btn-outline-secondary btn-lg px-4" onClick={() => navigate('about')}>See how it works</button>
          </div>
          <div className="hero-proof mt-4">
            <span className="proof-avatars"><i>JD</i><i>AK</i><i>MO</i></span>
            <span><strong>Built for sharper decisions</strong><br /><small>Transparent calculations. No guaranteed-return claims.</small></span>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="dashboard-preview">
            <div className="preview-header"><div><span className="preview-kicker">Live workspace</span><strong>Market overview</strong></div><span className="live-status"><span /> Live</span></div>
            <div className="preview-metrics"><div><small>Tracked markets</small><strong>248</strong><span className="positive">+12.8%</span></div><div><small>Best edge</small><strong>4.72%</strong><span className="positive">Today</span></div></div>
            <div className="preview-chart"><div className="chart-labels"><span>Market movement</span><small>Last 24 hours</small></div><svg viewBox="0 0 360 110" role="img" aria-label="Illustrative market movement chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#818cf8" stopOpacity=".35" /><stop offset="1" stopColor="#818cf8" stopOpacity="0" /></linearGradient></defs><path d="M0 88 C24 82, 30 70, 52 74 S83 92, 105 64 S137 54, 157 62 S184 52, 202 47 S231 65, 249 40 S278 51, 295 28 S330 34, 360 12 V110 H0Z" fill="url(#chartFill)" /><path d="M0 88 C24 82, 30 70, 52 74 S83 92, 105 64 S137 54, 157 62 S184 52, 202 47 S231 65, 249 40 S278 51, 295 28 S330 34, 360 12" fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" /></svg></div>
            <div className="preview-opportunity"><div><span className="preview-kicker">Arbitrage detected</span><strong>Arsenal vs Chelsea</strong><small>Match winner · 3 bookmakers</small></div><span className="edge-pill">+1.46%</span></div>
            <div className="preview-footer"><span><span className="tiny-check">✓</span> Prices refreshed</span><span>2 min ago</span></div>
          </div>
        </div>
      </div>
    </section>

    <section className="trust-strip"><div className="container"><div className="row g-3 align-items-center"><div className="col-lg-4"><span className="trust-title">A calmer way to read the market</span></div><div className="col-6 col-lg-2"><strong>15 sec</strong><small>Refresh cadence</small></div><div className="col-6 col-lg-2"><strong>100%</strong><small>Transparent math</small></div><div className="col-6 col-lg-2"><strong>24/7</strong><small>Market monitoring</small></div><div className="col-6 col-lg-2"><strong>1 view</strong><small>For every signal</small></div></div></div></section>

    <section id="features" className="container content-section">
      <div className="section-heading split-heading"><div><div className="eyebrow">Designed for clarity</div><h2 className="h1">The signal is there. We help you see it.</h2></div><p className="text-secondary section-intro">From price comparison to suggested stakes, every part of the workspace is designed to help you move from scattered information to an informed decision.</p></div>
      <div className="row g-4"><Feature number="01" icon="↗" title="Compare faster" text="Bring multiple bookmaker prices into a single, easy-to-scan view and reduce the noise." /><Feature number="02" icon="◎" title="Measure the edge" text="See implied probability, margin and suggested stakes calculated consistently across markets." /><Feature number="03" icon="◌" title="Follow movement" text="Use live updates and timestamps to understand what is changing while it matters." /></div>
    </section>

    <section className="container workflow-section"><div className="workflow-card"><div className="row g-5 align-items-center"><div className="col-lg-5"><div className="eyebrow">A simple workflow</div><h2 className="h1">From raw prices to a confident view.</h2><p className="text-secondary mb-0">VisualDisplay keeps the important parts close at hand, with less clutter between the market and your decision.</p></div><div className="col-lg-7"><div className="workflow-steps"><WorkflowStep number="1" title="Connect the market" text="Pull current prices from The Odds API." /><WorkflowStep number="2" title="Normalize the data" text="Standardize outcomes, timestamps and bookmakers." /><WorkflowStep number="3" title="Surface the edge" text="Highlight qualified opportunities and stake guidance." /></div></div></div></div></section>

    <section className="container content-section"><div className="section-heading"><div className="eyebrow">Made for disciplined analysis</div><h2 className="h1">A better operating rhythm for live markets.</h2></div><div className="row g-4"><div className="col-md-6"><article className="story-card story-card-dark"><span className="story-icon">✦</span><h3 className="h3">Know what changed.</h3><p className="mb-0">Live synchronization and clear timestamps help you distinguish a fresh signal from yesterday's noise.</p></article></div><div className="col-md-6"><article className="story-card"><span className="story-icon">⌁</span><h3 className="h3">Know what it means.</h3><p className="text-secondary mb-0">Every opportunity includes the underlying prices, bookmaker and stake split, so the calculation stays inspectable.</p></article></div></div></section>

    <FaqSection />
    <PricingSection navigate={navigate} />
  </main>;
}

function AboutPage({ navigate }) {
  return <main className="app-shell"><section className="container inner-page content-section"><div className="eyebrow">About VisualDisplay</div><h1 className="display-4 fw-bold mb-4">Useful context for people who take markets seriously.</h1><p className="lead text-secondary page-lead">VisualDisplay is an odds intelligence platform built to make fragmented bookmaker data easier to compare, understand and act on.</p><div className="row g-4 mt-4"><Feature number="01" icon="◈" title="Our purpose" text="Turn scattered odds into a simple, readable picture of the market." /><Feature number="02" icon="⌘" title="Our approach" text="Start with transparent calculations, clear timestamps and useful context." /><Feature number="03" icon="✓" title="Our promise" text="Inform decisions without promising guaranteed returns or hiding the underlying math." /></div><div className="about-grid mt-5"><div><div className="eyebrow">What we value</div><h2 className="h2">Signal over spectacle.</h2></div><div className="about-values"><p><strong>Readable by default.</strong> A good dashboard should help you think, not compete for your attention.</p><p><strong>Honest about uncertainty.</strong> An edge is a calculation, not a guarantee.</p><p className="mb-0"><strong>Built to improve.</strong> The product starts with the essentials and grows with better data and feedback.</p></div></div><div className="about-callout mt-5"><div><div className="eyebrow">Ready to see it clearly?</div><h2 className="h3 mb-0">Start with your VisualDisplay workspace.</h2></div><button className="btn btn-primary" onClick={() => navigate('login')}>View membership</button></div></section></main>;
}

function LoginPage({ login, navigate, gated }) {
  return <main className="app-shell auth-shell"><div className="auth-card"><div className="auth-icon">V</div><div className="eyebrow mb-2">Member access</div><h1 className="h2 fw-bold mb-2">Welcome back.</h1><p className="text-secondary mb-4">Sign in to view your market intelligence dashboard.</p>{gated && <div className="alert alert-warning small">Your dashboard is available to subscribed members. Sign in to continue.</div>}<label className="form-label">Email address</label><input className="form-control mb-3" type="email" placeholder="you@example.com" /><label className="form-label">Password</label><input className="form-control mb-4" type="password" placeholder="Your password" /><button className="btn btn-primary w-100 mb-3" onClick={login}>Log in</button><p className="small text-secondary text-center mb-0">Demo access is enabled while authentication is being connected.</p><hr className="my-4" /><p className="small text-center mb-0">New here? <button className="text-button" onClick={() => navigate('home')}>View plans on the homepage</button></p></div></main>;
}

function DashboardPage({ apiStatus }) {
  const [opportunities, setOpportunities] = useState([]);
  const [providerStatus, setProviderStatus] = useState({ status: 'checking' });
  const [syncStatus, setSyncStatus] = useState('Connecting live feed...');

  useEffect(() => {
    fetch(`${apiUrl}/opportunities`)
      .then((response) => response.json())
      .then((payload) => {
        setOpportunities(payload.data || []);
        setProviderStatus(payload.meta?.providerStatus || { status: 'unknown' });
      })
      .catch(() => setProviderStatus({ status: 'unavailable', error: 'API unavailable' }));

    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setSyncStatus('Live feed connected');
    socket.onmessage = (event) => {
      const snapshot = JSON.parse(event.data);
      setOpportunities(snapshot.opportunities || []);
      setProviderStatus(snapshot.oddsApi || { status: 'unknown' });
      setSyncStatus(`Synced ${new Date(snapshot.capturedAt).toLocaleTimeString()}`);
    };
    socket.onerror = () => setSyncStatus('Live feed unavailable');

    return () => socket.close();
  }, []);

  const providerLabel = providerStatus.status === 'connected' ? 'Live' : providerStatus.status === 'demo' ? 'Demo' : 'Offline';

  return <main className="app-shell"><section className="container py-5 dashboard-page"><div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4"><div><div className="eyebrow mb-2">Member dashboard</div><h1 className="h2 fw-bold mb-1">Good morning, member.</h1><p className="text-secondary mb-0">Your current market overview, in one focused view.</p></div><div className="text-end"><span className="status-pill"><span className="status-dot" />{apiStatus}</span><div className="small text-secondary mt-1">{syncStatus}</div></div></div>{providerStatus.status === 'error' && <div className="alert alert-danger"><strong>The Odds API error:</strong> {providerStatus.error}</div>}{providerStatus.status === 'demo' && <div className="alert alert-warning"><strong>Demo mode:</strong> Add an Odds API key to <code>server/.env</code> to receive live market data.</div>}<div className="row g-4 mb-4"><div className="col-md-4"><MetricCard label="Opportunities" value={opportunities.length} detail="Qualified right now" /></div><div className="col-md-4"><MetricCard label="Provider" value={providerLabel} detail="The Odds API" /></div><div className="col-md-4"><MetricCard label="Subscription" value="Active" detail="Renews monthly" /></div></div><div className="opportunity-panel p-4"><div className="d-flex flex-wrap justify-content-between align-items-center mb-3"><div><div className="eyebrow mb-1">Opportunity feed</div><h2 className="h4 mb-0">Latest signals</h2></div><span className="small text-secondary">Updated automatically</span></div>{opportunities.length === 0 && <div className="empty-state"><span className="empty-state-icon">⌁</span><div><strong>No qualified opportunities yet.</strong><p className="text-secondary mb-0">The feed will update here when the market meets your criteria.</p></div></div>}{opportunities.map((opportunity) => <OpportunityRow key={opportunity.id} opportunity={opportunity} />)}</div></section></main>;
}

function PricingSection({ navigate }) {
  return <section className="pricing-section"><div className="container py-5"><div className="row align-items-end g-4 mb-4"><div className="col-lg-7"><div className="eyebrow">Simple membership</div><h2 className="h1 mb-0">Choose a sharper view.</h2></div><div className="col-lg-5"><p className="text-secondary mb-0">One focused workspace for comparing odds, measuring the edge and following market signals.</p></div></div><div className="row g-4 align-items-stretch"><div className="col-lg-7"><div className="pricing-card p-4 p-md-5 h-100"><div className="d-flex justify-content-between align-items-start"><div><span className="pricing-label">VisualDisplay Pro</span><h3 className="h2 mt-3">Market intelligence, without the clutter.</h3></div><span className="price-tag">Pro</span></div><div className="price my-4">$19 <small>/ month</small></div><div className="row g-3"><div className="col-sm-6"><div className="plan-feature"><span>✓</span> Live opportunity dashboard</div></div><div className="col-sm-6"><div className="plan-feature"><span>✓</span> Suggested stake calculations</div></div><div className="col-sm-6"><div className="plan-feature"><span>✓</span> Market history and stats</div></div><div className="col-sm-6"><div className="plan-feature"><span>✓</span> Clear provider timestamps</div></div></div><button className="btn btn-primary mt-4" onClick={() => navigate('login')}>Subscribe and log in <span aria-hidden="true">→</span></button><p className="small text-secondary mt-3 mb-0">Payment integration coming next.</p></div></div><div className="col-lg-5"><div className="pricing-note h-100"><div className="eyebrow">The fine print</div><h3 className="h4">Information, not promises.</h3><p className="text-secondary">VisualDisplay highlights mathematical opportunities based on available prices. Markets move, providers differ and execution has real-world constraints.</p><p className="text-secondary mb-0">Use the dashboard as decision support, and always apply your own risk controls.</p></div></div></div></div></section>;
}

function FaqSection() {
  return <section className="container faq-section content-section"><div className="section-heading"><div className="eyebrow">Questions, answered</div><h2 className="h1">A clearer product starts with clear expectations.</h2></div><div className="row g-3"><Faq question="Where does the data come from?" answer="VisualDisplay currently uses The Odds API as its active odds provider. The server normalizes the feed and refreshes it on a regular cadence." /><Faq question="What is an arbitrage opportunity?" answer="It is a set of prices where the sum of implied probabilities is below 100%, creating a calculated margin after allocating the stake across outcomes." /><Faq question="Does VisualDisplay guarantee returns?" answer="No. The product provides information and calculations, not guaranteed results. Prices, availability and execution can change." /></div></section>;
}

function Faq({ question, answer }) {
  return <details className="faq-item"><summary>{question}<span>+</span></summary><p className="text-secondary mb-0">{answer}</p></details>;
}

function WorkflowStep({ number, title, text }) {
  return <div className="workflow-step"><span className="step-number">{number}</span><div><h3 className="h5 mb-1">{title}</h3><p className="text-secondary mb-0">{text}</p></div></div>;
}

function Feature({ number, icon, title, text }) {
  return <div className="col-md-4"><article className="feature-card p-4 h-100"><div className="feature-top"><span className="feature-icon">{icon}</span><span className="feature-number">{number}</span></div><h3 className="h4 mt-4">{title}</h3><p className="text-secondary mb-0">{text}</p></article></div>;
}

function MetricCard({ label, value, detail }) {
  return <article className="metric-card p-4 h-100"><p className="text-uppercase small text-secondary mb-2">{label}</p><h2 className="h3 mb-1">{value}</h2><p className="small text-secondary mb-0">{detail}</p></article>;
}

function OpportunityRow({ opportunity }) {
  const margin = Number(opportunity.arbitrage?.margin || 0).toFixed(2);
  const stakes = opportunity.arbitrage?.stakes || [];

  return <article className="opportunity-row p-3 mb-3"><div className="d-flex flex-wrap justify-content-between gap-2"><div><strong>{opportunity.homeTeam} <span className="versus">vs</span> {opportunity.awayTeam}</strong><p className="small text-secondary mb-1">{opportunity.market} · {opportunity.competition}</p><p className="small match-time mb-0">Starts {formatMatchTime(opportunity.startsAt)}</p></div><span className="margin-badge">+{margin}% edge</span></div><div className="row g-2 mt-2">{stakes.map((stake) => <div className="col-md-4" key={`${opportunity.id}-${stake.outcome}`}><div className="stake-card"><span>{stake.outcome}</span><strong>{stake.odds}</strong><small>{stake.bookmaker} · stake {stake.stake}</small></div></div>)}</div></article>;
}

function formatMatchTime(value) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getPageFromPath() {
  const path = window.location.pathname.replace('/', '');
  return ['about', 'login', 'dashboard'].includes(path) ? path : 'home';
}

export default App;
