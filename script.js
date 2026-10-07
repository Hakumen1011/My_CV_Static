(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Footer year ----------
  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- Nav: background on scroll ----------
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  
    // ---------- Smooth scrolling for in-page links ----------
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const navSmall = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h-small"), 10) || 52;

  const smoothScrollTo = (targetY) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = Math.min(1200, 450 + Math.abs(distance) * 0.25); // longer trips take a bit longer
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      const y = hash === "#home" ? 0 : target.getBoundingClientRect().top + window.scrollY - (navSmall + 16);
      smoothScrollTo(Math.max(0, y));
      history.pushState(null, "", hash); // keeps the #section in the address bar
    });
  });

  // ---------- Nav: mobile menu ----------
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  const setMenu = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // ---------- Nav: highlight current section ----------
  const navLinks = [...links.querySelectorAll('a[href^="#"]')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));

  // ---------- Reveal cards on scroll ----------
  const revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => revealer.observe(el));
  }

  // ---------- Count-up stats ----------
  const counters = document.querySelectorAll("[data-count]");
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now(), dur = 1200;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObs = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.6 });
  counters.forEach((c) => countObs.observe(c));

  // ---------- Copy email ----------
  const toast = document.getElementById("toast");
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  };
  document.getElementById("copyEmail").addEventListener("click", async () => {
    const email = document.getElementById("copyEmail").dataset.email;
    try { await navigator.clipboard.writeText(email); showToast("Email copied"); }
    catch { window.location.href = "mailto:" + email; }
  });

  // ---------- Starfield (drifts slowly toward the centre) ----------
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let stars = [], w = 0, h = 0, dpr = 1;

  const makeStar = () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * Math.hypot(w, h) * 0.6 + 40;
    return { angle, dist, size: Math.random() * 1.3 + 0.2, alpha: Math.random() * 0.7 + 0.2, speed: Math.random() * 0.15 + 0.03 };
  };
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((w * h) / 6000);
    stars = Array.from({ length: count }, makeStar);
  };
  const draw = (move) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    for (const s of stars) {
      if (move) {
        s.dist -= s.speed * (1 + 60 / s.dist);   // speeds up near the centre
        s.angle += 0.0006 * (200 / (s.dist + 50)); // slight swirl
        if (s.dist < 30) Object.assign(s, makeStar(), { dist: Math.hypot(w, h) * 0.6 });
      }
      const x = cx + Math.cos(s.angle) * s.dist;
      const y = cy + Math.sin(s.angle) * s.dist * 0.75;
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  };
  const loop = () => { draw(true); requestAnimationFrame(loop); };

  resize();
  window.addEventListener("resize", resize);
  if (reduceMotion) draw(false); else loop();
})();