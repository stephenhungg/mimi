"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother);

const media = {
  hero: "/hero.png",
  room: "/room.png",
  wordmark: "/wordmark.png",
  cta: "/cta.png",
  dog: "/dog.png",
  tiger: "/tiger.png",
  otter: "/otter.png",
  bunny: "/bunny.png",
  giraffe: "/giraffe.png",
  icon: "/icon.png"
};

type CuteStyle = CSSProperties & Record<`--${string}`, string>;

type Agent = {
  id: string;
  name: string;
  role: string;
  watches: string;
  line: string;
  image: string;
  accent: string;
  soft: string;
  spot: {
    left: string;
    top: string;
  };
};

type Mission = {
  title: string;
  type: string;
  line: string;
  image: string;
  hoverImage: string;
  accent: string;
  ratio: string;
  imageClass?: string;
  hoverClass?: string;
};

const agents: Agent[] = [
  {
    id: "mimi",
    name: "mimi",
    role: "manager dog",
    watches: "the whole room",
    line: "keeps every specialist calm, synced, and writing back to notion.",
    image: media.dog,
    accent: "#f3cf74",
    soft: "#fff0bd",
    spot: { left: "7%", top: "66%" }
  },
  {
    id: "tiger",
    name: "tiger",
    role: "github watcher",
    watches: "prs, tests, failures",
    line: "sniffs out broken builds and turns chaos into a tiny checklist.",
    image: media.tiger,
    accent: "#f19a56",
    soft: "#ffe2c8",
    spot: { left: "6%", top: "15%" }
  },
  {
    id: "otter",
    name: "otter",
    role: "inbox swimmer",
    watches: "gmail and replies",
    line: "sorts noisy mail into useful tasks before it floods your desk.",
    image: media.otter,
    accent: "#83cce9",
    soft: "#dff6ff",
    spot: { left: "72%", top: "12%" }
  },
  {
    id: "bunny",
    name: "bunny",
    role: "calendar scout",
    watches: "meetings and time",
    line: "keeps the schedule cute, punctual, and lightly terrifying.",
    image: media.bunny,
    accent: "#f7a7c8",
    soft: "#ffe1ef",
    spot: { left: "79%", top: "61%" }
  },
  {
    id: "giraffe",
    name: "giraffe",
    role: "memory keeper",
    watches: "notion and notes",
    line: "stands above the room and remembers what everyone promised.",
    image: media.giraffe,
    accent: "#d6b55d",
    soft: "#fff1bb",
    spot: { left: "43%", top: "72%" }
  }
];

const missions: Mission[] = [
  {
    title: "notion room",
    type: "home base",
    line: "the cozy canonical workspace where all agent notes land.",
    image: media.room,
    hoverImage: media.dog,
    accent: agents[0].accent,
    ratio: "aspect-[1.04/1]",
    imageClass: "object-cover",
    hoverClass: "object-contain p-8"
  },
  {
    title: "github tiger",
    type: "test watcher",
    line: "pr smoke, ci failure, regression receipts, and no drama.",
    image: media.hero,
    hoverImage: media.tiger,
    accent: agents[1].accent,
    ratio: "aspect-[4/5]",
    imageClass: "object-cover object-center",
    hoverClass: "object-contain p-6"
  },
  {
    title: "inbox otter",
    type: "mail triage",
    line: "messages become clean tasks instead of a psychic tax.",
    image: media.cta,
    hoverImage: media.otter,
    accent: agents[2].accent,
    ratio: "aspect-[4/3]",
    imageClass: "object-contain p-8",
    hoverClass: "object-contain p-8"
  },
  {
    title: "memory giraffe",
    type: "notion recall",
    line: "meeting scraps turn into searchable little artifacts.",
    image: media.wordmark,
    hoverImage: media.giraffe,
    accent: agents[4].accent,
    ratio: "aspect-[4/3]",
    imageClass: "object-contain p-10",
    hoverClass: "object-contain p-4"
  }
];

const proofChips = [
  "github watched",
  "gmail tucked away",
  "calendar guarded",
  "notion canonical"
];

const workflow = [
  {
    title: "watch the tools",
    kicker: "01",
    line: "mimi assigns a tiny specialist to each noisy surface.",
    image: media.hero,
    accent: agents[1].accent
  },
  {
    title: "catch the signal",
    kicker: "02",
    line: "every ping gets deduped, labeled, and routed to the right animal.",
    image: media.otter,
    accent: agents[2].accent
  },
  {
    title: "write it home",
    kicker: "03",
    line: "finished context lands back in notion with receipts and owners.",
    image: media.giraffe,
    accent: agents[4].accent
  },
  {
    title: "keep the room alive",
    kicker: "04",
    line: "the 3d workspace becomes a cute command center, not another tab.",
    image: media.room,
    accent: agents[0].accent
  }
];

export default function AgentsPage() {
  const root = useRef<HTMLDivElement>(null);
  const [activeService, setActiveService] = useState(0);
  const [clock, setClock] = useState("20:24");

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(new Date())
      );
    };

    updateClock();
    const interval = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useGSAP(
    () => {
      const cleanup: Array<() => void> = [];
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const smoother = reduceMotion
        ? undefined
        : ScrollSmoother.create({
            wrapper: ".agents-smooth-wrapper",
            content: ".agents-smooth-content",
            smooth: 1.2,
            effects: false,
            normalizeScroll: false,
            ignoreMobileResize: true
          });

      if (reduceMotion) {
        gsap.set(".agents-pop, .agents-reveal-up, .agents-wordmark-pop, .agents-scene-pop", {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotate: 0
        });
      } else {
        gsap.set(".agents-pop", { autoAlpha: 0, y: 24, scale: 0.98 });
        gsap.set(".agents-motion-nav", { autoAlpha: 0, y: -14 });
        gsap.set(".agents-wordmark-pop", { autoAlpha: 0, y: 46, scale: 0.9, rotate: -2 });
        gsap.set(".agents-scene-pop", { autoAlpha: 0, y: 54, scale: 0.92, rotate: 2 });
        gsap.set(".agents-reveal-up", { autoAlpha: 0, y: 54, scale: 0.98 });

        gsap
          .timeline({ defaults: { ease: "back.out(1.45)", duration: 0.8 } })
          .to(".agents-motion-nav", { autoAlpha: 1, y: 0, duration: 0.52, ease: "power3.out" }, 0.05)
          .to(".agents-wordmark-pop", { autoAlpha: 1, y: 0, scale: 1, rotate: 0 }, 0.08)
          .to(".agents-scene-pop", { autoAlpha: 1, y: 0, scale: 1, rotate: 0 }, 0.2)
          .to(".agents-pop", { autoAlpha: 1, y: 0, scale: 1, stagger: 0.06 }, 0.26);

        gsap.to(".agents-float", {
          y: (index) => [-12, 10, -8, 12, -10][index % 5],
          rotate: (index) => [-3, 2.5, -2, 3, -2.5][index % 5],
          duration: (index) => 2.3 + index * 0.12,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.12
        });

        gsap.to(".agents-sparkle", {
          scale: 1.35,
          rotate: 28,
          opacity: 0.72,
          duration: 1.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.18
        });

        gsap.to(".agents-hero-media", {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: ".agents-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true
          }
        });

        gsap.to(".agents-command-card", {
          rotate: -1.4,
          y: -18,
          ease: "none",
          scrollTrigger: {
            trigger: ".agents-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1
          }
        });

        ScrollTrigger.batch(".agents-reveal-up", {
          start: "top 84%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.78,
              ease: "back.out(1.22)",
              stagger: 0.06,
              overwrite: true
            });
          }
        });
      }

      gsap.utils.toArray<HTMLElement>(".agents-work-card").forEach((card) => {
        const inset = card.querySelector<HTMLElement>(".agents-work-inset");
        const baseImage = card.querySelector<HTMLElement>(".agents-work-base");
        const chip = card.querySelector<HTMLElement>(".agents-work-chip");
        if (!inset || !baseImage) return;

        const onEnter = () => {
          gsap.to(card, {
            y: -10,
            scale: 1.012,
            duration: 0.28,
            ease: "back.out(1.8)",
            overwrite: true
          });
          gsap.to(baseImage, {
            scale: 1.05,
            duration: 0.52,
            ease: "power3.out",
            overwrite: true
          });
          gsap.to(inset, {
            autoAlpha: 1,
            scale: 1,
            rotate: -1,
            duration: 0.38,
            ease: "back.out(1.8)",
            overwrite: true
          });
          gsap.to(chip, {
            x: 8,
            duration: 0.32,
            ease: "back.out(2)",
            overwrite: true
          });
        };

        const onMove = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotateX: y * -3,
            rotateY: x * 3,
            transformPerspective: 900,
            transformOrigin: "center",
            duration: 0.28,
            ease: "power2.out",
            overwrite: "auto"
          });
        };

        const onLeave = () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            rotateX: 0,
            rotateY: 0,
            duration: 0.42,
            ease: "elastic.out(1, 0.72)",
            overwrite: true
          });
          gsap.to(baseImage, {
            scale: 1,
            duration: 0.46,
            ease: "power3.out",
            overwrite: true
          });
          gsap.to(inset, {
            autoAlpha: 0,
            scale: 0.84,
            rotate: 2,
            duration: 0.28,
            ease: "power2.out",
            overwrite: true
          });
          gsap.to(chip, {
            x: 0,
            duration: 0.24,
            ease: "power2.out",
            overwrite: true
          });
        };

        card.addEventListener("pointerenter", onEnter);
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
        card.addEventListener("focusin", onEnter);
        card.addEventListener("focusout", onLeave);
        cleanup.push(() => {
          card.removeEventListener("pointerenter", onEnter);
          card.removeEventListener("pointermove", onMove);
          card.removeEventListener("pointerleave", onLeave);
          card.removeEventListener("focusin", onEnter);
          card.removeEventListener("focusout", onLeave);
        });
      });

      gsap.utils.toArray<HTMLElement>(".agents-service-row").forEach((row, index) => {
        ScrollTrigger.create({
          trigger: row,
          start: "top 58%",
          end: "bottom 42%",
          onEnter: () => setActiveService(index),
          onEnterBack: () => setActiveService(index)
        });
      });

      gsap.utils.toArray<HTMLElement>(".agents-squad-card").forEach((card) => {
        const img = card.querySelector<HTMLElement>("img");
        const onEnter = () => {
          gsap.to(card, {
            y: -8,
            rotate: -1.2,
            duration: 0.26,
            ease: "back.out(1.8)",
            overwrite: true
          });
          gsap.to(img, {
            y: -8,
            scale: 1.08,
            duration: 0.34,
            ease: "back.out(1.9)",
            overwrite: true
          });
        };
        const onLeave = () => {
          gsap.to(card, {
            y: 0,
            rotate: 0,
            duration: 0.42,
            ease: "elastic.out(1, 0.75)",
            overwrite: true
          });
          gsap.to(img, {
            y: 0,
            scale: 1,
            duration: 0.32,
            ease: "power3.out",
            overwrite: true
          });
        };

        card.addEventListener("pointerenter", onEnter);
        card.addEventListener("pointerleave", onLeave);
        card.addEventListener("focusin", onEnter);
        card.addEventListener("focusout", onLeave);
        cleanup.push(() => {
          card.removeEventListener("pointerenter", onEnter);
          card.removeEventListener("pointerleave", onLeave);
          card.removeEventListener("focusin", onEnter);
          card.removeEventListener("focusout", onLeave);
        });
      });

      return () => {
        cleanup.forEach((remove) => remove());
        smoother?.kill();
      };
    },
    { scope: root }
  );

  return (
    <div ref={root} className="agents-page agents-noise min-h-screen bg-agents-black text-agents-white">
      <AgentsNav />
      <div className="agents-smooth-wrapper">
        <main className="agents-smooth-content">
          <Hero />
          <ProofStrip />
          <FeaturedWork />
          <Squad />
          <Workflow activeService={activeService} onService={setActiveService} />
          <FinalSection />
          <Footer clock={clock} />
        </main>
      </div>
    </div>
  );
}

function AgentsNav() {
  return (
    <nav className="agents-motion-nav fixed inset-x-3 top-3 z-40 mx-auto flex max-w-[1180px] items-center justify-between rounded-full border-[3px] border-agents-white bg-[rgba(255,250,240,0.72)] px-3 py-2 font-inter text-[13px] font-extrabold leading-none shadow-[5px_5px_0_rgba(48,47,44,0.22)] backdrop-blur md:inset-x-6 md:top-5 md:px-4 md:text-[15px]">
      <a href="#" className="flex items-center gap-2">
        <img className="h-9 w-9 rounded-full border-2 border-agents-white bg-agents-black object-cover" src={media.dog} alt="" />
        <span>mimi.</span>
      </a>
      <div className="hidden items-center gap-2 md:flex">
        {[
          ["room", "#work"],
          ["squad", "#squad"],
          ["workflow", "#workflow"],
          ["jump in", "#contact"]
        ].map(([item, href]) => (
          <a key={item} href={href} className="agents-nav-link rounded-full px-4 py-2">
            {item}
          </a>
        ))}
      </div>
      <a className="agents-nav-cta rounded-full px-4 py-2" href="/onboard">
        onboard
      </a>
    </nav>
  );
}

function Hero() {
  return (
    <section className="agents-hero relative isolate flex min-h-[860px] items-center overflow-hidden px-4 pb-16 pt-28 md:min-h-screen md:px-6 md:pb-20 md:pt-32">
      <div className="agents-sparkle left-[8%] top-[18%]" />
      <div className="agents-sparkle right-[10%] top-[20%]" />
      <div className="agents-sparkle bottom-[14%] left-[16%]" />

      <div className="mx-auto grid w-full max-w-[1180px] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10 flex flex-col items-start">
          <p className="agents-pop agents-kicker mb-4">tiny agents, serious receipts</p>
          <h1 className="sr-only">mimi.</h1>
          <div className="agents-wordmark-pop agents-wordmark-frame">
            <img src={media.wordmark} alt="mimi." />
          </div>
          <p className="agents-pop mt-5 max-w-[540px] font-display text-[clamp(2.25rem,8vw,5.9rem)] font-bold leading-[0.88] tracking-normal">
            your tiny ops room for noisy tools.
          </p>
          <p className="agents-pop mt-5 max-w-[520px] font-inter text-[18px] font-bold leading-[1.35] text-agents-gray md:text-[22px]">
            mimi runs a chibi specialist squad across github, gmail, calendar, and notion, then writes the useful stuff back home.
          </p>
          <div className="agents-pop mt-7 flex flex-wrap gap-3">
            <a className="agents-primary-button" href="/onboard">
              meet mimi
            </a>
            <a className="agents-secondary-button" href="#squad">
              see squad
            </a>
          </div>
        </div>

        <div className="agents-scene-pop relative min-h-[500px] md:min-h-[620px]">
          <div className="agents-command-card absolute inset-x-0 top-8 mx-auto max-w-[760px] overflow-hidden">
            <img className="agents-hero-media h-full min-h-[440px] w-full object-cover object-center" src={media.hero} alt="" />
            <div className="agents-command-glass">
              <span>live room</span>
              <strong>notion is canonical</strong>
            </div>
          </div>
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="agents-float agents-hero-sticker absolute"
              style={
                {
                  "--agent": agent.accent,
                  "--agent-soft": agent.soft,
                  left: agent.spot.left,
                  top: agent.spot.top
                } as CuteStyle
              }
            >
              <img src={agent.image} alt="" />
              <span>{agent.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofStrip() {
  return (
    <section className="agents-proof relative overflow-hidden px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="agents-reveal-up font-display text-[28px] font-bold leading-none md:text-[48px]">
          command center, but make it pocket-sized.
        </p>
        <div className="agents-reveal-up flex flex-wrap gap-2">
          {proofChips.map((chip) => (
            <span key={chip} className="agents-proof-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedWork() {
  return (
    <section id="work" className="relative px-4 py-24 md:px-6 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="agents-reveal-up">
            <p className="agents-kicker mb-3">room layers</p>
            <h2 className="font-display text-[clamp(3rem,8vw,7.8rem)] font-bold leading-[0.9]">
              cute work, no loose ends.
            </h2>
          </div>
          <p className="agents-reveal-up max-w-[360px] font-inter text-[17px] font-bold leading-[1.35] text-agents-gray">
            hover the cards. each boring surface has a tiny animal who handles the mess.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {missions.map((mission) => (
            <a
              key={mission.title}
              href="#squad"
              className={`agents-work-card agents-reveal-up relative isolate block overflow-hidden ${mission.ratio}`}
              style={{ "--agent": mission.accent } as CuteStyle}
            >
              <img
                className={`agents-work-base absolute inset-0 h-full w-full ${mission.imageClass ?? "object-cover"}`}
                src={mission.image}
                alt=""
              />
              <div className="agents-work-inset absolute inset-[18%] overflow-hidden">
                <img
                  className={`h-full w-full ${mission.hoverClass ?? "object-contain"}`}
                  src={mission.hoverImage}
                  alt=""
                />
              </div>
              <div className="agents-work-copy absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 md:p-5">
                <span className="agents-work-chip w-fit">{mission.type}</span>
                <h3 className="font-display text-[32px] font-bold leading-none md:text-[48px]">
                  {mission.title}
                </h3>
                <p className="max-w-[420px] font-inter text-[15px] font-extrabold leading-[1.25] text-agents-gray md:text-[17px]">
                  {mission.line}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Squad() {
  return (
    <section id="squad" className="relative px-4 py-24 md:px-6 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        <div className="agents-reveal-up mb-10 max-w-[760px]">
          <p className="agents-kicker mb-3">the tiny staff</p>
          <h2 className="font-display text-[clamp(3rem,8vw,8.4rem)] font-bold leading-[0.88]">
            five specialists, one very bossy dog.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {agents.map((agent) => (
            <article
              key={agent.id}
              tabIndex={0}
              className="agents-squad-card agents-reveal-up flex flex-col"
              style={{ "--agent": agent.accent, "--agent-soft": agent.soft } as CuteStyle}
            >
              <div className="agents-squad-image">
                <img src={agent.image} alt="" />
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <p className="agents-squad-name">{agent.name}</p>
                <p className="font-inter text-[13px] font-extrabold text-agents-gray">{agent.role}</p>
                <p className="font-inter text-[14px] font-bold leading-[1.25]">{agent.watches}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow({
  activeService,
  onService
}: {
  activeService: number;
  onService: (index: number) => void;
}) {
  const active = workflow[activeService] ?? workflow[0];

  return (
    <section id="workflow" className="relative px-4 py-24 md:px-6 md:py-32">
      <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[420px_1fr]">
        <div className="agents-service-preview agents-reveal-up sticky top-28 h-[420px] overflow-hidden" style={{ "--agent": active.accent } as CuteStyle}>
          <img key={active.title} className="agents-service-image h-full w-full object-contain p-9" src={active.image} alt="" />
          <div className="agents-service-label">
            <span>{active.kicker}</span>
            <strong>{active.title}</strong>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="agents-reveal-up mb-8">
            <p className="agents-kicker mb-3">how the room runs</p>
            <h2 className="font-display text-[clamp(3rem,8vw,7rem)] font-bold leading-[0.9]">
              less inbox dread, more tiny order.
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {workflow.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onMouseEnter={() => onService(index)}
                onFocus={() => onService(index)}
                className={`agents-service-row agents-reveal-up text-left ${
                  activeService === index ? "is-active" : ""
                }`}
                style={{ "--agent": step.accent } as CuteStyle}
              >
                <span>{step.kicker}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.line}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className="relative px-4 py-24 md:px-6 md:py-32">
      <div className="agents-final-panel agents-reveal-up mx-auto grid max-w-[1180px] gap-8 overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center p-6 md:p-10">
          <p className="agents-kicker mb-4">ready room</p>
          <h2 className="font-display text-[clamp(3rem,8vw,7.4rem)] font-bold leading-[0.88]">
            give your chaos a desk.
          </h2>
          <p className="mt-5 max-w-[520px] font-inter text-[18px] font-bold leading-[1.35] text-agents-gray">
            onboard the squad, connect notion, and let mimi keep the receipts while the tiny crew handles the pings.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className="agents-primary-button" href="/onboard">
              build squad
            </a>
            <a className="agents-secondary-button" href="#work">
              peek room
            </a>
          </div>
        </div>
        <div className="agents-final-media flex items-center justify-center p-6 md:p-10">
          <img className="w-full max-w-[640px]" src={media.cta} alt="" />
        </div>
      </div>
    </section>
  );
}

function Footer({ clock }: { clock: string }) {
  return (
    <footer id="contact" className="relative overflow-hidden px-4 pb-8 pt-20 md:px-6">
      <div className="mx-auto grid max-w-[1180px] gap-8 border-t-[3px] border-agents-white pt-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div className="agents-reveal-up">
          <img className="mb-5 w-full max-w-[280px]" src={media.wordmark} alt="mimi." />
          <p className="max-w-[440px] font-inter text-[17px] font-extrabold leading-[1.35] text-agents-gray">
            tiny specialists for github, gmail, calendar, and notion. one cozy room. zero orphaned context.
          </p>
        </div>
        <div className="agents-reveal-up flex flex-col gap-2 font-display text-[38px] font-bold leading-none">
          <a href="/onboard">onboard</a>
          <a href="https://github.com/stephenhung/mimi">github</a>
          <a href="#workflow">workflow</a>
        </div>
        <div className="agents-reveal-up flex flex-col justify-between gap-6 font-inter text-[15px] font-extrabold text-agents-gray">
          <div className="flex flex-col gap-2">
            <a href="#work">room layer</a>
            <a href="#squad">agent roster</a>
            <a href="#contact">contact</a>
          </div>
          <div className="flex flex-col gap-1">
            <time className="font-display text-[28px] font-bold leading-none text-agents-white">{clock}</time>
            <span>notion-hq / may 2026</span>
          </div>
        </div>
      </div>
      <p className="agents-footer-watermark pointer-events-none mt-4 font-display font-bold leading-none">
        mimi.
      </p>
    </footer>
  );
}
