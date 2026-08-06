import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FlaskConical,
  Network,
  Orbit,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";

const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Astronomy"];

interface LandingPageProps {
  primaryHref: string;
  primaryLabel?: string;
  signInHref?: string;
}

export function LandingPage({
  primaryHref,
  primaryLabel = "Start learning",
  signInHref,
}: LandingPageProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <Link href="/" className="landing-brand" aria-label="Mathios home">
            <BrandMark className="landing-brand-mark" priority />
            <span className="landing-brand-name">Mathios</span>
          </Link>

          <nav className="landing-nav-links" aria-label="Landing page navigation">
            <a href="#method">The library</a>
            <a href="#workspace">The workspace</a>
            <a href="#classrooms">For classrooms</a>
          </nav>

          <div className="landing-nav-actions">
            {signInHref ? (
              <Link className="landing-nav-sign-in" href={signInHref as never}>
                Sign in
              </Link>
            ) : null}
            <Link className="landing-nav-cta" href={primaryHref as never}>
              {primaryLabel}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy landing-reveal">
              <p className="landing-eyebrow">A prepared science library</p>
              <h1 id="landing-title">Your next idea is already here.</h1>
              <p className="landing-hero-lede">
                Mathios comes with lessons, concepts, practice, simulations, and experiments already
                prepared. Start learning immediately; your own notes and additions are optional.
              </p>
              <div className="landing-actions">
                <Link className="landing-button landing-button-primary" href={primaryHref as never}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a className="landing-button landing-button-secondary" href="#method">
                  Browse the library
                </a>
              </div>
            </div>

            <div className="landing-hero-media landing-reveal landing-reveal-delay-1">
              <div className="landing-hero-image-frame">
                <Image
                  src="/landing/mathios-hero.png"
                  alt="A geometry notebook, compass, and translucent triangle on a deep blue desk"
                  fill
                  priority
                  sizes="(max-width: 767px) 100vw, 52vw"
                  className="landing-cover-image"
                />
              </div>
              <div className="landing-hero-media-caption">
                <span>Curated content first - personal layer optional</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-subjects" aria-label="Mathios subjects">
          <div className="landing-container landing-subjects-inner">
            <span className="landing-subjects-lead">Included from day one</span>
            <div className="landing-subject-list">
              {subjects.map((subject) => (
                <span key={subject}>{subject}</span>
              ))}
            </div>
          </div>
        </section>

        <section
          id="method"
          className="landing-section landing-method"
          aria-labelledby="method-title"
        >
          <div className="landing-container">
            <div className="landing-section-intro landing-reveal">
              <h2 id="method-title">Start with the library, not a blank page.</h2>
              <p>
                Every subject begins with a prepared sequence. Follow a course, open the ideas
                behind it, and practice without having to assemble the material yourself.
              </p>
            </div>

            <div className="landing-method-grid">
              <article className="landing-feature landing-feature-ink landing-reveal">
                <div className="landing-feature-icon" aria-hidden="true">
                  <Network className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <h3>Follow a prepared path</h3>
                <p>Courses and roadmaps give you a clear sequence through the ideas that matter.</p>
                <div className="landing-formula" aria-hidden="true">
                  <span>course</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>practice</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>mastery</span>
                </div>
              </article>

              <article className="landing-feature landing-feature-image landing-reveal landing-reveal-delay-1">
                <div className="landing-feature-photo">
                  <Image
                    src="/landing/mathios-study.png"
                    alt="A parabola drawn on paper beside a translucent ruler and pencil"
                    fill
                    sizes="(max-width: 767px) 100vw, 34vw"
                    className="landing-cover-image"
                  />
                </div>
                <div className="landing-feature-image-copy">
                  <h3>Stay with the why</h3>
                  <p>
                    Readable explanations keep the reasoning visible, not buried under the answer.
                  </p>
                </div>
              </article>

              <article className="landing-feature landing-feature-accent landing-reveal landing-reveal-delay-2">
                <div className="landing-feature-icon" aria-hidden="true">
                  <Sparkles className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <h3>Add your own layer when it helps</h3>
                <ul className="landing-check-list">
                  <li>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Keep optional notes and highlights
                  </li>
                  <li>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Track your own progress
                  </li>
                  <li>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Add personal context later
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section
          id="workspace"
          className="landing-section landing-workspace"
          aria-labelledby="workspace-title"
        >
          <div className="landing-container landing-workspace-grid">
            <div className="landing-workspace-copy landing-reveal">
              <div className="landing-section-icon" aria-hidden="true">
                <BookOpen className="h-5 w-5" strokeWidth={1.7} />
              </div>
              <h2 id="workspace-title">One library. Many ways to learn.</h2>
              <p>
                Read the prepared lesson, test the idea with an exercise, see it move in a
                simulation, then revisit what matters. Mathios keeps the learning thread connected
                so you do not have to build the curriculum yourself.
              </p>
            </div>

            <div className="landing-loop" aria-label="Mathios learning loop">
              <div className="landing-loop-row landing-reveal">
                <span className="landing-loop-word">Read</span>
                <span className="landing-loop-detail">
                  Prepared lessons, concepts, and explanations
                </span>
                <BookOpen className="landing-loop-icon" aria-hidden="true" />
              </div>
              <div className="landing-loop-row landing-reveal landing-reveal-delay-1">
                <span className="landing-loop-word">Practice</span>
                <span className="landing-loop-detail">Exercises, assessments, and feedback</span>
                <Sparkles className="landing-loop-icon" aria-hidden="true" />
              </div>
              <div className="landing-loop-row landing-reveal landing-reveal-delay-2">
                <span className="landing-loop-word">Explore</span>
                <span className="landing-loop-detail">Simulations and virtual laboratories</span>
                <Orbit className="landing-loop-icon" aria-hidden="true" />
              </div>
              <div className="landing-loop-row landing-reveal landing-reveal-delay-3">
                <span className="landing-loop-word">Review</span>
                <span className="landing-loop-detail">
                  Mastery, paths, planning, and optional notes
                </span>
                <FlaskConical className="landing-loop-icon" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-statement" aria-labelledby="statement-title">
          <div className="landing-container landing-statement-inner landing-reveal">
            <p className="landing-statement-mark" aria-hidden="true">
              ∑
            </p>
            <h2 id="statement-title">
              The learning material is ready. Your progress makes the path personal.
            </h2>
            <p>
              Mathios gives learners and teachers a shared place for the parts that make science
              stick, without asking learners to start from scratch.
            </p>
          </div>
        </section>

        <section
          id="classrooms"
          className="landing-section landing-classrooms"
          aria-labelledby="classrooms-title"
        >
          <div className="landing-container landing-classrooms-grid">
            <div className="landing-classrooms-heading landing-reveal">
              <h2 id="classrooms-title">For curious learners. And the people who guide them.</h2>
            </div>
            <div className="landing-classrooms-copy landing-reveal landing-reveal-delay-1">
              <p>
                Add assignments and guidance around the prepared library, review progress, and keep
                the human part of teaching in view.
              </p>
              <div className="landing-classrooms-items">
                <span>Personal paths</span>
                <span>Shared classrooms</span>
                <span>Visible progress</span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div className="landing-container landing-final-cta-inner landing-reveal">
            <div>
              <p className="landing-final-kicker">The library is ready</p>
              <h2 id="final-cta-title">Begin with the next useful idea.</h2>
            </div>
            <Link className="landing-button landing-button-primary" href={primaryHref as never}>
              {primaryLabel}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Link href="/" className="landing-brand" aria-label="Mathios home">
            <BrandMark className="landing-brand-mark" />
            <span className="landing-brand-name">Mathios</span>
          </Link>
          <p>Provided science learning, with room for your own notes.</p>
        </div>
      </footer>
    </div>
  );
}
