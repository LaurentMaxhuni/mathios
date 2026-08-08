"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BrandMark } from "@/components/shared/brand-mark";

gsap.registerPlugin(ScrollTrigger);

const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Astronomy"];
const manifesto = "When the question stays visible, the answer becomes a place to begin.".split(
  " ",
);

interface LandingPageProps {
  primaryHref: string;
  primaryLabel?: string;
  signInHref?: string;
}

function CtaArrow() {
  return (
    <span className="studio-cta-arrow" aria-hidden="true">
      ↗
    </span>
  );
}

export function LandingPage({
  primaryHref,
  primaryLabel = "Start learning",
  signInHref,
}: LandingPageProps) {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = pageRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const desktop = gsap.matchMedia();
    const cleanupListeners: Array<() => void> = [];
    const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
      intro
        .from(".studio-nav", { y: -28, opacity: 0, duration: 0.8 })
        .from(".studio-hero-reveal", { yPercent: 105, duration: 1.05, stagger: 0.1 }, "-=0.32")
        .from(".studio-hero-copy", { y: 28, opacity: 0, duration: 0.8 }, "-=0.58")
        .from(
          ".studio-hero-orbital-shell",
          { scale: 0.82, rotate: -9, opacity: 0, duration: 1.25 },
          "-=0.9",
        )
        .from(".studio-orbit", { scale: 0.4, opacity: 0, duration: 1.1, stagger: 0.12 }, "-=0.9");

      gsap.to(".studio-hero-art", {
        yPercent: 10,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: ".studio-hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(".studio-orbit-one", {
        rotation: 360,
        ease: "none",
        scrollTrigger: {
          trigger: ".studio-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(".studio-orbit-two", {
        rotation: -270,
        ease: "none",
        scrollTrigger: {
          trigger: ".studio-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.4,
        },
      });

      gsap.utils.toArray<HTMLElement>("[data-studio-reveal]").forEach((element, index) => {
        gsap.fromTo(
          element,
          { y: 56, opacity: 0, filter: "blur(8px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1,
            delay: (index % 3) * 0.07,
            ease: "power4.out",
            scrollTrigger: { trigger: element, start: "top 86%", once: true },
          },
        );
      });

      gsap.to(".studio-manifesto-word", {
        color: "#eaf3ea",
        stagger: 0.14,
        ease: "none",
        scrollTrigger: {
          trigger: ".studio-manifesto",
          start: "top 72%",
          end: "bottom 46%",
          scrub: true,
        },
      });

      desktop.add("(min-width: 768px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-sequence-item]").forEach((item, index) => {
          gsap.fromTo(
            item,
            { xPercent: index % 2 === 0 ? -8 : 8, opacity: 0 },
            {
              xPercent: 0,
              opacity: 1,
              duration: 0.9,
              ease: "power4.out",
              scrollTrigger: { trigger: item, start: "top 84%", once: true },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-studio-tilt]").forEach((element) => {
          const rotateX = gsap.quickTo(element, "rotationX", { duration: 0.7, ease: "power3.out" });
          const rotateY = gsap.quickTo(element, "rotationY", { duration: 0.7, ease: "power3.out" });
          const onPointerMove = (event: PointerEvent) => {
            const bounds = element.getBoundingClientRect();
            rotateX(((event.clientY - bounds.top) / bounds.height - 0.5) * -8);
            rotateY(((event.clientX - bounds.left) / bounds.width - 0.5) * 10);
          };
          const onPointerLeave = () => {
            rotateX(0);
            rotateY(0);
          };
          element.addEventListener("pointermove", onPointerMove);
          element.addEventListener("pointerleave", onPointerLeave);
          cleanupListeners.push(() => {
            element.removeEventListener("pointermove", onPointerMove);
            element.removeEventListener("pointerleave", onPointerLeave);
          });
        });
      });
    }, root);

    return () => {
      cleanupListeners.forEach((cleanup) => cleanup());
      desktop.revert();
      context.revert();
    };
  }, []);

  return (
    <div ref={pageRef} className="studio-page">
      <header className="studio-nav" aria-label="Primary navigation">
        <div className="studio-nav-core">
          <Link href="/" className="studio-brand" aria-label="Mathios home">
            <BrandMark className="studio-brand-mark" priority />
            <span>Mathios</span>
          </Link>
          <nav className="studio-nav-links" aria-label="Landing page navigation">
            <a href="#systems">The system</a>
            <a href="#practice">The practice</a>
            <a href="#begin">Start here</a>
          </nav>
          <div className="studio-nav-actions">
            {signInHref ? <Link href={signInHref as never}>Sign in</Link> : null}
            <Link className="studio-cta studio-cta-small" href={primaryHref as never}>
              <span>{primaryLabel}</span>
              <CtaArrow />
            </Link>
          </div>
        </div>
      </header>

      <main className="studio-main">
        <section className="studio-hero" aria-labelledby="landing-title">
          <div className="studio-hero-grid">
            <div className="studio-hero-copy-wrap">
              <p className="studio-kicker studio-hero-reveal">The learning observatory</p>
              <h1
                id="landing-title"
                className="studio-hero-title"
                aria-label="Study the question from every angle"
              >
                <span className="studio-hero-line">
                  <span className="studio-hero-reveal">Study the question</span>
                </span>
                <span className="studio-hero-line studio-hero-line-offset">
                  <span className="studio-hero-reveal">from every angle.</span>
                </span>
              </h1>
              <div className="studio-hero-copy">
                <p>
                  Mathios connects lessons, practice, notes, and experiments into one living field
                  of study.
                </p>
                <div className="studio-hero-actions">
                  <Link className="studio-cta" href={primaryHref as never}>
                    <span>{primaryLabel}</span>
                    <CtaArrow />
                  </Link>
                  <a className="studio-text-link" href="#systems">
                    See the system
                  </a>
                </div>
              </div>
            </div>

            <div className="studio-hero-orbital-shell" data-studio-tilt>
              <div className="studio-hero-orbital-core">
                <div className="studio-orbit studio-orbit-one" aria-hidden="true">
                  <span />
                </div>
                <div className="studio-orbit studio-orbit-two" aria-hidden="true">
                  <span />
                </div>
                <div className="studio-orbit studio-orbit-three" aria-hidden="true">
                  <span />
                </div>
                <Image
                  src="/landing/mathios-hero-spatial.png"
                  alt="Translucent geometric forms on a midnight-blue plinth"
                  fill
                  priority
                  sizes="(max-width: 767px) 100vw, 52vw"
                  className="studio-hero-art"
                />
                <div className="studio-hero-vignette" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="studio-signal" aria-label="Subjects in the Mathios library">
          <div className="studio-signal-track">
            <span>Ideas compound</span>
            <i>×</i>
            {subjects.map((subject) => (
              <span key={subject}>{subject}</span>
            ))}
            <i>×</i>
            <span>Ideas compound</span>
            <i>×</i>
          </div>
        </section>

        <section id="systems" className="studio-systems" aria-labelledby="systems-title">
          <div className="studio-section-head" data-studio-reveal>
            <p className="studio-kicker">A field, not a feed</p>
            <h2 id="systems-title">Every thought gets somewhere to go.</h2>
          </div>

          <div className="studio-bento" aria-label="Ways Mathios supports learning">
            <article
              className="studio-bezel studio-bento-large"
              data-studio-reveal
              data-studio-tilt
            >
              <div className="studio-bento-core studio-bento-image">
                <Image
                  src="/landing/mathios-hero.png"
                  alt="Geometry notebook and translucent triangle"
                  fill
                  sizes="(max-width: 767px) 100vw, 58vw"
                />
                <div className="studio-bento-wash" />
                <div className="studio-bento-copy">
                  <p>Connection</p>
                  <h3>See where an idea came from, then chase where it leads.</h3>
                </div>
              </div>
            </article>
            <article className="studio-bezel studio-bento-dark" data-studio-reveal data-studio-tilt>
              <div className="studio-bento-core studio-equation-card">
                <div className="studio-equation" aria-hidden="true">
                  <span>observe</span>
                  <b>→</b>
                  <span>model</span>
                  <b>→</b>
                  <span>test</span>
                </div>
                <div className="studio-bento-copy">
                  <p>Structure</p>
                  <h3>Turn a loose curiosity into a route with momentum.</h3>
                </div>
              </div>
            </article>
            <article className="studio-bezel studio-bento-lime" data-studio-reveal data-studio-tilt>
              <div className="studio-bento-core studio-constellation-card">
                <div className="studio-constellation" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="studio-bento-copy">
                  <p>Return</p>
                  <h3>Come back to the thought while it is still warm.</h3>
                </div>
              </div>
            </article>
            <article
              className="studio-bezel studio-bento-study"
              data-studio-reveal
              data-studio-tilt
            >
              <div className="studio-bento-core studio-bento-image">
                <Image
                  src="/landing/mathios-study.png"
                  alt="Parabola study on paper beside a translucent ruler"
                  fill
                  sizes="(max-width: 767px) 100vw, 34vw"
                />
                <div className="studio-bento-wash" />
                <div className="studio-bento-copy">
                  <p>Practice</p>
                  <h3>Let the idea move through your hands.</h3>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="studio-manifesto" aria-labelledby="manifesto-title">
          <div className="studio-manifesto-orbit" aria-hidden="true" />
          <div className="studio-manifesto-inner">
            <p className="studio-kicker">The real advantage</p>
            <h2 id="manifesto-title">
              {manifesto.map((word, index) => (
                <span className="studio-manifesto-word" key={`${word}-${index}`}>
                  {word}{" "}
                </span>
              ))}
            </h2>
          </div>
        </section>

        <section id="practice" className="studio-sequence" aria-labelledby="practice-title">
          <div className="studio-sequence-intro" data-studio-reveal>
            <p className="studio-kicker">The daily sequence</p>
            <h2 id="practice-title">Move through the subject, not around it.</h2>
            <p>One complete loop helps a new idea settle into a durable habit.</p>
          </div>

          <div className="studio-sequence-flow" aria-label="A four-step daily learning sequence">
            <article
              className="studio-sequence-item studio-sequence-image"
              data-sequence-item
              data-studio-tilt
            >
              <span className="studio-sequence-number">01</span>
              <div className="studio-sequence-visual">
                <Image
                  src="/landing/mathios-study.png"
                  alt="A carefully annotated mathematics study"
                  fill
                  sizes="(max-width: 767px) 100vw, 58vw"
                />
              </div>
              <div className="studio-sequence-copy">
                <h3>Meet the shape.</h3>
                <p>Start with a clear explanation and enough context to see the idea whole.</p>
              </div>
            </article>
            <article
              className="studio-sequence-item studio-sequence-model"
              data-sequence-item
              data-studio-tilt
            >
              <span className="studio-sequence-number">02</span>
              <div className="studio-sequence-visual studio-model-lines" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <b>?</b>
              </div>
              <div className="studio-sequence-copy">
                <h3>Find the pattern.</h3>
                <p>Trace the relationships that make the next move feel inevitable.</p>
              </div>
            </article>
            <article
              className="studio-sequence-item studio-sequence-test"
              data-sequence-item
              data-studio-tilt
            >
              <span className="studio-sequence-number">03</span>
              <div className="studio-sequence-visual studio-test-signal" aria-hidden="true">
                <i />
                <i />
                <i />
                <span>try it</span>
              </div>
              <div className="studio-sequence-copy">
                <h3>Give it friction.</h3>
                <p>Practice changes a familiar pattern into something you can actually use.</p>
              </div>
            </article>
            <article
              className="studio-sequence-item studio-sequence-spatial"
              data-sequence-item
              data-studio-tilt
            >
              <span className="studio-sequence-number">04</span>
              <div className="studio-sequence-visual">
                <Image
                  src="/landing/mathios-hero-spatial.png"
                  alt="Spatial learning forms on an inky surface"
                  fill
                  sizes="(max-width: 767px) 100vw, 58vw"
                />
              </div>
              <div className="studio-sequence-copy">
                <h3>Change the angle.</h3>
                <p>Simulations and laboratories let the same thought become tangible.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="studio-thread" aria-labelledby="thread-title">
          <div className="studio-thread-heading" data-studio-reveal>
            <p className="studio-kicker">Designed to hold attention</p>
            <h2 id="thread-title">One continuous thread, from first question to useful memory.</h2>
          </div>
          <div className="studio-thread-map" data-studio-reveal>
            <div className="studio-thread-line" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <article className="studio-thread-note studio-thread-note-read">
              <span>Read</span>
              <h3>Make room for the why.</h3>
              <p>Keep the reasoning with the answer.</p>
            </article>
            <article className="studio-thread-note studio-thread-note-test">
              <span>Test</span>
              <h3>Let the subject answer back.</h3>
              <p>Questions and simulations reveal what is really understood.</p>
            </article>
            <article className="studio-thread-note studio-thread-note-keep">
              <span>Keep</span>
              <h3>Bring the useful part forward.</h3>
              <p>Notes turn the next session into a continuation.</p>
            </article>
          </div>
        </section>

        <section id="begin" className="studio-final" aria-labelledby="begin-title">
          <div className="studio-final-grid" data-studio-reveal>
            <div>
              <p className="studio-kicker">Open the field</p>
              <h2 id="begin-title">Let curiosity set the direction.</h2>
            </div>
            <div className="studio-final-action">
              <p>A library for the questions that keep following you around.</p>
              <Link className="studio-cta studio-cta-dark" href={primaryHref as never}>
                <span>{primaryLabel}</span>
                <CtaArrow />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="studio-footer">
        <Link href="/" className="studio-brand" aria-label="Mathios home">
          <BrandMark className="studio-brand-mark" />
          <span>Mathios</span>
        </Link>
        <p>Science learning, with a longer memory.</p>
        <a href="#landing-title">Back to the beginning</a>
      </footer>
    </div>
  );
}
