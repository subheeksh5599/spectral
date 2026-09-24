"use client";

import React, { useEffect, useState } from "react";

/* Ported from the operator's own frontend (STATEKEEP /web): structure, classes and
   artwork are 1:1, only the words differ. No live chain data appears on this page. */

const pills = [
  { icon: <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">D</span>, label: "Not a keeper network" },
  { icon: <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">P</span>, label: "Not an intent system" },
  { icon: <span className="text-yellow-500 font-bold text-lg">✱</span>, label: "Not a bounty board" },
  { icon: <span className="text-amber-600 text-sm">👑</span>, label: "Not a liquidation bot" },
  { icon: <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">C</span>, label: "Not insurance" },
  { icon: <span className="text-rose-500 font-bold">▲</span>, label: "Not a transaction wrapper" },
  { icon: <span className="font-bold text-blue-500">G</span>, label: "Not an assertion layer" },
  { icon: <span className="w-6 h-5 rounded-md bg-red-600 text-white flex items-center justify-center text-xs font-bold">▶</span>, label: "Not a solver market" },
  { icon: <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">U</span>, label: "Not verified-work theatre" },
  { icon: <span className="text-blue-600 font-bold text-lg">∞</span>, label: "Not a voting system" },
  { icon: <span className="text-emerald-700 font-bold">✳</span>, label: "Not an oracle" },
  { icon: <span className="text-sky-600 font-bold text-xs bg-sky-100 px-1 rounded">AX</span>, label: "Not a model" },
  { icon: <span className="font-bold text-amber-500">a</span>, label: "Not an operator" },
  { icon: <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">💬</span>, label: "The count decides" },
  { icon: <span className="text-emerald-600 font-bold">N</span>, label: "Units are the record" },
  { icon: <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold">hp</span>, label: "No admin key" },
  { icon: <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">a:</span>, label: "Bond locked" },
  { icon: <span className="text-emerald-800 font-bold">☕</span>, label: "Deadline enforced" },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("papercraft-body");
    const s = document.createElement("script");
    s.src = "/animations.js";
    s.async = true;
    document.body.appendChild(s);
    return () => {
      document.body.classList.remove("papercraft-body");
      s.remove();
    };
  }, []);

  return (
    <div className="papercraft-body">
      {/* BEGIN: StickyNavigation */}
      <header className="fixed top-4 left-0 right-0 z-50 flex items-center justify-center gap-3 sm:gap-4 max-w-[1360px] mx-auto px-4 sm:px-6 pointer-events-none">
        <nav className="pointer-events-auto bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.06)] flex items-center gap-6 border border-black/5">
          <a aria-label="Spectral home" className="flex items-center pr-2" href="#">
            <span className="text-xl font-bold tracking-tight text-ink-charcoal">Spectral</span>
          </a>
          <div className="hidden lg:flex items-center gap-7 text-[15px] font-medium text-neutral-700">
            <a className="hover:text-black transition-colors" href="#rule">The rule</a>
            <a className="hover:text-black transition-colors" href="#units">Units</a>
            <a className="hover:text-black transition-colors" href="#methodology-journey">Takeover</a>
            <a className="hover:text-black transition-colors" href="#settlement">Settlement</a>
            <a className="hover:text-black transition-colors" href="#limits">Limits</a>
          </div>
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="w-9 h-9 rounded-full bg-brand-green flex flex-col items-center justify-center gap-1 hover:bg-brand-green-dark transition-colors"
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="w-4 h-[2px] bg-ink-charcoal rounded-full" />
            <span className="w-4 h-[2px] bg-ink-charcoal rounded-full" />
          </button>
        </nav>
        {menuOpen && (
          <div className="pointer-events-auto absolute top-[70px] left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md px-5 py-3 rounded-[28px] shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-black/5 flex flex-col gap-1 min-w-[220px]">
            {[["The rule", "#rule"], ["Units", "#units"], ["Takeover", "#methodology-journey"], ["Settlement", "#settlement"], ["Limits", "#limits"], ["Dashboard", "/app"]].map(([label, href]) => (
              <a key={label} className="text-[15px] font-medium text-neutral-700 hover:text-black transition-colors px-3 py-2 rounded-full hover:bg-neutral-100" href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
          </div>
        )}
        <div className="pointer-events-auto">
          <a className="bg-white/95 backdrop-blur-md pl-5 pr-2 py-1.5 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.06)] flex items-center gap-3 border border-black/5 hover:shadow-lg transition-all group" href="/app">
            <span className="text-[15px] font-semibold text-ink-charcoal">Open the venue</span>
            <span className="w-9 h-9 rounded-full bg-brand-sky flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 32 32">
                <circle cx="16" cy="16" fill="#1b8aff" r="14" />
                <path d="M10 13c1-2 4-2 5 0" fill="none" stroke="#111" strokeLinecap="round" strokeWidth="2" />
                <path d="M17 14c1-2 4-2 5 0" fill="none" stroke="#111" strokeLinecap="round" strokeWidth="2" />
                <path d="M11 20c2 3.5 8 3.5 10 0" fill="#fff" stroke="#111" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </span>
          </a>
        </div>
      </header>
      {/* END: StickyNavigation */}

      {/* BEGIN: HeroCurtainSection */}
      <section className="relative w-full bg-[#8ed462] min-h-[96vh] flex flex-col justify-between pt-32 pb-0 px-6 overflow-hidden rounded-b-[48px] transition-transform duration-700 shadow-md" id="hero-curtain">
        <div className="max-w-4xl mx-auto text-center mt-12 sm:mt-16">
          <h1 className="hero-title font-extrabold text-ink-charcoal tracking-tight">
            Pay for what<br />was counted
          </h1>
          <p className="mt-6 text-2xl sm:text-3xl font-medium text-ink-charcoal/85 tracking-tight">
            No oracle. No vote. No admin.
          </p>
        </div>
        <div className="relative w-full max-w-5xl mx-auto mt-12 flex justify-center items-end" data-reveal="illustrated-community">
          <div className="relative w-full aspect-[16/9] max-h-[500px] char-float">
            <svg className="w-full h-full drop-shadow-sm select-none" fill="none" viewBox="0 0 1000 520" xmlns="http://www.w3.org/2000/svg">
              <path d="M150 520C280 430 450 4 680 430C820 450 940 500 1000 520H0C40 520 100 520 150 520Z" fill="#78be46" />
              <circle cx="210" cy="380" fill="#ffffff" r="14" />
              <circle cx="210" cy="380" fill="#fce300" r="6" />
              <circle cx="790" cy="390" fill="#ffffff" r="16" />
              <circle cx="790" cy="390" fill="#f36952" r="7" />
              <path d="M250 470C250 455 265 440 285 440C295 440 305 445 310 450C315 440 330 435 345 445C355 450 360 460 360 470H250Z" fill="#ffffff" opacity="0.9" />
              <path d="M630 130C635 110 655 90 680 90C700 90 715 105 725 120C735 115 750 120 760 130H630Z" fill="#ffffff" />
              <path d="M575 190Q600 160 625 180T655 170" fill="none" stroke="#fce300" strokeLinecap="round" strokeWidth="12" />
              <circle cx="730" cy="180" fill="#2291fa" r="7" />
              <circle cx="570" cy="170" fill="#2291fa" r="5" />
              <g transform="translate(180, 210)">
                <path d="M70 140C90 110 140 100 170 120L195 150L135 195C110 210 70 180 70 140Z" fill="#2291fa" />
                <circle cx="105" cy="85" fill="#fbcfe8" r="32" />
                <rect fill="#1a1c19" height="12" rx="4" width="22" x="88" y="80" />
                <rect fill="#1a1c19" height="12" rx="4" width="22" x="114" y="80" />
                <line stroke="#1a1c19" strokeWidth="3" x1="110" x2="114" y1="86" y2="86" />
                <path d="M96 102Q106 112 118 102" stroke="#e05244" strokeLinecap="round" strokeWidth="4" />
                <path d="M75 80C70 60 90 40 125 48C140 52 145 68 135 85" fill="#f36952" />
                <path d="M125 48L155 45" stroke="#f36952" strokeLinecap="round" strokeWidth="8" />
                <path d="M120 180L75 270L125 285L170 200" fill="#f4f4ee" />
                <path d="M60 270C60 250 90 250 110 270L100 295C70 300 60 285 60 270Z" fill="#fce300" stroke="#f36952" strokeWidth="5" />
              </g>
              <g transform="translate(340, 150)">
                <path d="M40 90C40 40 70 20 100 50C125 75 120 120 80 130C45 130 40 105 40 90Z" fill="#4ea8de" />
                <path d="M70 100C80 110 95 110 105 100" stroke="#fff" strokeLinecap="round" strokeWidth="6" />
                <ellipse cx="90" cy="115" fill="#f36952" rx="14" ry="8" />
                <path d="M30 65C10 30 50 0 70 30C80 45 60 70 30 65Z" fill="#1b1b1b" />
                <path d="M20 140C40 125 120 125 150 150L140 240H30L20 140Z" fill="#f36952" />
                <circle cx="85" cy="175" fill="#fff" r="12" />
                <circle cx="85" cy="175" fill="#fce300" r="5" />
                <path d="M30 240L20 340L75 350L95 240L115 350L165 330L145 240" fill="#fce300" />
              </g>
              <g transform="translate(480, 60)">
                <circle cx="70" cy="100" fill="#ffcca7" r="38" />
                <path d="M40 75C42 45 98 42 102 75" fill="#fce300" />
                <circle cx="72" cy="42" fill="#f36952" r="8" />
                <path d="M40 90C30 95 40 115 50 105" fill="#1b8aff" />
                <path d="M65 95C75 90 90 95 95 105C95 120 70 125 65 95Z" fill="#1b1b1b" />
                <path d="M75 112C85 112 90 107 90 105" fill="#e05244" />
                <path d="M25 150C60 135 150 140 170 160L160 250H15L25 150Z" fill="#dca4fd" />
                <rect fill="#fff" height="26" opacity="0.8" rx="8" width="24" x="70" y="175" />
                <path d="M150 160L230 110C240 100 270 95 295 120C320 145 305 175 280 185L200 220" fill="#ffcca7" />
                <rect fill="#ffffff" height="22" rx="6" transform="rotate(35 220 120)" width="18" x="220" y="120" />
                <path d="M270 100C275 80 290 85 295 105L315 155C325 170 300 195 275 185C255 175 250 150 260 135Z" fill="#ffcca7" stroke="#1b1b1b" strokeWidth="2.5" />
                <path d="M15 250C30 240 140 240 160 260L185 360L100 370L80 280L60 370L-10 360Z" fill="#f36952" />
                <path d="M140 350C170 320 220 360 210 4C180 430 130 4 140 350Z" fill="#2291fa" stroke="#fce300" strokeWidth="12" />
              </g>
            </svg>
          </div>
        </div>
      </section>
      {/* END: HeroCurtainSection */}

      {/* BEGIN: IntroNarrativeSection */}
      <section className="py-24 sm:py-32 px-6 sm:px-12 max-w-[1360px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 pr-0 lg:pr-8">
            <p className="text-3xl sm:text-4xl lg:text-[40px] font-semibold leading-[1.22] tracking-tight text-neutral-900 mb-10">
              Work that was never finished used to become an argument. Spectral turns it into a counted
              obligation: whoever counted a unit is paid for it, and whatever was left is listed for anyone
              else to finish against a bond.
            </p>
            <a className="inline-flex items-center gap-4 bg-white pl-7 pr-3 py-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-200/80 hover:shadow-lg transition-all group" href="/app">
              <span className="text-lg font-semibold text-ink-charcoal">Open the venue</span>
              <span className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-ink-charcoal group-hover:translate-x-1 transition-transform">
                <svg className="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </a>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[440px] aspect-square rounded-[36px] bg-emerald-50/60 p-6 flex items-center justify-center border border-emerald-100 shadow-sm char-float">
              <svg className="w-full h-full drop-shadow-sm select-none" fill="none" viewBox="0 0 400 400">
                <circle cx="200" cy="200" fill="#8ed462" opacity="0.2" r="160" />
                <circle cx="190" cy="140" fill="#ffcca7" r="55" />
                <path d="M165 110C170 90 220 90 230 115" fill="#fce300" />
                <path d="M180 145C190 160 215 155 220 145" stroke="#111" strokeLinecap="round" strokeWidth="4" />
                <ellipse cx="175" cy="135" fill="#111" rx="5" ry="7" />
                <ellipse cx="215" cy="135" fill="#111" rx="5" ry="7" />
                <circle cx="160" cy="150" fill="#f36952" opacity="0.4" r="7" />
                <circle cx="225" cy="150" fill="#f36952" opacity="0.4" r="7" />
                <path d="M120 220C140 180 250 180 270 220L290 330H100L120 220Z" fill="#f36952" />
                <rect fill="#ffffff" height="130" rx="12" stroke="#e5e5e5" strokeWidth="3" width="95" x="150" y="210" />
                <line stroke="#8ed462" strokeLinecap="round" strokeWidth="5" x1="170" x2="225" y1="240" y2="240" />
                <line stroke="#cbd5e1" strokeLinecap="round" strokeWidth="4" x1="170" x2="225" y1="265" y2="265" />
                <line stroke="#cbd5e1" strokeLinecap="round" strokeWidth="4" x1="170" x2="210" y1="290" y2="290" />
              </svg>
            </div>
          </div>
        </div>
      </section>
      {/* END: IntroNarrativeSection */}

      {/* BEGIN: ContinuousWindingJourneySection */}
      <section className="relative py-24 overflow-hidden" id="methodology-journey">
        <div className="max-w-[1360px] mx-auto px-6 relative">
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-full max-w-[980px] pointer-events-none hidden md:block z-0">
            <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 800 3200">
              <path d="M420,0 C680,280 640,620 4,780 C160,940 120,1320 410,1540 C700,1760 710,2140 4,2360 C140,2580 220,2960 480,3200" id="journey-path" opacity="0.95" stroke="#8ed462" strokeLinecap="round" strokeLinejoin="round" strokeWidth="170" />
            </svg>
          </div>
          <div className="space-y-44 sm:space-y-56 relative z-10">
            {/* PILLAR 1 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 flex justify-center md:justify-start">
                <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center char-float">
                  <svg className="w-full h-full select-none" fill="none" viewBox="0 0 350 350">
                    <circle cx="95" cy="80" fill="#fff" r="42" stroke="#fce300" strokeWidth="12" />
                    <line stroke="#2291fa" strokeLinecap="round" strokeWidth="5" x1="95" x2="95" y1="80" y2="55" />
                    <line stroke="#f36952" strokeLinecap="round" strokeWidth="5" x1="95" x2="115" y1="80" y2="80" />
                    <polygon fill="#ffffff" points="175,130 220,110 190,145" stroke="#cbd5e1" strokeWidth="2" />
                    <rect fill="#ffffff" height="42" rx="4" stroke="#e2e8f0" strokeWidth="2" transform="rotate(20 210 160)" width="34" x="210" y="160" />
                    <rect fill="#ffffff" height="36" rx="4" stroke="#e2e8f0" strokeWidth="2" transform="rotate(-15 170 190)" width="28" x="170" y="190" />
                    <circle cx="150" cy="180" fill="#ffcca7" r="35" />
                    <circle cx="120" cy="160" fill="#f36952" r="22" />
                    <ellipse cx="165" cy="185" fill="#1b1b1b" rx="5" ry="7" />
                    <path d="M140 215C160 205 200 210 220 230L210 280H120L140 215Z" fill="#2291fa" />
                    <path d="M120 275L60 305L90 325L150 285" fill="#fce300" />
                    <path d="M170 280L230 330L260 310L200 275" fill="#dca4fd" />
                  </svg>
                </div>
              </div>
              <div className="md:col-span-6">
                <div className="bg-white p-9 sm:p-12 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-neutral-100 max-w-lg hover-lift reveal-card">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-charcoal mb-5">No dispute.</h2>
                  <p className="text-lg text-neutral-600 leading-relaxed mb-8">
                    A stalled job used to become an argument about whether the work was done. Here it becomes a
                    count: every unit carries a receipt, a repeated index is refused on chain, and payment follows
                    the count with nobody asked to decide who is telling the truth.
                  </p>
                  <a className="inline-flex items-center gap-3 bg-brand-coral text-white pl-6 pr-2.5 py-2.5 rounded-full font-medium hover:brightness-105 transition-all" href="#rule">
                    <span>The rule</span>
                    <span className="w-8 h-8 rounded-full bg-white text-brand-coral flex items-center justify-center font-bold text-sm">➔</span>
                  </a>
                </div>
              </div>
            </div>

            {/* PILLAR 2 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 order-2 md:order-1 flex justify-start md:justify-end">
                <div className="bg-white p-9 sm:p-12 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-neutral-100 max-w-lg hover-lift reveal-card">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-charcoal mb-5">Two parties. One bond.</h2>
                  <p className="text-lg text-neutral-600 leading-relaxed mb-8">
                    The executor is paid for the units it counted. A taker is paid for the remainder, and posts at
                    least half of that remainder again as a bond — money which moves to the buyer if their deadline
                    passes with units still uncounted.
                  </p>
                  <a className="inline-flex items-center gap-3 bg-brand-yellow text-ink-charcoal pl-6 pr-2.5 py-2.5 rounded-full font-semibold hover:brightness-105 transition-all" href="#units">
                    <span>Units</span>
                    <span className="w-8 h-8 rounded-full bg-white text-ink-charcoal flex items-center justify-center font-bold text-sm">➔</span>
                  </a>
                </div>
              </div>
              <div className="md:col-span-6 order-1 md:order-2 flex justify-center md:justify-end">
                <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center char-float-delay">
                  <svg className="w-full h-full select-none" fill="none" viewBox="0 0 350 350">
                    <path d="M70 120 C60 100 90 90 95 110" stroke="#8ed462" strokeLinecap="round" strokeWidth="8" />
                    <path d="M260 210 C250 190 280 180 285 200" stroke="#f36952" strokeLinecap="round" strokeWidth="8" />
                    <circle cx="95" cy="110" fill="#8ed462" r="6" />
                    <path d="M120 180L210 140L230 110L230 170L210 140" fill="#fce300" stroke="#111" strokeWidth="3" />
                    <path d="M230 110C245 115 255 135 250 160C245 175 235 175 230 170" fill="#fce300" stroke="#111" strokeWidth="3" />
                    <circle cx="110" cy="170" fill="#1b8aff" r="32" />
                    <ellipse cx="130" cy="175" fill="#fce300" rx="8" ry="12" />
                    <path d="M90 145C100 135 130 140 135 155" fill="#fce300" />
                    <path d="M80 200C100 190 160 190 175 220L160 290H70L80 200Z" fill="#dca4fd" />
                    <polygon fill="#fce300" points="115,205 125,212 115,220 135,220 125,212 135,205" />
                    <circle cx="210" cy="90" fill="#ffcca7" r="14" />
                    <path d="M210 90L230 75" stroke="#fce300" strokeLinecap="round" strokeWidth="6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* PILLAR 3 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 flex justify-center md:justify-start">
                <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center char-float">
                  <svg className="w-full h-full select-none" fill="none" viewBox="0 0 350 350">
                    <rect fill="#f36952" height="55" rx="20" stroke="#1b1b1b" strokeWidth="2" width="90" x="110" y="140" />
                    <circle cx="135" cy="165" fill="#1b8aff" r="7" />
                    <circle cx="175" cy="165" fill="#fce300" r="7" />
                    <line stroke="#1b1b1b" strokeLinecap="round" strokeWidth="3" x1="130" x2="140" y1="165" y2="165" />
                    <line stroke="#1b1b1b" strokeLinecap="round" strokeWidth="3" x1="135" x2="135" y1="160" y2="170" />
                    <circle cx="150" cy="100" fill="#ffcca7" r="30" />
                    <path d="M130 80C140 70 170 70 175 90" fill="#f36952" />
                    <path d="M110 130C130 120 180 120 195 135L210 210H100L110 130Z" fill="#fce300" />
                    <path d="M245 220L235 250L210 290C200 305 210 320 230 320H270C290 320 300 305 290 290L265 250L255 220Z" fill="#f36952" opacity="0.85" />
                    <rect fill="#2291fa" height="8" rx="2" width="22" x="244" y="215" />
                    <circle cx="250" cy="275" fill="#fff" opacity="0.6" r="8" />
                    <circle cx="235" cy="295" fill="#fff" opacity="0.7" r="5" />
                  </svg>
                </div>
              </div>
              <div className="md:col-span-6">
                <div className="bg-white p-9 sm:p-12 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-neutral-100 max-w-lg hover-lift reveal-card">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-charcoal mb-5">Six states.</h2>
                  <p className="text-lg text-neutral-600 leading-relaxed mb-8">
                    OPEN → STALLED → LISTED → TAKEN → SETTLED, or CLOSED when a taker misses the deadline. The
                    contract moves between them by rule, and no transition waits on a person to approve it.
                  </p>
                  <a className="inline-flex items-center gap-3 bg-brand-sky text-white pl-6 pr-2.5 py-2.5 rounded-full font-medium hover:brightness-105 transition-all" href="#settlement">
                    <span>Settlement</span>
                    <span className="w-8 h-8 rounded-full bg-white text-brand-sky flex items-center justify-center font-bold text-sm">➔</span>
                  </a>
                </div>
              </div>
            </div>

            {/* PILLAR 4 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 order-2 md:order-1 flex justify-start md:justify-end">
                <div className="bg-white p-9 sm:p-12 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-neutral-100 max-w-lg hover-lift reveal-card">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-charcoal mb-5">Refusals, not promises.</h2>
                  <p className="text-lg text-neutral-600 leading-relaxed mb-8">
                    Escrow that is not exactly units × price is refused. A unit counted twice is refused. A bond
                    below half the remainder is refused. A job taken twice is refused. The contract says no in
                    eighteen places, and every refusal path is covered by a test.
                  </p>
                  <a className="inline-flex items-center gap-3 bg-brand-lilac text-ink-charcoal pl-6 pr-2.5 py-2.5 rounded-full font-semibold hover:brightness-105 transition-all" href="#limits">
                    <span>Limits</span>
                    <span className="w-8 h-8 rounded-full bg-white text-ink-charcoal flex items-center justify-center font-bold text-sm">➔</span>
                  </a>
                </div>
              </div>
              <div className="md:col-span-6 order-1 md:order-2 flex justify-center md:justify-end">
                <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center char-float-delay">
                  <svg className="w-full h-full select-none" fill="none" viewBox="0 0 350 350">
                    <circle cx="70" cy="170" fill="#fff" r="35" stroke="#8ed462" strokeWidth="4" />
                    <polygon fill="#8ed462" points="70,150 85,160 80,180 60,180 55,160" />
                    <path d="M120 180L80 250L130 280L160 210" fill="#ffcca7" />
                    <path d="M70 245C65 230 95 220 115 240L100 270Z" fill="#fce300" stroke="#f36952" strokeWidth="5" />
                    <circle cx="230" cy="120" fill="#1b8aff" r="28" />
                    <circle cx="255" cy="115" fill="#fff" r="16" stroke="#fce300" strokeWidth="6" />
                    <circle cx="280" cy="115" fill="#fff" r="16" stroke="#fce300" strokeWidth="6" />
                    <path d="M210 150C225 140 280 140 295 160L280 230H195L210 150Z" fill="#f36952" />
                    <path d="M230 135C240 160 250 160 260 135" fill="none" stroke="#1b1b1b" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full mt-24 sm:mt-32 relative overflow-hidden" data-reveal="scenic-banner">
          <div className="relative w-full max-w-[1440px] mx-auto min-h-[300px] sm:min-h-[380px] flex items-end">
            <svg className="w-full h-auto select-none block" preserveAspectRatio="xMidYMax slice" viewBox="0 0 1440 380" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 380L0 200C180 140 380 240 560 170C740 100 920 220 1120 160C1280 110 1380 170 1440 210L1440 380Z" fill="#8ed462" />
              <path d="M0 380L0 270C240 210 460 310 720 250C980 190 1220 290 1440 260L1440 380Z" fill="#7ecb38" opacity="0.45" />
              <g transform="translate(140, 260)"><circle cx="0" cy="0" fill="#ffffff" r="12" /><circle cx="0" cy="0" fill="#fce300" r="5" /><path d="M0 12L-4 40" stroke="#63a837" strokeWidth="3" /></g>
              <g transform="translate(380, 280)"><circle cx="0" cy="0" fill="#ffffff" r="14" /><circle cx="0" cy="0" fill="#f36952" r="6" /><path d="M0 14L2 45" stroke="#63a837" strokeWidth="3" /></g>
              <g transform="translate(920, 270)"><circle cx="0" cy="0" fill="#ffffff" r="15" /><circle cx="0" cy="0" fill="#fce300" r="6" /><path d="M0 15L-3 45" stroke="#63a837" strokeWidth="3" /></g>
              <g transform="translate(1260, 280)"><circle cx="0" cy="0" fill="#ffffff" r="13" /><circle cx="0" cy="0" fill="#dca4fd" r="5" /><path d="M0 13L2 40" stroke="#63a837" strokeWidth="3" /></g>
              <g transform="translate(220, 150)">
                <circle cx="40" cy="100" fill="none" r="32" stroke="#1b1b1b" strokeWidth="5" />
                <circle cx="150" cy="100" fill="none" r="32" stroke="#1b1b1b" strokeWidth="5" />
                <circle cx="40" cy="100" fill="#fce300" r="10" />
                <circle cx="150" cy="100" fill="#fce300" r="10" />
                <path d="M40 100L85 100L125 55L75 55L40 100L75 55L85 100L150 100" fill="none" stroke="#f36952" strokeWidth="5" />
                <path d="M125 55L140 38" fill="none" stroke="#f36952" strokeWidth="5" />
                <path d="M130 38H155" stroke="#1b1b1b" strokeLinecap="round" strokeWidth="4" />
                <rect fill="#2291fa" height="18" rx="3" width="26" x="145" y="32" />
                <circle cx="95" cy="15" fill="#ffcca7" r="18" />
                <path d="M85 0C90 -10 115 -10 118 8" fill="#dca4fd" />
                <path d="M90 32C95 50 105 65 95 85L80 75" fill="none" stroke="#fce300" strokeLinecap="round" strokeWidth="12" />
                <path d="M90 32L135 42" stroke="#ffcca7" strokeLinecap="round" strokeWidth="7" />
              </g>
              <g transform="translate(680, 120)">
                <circle cx="65" cy="30" fill="#d9b1a5" r="22" />
                <path d="M50 20C55 5 80 5 85 20L95 18" fill="none" stroke="#fce300" strokeLinecap="round" strokeWidth="6" />
                <path d="M50 50C55 45 80 45 85 50L90 100H45L50 50Z" fill="#f36952" />
                <circle cx="105" cy="45" fill="#dca4fd" r="16" />
                <circle cx="105" cy="45" fill="none" r="16" stroke="#ffffff" strokeWidth="2" />
                <path d="M45 100L40 145L15 155" fill="none" stroke="#2291fa" strokeLinecap="round" strokeWidth="12" />
                <path d="M85 100L95 135L125 140" fill="none" stroke="#2291fa" strokeLinecap="round" strokeWidth="12" />
                <rect fill="#fce300" height="12" rx="4" width="22" x="118" y="135" />
                <rect fill="#fce300" height="12" rx="4" width="22" x="5" y="150" />
              </g>
              <g transform="translate(1040, 100)">
                <rect fill="#2291fa" height="40" rx="8" width="24" x="25" y="45" />
                <circle cx="60" cy="30" fill="#ffcca7" r="20" />
                <path d="M48 22C52 10 72 10 76 22" fill="#fce300" />
                <path d="M45 50C50 45 75 45 80 50L85 110H40L45 50Z" fill="#fce300" />
                <path d="M60 55L95 40L145 25" stroke="#ffcca7" strokeLinecap="round" strokeWidth="8" />
                <polygon fill="#dca4fd" points="95,40 145,25 148,32 98,47" stroke="#1b1b1b" strokeWidth="2" />
                <circle cx="150" cy="28" fill="#2291fa" r="7" />
                <path d="M48 110L42 165" stroke="#f36952" strokeLinecap="round" strokeWidth="14" />
                <path d="M78 110L84 165" stroke="#f36952" strokeLinecap="round" strokeWidth="14" />
              </g>
            </svg>
          </div>
        </div>
      </section>
      {/* END: ContinuousWindingJourneySection */}

      {/* BEGIN: CalloutSection */}
      <section id="rule" className="relative bg-brand-green text-ink-charcoal pt-20 pb-24 px-6 overflow-hidden" data-reveal="callout">
        <div className="max-w-4xl mx-auto flex justify-between items-center opacity-85 mb-8">
          <svg className="w-16 h-16 fill-current" viewBox="0 0 32 32">
            <circle cx="16" cy="16" fill="#fce300" r="6" />
            <path d="M16 2C17.5 7 21 8 26 8C21 11 21 15 26 18C21 18 18 22 16 27C14 22 11 18 6 18C11 15 11 11 6 8C11 8 14.5 7 16 2Z" fill="#dca4fd" />
          </svg>
          <svg className="w-14 h-14 fill-current" viewBox="0 0 32 32">
            <circle cx="16" cy="16" fill="#fce300" r="12" />
            <circle cx="16" cy="16" fill="#f36952" r="5" />
          </svg>
          <svg className="w-16 h-16 fill-current" viewBox="0 0 32 32">
            <path d="M16 4C20 10 24 12 30 12C24 16 24 20 30 24C24 24 20 28 16 32C12 28 8 24 2 24C8 20 8 16 2 12C8 12 12 10 16 4Z" fill="#f36952" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="big-section-title font-black mb-8 text-ink-charcoal">
            When the work<br />stops.
          </h2>
          <p className="text-xl sm:text-2xl leading-relaxed max-w-2xl mx-auto text-ink-charcoal/80 mb-10 font-medium">
            Open a job. Count the units. Let anyone with a bond finish what was left — and pay only what was counted.
          </p>
          <a className="inline-flex items-center gap-4 bg-white pl-8 pr-3 py-3 rounded-full shadow-[0_6px_25px_rgba(0,0,0,0.08)] hover:scale-105 transition-transform" href="/app">
            <span className="text-lg font-bold text-ink-charcoal">Open the venue</span>
            <span className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-ink-charcoal font-bold text-base">➔</span>
          </a>
        </div>
      </section>
      {/* END: CalloutSection */}

      {/* BEGIN: GuaranteesAndAudienceBanner */}
      <section className="bg-brand-green pb-24 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-ink-charcoal font-semibold text-lg sm:text-xl pt-6 border-t border-black/10">
          <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 rounded-full bg-ink-charcoal" /><span>Counted units only</span></div>
          <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 rounded-full bg-ink-charcoal" /><span>Any taker may finish it</span></div>
          <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 rounded-full bg-ink-charcoal" /><span>Settlement by arithmetic</span></div>
        </div>
        <div className="max-w-[1320px] mx-auto mt-14">
          <div className="relative w-full aspect-[21/9] min-h-[360px] rounded-[36px] overflow-hidden shadow-2xl bg-neutral-900">
            <img alt="A record of work, left unfinished" className="w-full h-full object-cover object-center opacity-90" src="/images/photo-1.jpg" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div className="w-[140%] py-4 sm:py-6 bg-brand-yellow -rotate-6 shadow-xl flex items-center justify-around font-extrabold text-2xl sm:text-5xl text-brand-coral uppercase tracking-tight">
                <span>COUNT</span>
                <span className="hidden sm:inline">★</span>
                <span>FINISH → PAY</span>
                <span className="hidden md:inline">★</span>
                <span className="hidden md:inline">COUNT</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* END: GuaranteesAndAudienceBanner */}

      {/* BEGIN: ImpactNumbersSection */}
      <section className="py-28 px-6 sm:px-12 max-w-[1360px] mx-auto relative" data-reveal="metrics-showcase">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          <div className="lg:col-span-6 lg:sticky lg:top-32 self-start pb-8">
            <div className="relative">
              <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] text-ink-charcoal max-w-lg">
                A few rules behind the{" "}
                <span className="relative inline-block">
                  settlement
                  <svg className="absolute -bottom-3 left-0 w-full h-4 text-brand-lilac" fill="none" viewBox="0 0 160 20">
                    <path d="M4 12Q30 2 55 12T105 12T155 12" stroke="currentColor" strokeLinecap="round" strokeWidth="7" />
                  </svg>
                </span>{" "}
                we deliver
              </h2>
            </div>
            <p className="mt-12 text-lg sm:text-xl text-neutral-600 max-w-md leading-relaxed font-normal">
              The contract is small by design. Its guarantees are not: seven instructions, six states, and no
              reporter anywhere in the payment path.
            </p>
          </div>
          <div className="lg:col-span-6 relative pb-16 space-y-12">
            <div className="stack-card reveal-card sticky top-28 bg-white p-10 sm:p-14 rounded-[36px] shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-neutral-100 flex flex-col justify-between min-h-[320px] z-10" id="metric-card-1">
              <div className="flex justify-between items-start">
                <span className="text-7xl sm:text-8xl font-extrabold text-brand-sky tracking-tight">7</span>
                <span className="w-14 h-14 rounded-full bg-brand-sky text-white flex items-center justify-center shadow-sm">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                </span>
              </div>
              <p className="text-xl sm:text-2xl text-brand-sky font-medium leading-snug mt-8">
                Seven instructions: create, count, stall, list, take, close, claim.
              </p>
            </div>
            <div className="stack-card reveal-card sticky top-36 bg-brand-green text-white p-10 sm:p-14 rounded-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex flex-col justify-between min-h-[320px] z-20" id="metric-card-2">
              <div className="flex justify-between items-start">
                <span className="text-7xl sm:text-8xl font-extrabold tracking-tight">22</span>
                <span className="w-14 h-14 rounded-full bg-white text-brand-green flex items-center justify-center font-bold text-2xl shadow-sm">✓</span>
              </div>
              <p className="text-xl sm:text-2xl text-white font-medium leading-snug mt-8">
                Twenty-two tests pass, including a 256-run fuzz proving escrow in always equals pay out.
              </p>
            </div>
            <div className="stack-card reveal-card sticky top-44 bg-brand-coral text-white p-10 sm:p-14 rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.15)] flex flex-col justify-between min-h-[320px] z-30" id="metric-card-3">
              <div className="flex justify-between items-start">
                <span className="text-7xl sm:text-8xl font-extrabold tracking-tight">0</span>
                <span className="w-14 h-14 rounded-full bg-white text-brand-coral flex items-center justify-center shadow-sm">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                </span>
              </div>
              <p className="text-xl sm:text-2xl text-white font-medium leading-snug mt-8">
                Zero oracles, votes, juries or admin keys decide settlement. Counted units and arithmetic do.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* END: ImpactNumbersSection */}

      {/* BEGIN: CaseStudiesSection */}
      <section id="settlement" className="py-24 px-6 sm:px-12 max-w-[1360px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <article className="group cursor-pointer">
            <div className="relative w-full aspect-[4/3] rounded-[32px] overflow-hidden mb-6 shadow-md">
              <img alt="Work handed back before it was finished" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/images/photo-2.jpg" />
              <div className="absolute top-5 left-5 flex items-center gap-2">
                <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3.5 py-1.5 rounded-full text-ink-charcoal">Executor stops</span>
                <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3.5 py-1.5 rounded-full text-ink-charcoal">Counted</span>
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-charcoal group-hover:text-brand-green-dark transition-colors leading-snug">
              A job abandoned at four units of ten, paid for the four
            </h3>
          </article>
          <article className="group cursor-pointer">
            <div className="relative w-full aspect-[4/3] rounded-[32px] overflow-hidden mb-6 shadow-md">
              <img alt="A deadline passing with work still open" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/images/photo-3.jpg" />
              <div className="absolute top-5 left-5 flex items-center gap-2">
                <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3.5 py-1.5 rounded-full text-ink-charcoal">Taker misses</span>
                <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3.5 py-1.5 rounded-full text-ink-charcoal">Closed by rule</span>
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-charcoal group-hover:text-brand-green-dark transition-colors leading-snug">
              A taker who missed the deadline and lost the bond to the buyer
            </h3>
          </article>
        </div>
      </section>
      {/* END: CaseStudiesSection */}

      {/* BEGIN: PillGridSection */}
      <section id="units" className="py-24 px-6 overflow-hidden text-center">
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-charcoal mb-16" id="limits">
          What Spectral<br className="sm:hidden" /> is not
        </h2>
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-3 sm:gap-4 select-none">
          {pills.map((p, i) => (
            <div key={i} className="bg-white px-6 py-3.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/70 flex items-center gap-3 font-semibold text-neutral-800 hover-lift reveal-card">
              {p.icon}
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </section>
      {/* END: PillGridSection */}

      {/* BEGIN: BoldYellowFooterSection */}
      <footer className="bg-[#f5df00] text-ink-charcoal pt-20 pb-12 px-6 sm:px-12 rounded-t-[48px] overflow-hidden" id="quote">
        <div className="max-w-[1360px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pb-16 border-b border-black/10">
            <p className="text-xl sm:text-2xl font-medium max-w-2xl leading-relaxed text-ink-charcoal">
              Open the dashboard and drive it yourself: escrow a job, count a unit, stop, hand the rest to someone
              else, and watch the deadline close it. Every step is a real transaction with a receipt you can check.
            </p>
            <a className="inline-flex items-center gap-4 bg-white pl-8 pr-3 py-3 rounded-full shadow-md hover:shadow-lg transition-all shrink-0" href="/app">
              <span className="text-lg font-bold text-ink-charcoal">Open the venue</span>
              <span className="w-10 h-10 rounded-full bg-brand-yellow flex items-center justify-center text-ink-charcoal font-bold">➔</span>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-16 pb-16 items-start">
            <div className="lg:col-span-6">
              <h2 className="text-6xl sm:text-8xl lg:text-9xl font-extrabold tracking-tight text-ink-charcoal leading-none">
                The chain<br />is the verifier.
              </h2>
              <div className="mt-6 max-w-[340px]">
                <svg className="w-full" fill="none" viewBox="0 0 340 30">
                  <path d="M5 15 Q45 2 85 15 T165 15 T245 15 T325 15" stroke="#8ed462" strokeLinecap="round" strokeWidth="12" />
                </svg>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-neutral-900">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold mb-2">Contract</h3>
                  <p className="text-neutral-800 text-sm leading-relaxed">
                    Deployed and exercised on a public<br />
                    testnet, with no owner and no admin<br />
                    <span className="text-neutral-700">Source verification pending</span>
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Status</h3>
                  <p className="text-neutral-800 text-sm leading-relaxed">
                    Twenty-nine of fifty-three checklist<br />
                    items are still open<br />
                    <span className="text-neutral-700">Listed in the repository</span>
                  </p>
                </div>
                <div className="pt-2">
                  <a className="text-xl font-bold hover:underline" href="/app">Open the dashboard</a>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-lg flex flex-col items-start sm:items-end">
                <a className="hover:text-black transition-colors" href="#rule">The rule</a>
                <a className="hover:text-black transition-colors" href="#units">Units</a>
                <a className="hover:text-black transition-colors" href="#methodology-journey">Takeover</a>
                <a className="hover:text-black transition-colors" href="#settlement">Settlement</a>
                <a className="hover:text-black transition-colors" href="#limits">Limits</a>
                <a className="hover:text-black transition-colors" href="/app">Dashboard</a>
                <a className="hover:text-black transition-colors" href="/app">Open a job</a>
                <a className="hover:text-black transition-colors" href="#quote">Top</a>
                <a className="text-sm font-normal text-neutral-700 hover:text-black pt-4" href="#limits">No analytics, no trackers</a>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm font-medium text-neutral-800">
            <p>Copyright © 2026 Spectral</p>
            <div className="flex items-center gap-6">
              <div className="bg-black text-white px-3.5 py-1 rounded-sm text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 shadow-sm">
                <span>testnet</span>
                <span className="text-[9px] font-normal text-neutral-300 border-l border-neutral-600 pl-1.5">no admin key</span>
              </div>
              <a className="hover:underline font-bold" href="/app">Dashboard</a>
            </div>
          </div>
        </div>
      </footer>
      {/* END: BoldYellowFooterSection */}
    </div>
  );
}
