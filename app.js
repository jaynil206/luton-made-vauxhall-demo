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

  // ------------------------------ overlay ------------------------------
  var currentTopicIndex = -1;

  function populateOverlay(topic, index) {
    document.getElementById('overlay-image').src = topic.image;
    document.getElementById('overlay-image').alt = topic.title;
    document.getElementById('overlay-title').textContent = topic.title;
    document.getElementById('overlay-description').textContent = topic.caption;
    document.getElementById('overlay-counter').textContent = (index + 1) + ' / ' + TOPICS.length;
    // Scroll the modal content back to the top when navigating.
    var card = document.querySelector('#overlay .overflow-y-auto');
    if (card) card.scrollTop = 0;
  }

  function openOverlay(topic) {
    currentTopicIndex = TOPICS.indexOf(topic);
    populateOverlay(topic, currentTopicIndex);
    document.getElementById('overlay').classList.add('open');
  }

  function closeOverlay() {
    document.getElementById('overlay').classList.remove('open');
    currentTopicIndex = -1;
  }

  function stepOverlay(direction) {
    if (currentTopicIndex === -1) return;
    currentTopicIndex = (currentTopicIndex + direction + TOPICS.length) % TOPICS.length;
    populateOverlay(TOPICS[currentTopicIndex], currentTopicIndex);
  }

  // ------------------------------ page switching ------------------------------
  function showPage(pageId) {
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
        if (page) showPage(page);
      });
    });

    var registerBtn = document.getElementById('btn-register-interest');
    if (registerBtn) registerBtn.addEventListener('click', function () { showPage('contact'); });

    document.getElementById('overlay-close').addEventListener('click', closeOverlay);
    document.getElementById('overlay-backdrop').addEventListener('click', closeOverlay);
    document.getElementById('overlay').addEventListener('click', function (e) {
      var stepEl = e.target.closest('[data-step]');
      if (stepEl) stepOverlay(parseInt(stepEl.dataset.step, 10));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
