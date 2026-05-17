"use client";

import { useRef, useState } from "react";
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
  studioInsetPoster:
    "https://framerusercontent.com/images/XMSNPSNvTzJo5MsfqAhjJPMoyU.jpg?scale-down-to=512",
  cosmos:
    "https://framerusercontent.com/images/5lNZhmnB3UtmJRseNIbhkoWNgKo.jpg?scale-down-to=2048",
  cosmosInset:
    "https://framerusercontent.com/images/ezAJS9v51DzmibMorAFvW9ggKU.jpg?scale-down-to=512",
  wars:
    "https://framerusercontent.com/images/VDXoudfFHIsamZOiuQ93oj6nPfU.jpg?scale-down-to=2048",
  warsInset: "https://framerusercontent.com/assets/VBU8duvoyWuqqs7S5v9Nn1DpSA.mp4",
  warsInsetPoster:
    "https://framerusercontent.com/images/hERJIoA2kykJ57R6a9HWZpvIqzU.jpg?scale-down-to=1024",
  purple:
    "https://framerusercontent.com/images/yoj0E31qb4jfa4HWR3gHRQ14g.jpg?scale-down-to=1024",
  purpleInset: "https://framerusercontent.com/assets/gFJdIZBziBu9mQQYt2jPW12thdI.mp4",
  purpleInsetPoster:
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
    insetPoster: media.studioInsetPoster
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
    insetPoster: media.warsInsetPoster
  },
  {
    label: "[ purple ]",
    type: "packaging",
    ratio: "aspect-[4/3]",
    image: media.purple,
    insetVideo: media.purpleInset,
    insetPoster: media.purpleInsetPoster
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
  className
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  return (
    <video
      className={className}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

export default function Home() {
  const root = useRef<HTMLElement>(null);
  const [activeService, setActiveService] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      gsap
        .timeline({ defaults: { duration: 1, ease: "expo.out" } })
        .to(".motion-nav", { opacity: 1, y: 0 }, 0)
        .to(".motion-title", { opacity: 1, y: 0 }, 0.05)
        .to(".motion-copy", { opacity: 1 }, 0.5);

      gsap.to(".hero-media", {
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });

      ScrollTrigger.batch(".reveal-up", {
        start: "top 82%",
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.08,
            ease: "expo.out",
            overwrite: true
          });
        }
      });

      gsap.utils.toArray<HTMLElement>(".work-card").forEach((card) => {
        const targets = card.querySelectorAll("img, video");
        card.addEventListener("mouseenter", () => {
          gsap.to(targets, { scale: 1.035, duration: 0.8, ease: "expo.out" });
        });
        card.addEventListener("mouseleave", () => {
          gsap.to(targets, { scale: 1, duration: 0.8, ease: "expo.out" });
        });
      });

      gsap.utils.toArray<HTMLElement>(".service-row").forEach((row, index) => {
        ScrollTrigger.create({
          trigger: row,
          start: "top center",
          end: "bottom center",
          onEnter: () => setActiveService(index),
          onEnterBack: () => setActiveService(index)
        });
      });

      mm.add("(min-width: 810px)", () => {
        gsap.to(".service-preview", {
          yPercent: 16,
          ease: "none",
          scrollTrigger: {
            trigger: ".services-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.7
          }
        });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <main ref={root} className="agents-noise min-h-screen overflow-hidden bg-agents-black">
      <Nav />
      <Hero />
      <FeaturedWork />
      <Services activeService={activeService} onService={setActiveService} />
      <Clients />
      <FinalSection />
      <Footer />
      <FramerBadge />
    </main>
  );
}

function Nav() {
  return (
    <nav className="motion-nav mix-difference fixed left-1/2 top-0 z-40 flex w-full items-center justify-between p-4 font-inter text-[10.8px] font-semibold uppercase leading-[1.2] text-agents-white md:text-lg">
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
    <section className="hero relative flex h-screen min-h-[760px] flex-col justify-end overflow-hidden bg-agents-black md:min-h-[900px]">
      <div className="absolute inset-0 overflow-hidden bg-agents-black">
        <img
          className="hero-media h-full w-full object-cover"
          src={media.heroImage}
          alt=""
        />
        <LoopVideo
          className="hero-media absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-screen"
          src={media.heroVideo}
        />
      </div>

      <div className="mix-difference relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <p className="motion-copy max-w-[320px] font-display text-[14.4px] font-semibold uppercase leading-[1.2] text-agents-white md:max-w-[400px] md:text-2xl">
          a creative agency specializing in design, art direction, and branding
          — crafting visuals that connect brands with their audience.
        </p>
      </div>

      <div className="relative flex h-[84px] items-start justify-center overflow-hidden md:h-[309px]">
        <h1 className="motion-title agents-fit-text font-display font-bold uppercase text-agents-white">
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
            className={`work-card reveal-up relative isolate block overflow-hidden ${item.ratio}`}
          >
            <img className="absolute inset-0 h-full w-full object-cover" src={item.image} alt="" />
            <div className="absolute inset-[20%] overflow-hidden">
              {item.insetVideo ? (
                <LoopVideo
                  className="h-full w-full object-cover"
                  src={item.insetVideo}
                  poster={item.insetPoster}
                />
              ) : (
                <img className="h-full w-full object-cover" src={item.insetImage} alt="" />
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col p-2 font-display text-[14.4px] font-semibold uppercase leading-[1.2] text-agents-white md:text-2xl">
              <span>{item.label}</span>
              <span>{item.type}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="reveal-up flex max-w-[400px] flex-col font-display text-[14.4px] font-semibold uppercase leading-[1.2] text-agents-white md:text-2xl">
        <p>from concept to execution, every detail matters—</p>
        <a className="text-agents-gray" href="#">
          see all works
        </a>
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
      className="services-section relative flex min-h-[855px] flex-col gap-10 px-4 py-32 md:min-h-[1089px] md:flex-row"
    >
      <div className="service-preview sticky top-[calc(50vh-150px)] h-[134px] w-[179px] overflow-hidden md:top-[128px] md:h-[300px] md:w-[400px]">
        <img
          className="h-full w-full object-cover"
          src={activeService > 3 ? media.serviceAlt : media.service}
          alt=""
        />
      </div>

      <div className="ml-auto flex w-[75%] max-w-[704px] flex-col p-4 md:w-[50%]">
        <h2 className="reveal-up mb-4 font-display text-[14.4px] font-semibold uppercase leading-[1.2] tracking-[-0.04em] text-agents-white md:text-2xl">
          [ services ]
        </h2>
        <div className="flex flex-col gap-1">
          {services.map((service, index) => (
            <button
              key={service}
              type="button"
              onMouseEnter={() => onService(index)}
              className={`service-row reveal-up block overflow-hidden text-left font-display text-[33.6px] font-bold uppercase leading-none tracking-[-0.02em] transition-colors duration-300 md:text-[56px] ${
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
        <h2 className="reveal-up mb-4 font-display text-[14.4px] font-semibold uppercase leading-[1.2] tracking-[-0.04em] text-agents-white md:text-2xl">
          [ selected clients ]
        </h2>
        <div className="flex flex-col gap-1">
          {clients.map((client, index) => (
            <div
              key={client.name}
              className={`reveal-up flex h-[34px] items-center gap-4 overflow-visible font-display text-[33.6px] font-bold uppercase leading-none tracking-[-0.02em] md:h-14 md:text-[56px] ${
                index === clients.length - 1 ? "text-agents-white" : "text-agents-gray"
              }`}
            >
              <span>{client.name}</span>
              <img className="h-8 w-8 object-contain" src={client.mark} alt="" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className="relative flex min-h-[363px] flex-col justify-center overflow-clip px-4 py-32 md:min-h-[476px]">
      <LoopVideo
        className="absolute right-4 top-32 h-[83px] w-[147px] object-cover md:left-[39.8%] md:top-10 md:h-[360px] md:w-[640px]"
        src={media.heroVideo}
      />
      <div className="relative flex flex-col font-display text-2xl font-semibold uppercase leading-none text-agents-white md:text-[40px]">
        <p className="reveal-up md:ml-[26.35%]">driven by ideas</p>
        <p className="reveal-up">— defined by details</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-agents-black px-4 pb-0 pt-32"
    >
      <div className="grid gap-8 md:grid-cols-2">
        <p className="reveal-up max-w-[480px] font-display text-2xl font-semibold uppercase leading-none text-agents-white md:text-[40px]">
          let´s build something different
        </p>

        <div className="reveal-up flex flex-col gap-2">
          <h2 className="font-inter text-[10.8px] font-semibold uppercase leading-[1.2] text-agents-white md:text-lg">
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

        <div className="reveal-up mt-8 flex flex-col gap-8 font-inter text-[10.8px] font-semibold uppercase leading-[1.2] text-agents-white md:text-lg">
          <div className="flex flex-col gap-1">
            <a href="#">buy template</a>
            <a href="#">made in framer</a>
            <a href="#">by jean</a>
          </div>
          <div className="flex flex-col gap-1">
            <time className="font-display leading-none">20:24</time>
            <span>montevideo-uy</span>
          </div>
        </div>

        <div className="reveal-up mt-8 flex flex-col font-inter text-[10.8px] font-semibold uppercase leading-[1.2] text-agents-white md:self-end md:text-lg">
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
