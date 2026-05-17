"use client";

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

type WorkItem = {
  label: string;
  type: string;
  ratio: string;
  image: string;
  insetImage: string;
  imageClass?: string;
  insetClass?: string;
};

const workItems: WorkItem[] = [
  {
    label: "[ notion room ]",
    type: "live dashboard",
    ratio: "aspect-square",
    image: media.room,
    insetImage: media.dog,
    imageClass: "object-cover",
    insetClass: "object-contain p-8"
  },
  {
    label: "[ github tiger ]",
    type: "test watcher",
    ratio: "aspect-[4/5]",
    image: media.hero,
    insetImage: media.tiger,
    imageClass: "object-cover",
    insetClass: "object-contain p-6"
  },
  {
    label: "[ inbox otter ]",
    type: "mail triage",
    ratio: "aspect-video",
    image: media.cta,
    insetImage: media.otter,
    imageClass: "object-cover",
    insetClass: "object-contain p-8"
  },
  {
    label: "[ memory giraffe ]",
    type: "notion recall",
    ratio: "aspect-[4/3]",
    image: media.wordmark,
    insetImage: media.giraffe,
    imageClass: "object-contain p-10",
    insetClass: "object-contain p-4"
  }
];

const services = [
  {
    title: "notion sync",
    image: media.room
  },
  {
    title: "github watcher",
    image: media.tiger
  },
  {
    title: "mail triage",
    image: media.otter
  },
  {
    title: "calendar radar",
    image: media.bunny
  },
  {
    title: "memory recall",
    image: media.giraffe
  },
  {
    title: "failure recovery",
    image: media.dog
  },
  {
    title: "live room render",
    image: media.hero
  }
];

const clients = [
  {
    name: "tiger",
    mark: media.tiger
  },
  {
    name: "otter",
    mark: media.otter
  },
  {
    name: "bunny",
    mark: media.bunny
  },
  {
    name: "giraffe",
    mark: media.giraffe
  },
  {
    name: "mimi",
    mark: media.dog
  },
  {
    name: "notion",
    mark: media.icon
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

      const smoother = ScrollSmoother.create({
        wrapper: ".agents-smooth-wrapper",
        content: ".agents-smooth-content",
        smooth: 1.15,
        effects: false,
        normalizeScroll: false,
        ignoreMobileResize: true
      });

      gsap.to(".agents-motion-title", {
        y: 0,
        delay: 0.14,
        duration: 1.05,
        ease: "expo.out"
      });

      gsap.to(".agents-hero-media", {
        y: () => window.innerHeight * 0.2,
        ease: "none",
        scrollTrigger: {
          trigger: ".agents-hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      gsap.set(".agents-work-inset", { autoAlpha: 0, scale: 0.96 });
      gsap.utils.toArray<HTMLElement>(".agents-work-card").forEach((card) => {
        const inset = card.querySelector<HTMLElement>(".agents-work-inset");
        const insetVideo = card.querySelector<HTMLVideoElement>(".agents-work-inset video");
        const onEnter = () => {
          insetVideo?.play().catch(() => undefined);
          gsap.to(inset, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.42,
            ease: "power3.out",
            overwrite: true
          });
        };
        const onLeave = () => {
          if (insetVideo) {
            insetVideo.pause();
            insetVideo.currentTime = 0;
          }
          gsap.to(inset, {
            autoAlpha: 0,
            scale: 0.96,
            duration: 0.32,
            ease: "power2.out",
            overwrite: true
          });
        };

        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("focusin", onEnter);
        card.addEventListener("mouseleave", onLeave);
        card.addEventListener("focusout", onLeave);
        cleanup.push(() => {
          card.removeEventListener("mouseenter", onEnter);
          card.removeEventListener("focusin", onEnter);
          card.removeEventListener("mouseleave", onLeave);
          card.removeEventListener("focusout", onLeave);
        });
      });

      gsap.utils.toArray<HTMLElement>(".agents-service-row").forEach((row, index) => {
        ScrollTrigger.create({
          trigger: row,
          start: "top center",
          end: "bottom center",
          onEnter: () => setActiveService(index),
          onEnterBack: () => setActiveService(index)
        });
      });

      return () => {
        cleanup.forEach((remove) => remove());
        smoother.kill();
      };
    },
    { scope: root }
  );

  return (
    <div ref={root} className="agents-page agents-noise min-h-screen bg-agents-black">
      <AgentsNav />
      <div id="smooth-wrapper" className="agents-smooth-wrapper">
        <main id="smooth-content" className="agents-smooth-content">
          <Hero />
          <FeaturedWork />
          <Services activeService={activeService} onService={setActiveService} />
          <Clients />
          <FinalSection />
          <Footer clock={clock} />
        </main>
      </div>
    </div>
  );
}

function AgentsNav() {
  return (
    <nav className="agents-motion-nav agents-mix-difference fixed left-1/2 top-0 z-40 flex w-full items-center justify-between p-4 font-inter text-[10.8px] font-semibold leading-[12.96px] text-agents-white md:text-[18px] md:leading-[21.6px]">
      <a href="#" className="tracking-normal">
        mimi.
      </a>
      <div className="hidden items-center gap-4 md:flex">
        {[
          ["room", "#work"],
          ["squad", "#squad"],
          ["workflow", "#about"],
          ["contact", "#contact"]
        ].map(([item, href]) => (
          <a key={item} href={href} className="hover:text-agents-gray">
            {item}
          </a>
        ))}
      </div>
      <button className="md:hidden" type="button">
        menu
      </button>
    </nav>
  );
}

function Hero() {
  return (
    <section className="agents-hero relative flex h-screen min-h-[760px] flex-col justify-end overflow-hidden bg-agents-black md:min-h-[900px]">
      <div className="absolute inset-0 overflow-hidden bg-agents-black">
        <img
          className="agents-hero-media h-full w-full object-cover object-center"
          src={media.hero}
          alt=""
        />
        <div className="agents-hero-wash absolute inset-0" />
      </div>
      <div className="agents-mix-difference relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <p className="agents-motion-copy max-w-[320px] text-justify font-display text-[14.4px] font-semibold leading-[17.28px] text-agents-white md:max-w-[400px] md:text-[24px] md:leading-[28.8px]">
          a 3d agent workspace where chibi specialists watch github, gmail,
          calendar, and notion - then write everything back home.
        </p>
      </div>
      <div className="relative flex h-[84px] items-start justify-center overflow-hidden md:h-[309px]">
        <h1 className="agents-motion-title agents-fit-text font-display font-bold text-agents-white">
          mimi.
        </h1>
      </div>
    </section>
  );
}

function FeaturedWork() {
  return (
    <section
      id="work"
      className="relative flex flex-col gap-10 px-4 pb-32 pt-4 md:min-h-[1678px]"
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {workItems.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`agents-work-card agents-reveal-up relative isolate block overflow-hidden ${item.ratio}`}
          >
            <img
              className={`absolute inset-0 h-full w-full ${item.imageClass ?? "object-cover"}`}
              src={item.image}
              alt=""
            />
            <div className="agents-work-inset absolute inset-[20%] overflow-hidden">
              <img
                className={`h-full w-full ${item.insetClass ?? "object-contain"}`}
                src={item.insetImage}
                alt=""
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col p-2 font-display text-[14.4px] font-semibold leading-[17.28px] text-agents-white md:text-[24px] md:leading-[28.8px]">
              <span>{item.label}</span>
              <span>{item.type}</span>
            </div>
          </a>
        ))}
      </div>
      <div className="agents-reveal-up max-w-[400px] font-display text-[14.4px] font-semibold leading-[17.28px] text-agents-white md:text-[24px] md:leading-[28.8px]">
        <p>
          one cozy room, five tiny specialists -
          <a className="text-agents-gray" href="#">
            see the squad
          </a>
        </p>
      </div>
    </section>
  );
}

function Services({
  activeService,
  onService
}: {
  activeService: number;
  onService: (index: number) => void;
}) {
  return (
    <section
      id="about"
      className="agents-services-section relative flex min-h-[855px] flex-col gap-10 px-4 py-32 md:min-h-[1089px] md:flex-row"
    >
      <div className="agents-service-preview sticky top-[calc(50vh-150px)] h-[134px] w-[179px] overflow-hidden md:top-[128px] md:h-[300px] md:w-[400px]">
        <img
          className="h-full w-full object-contain p-6"
          src={services[activeService]?.image ?? services[0].image}
          alt=""
        />
      </div>
      <div className="ml-auto flex w-[75%] max-w-[704px] flex-col p-4 md:w-[50%]">
        <h2 className="agents-reveal-up mb-4 font-display text-[14.4px] font-semibold leading-[17.28px] tracking-[-0.04em] text-agents-white md:text-[24px] md:leading-[28.8px]">
          [ workflow ]
        </h2>
        <div className="flex flex-col gap-1">
          {services.map((service, index) => (
            <button
              key={service.title}
              type="button"
              onMouseEnter={() => onService(index)}
              className={`agents-service-row agents-reveal-up block overflow-hidden text-left font-display text-[33.6px] font-bold leading-none tracking-[-0.02em] transition-colors duration-300 md:text-[56px] ${
                activeService === index ? "text-agents-white" : "text-agents-gray"
              }`}
            >
              {service.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clients() {
  return (
    <section id="squad" className="relative flex min-h-[511px] flex-col gap-[95px] px-4 py-32 md:min-h-[657px]">
      <div className="flex flex-col overflow-hidden">
        <h2 className="agents-reveal-up mb-4 font-display text-[14.4px] font-semibold leading-[17.28px] tracking-[-0.04em] text-agents-white md:text-[24px] md:leading-[28.8px]">
          [ squad roster ]
        </h2>
        <div className="flex flex-col gap-1">
          {clients.map((client, index) => (
            <div
              key={client.name}
              tabIndex={0}
              className={`agents-client-row agents-reveal-up flex h-[34px] items-center gap-4 overflow-visible font-display text-[33.6px] font-bold leading-none tracking-[-0.02em] md:h-14 md:text-[56px] ${
                index === clients.length - 1 ? "text-agents-white" : "text-agents-gray"
              }`}
            >
              <span>{client.name}</span>
              <img className="agents-client-mark h-8 object-contain" src={client.mark} alt="" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className="agents-final-section relative flex min-h-[363px] flex-col justify-center overflow-clip px-4 py-32 md:min-h-[476px]">
      <img
        className="agents-final-video absolute right-4 top-32 h-[83px] w-[147px] object-contain md:left-[39.8%] md:top-10 md:h-[360px] md:w-[640px]"
        src={media.room}
        alt=""
      />
      <div className="relative flex flex-col font-display text-[24px] font-semibold leading-[24px] text-agents-white md:text-[40px] md:leading-[40px]">
        <p className="agents-reveal-up md:ml-[26.35%]">notion is canonical</p>
        <p className="agents-reveal-up ml-16 md:ml-[29.5%]">- the room is alive</p>
      </div>
    </section>
  );
}

function Footer({ clock }: { clock: string }) {
  return (
    <footer id="contact" className="relative overflow-hidden bg-agents-black px-4 pb-0 pt-32">
      <div className="grid gap-8 md:grid-cols-2">
        <p className="agents-reveal-up max-w-[480px] font-display text-[24px] font-semibold leading-[24px] text-agents-white md:text-[40px] md:leading-[40px]">
          build a tiny team that actually writes things down.
        </p>
        <div className="agents-reveal-up flex flex-col gap-2">
          <h2 className="font-inter text-[10.8px] font-semibold leading-[12.96px] text-agents-white md:text-[18px] md:leading-[21.6px]">
            jump in
          </h2>
          <div className="flex flex-col gap-0.5 font-display text-[33.6px] font-bold leading-none tracking-[-0.02em] md:text-[56px]">
            {[
              ["onboard", "/onboard"],
              ["github", "https://github.com/stephenhung/mimi"],
              ["notion", "#work"]
            ].map(([link, href]) => (
              <a key={link} className="text-agents-gray hover:text-agents-white" href={href}>
                {link}
              </a>
            ))}
          </div>
        </div>
        <div className="agents-reveal-up mt-8 flex flex-col gap-8 font-inter text-[10.8px] font-semibold leading-[12.96px] text-agents-white md:text-[18px] md:leading-[21.6px]">
          <div className="flex flex-col gap-1">
            <a href="#work">room layer</a>
            <a href="#squad">agent roster</a>
          </div>
          <div className="flex flex-col gap-1">
            <time className="font-display text-[10.8px] leading-[10.8px] md:text-[18px] md:leading-[18px]">
              {clock}
            </time>
            <span>notion-hq</span>
          </div>
        </div>
        <div className="agents-reveal-up mt-8 flex flex-col font-inter text-[10.8px] font-semibold leading-[12.96px] text-agents-white md:self-end md:text-[18px] md:leading-[21.6px]">
          <span>may 2026</span>
          <span>mimi keeps receipts</span>
        </div>
      </div>
      <div className="mt-4 h-[75px] overflow-hidden md:h-[294px]">
        <h1 className="agents-watermark font-display font-bold text-agents-veil">
          mimi.
        </h1>
      </div>
    </footer>
  );
}
