import Link from "next/link";
import { ArrowDown, ArrowRight, Bookmark, Check, FileText, Handshake, LockKeyhole, MessageCircle, SlidersHorizontal, Sprout } from "lucide-react";
import MarketingMotion from "../components/marketing-motion";
import MarketingSpecialties from "../components/marketing-specialties";
import MarketingScrollScene from "../components/marketing-scroll-scene";
import MarketingProductTour from "../components/marketing-product-tour";
import MarketingEntry from "../components/marketing-entry";
import MarketingTemplates from "../components/marketing-templates";
import MarketingEvidenceBrief from "../components/marketing-evidence-brief";
import MarketingDiscoveryPreview from "../components/marketing-discovery-preview";
import MarketingConnectionMap from "../components/marketing-connection-map";
import MarketingPitchCanvas from "../components/marketing-pitch-canvas";
import PitchAudit from "../components/pitch-audit";
import RunwaySimulator from "../components/runway-simulator";
import ThesisRadar from "../components/thesis-radar";
import CustomerSignals from "../components/customer-signals";
import MarketingSignalTicker from "../components/marketing-signal-ticker";
import MarketingSignalVsDeck from "../components/marketing-signal-vs-deck";
import FloatingVentureToolkit from "../components/floating-venture-toolkit";
import { setupSignIn } from "../lib/onboarding-intent";
import LegacyWorkspaceLinks from "../components/legacy-workspace-links";
import "./marketing.css";
import "./marketing-tour-motion.css";
import "./marketing-motion.css";
import "./marketing-scroll-scene.css";
import "./marketing-story.css";

const profileEntry = "/signin?return_to=%2Fapp%23profiles";
const founderEntry = setupSignIn("founder");
const investorEntry = setupSignIn("investor");
const questions = [
  { q: "Is FindIn only for software startups?", a: "No. Founders from any industry can create a profile, including food, healthcare, education, consumer products, hardware and services. Choose a sector, or select Other and enter your own. Investors choose the industries they want to explore." },
  { q: "Do I need a finished product?", a: "No. Start with an idea, a prototype or early traction. Explain what you know, what remains uncertain and what you will test next." },
  { q: "How does Test & learn work?", a: "Open My ideas and choose Test & learn for an idea. Plan a customer test and define what a useful result would look like. Starting the test keeps that plan fixed. Record what happened and your next decision, then choose whether to share the completed learning. Tests are private by default; shared results remain founder-reported." },
  { q: "Do I sign up as a founder or an investor?", a: "Choose your role when you first save. Founders can create and manage multiple ideas, each with its own details, progress and sharing settings. Investors have one investment profile." },
  { q: "What happens after an introduction?", a: "The recipient accepts or declines. Acceptance opens private messaging and non-binding proposals. Each participant can also keep a private next-step note." },
  { q: "Can I follow a startup before connecting?", a: "Yes. Save a listed startup to revisit its profile and recent progress updates in your shortlist. Saving does not contact the founder or send progress emails." },
  { q: "Does FindIn guarantee funding or verify startup claims?", a: "No. Member claims are self-reported. FindIn supports discovery and discussion; investment decisions, due diligence and formal agreements happen separately." },
  { q: "Are the examples on this page real?", a: "The product examples are fictional and labelled. The walkthrough changes only this page; it saves no records and contacts nobody. The illustrations are AI-generated concepts. Illustrations and stock photographs do not depict FindIn members or endorsements." },
  { q: "Can I use the templates without signing up?", a: "Yes. Preview, copy and download all three worksheets without an account. The guided profile form needs sign-in and starts with your own information. A template never fills your profile with fictional evidence." },
];

export default function Home() {
  return <div className="marketing">
    <LegacyWorkspaceLinks />
    <header className="marketing-nav">
      <Link className="marketing-brand" href="/" aria-label="FindIn home"><img src="/illustrations/findin-mark-64.webp" srcSet="/illustrations/findin-mark-64.webp 64w, /illustrations/findin-mark-128.webp 128w" sizes="(max-width: 760px) 32px, 38px" width="38" height="38" alt="" />FindIn</Link>
      <nav aria-label="Main navigation"><a href="#how-it-works">Product</a><a href="#templates">Templates</a><a href="#founders">Founders</a><a href="#investors">Investors</a></nav>
      <MarketingMotion />
      <a className="marketing-nav-cta" href="/app" aria-label="Open workspace"><span>Open workspace</span><ArrowRight size={16} aria-hidden="true" /></a>
    </header>
    <main id="main-content">
      <section className="marketing-hero" id="start" aria-labelledby="hero-title" tabIndex={-1}>
        <div className="marketing-hero-copy">
          <span className="marketing-kicker"><span className="marketing-status-dot" aria-hidden="true" /> A HOME FOR EARLY IDEAS</span>
          <h1 id="hero-title">An early idea.<br />A meaningful<br /><em>first connection.</em></h1>
          <p>A workspace for early founders and investors. Share your thinking and find a reason to talk.</p>
          <MarketingEntry />
          <div className="marketing-hero-footnote"><span>Any industry.</span><span>Idea to early traction.</span><span>Your pace.</span></div>
          <a className="marketing-scroll-cue" href="#why-firstsignal"><ArrowDown size={16} aria-hidden="true" />See what makes FindIn different</a>
        </div>
        <div className="marketing-hero-product"><MarketingDiscoveryPreview /></div>
      </section>
      <MarketingSignalTicker />
      <section className="marketing-editorial marketing-section" aria-labelledby="ideas-everywhere-title">
        <div className="marketing-editorial-heading">
          <div><span className="marketing-kicker">ROOM FOR YOUR KIND OF IDEA</span><h2 id="ideas-everywhere-title">Good ideas don’t fit<br /><em>one category.</em></h2></div>
          <p>Food, healthcare, hardware, education, software and services. Bring the idea you want to explore.</p>
        </div>
        <figure className="marketing-editorial-art marketing-story-art">
          <div className="marketing-story-frame">
          <img src="/images/findin-first-workshop-1080.webp" srcSet="/images/findin-first-workshop-640.webp 640w, /images/findin-first-workshop-1080.webp 1080w, /images/findin-first-workshop-1672.webp 1672w" sizes="(max-width: 380px) calc(100vw - 40px), (max-width: 760px) calc(100vw - 48px), (max-width: 1100px) calc(100vw - 56px), (max-width: 1280px) calc(100vw - 72px), 1208px" width="1672" height="941" loading="lazy" decoding="async" alt="Concept illustration of founders exploring food, product design and clean energy in connected workshops" />
          </div>
          <figcaption><span>Every idea starts somewhere.</span><span>AI-generated concept illustration</span></figcaption>
        </figure>
      </section>
      <MarketingConnectionMap />

      <MarketingScrollScene><MarketingSpecialties /></MarketingScrollScene>
      <MarketingProductTour />
      <MarketingSignalVsDeck />

      <section className="marketing-audience marketing-section" id="founders" aria-labelledby="founders-title" tabIndex={-1}>
        <div className="marketing-audience-copy marketing-reveal"><span className="marketing-kicker"><span className="marketing-section-number">01 /</span> FOR FOUNDERS</span><h2 id="founders-title">Start with the idea.<br /><em>Show how it grows.</em></h2><p>You don’t need a launch to tell a useful story. Bring your ideology, proposed solution and the next question worth answering.</p>
          <ul className="marketing-feature-list"><li><FileText size={20} aria-hidden="true" /><div><strong>One clear step at a time</strong><span>Guided fields and a completion checklist help you tell the useful parts of your story.</span></div></li><li><LockKeyhole size={20} aria-hidden="true" /><div><strong>Your pace. Your visibility.</strong><span>Work on a private draft, then list it when you’re comfortable sharing.</span></div></li><li><Sprout size={20} aria-hidden="true" /><div><strong>Turn a question into learning</strong><span>Plan a small test for each idea. Record the result and next decision. Share completed learnings when you choose.</span></div></li></ul>
          <a className="marketing-primary" href={founderEntry}>Create your founder profile<ArrowRight size={16} aria-hidden="true" /></a>
        </div>
        <div className="marketing-audience-visual marketing-reveal"><figure className="marketing-audience-art marketing-story-art" data-story-direction="founder"><div className="marketing-story-frame"><img src="/images/founder-work-photo.webp" width="1400" height="788" loading="lazy" decoding="async" alt="A woman working on a laptop beside project notes in an office" /></div><figcaption className="marketing-photo-credit">Stock photo · <a href="https://unsplash.com/photos/woman-working-on-laptop-in-modern-office-setting-O9PEo38zOss" target="_blank" rel="noreferrer">Vitaly Gariev / Unsplash</a></figcaption></figure>
          <div className="marketing-learning-note"><span className="marketing-example-label">FICTIONAL TEST & LEARN</span><time dateTime="2026-10-06">06 Oct 2026</time><h3>Tracegrid tried a smaller handover.</h3><dl className="marketing-test-example"><div><dt>Before the test</dt><dd>Can both workshop leads complete a handover without help?</dd></div><div><dt>What happened</dt><dd>One completed it. One needed help finding unfinished work.</dd></div><div><dt>Next decision</dt><dd>Change the layout and test again. Willingness to pay is still unknown.</dd></div></dl><span className="marketing-note-footer">Illustrative founder-reported learning. No FindIn verification.</span></div>
        </div>
        <div style={{ gridColumn: "1 / -1", width: "100%", marginTop: "1.5rem" }}>
          <div className="venture-tool-target" id="tool-pitch" tabIndex={-1}><PitchAudit /></div>
          <div className="venture-tool-target" id="tool-runway" tabIndex={-1}><RunwaySimulator /></div>
        </div>
      </section>

      <section className="marketing-investor-band">
        <div className="marketing-audience marketing-section marketing-audience-investor" id="investors" aria-labelledby="investors-title" tabIndex={-1}>
          <div className="marketing-audience-copy marketing-reveal"><span className="marketing-kicker"><span className="marketing-section-number">02 /</span> FOR INVESTORS</span><h2 id="investors-title">Look beyond the pitch.<br /><em>Find a reason to talk.</em></h2><p>Make a shortlist with context. Compare stages, stated plans and funding interests before choosing a conversation.</p>
            <ul className="marketing-feature-list"><li><SlidersHorizontal size={20} aria-hidden="true" /><div><strong>A closer look, side by side</strong><span>Compare up to three profiles. Filter by stage and sector, then share the search.</span></div></li><li><Bookmark size={20} aria-hidden="true" /><div><strong>Follow before you connect</strong><span>Save startups and revisit their progress while you build your understanding.</span></div></li><li><MessageCircle size={20} aria-hidden="true" /><div><strong>Keep the conversation together</strong><span>Review requests, private messages and proposal history in one connections dashboard.</span></div></li></ul>
            <div className="marketing-actions"><a className="marketing-primary" href="/app#discover">Explore founder profiles</a><a className="marketing-secondary" href={investorEntry}>Create an investor profile</a></div><p className="marketing-audience-note">Your investor form opens after sign-in. Keep it private while you write.</p>
          </div>
          <div className="marketing-audience-visual marketing-reveal"><figure className="marketing-audience-art marketing-conversation-art marketing-story-art" data-story-direction="investor"><div className="marketing-story-frame"><img src="/images/findin-first-conversation-1080.webp" srcSet="/images/findin-first-conversation-640.webp 640w, /images/findin-first-conversation-1080.webp 1080w, /images/findin-first-conversation-1672.webp 1672w" sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1100px) 45vw, 570px" width="1672" height="941" loading="lazy" decoding="async" alt="Concept illustration of a founder and two investors discussing an early clean-energy prototype and project notes" /></div><figcaption className="marketing-photo-credit">AI-generated concept illustration · An early conversation</figcaption></figure>
            <div className="marketing-fit-note"><span className="marketing-example-label">FICTIONAL FIT COMPARISON</span><h3>Clear reasons to explore.</h3><div><span>Manufacturing SaaS</span><strong><Check size={15} aria-hidden="true" />Sector matches</strong></div><div><span>Pre-product</span><strong><Check size={15} aria-hidden="true" />Stage matches</strong></div><p>Availability and evidence quality? Ask about this.</p></div>
          </div>
          <div style={{ gridColumn: "1 / -1", width: "100%", marginTop: "1.5rem" }}>
            <div className="venture-tool-target" id="tool-thesis" tabIndex={-1}><ThesisRadar /></div>
          </div>
        </div>
      </section>

      <section className="marketing-context marketing-section" id="learning" aria-labelledby="context-title" tabIndex={-1}><div className="marketing-context-copy marketing-reveal"><span className="marketing-kicker">CONTEXT BEFORE CONVICTION</span><h2 id="context-title">The learning matters.<br /><em>So do the unknowns.</em></h2><p>An interview is a beginning. A prototype is a test. Neither is a promise of success. Put the useful detail and the unanswered questions in the same place.</p><ol className="marketing-context-points"><li><span>01</span><div><strong>What have you learned?</strong><p>Describe the observation and where it came from.</p></div></li><li><span>02</span><div><strong>What remains uncertain?</strong><p>Make room for the questions a pitch can leave out.</p></div></li><li><span>03</span><div><strong>What will you test next?</strong><p>Share a concrete next step and what you hope to learn.</p></div></li></ol><a href="#templates" className="marketing-text-link">Build your own brief<ArrowRight size={17} aria-hidden="true" /></a><p className="marketing-context-note">Member claims are self-reported. FindIn does not independently verify startup evidence.</p></div><MarketingEvidenceBrief /><MarketingPitchCanvas /><div style={{ gridColumn: "1 / -1", width: "100%", marginTop: "1.5rem" }}><CustomerSignals example /></div></section>

      <MarketingTemplates />

      <section className="marketing-trust marketing-section" aria-labelledby="trust-title"><div className="marketing-trust-heading"><span className="marketing-kicker">BUILT AROUND YOUR CHOICE</span><h2 id="trust-title">A little more control.<br /><em>At every first step.</em></h2><a href="/privacy" className="marketing-text-link">How sharing works<ArrowRight size={17} aria-hidden="true" /></a></div><div className="marketing-trust-list">
        {[{ icon: LockKeyhole, title: "Choose what to share", text: "Your draft stays private. List your profile when you’re ready. Follow-up notes belong only to you." }, { icon: Handshake, title: "A conversation takes two", text: "Messages and non-binding proposals open after an introduction is accepted." }, { icon: MessageCircle, title: "Keep your boundaries", text: "Block contact in both directions or submit a report for manual handling." }].map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}
      </div></section>

      <section className="marketing-faq marketing-section" id="questions" aria-labelledby="faq-title" tabIndex={-1}><div className="marketing-section-heading"><span className="marketing-kicker">A LITTLE CLARITY</span><h2 id="faq-title">Before your<br />first hello.</h2></div><div>{questions.map(({ q, a }) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
      <section className="marketing-closing" id="your-next-step" tabIndex={-1}><span className="marketing-kicker">YOUR NEXT CHAPTER IS STILL UNWRITTEN</span><h2>Start with an idea.<br /><em>See who it brings you to.</em></h2><p>Bring what you know. Be clear about what comes next.</p><div className="marketing-actions"><a className="marketing-primary" href={profileEntry}>Create your profile<ArrowRight size={16} aria-hidden="true" /></a><a className="marketing-secondary" href="/app#discover">Explore the network</a></div><span className="marketing-closing-note">Discovery and discussion. No funding guarantee.</span></section>
    </main>
    <footer className="marketing-footer"><div><Link className="marketing-brand" href="/"><img src="/illustrations/findin-mark-64.webp" srcSet="/illustrations/findin-mark-64.webp 64w, /illustrations/findin-mark-128.webp 128w" sizes="32px" width="32" height="32" loading="lazy" decoding="async" alt="" />FindIn</Link><p>Early ideas. Meaningful connections.</p></div><nav aria-label="Footer navigation"><a href="#templates">Starter templates</a><a href="#how-it-works">Inside the product</a><a href="#founders">For founders</a><a href="#investors">For investors</a><a href="/signin?return_to=%2Fapp">Sign in</a><a href="/privacy">Privacy</a></nav><small>© {new Date().getFullYear()} FindIn · Discovery and discussion. No funding guarantee.</small></footer>
    <FloatingVentureToolkit />
  </div>;
}
