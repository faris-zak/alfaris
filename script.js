const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
const performanceToggle = document.querySelector('[data-performance-toggle]');
const performanceStorageKey = 'alfaris-performance-mode';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = motionPreference.matches;
const isPerformanceMode = () => document.documentElement.classList.contains('performance-mode');
const shouldReduceDecorativeMotion = () => reducedMotion || isPerformanceMode();

const syncPerformanceToggle = () => {
  if (!performanceToggle) {
    return;
  }

  const isActive = isPerformanceMode();
  performanceToggle.setAttribute('aria-pressed', String(isActive));
};

const setPerformanceMode = (isActive) => {
  document.documentElement.classList.toggle('performance-mode', isActive);
  document.body.classList.toggle('performance-mode', isActive);
  syncPerformanceToggle();

  try {
    localStorage.setItem(performanceStorageKey, String(isActive));
  } catch {
    // Storage can be blocked in private or strict browsing modes.
  }

  window.dispatchEvent(new CustomEvent('performance-mode-change', {
    detail: { isActive },
  }));
};

document.body.classList.toggle('performance-mode', isPerformanceMode());
syncPerformanceToggle();

if (performanceToggle) {
  performanceToggle.addEventListener('click', () => {
    setPerformanceMode(!isPerformanceMode());
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // The site remains fully usable if service worker registration is unavailable.
    });
  });
}

if (menuButton && navigation) {
  const closeMenu = () => {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (event) => {
    const clickedInsideMenu = navigation.contains(event.target);
    const clickedToggle = menuButton.contains(event.target);

    if (navigation.classList.contains('is-open') && !clickedInsideMenu && !clickedToggle) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
}

const revealItems = document.querySelectorAll('.reveal');
const meteor = document.querySelector('[data-meteor]');

let meteorTimer;

if (meteor) {
  const minMeteorDelay = 180000;
  const randomMeteorDelay = 90000;
  const meteorDuration = 1500;

  const randomBetween = (minimum, maximum) => Math.random() * (maximum - minimum) + minimum;

  const launchMeteor = () => {
    if (shouldReduceDecorativeMotion()) {
      return;
    }

    meteor.classList.remove('is-active');
    meteor.style.setProperty('--meteor-top', `${randomBetween(8, 48)}vh`);
    meteor.style.setProperty('--meteor-left', `${randomBetween(62, 96)}vw`);
    meteor.style.setProperty('--meteor-x', `${randomBetween(-58, -34)}vw`);
    meteor.style.setProperty('--meteor-y', `${randomBetween(24, 52)}vh`);
    meteor.style.setProperty('--meteor-angle', `${randomBetween(-34, -21)}deg`);
    meteor.style.setProperty('--meteor-length', `${randomBetween(6.5, 10.5)}rem`);
    meteor.style.setProperty('--meteor-duration', `${randomBetween(1.15, 1.75)}s`);

    window.requestAnimationFrame(() => {
      meteor.classList.add('is-active');
    });
  };

  const scheduleMeteor = () => {
    window.clearTimeout(meteorTimer);
    if (shouldReduceDecorativeMotion()) {
      return;
    }

    meteorTimer = window.setTimeout(() => {
      launchMeteor();
      scheduleMeteor();
    }, minMeteorDelay + Math.random() * randomMeteorDelay);
  };

  meteor.addEventListener('animationend', () => {
    meteor.classList.remove('is-active');
  });

  if (!shouldReduceDecorativeMotion()) {
    meteorTimer = window.setTimeout(scheduleMeteor, meteorDuration);
  }

  window.addEventListener('performance-mode-change', () => {
    window.clearTimeout(meteorTimer);
    meteor.classList.remove('is-active');
    if (!shouldReduceDecorativeMotion()) {
      scheduleMeteor();
    }
  });
}

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const certificatesTrigger = document.querySelector('[data-certificates-open]');
const certificatesModal = document.querySelector('[data-certificates-modal]');

if (certificatesTrigger && certificatesModal) {
  const certificatesPanel = certificatesModal.querySelector('.certificate-modal__panel');
  const certificatesCloseButtons = certificatesModal.querySelectorAll('[data-certificates-close]');
  const modalTransitionDuration = reducedMotion ? 0 : 360;
  let closeTimer;

  const getModalFocusables = () => Array.from(
    certificatesModal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null && element.tabIndex !== -1);

  const openCertificatesModal = () => {
    window.clearTimeout(closeTimer);
    certificatesModal.hidden = false;
    document.body.classList.add('modal-open');
    certificatesTrigger.setAttribute('aria-expanded', 'true');

    window.requestAnimationFrame(() => {
      certificatesModal.classList.add('is-open');
      certificatesPanel.focus();
    });
  };

  const closeCertificatesModal = (shouldRestoreFocus = true) => {
    if (certificatesModal.hidden) {
      return;
    }

    certificatesModal.classList.remove('is-open');
    certificatesTrigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('modal-open');

    closeTimer = window.setTimeout(() => {
      certificatesModal.hidden = true;
      if (shouldRestoreFocus) {
        certificatesTrigger.focus();
      }
    }, modalTransitionDuration);
  };

  certificatesTrigger.addEventListener('click', openCertificatesModal);
  certificatesCloseButtons.forEach((button) => {
    button.addEventListener('click', () => closeCertificatesModal());
  });

  certificatesModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCertificatesModal();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getModalFocusables();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });
}

const vectorControls = document.querySelectorAll('[data-vector]');
const vectorLines = document.querySelectorAll('[data-vector-line]');
const vectorCards = document.querySelectorAll('[data-vector-card]');

const setActiveVector = (vector) => {
  vectorControls.forEach((control) => {
    const isActive = control.dataset.vector === vector;
    control.classList.toggle('is-active', isActive);
    control.setAttribute('aria-pressed', String(isActive));
  });

  vectorLines.forEach((line) => {
    line.classList.toggle('is-active', line.dataset.vectorLine === vector);
  });

  vectorCards.forEach((card) => {
    card.classList.toggle('is-active', card.dataset.vectorCard === vector);
  });
};

vectorControls.forEach((control) => {
  const activate = () => setActiveVector(control.dataset.vector);

  control.addEventListener('mouseenter', activate);
  control.addEventListener('focus', activate);
  control.addEventListener('click', activate);
});

if (vectorControls.length) {
  setActiveVector('physics');
}

const generateCvButton = document.querySelector('[data-generate-cv]');

if (generateCvButton) {
  const cvGeneratedDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const cleanText = (value = '') => value
    .replace(/[↗↘✦⌘]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const escapeHtml = (value = '') => cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const textFrom = (selector, root = document) => {
    const element = root.querySelector(selector);
    return element ? cleanText(element.textContent) : '';
  };

  const linkHref = (link) => {
    if (!link) {
      return '';
    }

    return link.href.startsWith('mailto:') ? link.href.replace('mailto:', '') : link.href;
  };

  const collectCards = (selector, mapCard) => Array.from(document.querySelectorAll(selector))
    .map(mapCard)
    .filter((item) => item.title || item.body);

  const renderList = (items, className = '') => {
    if (!items.length) {
      return '';
    }

    return `<ul class="${className}">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
  };

  const renderEntries = (entries) => {
    if (!entries.length) {
      return '';
    }

    return entries.map((entry) => `
      <article class="cv-entry">
        ${entry.meta ? `<p class="cv-entry__meta">${escapeHtml(entry.meta)}</p>` : ''}
        <h3>${escapeHtml(entry.title)}</h3>
        ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
        ${entry.tags && entry.tags.length ? renderList(entry.tags.map((tag) => escapeHtml(tag)), 'cv-tags') : ''}
      </article>
    `).join('');
  };

  const renderSection = (title, body) => body ? `
    <section class="cv-section">
      <h2>${escapeHtml(title)}</h2>
      ${body}
    </section>
  ` : '';

  const collectCvData = () => {
    const author = document.querySelector('meta[name="author"]')?.content || 'Al-Faris Mujahid AlZakwani';
    const contactLinks = Array.from(document.querySelectorAll('.social-links a')).map((link) => ({
      label: cleanText(link.textContent),
      href: linkHref(link),
    })).filter((link) => link.label && link.href);

    return {
      author,
      title: textFrom('.hero__kicker'),
      intro: textFrom('.hero__intro'),
      objective: textFrom('.hero-objective strong'),
      mission: textFrom('.hero__mission > p:not(.eyebrow)'),
      fieldNote: textFrom('.field-note p'),
      portrait: document.querySelector('.portrait-frame img')?.src || '',
      generatedAt: cvGeneratedDate.format(new Date()),
      source: window.location.href,
      contactLinks,
      missionPillars: collectCards('.mission-pillar', (card) => ({
        meta: textFrom('span', card),
        title: textFrom('h3', card),
        body: textFrom('p', card),
      })),
      trajectory: collectCards('.trajectory-card', (card) => ({
        meta: textFrom('.card-index', card),
        title: textFrom('h3', card),
        body: textFrom('p', card),
      })),
      rocketLog: collectCards('.log-panel', (card) => ({
        meta: textFrom('span', card),
        title: textFrom('h3', card),
        body: textFrom('p', card),
      })),
      projects: collectCards('.project', (card) => ({
        meta: textFrom('.project__meta', card),
        title: textFrom('h3', card),
        body: textFrom('.project__body > p:not(.project__meta)', card),
        tags: Array.from(card.querySelectorAll('.tag-list li')).map((tag) => cleanText(tag.textContent)),
      })),
      breakthroughs: collectCards('.timeline__item', (card) => ({
        meta: textFrom('time', card),
        title: textFrom('h3', card),
        body: textFrom('p', card),
      })),
      capabilities: collectCards('.capability', (card) => ({
        title: textFrom('h3', card),
        body: textFrom('p', card),
      })),
      nextSteps: collectCards('.launch-card', (card) => ({
        meta: textFrom('time', card),
        title: textFrom('h3', card),
        body: textFrom('p', card),
      })),
      credentials: Array.from(document.querySelectorAll('.credentials__stats > *')).map((item) => ({
        title: textFrom('strong', item),
        body: textFrom('span', item),
      })).filter((item) => item.title || item.body),
      certificates: collectCards('.certificate-item', (card) => ({
        title: textFrom('h3', card),
        body: textFrom('p', card),
      })),
    };
  };

  const buildCvDocument = (cv) => {
    const portraitMarkup = cv.portrait ? `
      <figure class="cv-portrait">
        <img src="${escapeHtml(cv.portrait)}" alt="${escapeHtml(cv.author)}" />
      </figure>
    ` : '';
    const contactMarkup = cv.contactLinks.map((link) => `
      <a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}<span>${escapeHtml(link.href)}</span></a>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.author)} | Generated CV</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172033; background: #ffffff; font-family: Arial, Helvetica, sans-serif; line-height: 1.45; }
      a { color: inherit; text-decoration: none; }
      .cv-page { max-width: 820px; margin: 0 auto; }
      .cv-header { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 24px; padding-bottom: 18px; border-bottom: 2px solid #172033; }
      .cv-identity { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 18px; align-items: start; }
      .cv-portrait { width: 112px; aspect-ratio: 1; margin: 0; overflow: hidden; border: 2px solid #172033; border-radius: 50%; background: #eef3f7; }
      .cv-portrait img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 51% 32%; filter: grayscale(12%) contrast(1.04); }
      .cv-kicker, .cv-entry__meta, .cv-generated { margin: 0; color: #5f6c7b; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 7px 0 10px; font-size: 34px; line-height: .98; letter-spacing: -.03em; }
      .cv-title { margin: 0 0 12px; color: #2f3b4f; font-size: 13px; font-weight: 700; }
      .cv-summary { margin: 0; color: #334155; font-size: 11.5px; }
      .cv-objective { margin: 12px 0 0; padding-left: 10px; border-left: 3px solid #17a2a0; color: #1f2937; font-size: 11px; font-weight: 700; }
      .cv-contact { display: grid; gap: 8px; align-content: start; font-size: 10px; }
      .cv-contact a { display: grid; gap: 2px; padding-bottom: 7px; border-bottom: 1px solid #d7dee8; font-weight: 700; }
      .cv-contact span { overflow-wrap: anywhere; color: #526173; font-size: 9px; font-weight: 400; }
      .cv-grid { display: grid; grid-template-columns: 1.02fr .98fr; gap: 18px 24px; padding-top: 18px; }
      .cv-section { break-inside: avoid; margin-bottom: 18px; }
      .cv-section h2 { margin: 0 0 9px; padding-bottom: 5px; border-bottom: 1px solid #d7dee8; color: #111827; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; }
      .cv-entry { break-inside: avoid; margin-bottom: 11px; }
      .cv-entry h3 { margin: 2px 0 3px; color: #111827; font-size: 12px; line-height: 1.2; }
      .cv-entry p { margin: 0; color: #334155; font-size: 10.5px; }
      .cv-tags { display: flex; flex-wrap: wrap; gap: 4px; padding: 0; margin: 6px 0 0; list-style: none; }
      .cv-tags li { padding: 2px 6px; border: 1px solid #d7dee8; border-radius: 999px; color: #334155; font-size: 8.5px; }
      .cv-compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
      .cv-compact .cv-entry { margin-bottom: 0; }
      .cv-generated { margin-top: 14px; padding-top: 8px; border-top: 1px solid #d7dee8; text-transform: none; letter-spacing: 0; }
      @media print {
        .cv-page { max-width: none; }
        .cv-section { page-break-inside: avoid; }
      }
      @media (max-width: 700px) {
        .cv-header, .cv-grid { grid-template-columns: 1fr; }
        .cv-identity { grid-template-columns: 88px minmax(0, 1fr); }
        .cv-portrait { width: 88px; }
        .cv-contact { grid-template-columns: 1fr 1fr; }
      }
    </style>
  </head>
  <body>
    <main class="cv-page">
      <header class="cv-header">
        <div class="cv-identity">
          ${portraitMarkup}
          <div>
            <p class="cv-kicker">Generated website CV</p>
            <h1>${escapeHtml(cv.author)}</h1>
            <p class="cv-title">${escapeHtml(cv.title)}</p>
            <p class="cv-summary">${escapeHtml(cv.intro)}</p>
            <p class="cv-objective">${escapeHtml(cv.objective)}</p>
          </div>
        </div>
        <aside class="cv-contact" aria-label="Contact links">
          ${contactMarkup}
        </aside>
      </header>
      <div class="cv-grid">
        <div>
          ${renderSection('Profile', `<article class="cv-entry"><p>${escapeHtml(cv.mission)} ${escapeHtml(cv.fieldNote)}</p></article>`)}
          ${renderSection('Selected Work', renderEntries(cv.projects))}
          ${renderSection('Breakthroughs & Experience', renderEntries(cv.breakthroughs))}
          ${renderSection('Certificates', renderEntries(cv.certificates))}
        </div>
        <div>
          ${renderSection('Current Trajectory', renderEntries(cv.trajectory))}
          ${renderSection('Capabilities', `<div class="cv-compact">${renderEntries(cv.capabilities)}</div>`)}
          ${renderSection('Education & Credentials', renderEntries(cv.credentials))}
          ${renderSection('Rocket Science Learning', renderEntries(cv.rocketLog))}
          ${renderSection('Astronaut Path Foundations', renderEntries(cv.missionPillars))}
          ${renderSection('Next Steps', renderEntries(cv.nextSteps))}
        </div>
      </div>
      <p class="cv-generated">Generated from the live website on ${escapeHtml(cv.generatedAt)}. Source: ${escapeHtml(cv.source)}</p>
    </main>
    <script>
      window.addEventListener('load', () => {
        window.setTimeout(() => window.print(), 250);
      });
    <\/script>
  </body>
</html>`;
  };

  generateCvButton.addEventListener('click', () => {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.alert('Please allow pop-ups for this site, then click Generate CV again.');
      return;
    }

    printWindow.opener = null;
    const cvMarkup = buildCvDocument(collectCvData());
    printWindow.document.open();
    printWindow.document.write(cvMarkup);
    printWindow.document.close();
    printWindow.focus();
  });
}

const signalRibbon = document.querySelector('[data-signal-ribbon]');

if (signalRibbon) {
  const tracks = [
    {
      title: 'Journey Sequence',
      src: 'assets/tracks/Journey%20Sequence.mp3',
    },
    {
      title: 'Radiant (Dynamic)',
      src: 'assets/tracks/Radiant%20(Dynamic).mp3',
    },
  ];
  const audio = signalRibbon.querySelector('[data-signal-audio]');
  const playButton = signalRibbon.querySelector('[data-signal-toggle]');
  const nextButton = signalRibbon.querySelector('[data-signal-next]');
  const titleElement = signalRibbon.querySelector('[data-signal-title]');
  const statusElement = signalRibbon.querySelector('[data-signal-status]');
  const progressElement = signalRibbon.querySelector('[data-signal-progress]');
  const currentTimeElement = signalRibbon.querySelector('[data-signal-current]');
  const durationElement = signalRibbon.querySelector('[data-signal-duration]');
  const indexElement = signalRibbon.querySelector('[data-signal-index]');
  let currentTrackIndex = 0;
  let currentTrackAvailable = true;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  };

  const updateProgress = () => {
    const duration = audio.duration;
    const currentTime = audio.currentTime;
    const progress = Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    signalRibbon.style.setProperty('--signal-progress', `${clampedProgress * 360}deg`);
    signalRibbon.style.setProperty('--signal-progress-x', `${clampedProgress * 100}%`);
    progressElement.style.width = `${clampedProgress * 100}%`;
    currentTimeElement.textContent = `T+ ${formatTime(currentTime)}`;
    if (durationElement) {
      durationElement.textContent = formatTime(duration);
    }
  };

  const updateButtonLabels = () => {
    playButton.setAttribute('aria-label', audio.paused ? 'Play current transmission' : 'Pause current transmission');
    nextButton.setAttribute('aria-label', 'Next transmission');
  };

  const setStatus = (status) => {
    statusElement.textContent = status;
  };

  const setTrack = (index, shouldPlay = false, shouldLoad = true) => {
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];

    currentTrackAvailable = true;
    signalRibbon.classList.remove('is-playing', 'is-error');
    playButton.disabled = false;
    if (titleElement) {
      titleElement.textContent = track.title;
    }
    if (indexElement) {
      indexElement.textContent = `${String(currentTrackIndex + 1).padStart(2, '0')} / ${String(tracks.length).padStart(2, '0')}`;
    }
    if (shouldLoad) {
      audio.src = track.src;
      audio.load();
    }
    updateProgress();
    updateButtonLabels();
    setStatus(!shouldLoad && audio.autoplay ? 'ORBITAL AUDIO / ACQUIRING' : shouldPlay ? 'ORBITAL AUDIO / SYNCING' : 'ORBITAL AUDIO / STANDBY');

    if (shouldPlay) {
      audio.play().catch(() => {
        signalRibbon.classList.remove('is-playing');
        setStatus('ORBITAL AUDIO / TAP TO ARM');
        updateButtonLabels();
      });
    }
  };

  const playCurrentTrack = () => {
    if (!currentTrackAvailable) {
      return;
    }

    audio.play().then(() => {
      signalRibbon.classList.add('is-playing');
      setStatus('ORBITAL AUDIO / LIVE');
      updateButtonLabels();
    }).catch(() => {
      signalRibbon.classList.remove('is-playing');
      setStatus('ORBITAL AUDIO / RETRY LINK');
      updateButtonLabels();
    });
  };

  playButton.addEventListener('click', () => {
    if (audio.paused) {
      playCurrentTrack();
    } else {
      audio.pause();
    }
  });

  nextButton.addEventListener('click', () => {
    setTrack(currentTrackIndex + 1, !audio.paused);
  });

  audio.addEventListener('play', () => {
    signalRibbon.classList.add('is-playing');
    setStatus('ORBITAL AUDIO / LIVE');
    updateButtonLabels();
  });

  audio.addEventListener('pause', () => {
    signalRibbon.classList.remove('is-playing');
    if (currentTrackAvailable && !audio.ended) {
      setStatus('ORBITAL AUDIO / HOLD');
    }
    updateButtonLabels();
  });

  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('timeupdate', updateProgress);

  audio.addEventListener('ended', () => {
    if (currentTrackIndex < tracks.length - 1) {
      setTrack(currentTrackIndex + 1, true);
    } else {
      setTrack(0);
      audio.currentTime = 0;
      updateProgress();
      setStatus('ORBITAL AUDIO / ORBIT RESET');
    }
  });

  audio.addEventListener('error', () => {
    currentTrackAvailable = false;
    signalRibbon.classList.remove('is-playing');
    signalRibbon.classList.add('is-error');
    playButton.disabled = true;
    setStatus('ORBITAL AUDIO / SIGNAL LOST');
    updateButtonLabels();
  });

  setTrack(0, false, false);

  window.setTimeout(() => {
    if (audio.paused && currentTrackAvailable) {
      setStatus('ORBITAL AUDIO / TAP TO ARM');
      updateButtonLabels();
    }
  }, 1500);
}

let decorativeAnimationInstances = [];

const startDecorativeAnimations = () => {
  if (shouldReduceDecorativeMotion() || !window.anime || decorativeAnimationInstances.length) {
    return;
  }

  decorativeAnimationInstances = [
    window.anime({
      targets: '.console-orbit--outer',
      rotate: ['-16deg', '344deg'],
      duration: 52000,
      easing: 'linear',
      loop: true,
    }),
    window.anime({
      targets: '.console-orbit--middle',
      rotate: ['24deg', '-336deg'],
      duration: 61000,
      easing: 'linear',
      loop: true,
    }),
    window.anime({
      targets: '.console-orbit--inner',
      rotate: ['-38deg', '322deg'],
      duration: 44000,
      easing: 'linear',
      loop: true,
    }),
    window.anime({
      targets: '.console-core',
      boxShadow: [
        '0 0 24px rgba(134,229,224,.1)',
        '0 0 44px rgba(134,229,224,.22)',
        '0 0 24px rgba(134,229,224,.1)',
      ],
      duration: 4200,
      easing: 'easeInOutSine',
      loop: true,
    }),
    window.anime({
      targets: '.telemetry-label',
      opacity: [.34, .68, .34],
      duration: 5200,
      delay: window.anime.stagger(700),
      easing: 'easeInOutSine',
      loop: true,
    }),
  ];
};

const stopDecorativeAnimations = () => {
  decorativeAnimationInstances.forEach((animation) => animation.pause());
  decorativeAnimationInstances = [];

  if (window.anime) {
    window.anime.remove('.console-orbit--outer, .console-orbit--middle, .console-orbit--inner, .console-core, .telemetry-label');
  }
};

startDecorativeAnimations();

window.addEventListener('performance-mode-change', () => {
  if (shouldReduceDecorativeMotion()) {
    stopDecorativeAnimations();
  } else {
    startDecorativeAnimations();
  }
});

if (!reducedMotion) {
  const trailLayer = document.createElement('div');
  const trailColors = [
    { color: 'rgba(244,184,96,.95)', glow: 'rgba(244,184,96,.42)' },
    { color: 'rgba(134,229,224,.88)', glow: 'rgba(134,229,224,.32)' },
    { color: 'rgba(238,244,241,.72)', glow: 'rgba(238,244,241,.24)' },
  ];
  const maxTrailParticles = 80;
  const activeTrailParticles = new Set();

  trailLayer.className = 'click-trail-layer';
  trailLayer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(trailLayer);

  const trimTrailParticles = () => {
    while (activeTrailParticles.size > maxTrailParticles) {
      const oldestParticle = activeTrailParticles.values().next().value;
      activeTrailParticles.delete(oldestParticle);
      oldestParticle.remove();
    }
  };

  const clearTrailParticles = () => {
    activeTrailParticles.forEach((particle) => particle.remove());
    activeTrailParticles.clear();
  };

  const createTrailParticle = (x, y, index) => {
    const particle = document.createElement('span');
    const palette = trailColors[index % trailColors.length];
    const driftX = (Math.random() - .5) * 56;
    const driftY = 18 + Math.random() * 58;
    const size = 5 + Math.random() * 8;
    const duration = 560 + Math.random() * 320;

    particle.className = 'click-trail-particle';
    particle.style.setProperty('--origin-x', `${x}px`);
    particle.style.setProperty('--origin-y', `${y}px`);
    particle.style.setProperty('--trail-x', `${driftX}px`);
    particle.style.setProperty('--trail-y', `${driftY}px`);
    particle.style.setProperty('--trail-size', `${size}px`);
    particle.style.setProperty('--trail-duration', `${duration}ms`);
    particle.style.setProperty('--trail-color', palette.color);
    particle.style.setProperty('--trail-glow', palette.glow);

    particle.addEventListener('animationend', () => {
      activeTrailParticles.delete(particle);
      particle.remove();
    }, { once: true });

    activeTrailParticles.add(particle);
    trailLayer.appendChild(particle);
  };

  document.addEventListener('pointerdown', (event) => {
    if (shouldReduceDecorativeMotion()) {
      clearTrailParticles();
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    for (let index = 0; index < 8; index += 1) {
      createTrailParticle(event.clientX, event.clientY, index);
    }

    trimTrailParticles();
  }, { passive: true });

  window.addEventListener('performance-mode-change', () => {
    if (shouldReduceDecorativeMotion()) {
      clearTrailParticles();
    }
  });
}
