// Paste the Web app URL from Google Apps Script between the quotes (it ends with /exec)
var SHEET_URL = 'https://script.google.com/macros/s/AKfycbyU94HhEtFG0jksh4uPvkzDkrlfE9HM09snQdhSJOzToFAqgHnMgcbsEXURy43C9qE2xQ/exec';

var form = document.getElementById('adm');
var msg = document.getElementById('ok');
var btn = document.getElementById('send');

function show(text, bad) {
  msg.textContent = text;
  msg.className = 'full' + (bad ? ' err' : '');
  msg.style.display = 'block';
  msg.scrollIntoView({ block: 'center' });
}

/* ---------- Photo: drag and drop ---------- */
var drop = document.getElementById('drop'), fileIn = document.getElementById('file');
var pv = document.getElementById('pv'), dropmsg = document.getElementById('dropmsg'), rm = document.getElementById('rm');
var photoData = '';

function loadPhoto(file) {
  if (!file || file.type.indexOf('image/') !== 0) { show('Please choose an image file for the photo.', true); return; }
  var fr = new FileReader();
  fr.onload = function () {
    var img = new Image();
    img.onload = function () {
      var max = 480, k = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      photoData = c.toDataURL('image/jpeg', 0.8);
      pv.src = photoData; pv.hidden = false; dropmsg.hidden = true; rm.hidden = false;
    };
    img.onerror = function () { show('That image could not be read. Try another photo.', true); };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
drop.addEventListener('click', function () { fileIn.click(); });
drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
fileIn.addEventListener('change', function () { loadPhoto(fileIn.files[0]); });
['dragenter', 'dragover'].forEach(function (t) {
  drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); });
});
['dragleave', 'drop'].forEach(function (t) {
  drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); });
});
drop.addEventListener('drop', function (e) { loadPhoto(e.dataTransfer.files[0]); });
rm.addEventListener('click', function () {
  photoData = ''; pv.hidden = true; pv.removeAttribute('src'); dropmsg.hidden = false; rm.hidden = true; fileIn.value = '';
});

/* ---------- Signature pads ---------- */
var pads = {};
function setupPad(id) {
  var c = document.getElementById(id), x = c.getContext('2d'), down = false, inked = false;
  function blank() { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#1F1300'; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round'; inked = false; }
  function pos(e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; }
  c.addEventListener('pointerdown', function (e) { down = true; c.setPointerCapture(e.pointerId); var p = pos(e); x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0] + .1, p[1]); x.stroke(); inked = true; });
  c.addEventListener('pointermove', function (e) { if (!down) return; var p = pos(e); x.lineTo(p[0], p[1]); x.stroke(); });
  ['pointerup', 'pointercancel'].forEach(function (t) { c.addEventListener(t, function () { down = false; }); });
  blank();
  pads[id] = { data: function () { return inked ? c.toDataURL('image/png') : ''; }, clear: blank };
}
setupPad('sig1'); setupPad('sig2');
document.querySelectorAll('[data-clear]').forEach(function (b) {
  b.addEventListener('click', function () { pads[b.getAttribute('data-clear')].clear(); });
});

/* ---------- Child's name repeats in the declaration ---------- */
var ward = document.getElementById('ward');
form.elements.student.addEventListener('input', function () { if (!ward.dataset.edited) ward.value = this.value; });
ward.addEventListener('input', function () { ward.dataset.edited = '1'; });

/* ---------- Submit ---------- */
form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }

  var s1 = pads.sig1.data(), s2 = pads.sig2.data();
  if (!s1 && !s2) { show('Please sign in the Father’s or Mother’s signature box.', true); return; }

  if (SHEET_URL.indexOf('PASTE') === 0) {
    show('The form is not connected yet. Add the Web app URL in script.js.', true);
    return;
  }

  var data = new FormData(form);
  if (data.get('botcheck')) { return; }
  ['student', 'father', 'mother', 'ward'].forEach(function (k) {
    data.set(k, String(data.get(k)).toUpperCase().trim());
  });
  data.set('photo', photoData);
  data.set('father_sign', s1);
  data.set('mother_sign', s2);

  btn.disabled = true;
  btn.textContent = 'Sending…';

  fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) })
    .then(function () {
      form.reset(); rm.click(); pads.sig1.clear(); pads.sig2.clear(); delete ward.dataset.edited;
      show('Thank you. Your admission request has been received. The school office will call you within two working days.');
    })
    .catch(function () {
      show('Could not send. Check your internet or call the school office.', true);
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Send admission request';
    });
});