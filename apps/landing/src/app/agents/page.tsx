"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const media = {
  heroImage:
    "https://framerusercontent.com/images/MyxWwGhf3HJ0lwBgIJADTP2QxZ0.jpg?scale-down-to=4096&width=3836&height=5754",
  heroVideo: "https://framerusercontent.com/assets/Y16cseCt78yy0yxxYvsB1d88.mp4",
  studio:
    "https://framerusercontent.com/images/MyxWwGhf3HJ0lwBgIJADTP2QxZ0.jpg?scale-down-to=2048",
  studioInset: "https://framerusercontent.com/assets/Rtemo11bm5VyidQGs6zRJhEPU.mp4",
  studioPoster:
    "https://framerusercontent.com/images/XMSNPSNvTzJo5MsfqAhjJPMoyU.jpg?scale-down-to=512",
  cosmos:
    "https://framerusercontent.com/images/5lNZhmnB3UtmJRseNIbhkoWNgKo.jpg?scale-down-to=2048",
  cosmosInset:
    "https://framerusercontent.com/images/ezAJS9v51DzmibMorAFvW9ggKU.jpg?scale-down-to=512",
  wars:
    "https://framerusercontent.com/images/VDXoudfFHIsamZOiuQ93oj6nPfU.jpg?scale-down-to=2048",
  warsInset: "https://framerusercontent.com/assets/VBU8duvoyWuqqs7S5v9Nn1DpSA.mp4",
  warsPoster:
    "https://framerusercontent.com/images/hERJIoA2kykJ57R6a9HWZpvIqzU.jpg?scale-down-to=1024",
  purple:
    "https://framerusercontent.com/images/yoj0E31qb4jfa4HWR3gHRQ14g.jpg?scale-down-to=1024",
  purpleInset: "https://framerusercontent.com/assets/gFJdIZBziBu9mQQYt2jPW12thdI.mp4",
  purplePoster:
    "https://framerusercontent.com/images/bF9Hv6AOUaydSd007YDMhvJBfHg.jpg?scale-down-to=512",
  service:
    "https://framerusercontent.com/images/Ef8tCjACck49t9zo1BwNPFdntuA.jpg?width=6000&height=4000",
  serviceAlt:
    "https://framerusercontent.com/images/djIYNr57PrOBWSEpKeMDF3diTE.jpg?scale-down-to=1024&width=6315&height=8626"
};

const workItems = [
  {
    label: "[ studio ]",
    type: "art direction",
    ratio: "aspect-square",
    image: media.studio,
    insetVideo: media.studioInset,
    poster: media.studioPoster
  },
  {
    label: "[ cosmos ]",
    type: "branding",
    ratio: "aspect-[4/5]",
    image: media.cosmos,
    insetImage: media.cosmosInset
  },
  {
    label: "[ wars ]",
    type: "branding",
    ratio: "aspect-video",
    image: media.wars,
    insetVideo: media.warsInset,
    poster: media.warsPoster
  },
  {
    label: "[ purple ]",
    type: "packaging",
    ratio: "aspect-[4/3]",
    image: media.purple,
    insetVideo: media.purpleInset,
    poster: media.purplePoster
  }
];

const services = [
  "art direction",
  "branding",
  "creative direction",
  "packaging",
  "social media",
  "web design",
  "visual identity"
];

const clients = [
  {
    name: "axtra",
    mark: "https://framerusercontent.com/images/zddxnK1mMt7LLxfrm2wngug7cCw.png?width=160&height=160"
  },
  {
    name: "blinq",
    mark: "https://framerusercontent.com/images/sbNsZL6DNFIX7Y6qndWvOULHY.png?width=162&height=163"
  },
  {
    name: "hester",
    mark: "https://framerusercontent.com/images/1AszcIkgxXlpDWLQSndCgta1K4.png?width=144&height=164"
  },
  {
    name: "kodra",
    mark: "https://framerusercontent.com/images/gLk6UyVDYIdlWlYslytnb56Fn8o.png?width=156&height=164"
  },
  {
    name: "northland",
    mark: "https://framerusercontent.com/images/S0d41bOntgrqdmUAVRcWCcNag.png?width=520&height=160"
  },
  {
    name: "vesper",
    mark: "https://framerusercontent.com/images/kdZAka2hoKAgtUtmshSBQoQasaU.png?width=184&height=160"
  }
];

function LoopVideo({
  src,
  poster,
  autoPlay = true,
  className
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}) {
  return (
    <video
      className={className}
      src={src}
      poster={poster}
      autoPlay={autoPlay}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

export default function AgentsPage() {
  const root = useRef<HTMLElement>(null);
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
      const mm = gsap.matchMedia();
      const cleanup: Array<() => void> = [];

      gsap.set(".agents-work-inset", { autoAlpha: 0, scale: 0.94 });
      gsap.set(".agents-client-mark", { autoAlpha: 0, scale: 0.7, width: 0 });
      gsap.set(".agents-final-video", { autoAlpha: 0, y: 48 });

      gsap
        .timeline({ defaults: { duration: 1.05, ease: "expo.out" } })
        .to(".agents-motion-nav", { opacity: 1, y: 0 }, 0)
        .to(".agents-motion-title", { opacity: 1, y: 0 }, 0.05)
        .to(".agents-motion-copy", { opacity: 1 }, 0.5);

      gsap.to(".agents-hero-media", {
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: ".agents-hero",
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });

      ScrollTrigger.batch(".agents-reveal-up", {
        start: "top 82%",
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { opacity: 0.001, y: 48 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              stagger: 0.08,
              ease: "expo.out",
              overwrite: true
            }
          );
        }
      });

      gsap.utils.toArray<HTMLElement>(".agents-work-card").forEach((card) => {
        const baseMedia = card.querySelectorAll<HTMLElement>(":scope > img, :scope > video");
        const inset = card.querySelector<HTMLElement>(".agents-work-inset");
        const insetVideo = inset?.querySelector("video");
        const onEnter = () => {
          insetVideo?.play().catch(() => undefined);
          gsap.to(baseMedia, { scale: 1.035, duration: 0.9, ease: "expo.out" });
          gsap.to(inset, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.65,
            ease: "expo.out",
            overwrite: true
          });
        };
        const onLeave = () => {
          insetVideo?.pause();
          gsap.to(baseMedia, { scale: 1, duration: 0.9, ease: "expo.out" });
          gsap.to(inset, {
            autoAlpha: 0,
            scale: 0.94,
            duration: 0.55,
            ease: "expo.out",
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

      gsap.utils.toArray<HTMLElement>(".agents-client-row").forEach((row) => {
        const mark = row.querySelector<HTMLElement>(".agents-client-mark");
        const onEnter = () => {
          gsap.to(mark, {
            autoAlpha: 1,
            scale: 1,
            width: 32,
            duration: 0.45,
            ease: "expo.out",
            overwrite: true
          });
        };
        const onLeave = () => {
          gsap.to(mark, {
            autoAlpha: 0,
            scale: 0.7,
            width: 0,
            duration: 0.4,
            ease: "expo.out",
            overwrite: true
          });
        };

        row.addEventListener("mouseenter", onEnter);
        row.addEventListener("focusin", onEnter);
        row.addEventListener("mouseleave", onLeave);
        row.addEventListener("focusout", onLeave);
        cleanup.push(() => {
          row.removeEventListener("mouseenter", onEnter);
          row.removeEventListener("focusin", onEnter);
          row.removeEventListener("mouseleave", onLeave);
          row.removeEventListener("focusout", onLeave);
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

      gsap.to(".agents-final-video", {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".agents-final-section",
          start: "top 68%",
          toggleActions: "play none none reverse"
        }
      });

      mm.add("(min-width: 810px)", () => {
        gsap.to(".agents-service-preview", {
          yPercent: 16,
          ease: "none",
          scrollTrigger: {
            trigger: ".agents-services-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.7
          }
        });
      });

      return () => {
        cleanup.forEach((remove) => remove());
        mm.revert();
      };
    },
    { scope: root }
  );

  return (
    <main ref={root} className="agents-page agents-noise min-h-screen overflow-hidden bg-agents-black">
      <AgentsNav />
      <Hero />
      <FeaturedWork />
      <Services activeService={activeService} onService={setActiveService} />
      <Clients />
      <FinalSection />
      <Footer clock={clock} />
      <FramerBadge />
    </main>
  );
}

function AgentsNav() {
  return (
    <nav className="agents-motion-nav agents-mix-difference fixed left-1/2 top-0 z-40 flex w-full items-center justify-between p-4 font-inter text-[10.8px] font-semibold uppercase leading-[12.96px] text-agents-white md:text-[18px] md:leading-[21.6px]">
      <a href="#" className="tracking-normal">
        agents
      </a>
      <div className="hidden items-center gap-4 md:flex">
        {["work", "archive", "about", "contact"].map((item) => (
          <a key={item} href={`#${item}`} className="hover:text-agents-gray">
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
        <img className="agents-hero-media h-full w-full object-cover" src={media.heroImage} alt="" />
        <LoopVideo
          className="agents-hero-media absolute inset-0 h-full w-full object-cover opacity-80"
          src={media.heroVideo}
        />
      </div>
      <div className="agents-mix-difference relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <p className="agents-motion-copy max-w-[320px] text-justify font-display text-[14.4px] font-semibold uppercase leading-[17.28px] text-agents-white md:max-w-[400px] md:text-[24px] md:leading-[28.8px]">
          a creative agency specializing in design, art direction, and branding
          — crafting visuals that connect brands with their audience.
        </p>
      </div>
      <div className="relative flex h-[84px] items-start justify-center overflow-hidden md:h-[309px]">
        <h1 className="agents-motion-title agents-fit-text font-display font-bold uppercase text-agents-white">
          agents
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
            <img className="absolute inset-0 h-full w-full object-cover" src={item.image} alt="" />
            <div className="agents-work-inset absolute inset-[20%] overflow-hidden">
              {item.insetVideo ? (
                <LoopVideo
                  className="h-full w-full object-cover"
                  src={item.insetVideo}
                  poster={item.poster}
                  autoPlay={false}
                />
              ) : (
                <img className="h-full w-full object-cover" src={item.insetImage} alt="" />
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col p-2 font-display text-[14.4px] font-semibold uppercase leading-[17.28px] text-agents-white md:text-[24px] md:leading-[28.8px]">
              <span>{item.label}</span>
              <span>{item.type}</span>
            </div>
          </a>
        ))}
      </div>
      <div className="agents-reveal-up max-w-[400px] font-display text-[14.4px] font-semibold uppercase leading-[17.28px] text-agents-white md:text-[24px] md:leading-[28.8px]">
        <p>
          from concept to execution, every detail matters—
          <a className="text-agents-gray" href="#">
            see all works
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
          className="h-full w-full object-cover"
          src={activeService > 3 ? media.serviceAlt : media.service}
          alt=""
        />
      </div>
      <div className="ml-auto flex w-[75%] max-w-[704px] flex-col p-4 md:w-[50%]">
        <h2 className="agents-reveal-up mb-4 font-display text-[14.4px] font-semibold uppercase leading-[17.28px] tracking-[-0.04em] text-agents-white md:text-[24px] md:leading-[28.8px]">
          [ services ]
        </h2>
        <div className="flex flex-col gap-1">
          {services.map((service, index) => (
            <button
              key={service}
              type="button"
              onMouseEnter={() => onService(index)}
              className={`agents-service-row agents-reveal-up block overflow-hidden text-left font-display text-[33.6px] font-bold uppercase leading-none tracking-[-0.02em] transition-colors duration-300 md:text-[56px] ${
                activeService === index ? "text-agents-white" : "text-agents-gray"
              }`}
            >
              {service}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clients() {
  return (
    <section className="relative flex min-h-[511px] flex-col gap-[95px] px-4 py-32 md:min-h-[657px]">
      <div className="flex flex-col overflow-hidden">
        <h2 className="agents-reveal-up mb-4 font-display text-[14.4px] font-semibold uppercase leading-[17.28px] tracking-[-0.04em] text-agents-white md:text-[24px] md:leading-[28.8px]">
          [ selected clients ]
        </h2>
        <div className="flex flex-col gap-1">
          {clients.map((client, index) => (
            <div
              key={client.name}
              tabIndex={0}
              className={`agents-client-row agents-reveal-up flex h-[34px] items-center gap-4 overflow-visible font-display text-[33.6px] font-bold uppercase leading-none tracking-[-0.02em] md:h-14 md:text-[56px] ${
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
      <LoopVideo
        className="agents-final-video absolute right-4 top-32 h-[83px] w-[147px] object-cover md:left-[39.8%] md:top-10 md:h-[360px] md:w-[640px]"
        src={media.heroVideo}
        autoPlay={false}
      />
      <div className="relative flex flex-col font-display text-[24px] font-semibold uppercase leading-[24px] text-agents-white md:text-[40px] md:leading-[40px]">
        <p className="agents-reveal-up md:ml-[26.35%]">driven by ideas</p>
        <p className="agents-reveal-up ml-16 md:ml-[29.5%]">— defined by details</p>
      </div>
    </section>
  );
}

function Footer({ clock }: { clock: string }) {
  return (
    <footer id="contact" className="relative overflow-hidden bg-agents-black px-4 pb-0 pt-32">
      <div className="grid gap-8 md:grid-cols-2">
        <p className="agents-reveal-up max-w-[480px] font-display text-[24px] font-semibold uppercase leading-[24px] text-agents-white md:text-[40px] md:leading-[40px]">
          let´s build something different
        </p>
        <div className="agents-reveal-up flex flex-col gap-2">
          <h2 className="font-inter text-[10.8px] font-semibold uppercase leading-[12.96px] text-agents-white md:text-[18px] md:leading-[21.6px]">
            reach out
          </h2>
          <div className="flex flex-col gap-0.5 font-display text-[33.6px] font-bold uppercase leading-none tracking-[-0.02em] md:text-[56px]">
            {["mail", "instagram", "x (twitter)"].map((link) => (
              <a key={link} className="text-agents-gray hover:text-agents-white" href="#">
                {link}
              </a>
            ))}
          </div>
        </div>
        <div className="agents-reveal-up mt-8 flex flex-col gap-8 font-inter text-[10.8px] font-semibold uppercase leading-[12.96px] text-agents-white md:text-[18px] md:leading-[21.6px]">
          <div className="flex flex-col gap-1">
            <a href="#">buy template</a>
            <a href="#">made in framer</a>
            <a href="#">by jean</a>
          </div>
          <div className="flex flex-col gap-1">
            <time className="font-display text-[10.8px] leading-[10.8px] md:text-[18px] md:leading-[18px]">
              {clock}
            </time>
            <span>montevideo-uy</span>
          </div>
        </div>
        <div className="agents-reveal-up mt-8 flex flex-col font-inter text-[10.8px] font-semibold uppercase leading-[12.96px] text-agents-white md:self-end md:text-[18px] md:leading-[21.6px]">
          <span>©2025</span>
          <span>all rights reserved</span>
        </div>
      </div>
      <div className="mt-4 h-[75px] overflow-hidden md:h-[294px]">
        <h1 className="agents-watermark font-display font-bold uppercase text-agents-veil">
          agents
        </h1>
      </div>
    </footer>
  );
}

function FramerBadge() {
  return (
    <a
      className="fixed bottom-5 right-5 z-50 hidden h-[38px] w-[140px] items-center justify-center rounded-[10px] bg-white text-[11px] font-semibold text-black shadow-[0_10px_26px_-4.5px_rgba(0,0,0,0.2)] md:flex"
      href="#"
      aria-label="create a free website with framer"
    >
      made in framer
    </a>
  );
}
