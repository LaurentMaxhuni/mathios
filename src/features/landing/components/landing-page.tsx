"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BrandMark } from "@/components/shared/brand-mark";

gsap.registerPlugin(ScrollTrigger);

const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Astronomy"];

interface LandingPageProps {
  primaryHref: string;
  primaryLabel?: string;
  signInHref?: string;
}

function CtaIcon() {
  return (
    <span className="landing-cta-icon" aria-hidden="true">
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
      desktop.add("(min-width: 768px)", () => {
        const intro = gsap.timeline({ defaults: { ease: "power4.out" } });

        intro
          .from(
            ".landing-hero-kicker, .landing-hero-title, .landing-hero-lede, .landing-hero-actions",
            {
              y: 34,
              opacity: 0,
              duration: 0.88,
              stagger: 0.08,
            },
          )
          .from(
            ".landing-hero-visual-shell",
            {
              y: 56,
              rotateX: 10,
              rotateY: -12,
              opacity: 0,
              duration: 1.2,
            },
            "-=0.66",
          )
          .from(
            ".landing-hero-layer",
            {
              z: -80,
              opacity: 0,
              duration: 0.9,
              stagger: 0.08,
            },
            "-=0.88",
          );

        gsap.to(".landing-hero-visual-image", {
          yPercent: 10,
          scale: 1.08,
          ease: "none",
          scrollTrigger: {
            trigger: ".landing-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.to(".landing-hero-visual-orbit", {
          rotation: 360,
          transformOrigin: "center center",
          ease: "none",
          scrollTrigger: {
            trigger: ".landing-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.2,
          },
        });

        gsap.to(".landing-hero-visual-shell", {
          yPercent: -6,
          rotateX: -4,
          rotateY: 5,
          ease: "none",
          scrollTrigger: {
            trigger: ".landing-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.1,
          },
        });

        gsap.to(".landing-manifesto-image", {
          yPercent: -16,
          scale: 1.08,
          ease: "none",
          scrollTrigger: {
            trigger: ".landing-manifesto",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element, index) => {
        gsap.fromTo(
          element,
          { y: 42, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            delay: (index % 3) * 0.06,
            ease: "power4.out",
            scrollTrigger: {
              trigger: element,
              start: "top 86%",
              once: true,
            },
          },
        );
      });

      desktop.add("(min-width: 768px)", () => {
        const stackCards = gsap.utils.toArray<HTMLElement>(".landing-stack-card");
        stackCards.forEach((card, index) => {
          if (index === stackCards.length - 1) return;

          ScrollTrigger.create({
            trigger: card,
            start: "top top",
            endTrigger: stackCards[stackCards.length - 1],
            end: "top top",
            pin: true,
            pinSpacing: false,
          });

          gsap.to(card, {
            scale: 0.92,
            opacity: 0.56,
            ease: "none",
            scrollTrigger: {
              trigger: stackCards[index + 1],
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-tilt]").forEach((element) => {
          const rotateX = gsap.quickTo(element, "rotationX", {
            duration: 0.72,
            ease: "power3.out",
          });
          const rotateY = gsap.quickTo(element, "rotationY", {
            duration: 0.72,
            ease: "power3.out",
          });
          const lift = gsap.quickTo(element, "z", {
            duration: 0.72,
            ease: "power3.out",
          });

          const onPointerMove = (event: PointerEvent) => {
            const bounds = element.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            rotateX(y * -7);
            rotateY(x * 9);
            lift(18);
          };

          const onPointerLeave = () => {
            rotateX(0);
            rotateY(0);
            lift(0);
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
    <div ref={pageRef} className="landing-page">
      <header className="landing-nav" aria-label="Primary navigation">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand" aria-label="Mathios home">
            <BrandMark className="landing-brand-mark" priority />
            <span className="landing-brand-name">Mathios</span>
          </Link>

          <nav className="landing-nav-links" aria-label="Landing page navigation">
            <a href="#method">How it works</a>
            <a href="#workspace">The subjects</a>
            <a href="#rhythm">Daily rhythm</a>
          </nav>

          <div className="landing-nav-actions">
            {signInHref ? (
              <Link className="landing-nav-sign-in" href={signInHref as never}>
                Sign in
              </Link>
            ) : null}
            <Link className="landing-cta landing-cta-nav" href={primaryHref as never}>
              <span>{primaryLabel}</span>
              <CtaIcon />
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-hero-kicker">A learning system for curious minds</p>
              <h1 id="landing-title" className="landing-hero-title">
                Learn in layers, not loops.
              </h1>
              <p className="landing-hero-lede">
                A focused science library that turns one daily session into a path you can keep.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-cta landing-cta-primary" href={primaryHref as never}>
                  <span>{primaryLabel}</span>
                  <CtaIcon />
                </Link>
                <a className="landing-cta landing-cta-quiet" href="#method">
                  <span>Explore the method</span>
                  <span className="landing-quiet-arrow" aria-hidden="true">
                    ↓
                  </span>
                </a>
              </div>
            </div>

            <div className="landing-hero-visual-shell landing-bezel" data-tilt>
              <div className="landing-hero-visual-core">
                <div className="landing-hero-layer landing-hero-visual-orbit" aria-hidden="true">
                  <span />
                </div>
                <div className="landing-hero-layer landing-hero-visual-ring" aria-hidden="true" />
                <Image
                  src="/landing/mathios-hero-spatial.png"
                  alt="Translucent geometric forms arranged on a midnight-blue plinth"
                  fill
                  priority
                  sizes="(max-width: 767px) 100vw, 56vw"
                  className="landing-hero-visual-image"
                />
                <div className="landing-hero-visual-wash" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="workspace"
          className="landing-subject-strip"
          aria-label="Subjects in the Mathios library"
        >
          <div className="landing-container landing-subject-strip-inner">
            <span className="landing-subject-strip-lead">One library across</span>
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
            <div className="landing-section-heading" data-reveal>
              <h2 id="method-title">Make the next idea easy to find.</h2>
              <p>
                Prepared courses, visible reasoning, and the right amount of practice keep the
                learning thread intact.
              </p>
            </div>

            <div className="landing-bento" aria-label="How Mathios supports learning">
              <article
                className="landing-bezel landing-bento-card landing-bento-card-large"
                data-reveal
                data-tilt
              >
                <div className="landing-bento-core">
                  <div className="landing-bento-image-wrap">
                    <Image
                      src="/landing/mathios-hero.png"
                      alt="A geometry notebook and translucent triangle on a deep blue desk"
                      fill
                      sizes="(max-width: 767px) 100vw, 58vw"
                      className="landing-cover-image"
                    />
                  </div>
                  <div className="landing-bento-copy">
                    <span className="landing-bento-word">Understand</span>
                    <h3>Stay with the why.</h3>
                    <p>Explanations keep the reasoning visible, not buried under the answer.</p>
                  </div>
                </div>
              </article>

              <article
                className="landing-bezel landing-bento-card landing-bento-card-dark"
                data-reveal
                data-tilt
              >
                <div className="landing-bento-core">
                  <div className="landing-equation" aria-hidden="true">
                    <span>idea</span>
                    <i>→</i>
                    <span>pattern</span>
                    <i>→</i>
                    <span>fluency</span>
                  </div>
                  <div className="landing-bento-copy">
                    <span className="landing-bento-word">Follow</span>
                    <h3>A path with a point.</h3>
                    <p>Courses and roadmaps make the sequence feel considered.</p>
                  </div>
                </div>
              </article>

              <article
                className="landing-bezel landing-bento-card landing-bento-card-accent"
                data-reveal
                data-tilt
              >
                <div className="landing-bento-core">
                  <div className="landing-orbit-glyph" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="landing-bento-copy">
                    <span className="landing-bento-word">Return</span>
                    <h3>Small sessions add up.</h3>
                    <p>A daily rhythm makes progress easier to notice and easier to keep.</p>
                  </div>
                </div>
              </article>

              <article
                className="landing-bezel landing-bento-card landing-bento-card-study"
                data-reveal
                data-tilt
              >
                <div className="landing-bento-core">
                  <div className="landing-bento-image-wrap landing-bento-image-wrap-study">
                    <Image
                      src="/landing/mathios-study.png"
                      alt="A parabola drawn on paper beside a translucent ruler and pencil"
                      fill
                      sizes="(max-width: 767px) 100vw, 34vw"
                      className="landing-cover-image"
                    />
                  </div>
                  <div className="landing-bento-copy">
                    <span className="landing-bento-word">Test</span>
                    <h3>Make the idea move.</h3>
                  </div>
                </div>
              </article>

              <article
                className="landing-bezel landing-bento-card landing-bento-card-thread"
                data-reveal
                data-tilt
              >
                <div className="landing-bento-core">
                  <div className="landing-thread-lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="landing-bento-copy">
                    <span className="landing-bento-word">Keep</span>
                    <h3>Your notes belong in the picture.</h3>
                    <p>Add context, save the useful parts, and return when the idea is ready.</p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="rhythm" className="landing-journey" aria-labelledby="journey-title">
          <div className="landing-container landing-journey-heading" data-reveal>
            <h2 id="journey-title">Let the path reveal itself.</h2>
            <p>
              Learning works better when the next move is close, the context stays visible, and each
              session leaves something useful behind.
            </p>
          </div>

          <div className="landing-journey-stack">
            <article className="landing-stack-card">
              <div className="landing-bezel landing-stack-card-frame" data-tilt>
                <div className="landing-stack-card-core">
                  <div className="landing-stack-card-media">
                    <Image
                      src="/landing/mathios-study.png"
                      alt="A geometric curve drawn across a paper study"
                      fill
                      sizes="(max-width: 767px) 100vw, 48vw"
                      className="landing-cover-image"
                    />
                  </div>
                  <div className="landing-stack-card-copy">
                    <span className="landing-stack-card-label">Read</span>
                    <h3>Start with the shape of the idea.</h3>
                    <p>Prepared lessons give the concept enough room to make sense.</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="landing-stack-card">
              <div className="landing-bezel landing-stack-card-frame" data-tilt>
                <div className="landing-stack-card-core">
                  <div className="landing-stack-card-media">
                    <Image
                      src="/landing/mathios-hero.png"
                      alt="A compass resting beside a geometry notebook"
                      fill
                      sizes="(max-width: 767px) 100vw, 48vw"
                      className="landing-cover-image"
                    />
                  </div>
                  <div className="landing-stack-card-copy">
                    <span className="landing-stack-card-label">Practice</span>
                    <h3>Give the idea somewhere to land.</h3>
                    <p>Exercises and feedback turn recognition into something you can use.</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="landing-stack-card">
              <div className="landing-bezel landing-stack-card-frame" data-tilt>
                <div className="landing-stack-card-core landing-stack-card-core-spatial">
                  <div className="landing-stack-spatial" aria-hidden="true">
                    <span className="landing-stack-spatial-orbit landing-stack-spatial-orbit-one" />
                    <span className="landing-stack-spatial-orbit landing-stack-spatial-orbit-two" />
                    <span className="landing-stack-spatial-core" />
                    <span className="landing-stack-spatial-ray landing-stack-spatial-ray-one" />
                    <span className="landing-stack-spatial-ray landing-stack-spatial-ray-two" />
                  </div>
                  <div className="landing-stack-card-copy">
                    <span className="landing-stack-card-label">Explore</span>
                    <h3>See the system from another angle.</h3>
                    <p>Simulations and virtual laboratories let understanding become tangible.</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-manifesto" aria-labelledby="manifesto-title">
          <div className="landing-container landing-manifesto-inner" data-reveal>
            <h2 id="manifesto-title">
              A good lesson{" "}
              <span className="landing-inline-image">
                <Image
                  src="/landing/mathios-study.png"
                  alt=""
                  fill
                  sizes="180px"
                  className="landing-manifesto-image"
                />
              </span>{" "}
              changes what you notice next.
            </h2>
            <p>Keep the useful idea. Let the rest become part of the background.</p>
          </div>
        </section>

        <section className="landing-final" aria-labelledby="final-title">
          <div className="landing-container landing-final-inner" data-reveal>
            <div className="landing-final-copy">
              <p className="landing-final-kicker">The library is ready</p>
              <h2 id="final-title">Make curiosity part of the day.</h2>
              <p>Pick a subject, find the next useful idea, and give it ten focused minutes.</p>
            </div>
            <Link
              className="landing-cta landing-cta-primary landing-cta-final"
              href={primaryHref as never}
            >
              <span>{primaryLabel}</span>
              <CtaIcon />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Link href="/" className="landing-brand" aria-label="Mathios home">
            <BrandMark className="landing-brand-mark" />
            <span className="landing-brand-name">Mathios</span>
          </Link>
          <p>Science learning with room for your own notes.</p>
          <a className="landing-footer-top" href="#landing-title">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
