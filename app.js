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

  // ------------------------------ path routing ------------------------------
  // URL schema (clean paths via the History API):
  //   /                → home (gallery)
  //   /about           → Get Involved page
  //   /exhibition      → Exhibition page
  //   /oral-histories  → Oral Histories page
  //   /<topic-id>      → topic overlay (rendered on top of the gallery)
  //
  // GitHub Pages can't rewrite arbitrary paths to index.html on its own, so a
  // 404.html at the repo root redirects unmatched paths back here (encoding
  // the original path in the query string); the restore script at the top of
  // index.html's <head> decodes that back into a clean URL before this file
  // runs. See https://github.com/rafgraph/spa-github-pages.
  var PAGE_IDS = ['gallery', 'about', 'exhibition', 'oral-histories'];

  function readPath() {
    return decodeURIComponent(window.location.pathname).replace(/^\/|\/$/g, '');
  }

  function setPathRoute(path, replace) {
    var url = (path ? '/' + path : '/') + window.location.search;
    if (replace) history.replaceState(null, '', url);
    else         history.pushState(null, '', url);
  }

  // Old shared links used /#exhibition, /#<topic-id>, etc. — if one lands
  // here, rewrite it to the equivalent clean path before routing runs so
  // existing bookmarks and posted links keep working.
  function migrateLegacyHash() {
    if (!window.location.hash) return;
    var legacyPath = window.location.hash.replace(/^#\/?/, '');
    history.replaceState(null, '', (legacyPath ? '/' + legacyPath : '/') + window.location.search);
  }

  // Apply whatever the URL says — used on page load and when the user
  // navigates via browser back/forward (which fires popstate).
  function applyPathState() {
    var path = readPath();
    var topic = path ? (TOPICS.find(function (t) { return t.id === path; }) || null) : null;
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

    // Pick the page to show (fall back to gallery for empty/unknown paths).
    var page = (PAGE_IDS.indexOf(path) !== -1) ? path : 'gallery';
    showPage(page);
  }

  // ------------------------------ overlay ------------------------------
  var currentTopicIndex = -1;

  function populateOverlay(topic, index) {
    var galleryEl = document.getElementById('overlay-gallery');
    var filtered = (topic.gallery || []).filter(function (src) { return src !== topic.image; });
    var images = filtered.length ? filtered : [topic.image];
    galleryEl.innerHTML = images.map(function (src, i) {
      var credit = topic.credits && topic.credits[src];
      return '<figure class="snap-start shrink-0 flex flex-col gap-1 m-0">' +
        '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(topic.title + ' — image ' + (i + 1)) + '" class="h-72 md:h-96 w-auto block" loading="lazy" decoding="async" />' +
        (credit ? '<figcaption class="text-xs font-mono text-white/40 px-1">' + escapeHtml(credit) + '</figcaption>' : '') +
        '</figure>';
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
    setPathRoute(topic.id, false); // push — back button closes the overlay
  }

  function closeOverlay() {
    document.getElementById('overlay').classList.remove('open');
    currentTopicIndex = -1;
    stopAudio();
    setPathRoute('', true); // replace — clear path without polluting history
  }

  function stepOverlay(direction) {
    if (currentTopicIndex === -1) return;
    currentTopicIndex = (currentTopicIndex + direction + TOPICS.length) % TOPICS.length;
    var topic = TOPICS[currentTopicIndex];
    populateOverlay(topic, currentTopicIndex);
    setPathRoute(topic.id, true); // replace — keeps history clean while paging
  }

  function navigateToPage(pageId) {
    if (currentTopicIndex !== -1) {
      document.getElementById('overlay').classList.remove('open');
      currentTopicIndex = -1;
      stopAudio();
    }
    showPage(pageId);
    setPathRoute(pageId === 'gallery' ? '' : pageId, false);
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

  // ------------------------------ oral histories ------------------------------
  function renderOralHistories() {
    var container = document.getElementById('oral-histories-container');
    if (!container || typeof ORAL_HISTORIES === 'undefined') return;
    container.innerHTML = '';

    ORAL_HISTORIES.forEach(function (section) {
      var wrap = el('div', '');
      var heading = el('h4', 'font-display text-lg uppercase tracking-wide mb-3 text-ink', escapeHtml(section.title));
      wrap.appendChild(heading);

      if (!section.clips.length) {
        wrap.appendChild(el('p', 'text-sm font-sans text-ink/50 italic', 'Coming soon'));
        container.appendChild(wrap);
        return;
      }

      // Tab row
      var tabRow = el('div', 'flex flex-nowrap overflow-x-auto gap-2 mb-6');
      var tabs = section.clips.map(function (clip, i) {
        var btn = el('button', 'font-display text-xs uppercase tracking-widest px-4 py-2 transition-colors ' + (i === 0 ? 'bg-ink text-white' : 'border-2 border-ink text-ink hover:bg-ink/10'), escapeHtml(clip.title));
        btn.type = 'button';
        btn.dataset.src = clip.src;
        tabRow.appendChild(btn);
        return btn;
      });
      wrap.appendChild(tabRow);

      // Single player for this section
      var player = document.createElement('audio');
      player.controls = true;
      player.preload = 'metadata';
      player.src = section.clips[0].src;
      player.className = 'w-full';
      wrap.appendChild(player);

      // Tab click handler
      tabs.forEach(function (btn) {
        btn.addEventListener('click', function () {
          tabs.forEach(function (b) {
            b.className = 'font-display text-xs uppercase tracking-widest px-4 py-2 transition-colors border-2 border-ink text-ink hover:bg-ink/10';
          });
          btn.className = 'font-display text-xs uppercase tracking-widest px-4 py-2 transition-colors bg-ink text-white';
          player.src = btn.dataset.src;
          player.currentTime = 0;
          player.play();
        });
      });

      container.appendChild(wrap);
    });
  }

  // Newsletter signup logic lives in newsletter.js (shared with stayupdated.html).

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

    // renderOralHistories populates the Exhibition page's oral history sections
    renderOralHistories();

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

    // Path routing: open the right overlay/page for the current URL on load,
    // and respond to back/forward navigation.
    migrateLegacyHash();
    window.addEventListener('popstate', applyPathState);
    applyPathState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
