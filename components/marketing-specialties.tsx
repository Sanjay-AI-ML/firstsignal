import { Check, FileText, Handshake, LockKeyhole, SlidersHorizontal } from "lucide-react";

export default function MarketingSpecialties() {
  return <section className="marketing-specialties marketing-section" id="why-firstsignal" aria-labelledby="specialty-title">
    <div className="specialty-heading">
      <span className="marketing-kicker">THE FIRSTSIGNAL DIFFERENCE</span>
      <h2 id="specialty-title">A little earlier.<br/>A lot more context.</h2>
      <p>Your idea is the beginning. Give the right people something meaningful to explore.</p>
      <a className="marketing-secondary" href="#how-it-works">See how it works</a>
      <div className="specialty-index" aria-hidden="true"><span>01 / Substance</span><span>02 / Relevance</span><span>03 / Choice</span></div>
    </div>
    <div className="specialty-stack">
      <article className="specialty-card specialty-evidence">
        <div className="specialty-card-top"><span>01 / SUBSTANCE</span><FileText size={24}/></div>
        <h3>More than an elevator pitch.</h3>
        <p>Show the problem you understand, what you’ve learned, and the next milestone you want to reach.</p>
        <div className="specialty-demo"><div className="specialty-demo-heading"><strong>Tracegrid</strong><span>SAMPLE PROFILE</span></div><div className="specialty-demo-line"><span>Customer learning</span><strong>16 interviews · 6 factories</strong></div><div className="specialty-demo-line"><span>Next milestone</span><strong>Test the prototype with 2 factories</strong></div><small>Illustrative evidence · Self-reported</small></div>
      </article>
      <article className="specialty-card specialty-fit">
        <div className="specialty-card-top"><span>02 / RELEVANCE</span><SlidersHorizontal size={24}/></div>
        <h3>Know why it could fit.</h3>
        <p>Compare a founder’s stage and sector with an investor’s stated interests. See what aligns and what needs a conversation.</p>
        <div className="specialty-demo"><div className="specialty-demo-heading"><strong>Profile fit</strong><span>SAMPLE COMPARISON</span></div><div className="specialty-demo-line"><span>Manufacturing SaaS</span><span className="specialty-pill"><Check size={12}/>Sector aligned</span></div><div className="specialty-demo-line"><span>Pre-product</span><span className="specialty-pill"><Check size={12}/>Stage aligned</span></div><small>Availability and evidence quality: confirm together</small></div>
      </article>
      <article className="specialty-card specialty-consent">
        <div className="specialty-card-top"><span>03 / CHOICE</span><Handshake size={24}/></div>
        <h3>A connection you both choose.</h3>
        <p>Start with a private draft. Send an introduction with context. Open a conversation when the other person accepts.</p>
        <div className="specialty-demo"><div className="specialty-demo-heading"><strong>Your next hello</strong><span>WORKFLOW PREVIEW</span></div><div className="specialty-consent-flow"><span><LockKeyhole size={17}/>Private draft</span><span><Handshake size={17}/>Introduction</span><span><Check size={17}/>Accepted</span></div><small>You decide when to publish and which requests to accept.</small></div>
      </article>
    </div>
  </section>;
}
