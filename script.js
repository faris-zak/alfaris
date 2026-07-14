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
