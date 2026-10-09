import { Bookmark, Check, FileText, Handshake, LockKeyhole, MessageCircle, SlidersHorizontal, Sprout } from "lucide-react";
import MarketingMotion from "../components/marketing-motion";
import MarketingSpecialties from "../components/marketing-specialties";
import MarketingProductTour from "../components/marketing-product-tour";
import MarketingEntry from "../components/marketing-entry";
import MarketingTemplates from "../components/marketing-templates";
import MarketingEvidenceBrief from "../components/marketing-evidence-brief";
import { setupSignIn } from "../lib/onboarding-intent";
import LegacyWorkspaceLinks from "../components/legacy-workspace-links";
import "./marketing.css";

const profileEntry = "/signin?return_to=%2Fapp%23profiles";
const founderEntry = setupSignIn("founder");
const investorEntry = setupSignIn("investor");
const questions = [
  { q: "Do I need a finished product?", a: "No. Start with an idea, a prototype or early traction. Explain what you know, what remains uncertain and what you will test next." },
  { q: "Can I use FirstSignal as both a founder and an investor?", a: "Yes. One account can have a founder profile and an investor profile. Each begins as a private draft, with its own interests and sharing choice." },
  { q: "What happens after an introduction?", a: "The recipient accepts or declines. Acceptance opens private messaging and non-binding proposals. Each participant can also keep a private next-step note." },
  { q: "Can I follow a startup before connecting?", a: "Yes. Save a listed startup to revisit its profile and recent progress updates in your shortlist. Saving does not contact the founder or send progress emails." },
  { q: "Does FirstSignal guarantee funding or verify startup claims?", a: "No. Member claims are self-reported. FirstSignal supports discovery and discussion; investment decisions, due diligence and formal agreements happen separately." },
  { q: "Are the examples on this page real?", a: "The product examples are fictional and labelled. The walkthrough changes only this page; it saves no records and contacts nobody. Stock photographs do not depict FirstSignal members or endorsements." },
  { q: "Can I use the templates without signing up?", a: "Yes. Preview, copy and download all three worksheets without an account. The guided profile form needs sign-in and starts with your own information. A template never fills your profile with fictional evidence." },
];

export default function Home() {
  return <div className="marketing">
    <LegacyWorkspaceLinks /><MarketingMotion />
    <header className="marketing-nav">
      <a className="marketing-brand" href="/" aria-label="FirstSignal home"><img src="/firstsignal-logo.png" width="38" height="38" alt="" />FirstSignal</a>
      <nav aria-label="Main navigation"><a href="#how-it-works">Product</a><a href="#templates">Templates</a><a href="#founders">Founders</a><a href="#investors">Investors</a></nav>
      <a className="marketing-nav-cta" href="/app">Open workspace</a>
    </header>
    <main id="main-content">
      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <span className="marketing-kicker"><Sprout size={16} aria-hidden="true" /> THE FIRST MILE OF BUILDING SOMETHING</span>
          <h1>An early idea.<br /><em>A clear next move.</em></h1>
          <p>Meet founders and investors through clear profiles, shared progress and conversations you both choose.</p>
          <MarketingEntry />
          <div className="marketing-hero-footnote"><span>Idea</span><span>Pre-product</span><span>First prototype</span><span>Early traction</span></div>
        </div>
        <MarketingEvidenceBrief />
      </section>
      <div className="marketing-principles" aria-label="FirstSignal principles"><span>Show the learning.</span><span>Understand the fit.</span><span>Choose the conversation.</span><span>Keep moving forward.</span></div>

      <MarketingSpecialties />
      <MarketingProductTour />
      <MarketingTemplates />

      <section className="marketing-audience marketing-section" id="founders" aria-labelledby="founders-title" tabIndex={-1}>
        <div className="marketing-audience-copy marketing-reveal"><span className="marketing-kicker">FOR FOUNDERS</span><h2 id="founders-title">Your idea has a story.<br /><em>Give it a starting point.</em></h2><p>Bring the problem, the learning and the next experiment together. You can start before the product is ready.</p>
          <ul className="marketing-feature-list"><li><FileText size={20} aria-hidden="true" /><div><strong>One clear step at a time</strong><span>Guided fields and a completion checklist help you tell the useful parts of your story.</span></div></li><li><LockKeyhole size={20} aria-hidden="true" /><div><strong>Your pace. Your visibility.</strong><span>Work on a private draft, then list it when you’re comfortable sharing.</span></div></li><li><Sprout size={20} aria-hidden="true" /><div><strong>Keep the learning visible</strong><span>Post dated progress updates so people can revisit how your idea develops.</span></div></li></ul>
          <a className="marketing-primary" href={founderEntry}>Create your founder profile</a>
        </div>
        <div className="marketing-audience-visual marketing-reveal"><figure className="marketing-audience-art"><img src="/images/founder-work-photo.webp" width="1400" height="788" loading="lazy" decoding="async" alt="A woman working on a laptop beside project notes in an office" /><figcaption className="marketing-photo-credit">Stock photo · <a href="https://unsplash.com/photos/woman-working-on-laptop-in-modern-office-setting-O9PEo38zOss" target="_blank" rel="noreferrer">Vitaly Gariev / Unsplash</a></figcaption></figure>
          <div className="marketing-learning-note"><span className="marketing-example-label">FICTIONAL PROGRESS UPDATE</span><time dateTime="2026-10-06">06 Oct 2026</time><h3>We simplified the handover.</h3><p>Three walkthroughs pointed to a shorter unresolved-items list. Whether owners will pay remains untested.</p><span className="marketing-note-footer">A learning, an uncertainty, a next step.</span></div>
        </div>
      </section>

      <section className="marketing-investor-band">
        <div className="marketing-audience marketing-section marketing-audience-investor" id="investors" aria-labelledby="investors-title" tabIndex={-1}>
          <div className="marketing-audience-copy marketing-reveal"><span className="marketing-kicker">FOR INVESTORS</span><h2 id="investors-title">See the thinking.<br /><em>Then start talking.</em></h2><p>Explore the learning behind an early idea, understand the stated fit and choose which conversations deserve your time.</p>
            <ul className="marketing-feature-list"><li><SlidersHorizontal size={20} aria-hidden="true" /><div><strong>Put your interests into focus</strong><span>Describe sectors, stages, indicative check ranges and the evidence you want to see.</span></div></li><li><Bookmark size={20} aria-hidden="true" /><div><strong>Follow before you connect</strong><span>Save startups and revisit their progress while you build your understanding.</span></div></li><li><MessageCircle size={20} aria-hidden="true" /><div><strong>Keep the conversation together</strong><span>Review requests, private messages and proposal history in one connections dashboard.</span></div></li></ul>
            <div className="marketing-actions"><a className="marketing-primary" href="/app#discover">Explore founder profiles</a><a className="marketing-secondary" href={investorEntry}>Create an investor profile</a></div><p className="marketing-audience-note">Your investor form opens after sign-in. Keep it private while you write.</p>
          </div>
          <div className="marketing-audience-visual marketing-reveal"><figure className="marketing-audience-art"><img src="/images/project-discussion-photo.webp" width="1400" height="788" loading="lazy" decoding="async" alt="Two colleagues discussing a project together at a laptop" /><figcaption className="marketing-photo-credit">Stock photo · <a href="https://unsplash.com/photos/two-colleagues-collaborating-on-a-project-at-a-laptop-tRvuRPE8cr4" target="_blank" rel="noreferrer">Vitaly Gariev / Unsplash</a></figcaption></figure>
            <div className="marketing-fit-note"><span className="marketing-example-label">FICTIONAL FIT COMPARISON</span><h3>Clear reasons to explore.</h3><div><span>Manufacturing SaaS</span><strong><Check size={15} aria-hidden="true" />Sector aligns</strong></div><div><span>Pre-product</span><strong><Check size={15} aria-hidden="true" />Stage aligns</strong></div><p>Availability and evidence quality? Confirm together.</p></div>
          </div>
        </div>
      </section>

      <section className="marketing-trust marketing-section" aria-labelledby="trust-title"><div className="marketing-reveal"><span className="marketing-kicker">YOU KEEP THE CHOICE</span><h2 id="trust-title">Open to possibility.<br />Clear about boundaries.</h2><p>Useful relationships start with context and control.</p><a href="/privacy" className="marketing-secondary">Read how sharing works</a></div><div className="marketing-trust-list">
        {[{ icon: LockKeyhole, title: "Private until you choose otherwise", text: "Drafts stay with your account. A listed profile is public. Your follow-up notes stay private." }, { icon: Handshake, title: "Introductions need acceptance", text: "Messages and proposals open after both people choose to connect. Proposals express non-binding interest." }, { icon: MessageCircle, title: "A way to handle unwanted contact", text: "Report a member or block contact in both directions. Reports are submitted for manual handling; they do not automatically remove a profile." }, { icon: FileText, title: "Claims keep their context", text: "Member evidence is self-reported. Examples are labelled. Funding, due diligence and formal agreements remain separate." }].map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}
      </div></section>

      <section className="marketing-faq marketing-section" aria-labelledby="faq-title"><div className="marketing-section-heading"><span className="marketing-kicker">A LITTLE CLARITY</span><h2 id="faq-title">Before your<br />first hello.</h2></div><div>{questions.map(({ q, a }) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
      <section className="marketing-closing"><span className="marketing-kicker">BUILD SOMETHING WORTH A CONVERSATION</span><h2>The product can come later.<br /><em>The first signal starts here.</em></h2><p>Bring what you know. Be clear about what comes next.</p><div className="marketing-actions"><a className="marketing-primary" href={profileEntry}>Create your profile</a><a className="marketing-secondary" href="/app#discover">Explore the network</a></div></section>
    </main>
    <footer className="marketing-footer"><div><a className="marketing-brand" href="/"><img src="/firstsignal-logo.png" width="32" height="32" alt="" />FirstSignal</a><p>Early ideas. Meaningful connections.</p></div><nav aria-label="Footer navigation"><a href="#templates">Starter templates</a><a href="#how-it-works">Inside the product</a><a href="#founders">For founders</a><a href="#investors">For investors</a><a href="/signin?return_to=%2Fapp">Sign in</a><a href="/privacy">Privacy</a></nav><small>© {new Date().getFullYear()} FirstSignal · Discovery and discussion. No funding guarantee.</small></footer>
  </div>;
}
