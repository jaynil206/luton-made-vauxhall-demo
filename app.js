// @ts-nocheck
/* global TOPICS */
(function () {
  'use strict';

  // ------------------------------ utils ------------------------------
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  // Split a long flat string into readable paragraphs by finding the next
  // sentence boundary after a target length. Keeps short text as one paragraph.
  function paragraphize(text) {
    if (!text) return [];
    var paragraphs = [];
    var remaining = String(text).trim();
    var minLen = 350;
    while (remaining.length > minLen + 80) {
      var idx = remaining.indexOf('. ', minLen);
      if (idx === -1) break;
      paragraphs.push(remaining.slice(0, idx + 1).trim());
      remaining = remaining.slice(idx + 2).trim();
    }
    if (remaining) paragraphs.push(remaining);
    return paragraphs;
  }

  // ------------------------------ tile rendering ------------------------------
  // Artifacts are already framed (polaroid borders, torn newspaper edges,
  // ID-badge lamination, etc.) in the source PNG. Each tile sits in a single
  // uniform cell of the bento grid with the image contained inside it.
  function createTile(topic) {
    var tile = el('button', 'tile');
    tile.type = 'button';
    tile.dataset.topicId = topic.id;
    tile.setAttribute('aria-label', 'Open ' + topic.title);

    var inner = el('div', 'tile-inner');

    var img = el('img', 'artifact');
    img.src = topic.image;
    img.alt = topic.title + ' — ' + topic.cover;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', function () {
      // Fallback: show a simple paper card with the topic name so the collage
      // never renders broken-image icons for files that haven't landed yet.
      inner.innerHTML =
        '<div class="artifact-fallback">' +
          '<div class="fallback-title">' + escapeHtml(topic.title) + '</div>' +
          '<div class="fallback-meta">' + escapeHtml(topic.cover) + '</div>' +
        '</div>';
    });

    inner.appendChild(img);
    tile.appendChild(inner);
    return tile;
  }

  function renderGallery(container, topics) {
    container.innerHTML = '';
    topics.forEach(function (topic) {
      container.appendChild(createTile(topic));
    });
  }

  // ------------------------------ audio playback ------------------------------
  // Pre-generated narration files (e.g. ElevenLabs) referenced via topic.audio.
  // The player bar only appears on topics that have an audio file set.
  var audioEl = null;

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updatePlayPauseIcon(playing) {
    var btn = document.getElementById('overlay-audio');
    if (!btn) return;
    btn.querySelector('.audio-icon-play').classList.toggle('hidden', playing);
    btn.querySelector('.audio-icon-pause').classList.toggle('hidden', !playing);
    btn.setAttribute('aria-label', playing ? 'Pause narration' : 'Play narration');
  }

  function updateProgressUI(current, duration) {
    var pct = duration > 0 ? (current / duration) * 100 : 0;
    var fill = document.getElementById('audio-progress-fill');
    var thumb = document.getElementById('audio-progress-thumb');
    if (fill) fill.style.width = pct + '%';
    if (thumb) thumb.style.left = pct + '%';
    var cur = document.getElementById('audio-time-current');
    var tot = document.getElementById('audio-time-total');
    if (cur) cur.textContent = formatTime(current);
    if (tot) tot.textContent = formatTime(duration);
  }

  function ensureAudioEl() {
    if (audioEl) return audioEl;
    audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.addEventListener('play',          function () { updatePlayPauseIcon(true); });
    audioEl.addEventListener('pause',         function () { updatePlayPauseIcon(false); });
    audioEl.addEventListener('ended',         function () { updatePlayPauseIcon(false); audioEl.currentTime = 0; updateProgressUI(0, audioEl.duration || 0); });
    audioEl.addEventListener('error',         function () { updatePlayPauseIcon(false); });
    audioEl.addEventListener('loadedmetadata',function () { updateProgressUI(audioEl.currentTime, audioEl.duration); });
    audioEl.addEventListener('timeupdate',    function () { updateProgressUI(audioEl.currentTime, audioEl.duration); });
    return audioEl;
  }

  function stopAudio() {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    updatePlayPauseIcon(false);
    updateProgressUI(0, audioEl ? (audioEl.duration || 0) : 0);
  }

  function loadTopicAudio(topic) {
    var player = document.getElementById('overlay-audio-player');
    var hasAudio = !!(topic && topic.audio);
    if (player) {
      player.classList.toggle('hidden', !hasAudio);
      player.classList.toggle('flex', hasAudio);
    }
    if (!hasAudio) {
      stopAudio();
      return;
    }
    var a = ensureAudioEl();
    if (!a.src.endsWith(topic.audio)) {
      a.src = topic.audio;
    }
    a.pause();
    a.currentTime = 0;
    updatePlayPauseIcon(false);
    updateProgressUI(0, a.duration || 0);
  }

  function toggleAudio() {
    var a = ensureAudioEl();
    if (!a.src) return;
    if (a.paused) {
      var p = a.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } else {
      a.pause();
    }
  }

  function seekFromEvent(e) {
    if (!audioEl || !audioEl.duration) return;
    var track = document.getElementById('audio-progress-track');
    if (!track) return;
    var rect = track.getBoundingClientRect();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    var pct = Math.max(0, Math.min(1, x / rect.width));
    audioEl.currentTime = pct * audioEl.duration;
    updateProgressUI(audioEl.currentTime, audioEl.duration);
  }

  // ------------------------------ hash routing ------------------------------
  // Hash schema:
  //   /              → home (gallery)
  //   /#about        → Get Involved page
  //   /#contact      → Contact page
  //   /#<topic-id>   → topic overlay (rendered on top of the gallery)
  //
  // Direct loads, sharing links, and browser back/forward all work without
  // any server-side config since GitHub Pages happily serves the static
  // index.html for the root path.
  var PAGE_IDS = ['gallery', 'about', 'contact'];

  function readHash() {
    return (window.location.hash || '').replace(/^#\/?/, '');
  }

  function setHashRoute(hash, replace) {
    var url = window.location.pathname + window.location.search + (hash ? '#' + hash : '');
    if (replace) history.replaceState(null, '', url);
    else         history.pushState(null, '', url);
  }

  // Apply whatever the URL says — used on page load and when the user
  // navigates via browser back/forward (which fires hashchange).
  function applyHashState() {
    var hash = readHash();
    var topic = hash ? (TOPICS.find(function (t) { return t.id === hash; }) || null) : null;
    var overlayEl = document.getElementById('overlay');

    if (topic) {
      // A topic overlay sits on top of the gallery page.
      showPage('gallery');
      if (currentTopicIndex === -1 || TOPICS[currentTopicIndex].id !== topic.id) {
        currentTopicIndex = TOPICS.indexOf(topic);
        populateOverlay(topic, currentTopicIndex);
        overlayEl.classList.add('open');
      }
      return;
    }

    // Not a topic — close any open overlay first.
    if (currentTopicIndex !== -1) {
      overlayEl.classList.remove('open');
      currentTopicIndex = -1;
      stopAudio();
    }

    // Pick the page to show (fall back to gallery for empty/unknown hashes).
    var page = (PAGE_IDS.indexOf(hash) !== -1) ? hash : 'gallery';
    showPage(page);
  }

  // ------------------------------ overlay ------------------------------
  var currentTopicIndex = -1;

  function populateOverlay(topic, index) {
    var galleryEl = document.getElementById('overlay-gallery');
    var images = (topic.gallery && topic.gallery.length) ? topic.gallery : [topic.image];
    galleryEl.innerHTML = images.map(function (src, i) {
      return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(topic.title + ' — image ' + (i + 1)) + '" class="snap-start shrink-0 h-72 md:h-96 w-auto" loading="lazy" decoding="async" />';
    }).join('');
    galleryEl.scrollLeft = 0;

    document.getElementById('overlay-title').textContent = topic.title;
    document.getElementById('overlay-caption').textContent = topic.caption || '';
    var descEl = document.getElementById('overlay-description');
    var bodyText = topic.description || topic.caption;
    descEl.innerHTML = paragraphize(bodyText).map(function (p) {
      return '<p>' + escapeHtml(p) + '</p>';
    }).join('');

    loadTopicAudio(topic);
    document.getElementById('overlay-counter').textContent = (index + 1) + ' / ' + TOPICS.length;
    // Scroll the modal content back to the top when navigating.
    var card = document.querySelector('#overlay .overflow-y-auto');
    if (card) card.scrollTop = 0;
  }

  function openOverlay(topic) {
    currentTopicIndex = TOPICS.indexOf(topic);
    populateOverlay(topic, currentTopicIndex);
    document.getElementById('overlay').classList.add('open');
    setHashRoute(topic.id, false); // push — back button closes the overlay
  }

  function closeOverlay() {
    document.getElementById('overlay').classList.remove('open');
    currentTopicIndex = -1;
    stopAudio();
    setHashRoute('', true); // replace — clear hash without polluting history
  }

  function stepOverlay(direction) {
    if (currentTopicIndex === -1) return;
    currentTopicIndex = (currentTopicIndex + direction + TOPICS.length) % TOPICS.length;
    var topic = TOPICS[currentTopicIndex];
    populateOverlay(topic, currentTopicIndex);
    setHashRoute(topic.id, true); // replace — keeps history clean while paging
  }

  function navigateToPage(pageId) {
    if (currentTopicIndex !== -1) {
      document.getElementById('overlay').classList.remove('open');
      currentTopicIndex = -1;
      stopAudio();
    }
    showPage(pageId);
    setHashRoute(pageId === 'gallery' ? '' : pageId, false);
  }

  // ------------------------------ page switching ------------------------------
  var currentPageId = 'gallery';

  function showPage(pageId) {
    if (currentPageId === pageId) return;
    currentPageId = pageId;
    document.querySelectorAll('.page-section').forEach(function (el) {
      el.classList.toggle('active', el.id === 'page-' + pageId);
    });
    document.querySelectorAll('.nav-link').forEach(function (el) {
      var isActive = el.getAttribute('data-page') === pageId;
      el.classList.toggle('text-luton-red', isActive);
      el.classList.toggle('text-ink/80', !isActive);
      el.classList.toggle('border-b-2', isActive);
      el.classList.toggle('border-luton-red', isActive);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // ------------------------------ init ------------------------------
  function init() {
    var galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
      renderGallery(galleryGrid, TOPICS);

      galleryGrid.addEventListener('click', function (e) {
        var tile = e.target.closest('.tile');
        if (!tile) return;
        var topic = TOPICS.find(function (t) { return t.id === tile.dataset.topicId; });
        if (topic) openOverlay(topic);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOverlay();
      if (e.key === 'ArrowLeft')  stepOverlay(-1);
      if (e.key === 'ArrowRight') stepOverlay(1);
    });

    document.querySelectorAll('[data-page]').forEach(function (el) {
      el.addEventListener('click', function () {
        var page = this.getAttribute('data-page');
        if (page) navigateToPage(page);
      });
    });

    var registerBtn = document.getElementById('btn-register-interest');
    if (registerBtn) registerBtn.addEventListener('click', function () { navigateToPage('contact'); });

    document.getElementById('overlay-close').addEventListener('click', closeOverlay);
    document.getElementById('overlay-backdrop').addEventListener('click', closeOverlay);
    document.getElementById('overlay').addEventListener('click', function (e) {
      var stepEl = e.target.closest('[data-step]');
      if (stepEl) stepOverlay(parseInt(stepEl.dataset.step, 10));
    });

    var audioBtn = document.getElementById('overlay-audio');
    if (audioBtn) audioBtn.addEventListener('click', toggleAudio);

    var progressTrack = document.getElementById('audio-progress-track');
    if (progressTrack) {
      progressTrack.addEventListener('click', seekFromEvent);
    }

    // Hash routing: open the right overlay/page for the current URL on load,
    // and respond to back/forward navigation.
    window.addEventListener('hashchange', applyHashState);
    applyHashState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
