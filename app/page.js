import Link from 'next/link';
import WaveformPreview from './components/WaveformPreview';
import PlanButton from './components/PlanButton';

const STEPS = [
  {
    title: 'Upload',
    text: 'Drop in any MP3 or WAV, or click to pick one from your device.',
    icon: <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  },
  {
    title: 'Analyze',
    text: 'Your browser listens to the whole track. The audio never leaves your device.',
    icon: <path d="M3 12h2m3-5v10m4-13v16m4-11v6m4-3h1" />,
  },
  {
    title: 'See your key and BPM',
    text: 'Get the musical key, like F minor, and the tempo in seconds.',
    icon: <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    blurb: 'For checking a few tracks.',
    features: ['5 song analyses per month', 'Key and BPM for MP3 and WAV', 'Results saved to your history'],
    button: 'button-glass',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    blurb: 'For DJs and producers.',
    features: ['Unlimited song analyses', 'Key and BPM for MP3 and WAV', 'Results saved to your history', 'Cancel anytime'],
    button: 'button-teal',
    featured: true,
  },
];

function Check() {
  return (
    <svg className="check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Key &amp; BPM Finder</p>
        <h1>
          Every song has a key.
          <br />
          <span className="soft">Find it in seconds.</span>
        </h1>
        <p className="lead">
          Upload any MP3 or WAV and instantly see its musical key and tempo in BPM. It all happens in
          your browser, so your music never leaves your device.
        </p>
        <div className="hero-actions">
          <Link href="/analyze" className="button button-teal">
            Analyze a song
          </Link>
          <a href="#pricing" className="text-link">
            See pricing
          </a>
        </div>
        <WaveformPreview />
      </section>

      <section className="section" id="how-it-works" aria-labelledby="how-title">
        <p className="eyebrow">How it works</p>
        <h2 id="how-title">Three steps. No setup.</h2>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step glass">
              <span className="step-top">
                <svg className="step-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {step.icon}
                </svg>
                <span className="step-num">{i + 1}</span>
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" id="pricing" aria-labelledby="pricing-title">
        <p className="eyebrow">Pricing</p>
        <h2 id="pricing-title">Simple plans.</h2>
        <div className="plans">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`plan glass${plan.featured ? ' plan-featured' : ''}`}>
              <h3>{plan.name}</h3>
              <p className="plan-blurb">{plan.blurb}</p>
              <p className="plan-price">
                {plan.price}
                <span className="unit"> / month</span>
              </p>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <PlanButton plan={plan.id} className={plan.button} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
