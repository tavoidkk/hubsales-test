(function () {
  'use strict';

  /* ============================================================
     TEST TEXT - Spanish, no accents, no ñ, no special chars
     ============================================================ */
  const TEST_TEXT = [
    "La ciencia y la tecnologia han transformado radicalmente nuestra sociedad en las ultimas decadas. Desde los primeros ordenadores que ocupaban habitaciones enteras hasta los potentes dispositivos que caben en nuestros bolsillos, el progreso ha sido verdaderamente asombroso. Cada nuevo descubrimiento abre las puertas a posibilidades que antes parecian imposibles.",
    "El metodo cientifico sigue siendo la herramienta mas poderosa que tenemos para entender el mundo que nos rodea. A traves de la observacion, la formulacion de hipotesis, la experimentacion y el analisis de resultados, podemos obtener conocimiento confiable y verificable. Este enfoque riguroso nos ha permitido desarrollar desde vacunas que salvan millones de vidas hasta tecnologias de comunicacion que conectan a personas en todo el planeta.",
    "En el ambito de la computacion, los algoritmos de busqueda y procesamiento de datos han revolucionado la forma en que accedemos a la informacion. Los motores de busqueda pueden examinar miles de millones de paginas web en fracciones de segundo, ofreciendonos respuestas a nuestras preguntas casi instantaneamente. La inteligencia artificial y el aprendizaje automatico estan llevando estas capacidades a nuevos niveles, permitiendo que las maquinas reconozcan patrones complejos y tomen decisiones basadas en datos.",
    "La colaboracion internacional es fundamental para el avance del conocimiento. Cientificos e ingenieros de diferentes paises trabajan juntos en proyectos que trascienden las fronteras, compartiendo datos y recursos para abordar desafios globales. El telescopio espacial y los aceleradores de particulas son ejemplos de como la cooperacion puede lograr resultados que ningun pais podria alcanzar por si solo.",
    "En el futuro, la tecnologia continuara evolucionando a un ritmo acelerado. La computacion cuantica, la biotecnologia y la exploracion espacial prometen abrir nuevas fronteras. La capacidad de adaptarnos y aprender continuamente sera cada vez mas importante en un mundo donde el cambio es la unica constante. La educacion y la curiosidad intelectual son las herramientas que nos permitiran navegar este futuro emocionante y lleno de posibilidades.",
    "La programacion es una habilidad cada vez mas valorada en el mercado laboral actual. Aprender a codificar no solo permite crear aplicaciones y sitios web, sino que tambien desarrolla el pensamiento logico y la capacidad de resolver problemas complejos. La comunidad de desarrolladores comparte conocimiento a traves de foros, tutoriales y proyectos de codigo abierto, facilitando el aprendizaje continuo y la innovacion colectiva."
  ].join(' ');

  /* ============================================================
     STATE
     ============================================================ */
  const state = {
    text: TEST_TEXT,
    charIndex: 0,
    lockedUpTo: -1,
    charStates: [],
    startTime: null,
    timeRemaining: 60,
    timerInterval: null,
    isActive: false,
    isFinished: false,
    totalKeystrokes: 0,
    correctChars: 0,
    totalErrors: 0,
    keystrokeTimestamps: [],
    tabSwitches: 0,
    securityViolation: false,
    userData: null,
    timerStarted: false,
  };

  /* ============================================================
     DOM REFS
     ============================================================ */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const dom = {};

  function cacheDOM() {
    dom.formScreen = $('#formScreen');
    dom.testScreen = $('#testScreen');
    dom.resultModal = $('#resultModal');
    dom.adminPanel = $('#adminPanel');
    dom.registrationForm = $('#registrationForm');
    dom.cedula = $('#cedula');
    dom.nombre = $('#nombre');
    dom.apellido = $('#apellido');
    dom.telefono = $('#telefono');
    dom.textDisplay = $('#textDisplay');
    dom.timer = $('#timer');
    dom.userInfo = $('#userInfo');
    dom.statusBadge = $('#statusBadge');
    dom.hiddenInput = $('#hiddenInput');
    dom.resultWpm = $('#resultWpm');
    dom.resultAccuracy = $('#resultAccuracy');
    dom.resultErrors = $('#resultErrors');
    dom.resultDetail = $('#resultDetail');
    dom.newTestBtn = $('#newTestBtn');
    dom.adminBtn = $('#adminBtn');
    dom.closeAdmin = $('#closeAdmin');
    dom.exportCSV = $('#exportCSV');
    dom.clearDB = $('#clearDB');
    dom.adminTableBody = $('#adminTableBody');
    dom.adminEmpty = $('#adminEmpty');
    dom.adminCount = $('#adminCount');
    dom.toast = $('#toast');
  }

  /* ============================================================
     TOAST
     ============================================================ */
  let toastTimeout = null;

  function showToast(message, type) {
    type = type || 'error';
    if (toastTimeout) clearTimeout(toastTimeout);
    dom.toast.textContent = message;
    dom.toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl text-sm font-medium text-white pointer-events-none show';
    dom.toast.classList.add(type);
    toastTimeout = setTimeout(function () {
      dom.toast.classList.remove('show');
      dom.toast.classList.add('hide');
      setTimeout(function () { dom.toast.classList.add('hidden'); }, 300);
    }, 4000);
  }

  /* ============================================================
     LOCALSTORAGE
     ============================================================ */
  const STORAGE_KEY = 'typingTestResults';

  function getResults() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) { return []; }
  }

  function saveResults(results) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  }

  function cedulaExists(cedula) {
    return getResults().some(function (r) { return r.cedula === cedula.trim(); });
  }

  function addResult(data) {
    var results = getResults();
    results.push(data);
    saveResults(results);
  }

  function deleteResultByCedula(cedula) {
    var results = getResults().filter(function (r) { return r.cedula !== cedula; });
    saveResults(results);
  }

  function clearAllResults() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ============================================================
     FORM HANDLING
     ============================================================ */
  function handleFormSubmit(e) {
    e.preventDefault();
    var cedula = dom.cedula.value.trim();
    var nombre = dom.nombre.value.trim();
    var apellido = dom.apellido.value.trim();
    var telefono = dom.telefono.value.trim();

    if (!cedula || !nombre || !apellido || !telefono) {
      showToast('Todos los campos son obligatorios.', 'warning');
      return;
    }

    if (cedulaExists(cedula)) {
      showToast('Esta cedula ya completo su intento.', 'error');
      return;
    }

    state.userData = { cedula: cedula, nombre: nombre, apellido: apellido, telefono: telefono };
    startTest();
  }

  /* ============================================================
     INITIALIZE TEST
     ============================================================ */
  function initCharStates() {
    state.charStates = new Array(state.text.length).fill('untyped');
  }

  function startTest() {
    state.charIndex = 0;
    state.lockedUpTo = -1;
    state.startTime = null;
    state.timeRemaining = 60;
    state.isActive = true;
    state.isFinished = false;
    state.totalKeystrokes = 0;
    state.correctChars = 0;
    state.totalErrors = 0;
    state.keystrokeTimestamps = [];
    state.tabSwitches = 0;
    state.securityViolation = false;
    state.timerStarted = false;

    initCharStates();

    dom.userInfo.textContent = state.userData.nombre + ' ' + state.userData.apellido;
    dom.statusBadge.textContent = 'Listo';
    dom.statusBadge.className = 'text-sm text-gray-400';
    dom.timer.textContent = '01:00';
    dom.timer.className = 'text-3xl font-bold tabular-nums tracking-wider text-gray-800';

    renderText();

    dom.formScreen.classList.add('hidden');
    dom.testScreen.classList.remove('hidden');
    dom.resultModal.classList.add('hidden');

    dom.hiddenInput.focus();
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function escapeHtml(ch) {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    if (ch === "'") return '&#039;';
    return ch;
  }

  function renderText() {
    var html = '';
    var text = state.text;
    var len = text.length;
    var wordEnd = getCurrentWordEnd();

    for (var i = 0; i < len; i++) {
      var ch = text[i];
      var cls = '';

      if (state.charStates[i] === 'correct') cls = 'correct';
      else if (state.charStates[i] === 'incorrect') cls = 'incorrect';

      if (i === state.charIndex) cls += ' current';

      if (i > state.lockedUpTo && i <= wordEnd) cls += ' word-highlight';

      var displayCh = ch === ' ' ? '\u00A0' : escapeHtml(ch);

      html += '<span class="' + cls.trim() + '">' + displayCh + '</span>';
    }

    dom.textDisplay.innerHTML = html;

    var currentEl = dom.textDisplay.querySelector('.current');
    if (currentEl) {
      currentEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function getCurrentWordEnd() {
    var text = state.text;
    for (var i = state.charIndex; i < text.length; i++) {
      if (text[i] === ' ') return i;
    }
    return text.length - 1;
  }

  /* ============================================================
     TIMER
     ============================================================ */
  function startTimer() {
    state.timerStarted = true;
    state.startTime = Date.now();
    dom.statusBadge.textContent = 'Escribiendo...';
    dom.statusBadge.className = 'text-sm text-gray-500';

    state.timerInterval = setInterval(function () {
      var elapsed = (Date.now() - state.startTime) / 1000;
      state.timeRemaining = Math.max(0, 60 - elapsed);

      var mins = Math.floor(state.timeRemaining / 60);
      var secs = Math.floor(state.timeRemaining % 60);
      dom.timer.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

      if (state.timeRemaining <= 10) {
        dom.timer.classList.add('urgent');
      }

      if (state.timeRemaining <= 0) {
        endTest();
      }
    }, 100);
  }

  /* ============================================================
     ANTI-CHEAT
     ============================================================ */
  function checkKeyTiming() {
    var now = Date.now();
    state.keystrokeTimestamps.push(now);

    state.keystrokeTimestamps = state.keystrokeTimestamps.filter(function (ts) {
      return now - ts < 1000;
    });

    var recent = state.keystrokeTimestamps.filter(function (ts) {
      return now - ts < 20;
    });

    if (recent.length > 2) {
      state.securityViolation = true;
      dom.statusBadge.textContent = 'Violacion detectada';
      dom.statusBadge.className = 'text-sm text-gray-500 cheat';
    }
  }

  function handleVisibilityChange() {
    if (state.isActive && !state.isFinished && document.hidden) {
      state.tabSwitches++;
      showToast('Pestana cambiada - registrado en resultados', 'warning');
    }
  }

  /* ============================================================
     KEYDOWN HANDLER
     ============================================================ */
  function handleKeydown(e) {
    if (!state.isActive || state.isFinished) return;

    checkKeyTiming();

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (state.charIndex > state.lockedUpTo + 1) {
        state.charIndex--;
        state.charStates[state.charIndex] = 'untyped';
        renderText();
      }
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();

      if (!state.timerStarted) {
        startTimer();
      }

      if (state.charIndex >= state.text.length) return;

      var expected = state.text[state.charIndex];
      state.totalKeystrokes++;

      if (e.key === expected) {
        state.charStates[state.charIndex] = 'correct';
        state.correctChars++;
      } else {
        state.charStates[state.charIndex] = 'incorrect';
        state.totalErrors++;
      }

      if (e.key === ' ') {
        state.lockedUpTo = state.charIndex;
      }

      state.charIndex++;
      renderText();

      if (state.charIndex >= state.text.length) {
        endTest();
      }
    }
  }

  /* ============================================================
     DISABLE COPY/PASTE/DRAG
     ============================================================ */
  function disableCheatEvents() {
    document.addEventListener('paste', function (e) { e.preventDefault(); return false; });
    document.addEventListener('copy', function (e) { if (state.isActive) e.preventDefault(); return false; });
    document.addEventListener('cut', function (e) { if (state.isActive) e.preventDefault(); return false; });
    document.addEventListener('dragstart', function (e) { if (state.isActive) e.preventDefault(); return false; });
    document.addEventListener('drop', function (e) { if (state.isActive) e.preventDefault(); return false; });
    document.addEventListener('contextmenu', function (e) { if (state.isActive) e.preventDefault(); return false; });
  }

  /* ============================================================
     END TEST & RESULTS
     ============================================================ */
  function endTest() {
    if (state.isFinished) return;
    state.isFinished = true;
    state.isActive = false;

    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    var correct = state.correctChars;
    var total = state.totalKeystrokes;
    var errors = state.totalErrors;

    var elapsedMinutes = state.startTime
      ? (Date.now() - state.startTime) / 60000
      : 1;

    if (elapsedMinutes < 0.01) elapsedMinutes = 1;

    var wpm = elapsedMinutes > 0 ? Math.round((correct / 5) / elapsedMinutes) : 0;
    var accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    var alertMsgs = [];
    if (state.securityViolation) alertMsgs.push('Violacion de seguridad (timing)');
    if (state.tabSwitches > 0) alertMsgs.push('Pestana cambiada (' + state.tabSwitches + ' vez/veces)');

    var validityText = alertMsgs.length === 0 ? 'Pasa' : 'Sospechoso - ' + alertMsgs.join('; ');

    var resultData = {
      cedula: state.userData.cedula,
      nombre: state.userData.nombre,
      apellido: state.userData.apellido,
      telefono: state.userData.telefono,
      wpm: wpm,
      precision: accuracy,
      errores: errors,
      fecha: new Date().toISOString(),
      alertaAntiIA: validityText,
    };

    addResult(resultData);

    showResults(resultData, elapsedMinutes);
  }

  function showResults(data, elapsedMinutes) {
    dom.resultWpm.textContent = data.wpm;
    dom.resultAccuracy.textContent = data.precision + '%';
    dom.resultErrors.textContent = data.errores;

    dom.resultDetail.textContent = 'Tiempo: ' + Math.round(elapsedMinutes * 60) + 's | Teclas: ' + state.totalKeystrokes + ' | Caracteres correctos: ' + state.correctChars;

    dom.resultModal.classList.remove('hidden');

    dom.statusBadge.textContent = 'Completado';
    dom.statusBadge.className = 'text-sm text-blue-600';
  }

  /* ============================================================
     NEW TEST
     ============================================================ */
  function resetToForm() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.isActive = false;
    state.isFinished = false;
    state.timerStarted = false;

    dom.resultModal.classList.add('hidden');
    dom.testScreen.classList.add('hidden');
    dom.formScreen.classList.remove('hidden');

    dom.cedula.value = '';
    dom.nombre.value = '';
    dom.apellido.value = '';
    dom.telefono.value = '';

    dom.timer.className = 'text-3xl font-bold tabular-nums tracking-wider text-gray-800';
    dom.timer.textContent = '01:00';
  }

  /* ============================================================
     ADMIN PANEL
     ============================================================ */
  function openAdmin() {
    var pwd = prompt('Ingrese la clave de administrador:');
    if (pwd === null) return;
    if (pwd !== 'Athena2026*') {
      showToast('Clave incorrecta', 'error');
      return;
    }
    showAdminPanel();
  }

  function showAdminPanel() {
    var results = getResults();

    dom.adminPanel.classList.remove('hidden');

    if (results.length === 0) {
      dom.adminEmpty.classList.remove('hidden');
      dom.adminTableBody.innerHTML = '';
      dom.adminCount.textContent = '0 registros';
      return;
    }

    dom.adminEmpty.classList.add('hidden');
    dom.adminCount.textContent = results.length + ' registro' + (results.length !== 1 ? 's' : '');

    var tbody = dom.adminTableBody;
    var html = '';

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var fecha = new Date(r.fecha);
      var fechaStr = fecha.toLocaleDateString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });

      var validityClass = r.alertaAntiIA === 'Pasa' ? 'text-emerald-600' : 'text-amber-600';

      html += '<tr>' +
        '<td class="font-mono text-xs">' + escapeHtml(r.cedula) + '</td>' +
        '<td>' + escapeHtml(r.nombre) + '</td>' +
        '<td>' + escapeHtml(r.apellido) + '</td>' +
        '<td class="font-mono text-xs">' + escapeHtml(r.telefono) + '</td>' +
        '<td class="text-right font-mono">' + r.wpm + '</td>' +
        '<td class="text-right font-mono">' + r.precision + '%</td>' +
        '<td class="text-right font-mono">' + r.errores + '</td>' +
        '<td class="text-xs whitespace-nowrap">' + fechaStr + '</td>' +
        '<td class="text-xs ' + validityClass + '">' + escapeHtml(r.alertaAntiIA) + '</td>' +
        '<td class="text-center"><button class="btn-delete" data-cedula="' + escapeHtml(r.cedula) + '">Eliminar</button></td>' +
        '</tr>';
    }

    tbody.innerHTML = html;

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ced = btn.getAttribute('data-cedula');
        if (confirm('Eliminar registro de cedula ' + ced + '?')) {
          deleteResultByCedula(ced);
          showAdminPanel();
          showToast('Registro eliminado.', 'success');
        }
      });
    });
  }

  function closeAdminPanel() {
    dom.adminPanel.classList.add('hidden');
  }

  /* ============================================================
     EXPORT CSV
     ============================================================ */
  function exportCSV() {
    var results = getResults();
    if (results.length === 0) {
      showToast('No hay datos para exportar.', 'warning');
      return;
    }

    var headers = ['Cedula', 'Nombre', 'Apellido', 'Telefono', 'WPM', 'Precision', 'Errores', 'Fecha', 'Alerta Anti-IA'];
    var csvRows = [headers.join(',')];

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var row = [
        csvEscape(r.cedula),
        csvEscape(r.nombre),
        csvEscape(r.apellido),
        csvEscape(r.telefono),
        r.wpm,
        r.precision,
        r.errores,
        csvEscape(new Date(r.fecha).toISOString()),
        csvEscape(r.alertaAntiIA),
      ];
      csvRows.push(row.join(','));
    }

    var csvContent = csvRows.join('\r\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'typing_test_resultados_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('CSV exportado exitosamente.', 'success');
  }

  function csvEscape(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /* ============================================================
     CLEAR DATABASE
     ============================================================ */
  function clearDatabase() {
    var results = getResults();
    if (results.length === 0) {
      showToast('La base de datos ya esta vacia.', 'info');
      return;
    }
    if (confirm('Esta accion eliminara TODOS los registros. Desea continuar?')) {
      clearAllResults();
      showAdminPanel();
      showToast('Base de datos limpiada.', 'success');
    }
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    cacheDOM();

    dom.registrationForm.addEventListener('submit', handleFormSubmit);

    document.addEventListener('keydown', handleKeydown);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    disableCheatEvents();

    dom.newTestBtn.addEventListener('click', resetToForm);

    dom.adminBtn.addEventListener('click', openAdmin);
    dom.closeAdmin.addEventListener('click', closeAdminPanel);
    dom.exportCSV.addEventListener('click', exportCSV);
    dom.clearDB.addEventListener('click', clearDatabase);

    dom.textDisplay.addEventListener('click', function () {
      if (state.isActive && !state.isFinished) {
        dom.hiddenInput.focus();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      if (state.isActive && !state.isFinished) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
