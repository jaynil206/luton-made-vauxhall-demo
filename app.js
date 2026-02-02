(function () {
  'use strict';

  function getContainerStyle(type) {
    switch (type) {
      case 'photo':
        return 'bg-paper-white p-3 shadow-lifted';
      case 'document':
        return 'bg-paper-white p-4 shadow-lifted border border-gray-200';
      case 'object':
        return 'bg-gray-100 p-2 shadow-lifted border-2 border-gray-300';
      default:
        return 'bg-white p-2 shadow-lifted';
    }
  }

  function createFlipTile(topic, onReadStory) {
    var outer = document.createElement('div');
    outer.className = 'relative group ' + topic.span + ' h-64 md:h-80 z-0 hover:z-10 transition-all duration-300';
    outer.dataset.topicId = topic.id;

    var rotWrap = document.createElement('div');
    rotWrap.className = 'w-full h-full transform transition-all duration-300 ' + topic.rotation + ' hover:scale-105 hover:rotate-0';

    var flipContainer = document.createElement('div');
    flipContainer.className = 'relative w-full h-full cursor-pointer perspective-1000';

    var flipInner = document.createElement('div');
    flipInner.className = 'relative w-full h-full transition-transform duration-700 transform-style-3d flip-inner';

    flipContainer.addEventListener('click', function (e) {
      if (e.target.closest('[data-read-story]')) return;
      flipInner.classList.toggle('is-flipped');
    });

    // Front
    var front = document.createElement('div');
    front.className = 'absolute w-full h-full backface-hidden ' + getContainerStyle(topic.type) + ' flex flex-col';

    var imgWrap = document.createElement('div');
    imgWrap.className = 'flex-grow relative overflow-hidden bg-gray-200';
    var img = document.createElement('img');
    img.src = topic.image;
    img.alt = topic.title;
    img.className = 'w-full h-full object-cover filter sepia-[0.2] contrast-110';
    imgWrap.appendChild(img);

    if (topic.type === 'photo') {
      var photoLabel = document.createElement('div');
      photoLabel.className = 'absolute bottom-2 right-2 opacity-60';
      photoLabel.innerHTML = '<span class="text-[10px] font-mono bg-black text-white px-1">JAN 2026</span>';
      imgWrap.appendChild(photoLabel);
    }
    if (topic.type === 'object') {
      var refBadge = document.createElement('div');
      refBadge.className = 'absolute top-2 left-2';
      refBadge.innerHTML = '<div class="w-8 h-8 rounded-full bg-luton-red opacity-80 flex items-center justify-center text-white font-bold text-xs">Ref</div>';
      imgWrap.appendChild(refBadge);
    }

    var labelArea = document.createElement('div');
    labelArea.className = 'mt-3 min-h-[3rem]';
    labelArea.innerHTML =
      '<h3 class="font-serif font-bold text-gray-800 leading-tight uppercase tracking-wide text-sm md:text-base">' + escapeHtml(topic.title) + '</h3>' +
      '<p class="font-mono text-xs text-luton-red mt-1 uppercase tracking-wider">' + (topic.type === 'photo' ? 'GM ARCHIVE' : 'ARTIFACT') + '</p>';

    front.appendChild(imgWrap);
    front.appendChild(labelArea);

    // Back
    var back = document.createElement('div');
    back.className = 'absolute w-full h-full backface-hidden rotate-y-180 bg-luton-red p-6 text-white flex flex-col justify-between shadow-xl';

    var readBtn = document.createElement('button');
    readBtn.type = 'button';
    readBtn.dataset.readStory = '1';
    readBtn.className = 'w-full bg-white text-luton-red py-3 px-4 text-sm font-bold uppercase tracking-widest hover:bg-yellow-50 transition-colors flex items-center justify-between group/btn';
    readBtn.innerHTML = '<span>Read Story</span><span class="group-hover/btn:translate-x-1 transition-transform">→</span>';
    readBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      onReadStory(topic);
    });

    back.innerHTML =
      '<div>' +
        '<div class="border-b border-white/30 pb-2 mb-4"><span class="font-mono text-xs uppercase tracking-widest opacity-80">' + escapeHtml(topic.category) + '</span></div>' +
        '<h3 class="font-bold text-xl mb-3 leading-tight">' + escapeHtml(topic.title) + '</h3>' +
        '<p class="text-sm font-medium leading-relaxed opacity-90">' + escapeHtml(topic.description) + '</p>' +
      '</div>';
    back.appendChild(readBtn);

    flipInner.appendChild(front);
    flipInner.appendChild(back);
    flipContainer.appendChild(flipInner);
    rotWrap.appendChild(flipContainer);
    outer.appendChild(rotWrap);

    return outer;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderGallery(container, topics, onReadStory) {
    container.innerHTML = '';
    topics.forEach(function (topic) {
      container.appendChild(createFlipTile(topic, onReadStory));
    });
  }

  function showPage(pageId) {
    var sections = document.querySelectorAll('.page-section');
    var navLinks = document.querySelectorAll('.nav-link');
    sections.forEach(function (el) {
      el.classList.toggle('active', el.id === 'page-' + pageId);
    });
    navLinks.forEach(function (el) {
      var isActive = el.getAttribute('data-page') === pageId;
      el.classList.toggle('text-luton-red', isActive);
      el.classList.toggle('text-gray-700', !isActive);
      el.classList.toggle('border-b-2', isActive);
      el.classList.toggle('border-luton-red', isActive);
    });
  }

  function openOverlay(topic) {
    var overlay = document.getElementById('overlay');
    document.getElementById('overlay-image').src = topic.image;
    document.getElementById('overlay-image').alt = topic.title;
    document.getElementById('overlay-item-id').textContent = 'Exhibition Item #' + topic.id.toUpperCase();
    document.getElementById('overlay-title-left').textContent = topic.title;
    document.getElementById('overlay-title-mobile').textContent = topic.title;
    document.getElementById('overlay-category').textContent = topic.category.toUpperCase();
    document.getElementById('overlay-description').textContent = topic.description;
    document.getElementById('overlay-full-content').textContent = topic.fullContent;
    document.getElementById('overlay-gallery-1').src = 'https://picsum.photos/seed/' + topic.id + '1/200/200';
    document.getElementById('overlay-gallery-2').src = 'https://picsum.photos/seed/' + topic.id + '2/200/200';
    overlay.classList.add('open');
  }

  function closeOverlay() {
    document.getElementById('overlay').classList.remove('open');
  }

  function init() {
    var galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid && typeof TOPICS !== 'undefined') {
      renderGallery(galleryGrid, TOPICS, openOverlay);
    }

    document.querySelectorAll('[data-page]').forEach(function (el) {
      el.addEventListener('click', function () {
        var page = this.getAttribute('data-page');
        if (page) showPage(page);
      });
    });

    document.getElementById('btn-register-interest').addEventListener('click', function () {
      showPage('contact');
    });

    document.getElementById('overlay-close').addEventListener('click', closeOverlay);
    document.getElementById('overlay-backdrop').addEventListener('click', closeOverlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
