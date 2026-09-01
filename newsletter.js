// @ts-nocheck
// Newsletter signup — shared between index.html (site footer) and
// stayupdated.html (standalone signup page), so both post to the same place.
//
// Posted straight to a Google Apps Script Web App bound to a Google Sheet, so
// signups land as new rows without needing any other backend. To wire it up:
//   1. Create a Google Sheet with header row: Timestamp | First Name | Email | Consent
//   2. In that sheet: Extensions > Apps Script, and paste:
//        function doPost(e) {
//          var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
//          var p = e.parameter;
//          sheet.appendRow([new Date(), p.firstName, p.email, p.consent]);
//          return ContentService.createTextOutput('ok');
//        }
//   3. Deploy > New deployment > type "Web app" > Execute as: Me > Who has
//      access: Anyone. Copy the resulting /exec URL into the constant below.
(function () {
  'use strict';

  var NEWSLETTER_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbwrQom4SNNa7Pt7NUiQUbkbhDA2IHtty5fUQ8vWDs4-uscmBZDDqLN30ziUL2E6h-Dh/exec'; // e.g. 'https://script.google.com/macros/s/XXXXXXXX/exec'

  function initNewsletterForm() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;
    var status = document.getElementById('newsletter-status');

    function showStatus(message) {
      status.textContent = message;
      status.classList.remove('hidden');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = document.getElementById('newsletter-name').value.trim();
      var email = document.getElementById('newsletter-email').value.trim();
      var consent = document.getElementById('newsletter-consent').checked;

      if (!name || !email || !consent) {
        showStatus('Please fill in your name, email, and accept the privacy policy.');
        return;
      }

      if (!NEWSLETTER_ENDPOINT_URL) {
        // Not wired up yet — fail gracefully instead of pretending it worked.
        showStatus("Sorry, sign-up isn't available right now — please email lutonmade@luton.gov.uk instead.");
        return;
      }

      var data = new FormData();
      data.append('firstName', name);
      data.append('email', email);
      data.append('consent', 'Yes');

      // Apps Script web apps don't reliably send CORS headers, so the response
      // is opaque (mode: 'no-cors') — we optimistically report success once the
      // request has been sent.
      fetch(NEWSLETTER_ENDPOINT_URL, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () {
          form.reset();
          // form has Tailwind's `flex` class, which overrides the `[hidden]`
          // attribute's `display: none` — drop it explicitly instead.
          form.classList.add('hidden');
          form.classList.remove('flex');
          var success = document.getElementById('newsletter-success');
          if (success) {
            success.classList.remove('hidden');
            success.classList.add('flex');
          }
        })
        .catch(function () {
          showStatus('Something went wrong — please try again or email lutonmade@luton.gov.uk.');
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsletterForm);
  } else {
    initNewsletterForm();
  }
})();
