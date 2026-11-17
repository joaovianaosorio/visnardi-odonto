/**
 * J.D. Visnardi – Odontologia e Estética
 * Interatividade do Header, Módulo de Agendamento (Seg-Sex | 09h00-18h30)
 * e Preview em Toast de Notificação WhatsApp.
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. HEADER FIXO & MENU MOBILE
  // =========================================================================
  const header = document.getElementById('header');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.getElementById('mainNav');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 24);
  });

  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Atualiza ano do rodapé
  document.getElementById('currentYear').textContent = new Date().getFullYear();

  // =========================================================================
  // 2. ATALHO DOS CARDS DE ESPECIALIDADES -> AGENDAMENTO
  // =========================================================================
  const procedureRadios = document.querySelectorAll('input[name="procedure"]');
  const summaryProcedure = document.getElementById('summaryProcedure');

  document.querySelectorAll('[data-select-procedure]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetProcedure = btn.getAttribute('data-select-procedure');
      procedureRadios.forEach((radio) => {
        if (radio.value === targetProcedure) {
          radio.checked = true;
          summaryProcedure.textContent = targetProcedure;
        }
      });
      document.getElementById('agendamento').scrollIntoView({ behavior: 'smooth' });
    });
  });

  procedureRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      summaryProcedure.textContent = e.target.value;
    });
  });

  // =========================================================================
  // 3. MÓDULO INTERATIVO DE AGENDAMENTO (SEG A SEX | 09H00 ÀS 18H30)
  // =========================================================================
  const weekdayPillsContainer = document.getElementById('weekdayPills');
  const bookingDateInput = document.getElementById('bookingDate');
  const dateHelperText = document.getElementById('dateHelperText');
  const timeSlotsGrid = document.getElementById('timeSlotsGrid');
  const summaryDate = document.getElementById('summaryDate');
  const summaryTime = document.getElementById('summaryTime');
  const bookingForm = document.getElementById('bookingForm');
  const patientNameInput = document.getElementById('patientName');
  const patientPhoneInput = document.getElementById('patientPhone');
  const formFeedback = document.getElementById('formFeedback');

  // Horários das 09h00 às 18h30 (intervalos de 30 minutos)
  const ALL_TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];

  // Armazena horários reservados na sessão atual { 'YYYY-MM-DD': Set(['10:00', ...]) }
  const sessionBookedSlots = {};

  let selectedDateISO = '';
  let selectedTime = '';

  const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const WEEKDAY_FULL = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseLocalDate(isoStr) {
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDisplayDate(isoStr) {
    const date = parseLocalDate(isoStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${WEEKDAY_FULL[date.getDay()]}, ${day}/${month}/${date.getFullYear()}`;
  }

  // Avança para o próximo dia útil caso caia em Sábado (6) ou Domingo (0)
  function getNextBusinessDay(date) {
    const d = new Date(date);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // Gera lista dos próximos 5 dias úteis para seleção rápida
  function getUpcomingBusinessDays(count = 5) {
    const list = [];
    const cursor = getNextBusinessDay(new Date());
    while (list.length < count) {
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
        list.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }

  // Simula deterministicamente horários já ocupados na agenda do dia
  function getOccupiedSlotsForDate(isoStr) {
    const seed = isoStr.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const occupied = new Set();

    ALL_TIME_SLOTS.forEach((slot, idx) => {
      if ((seed + idx * 7) % 4 === 0) {
        occupied.add(slot);
      }
    });

    if (sessionBookedSlots[isoStr]) {
      sessionBookedSlots[isoStr].forEach((s) => occupied.add(s));
    }

    return occupied;
  }

  function renderWeekdayPills(upcomingDays) {
    weekdayPillsContainer.innerHTML = '';
    upcomingDays.forEach((dateObj) => {
      const iso = toISODate(dateObj);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `day-pill ${iso === selectedDateISO ? 'active' : ''}`;
      btn.dataset.date = iso;
      btn.innerHTML = `
        <span class="day-name">${WEEKDAY_SHORT[dateObj.getDay()]}</span>
        <span class="day-num">${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}</span>
      `;
      btn.addEventListener('click', () => setBookingDate(iso));
      weekdayPillsContainer.appendChild(btn);
    });
  }

  function renderTimeSlots(isoStr) {
    timeSlotsGrid.innerHTML = '';
    const occupiedSet = getOccupiedSlotsForDate(isoStr);

    ALL_TIME_SLOTS.forEach((slot) => {
      const isOccupied = occupiedSet.has(slot);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = slot;

      if (isOccupied) {
        btn.disabled = true;
        btn.classList.add('occupied');
        btn.title = 'Horário já reservado';
      } else {
        if (selectedTime === slot) {
          btn.classList.add('selected');
        }
        btn.addEventListener('click', () => {
          selectedTime = slot;
          summaryTime.textContent = `${slot}h`;
          formFeedback.textContent = '';
          document.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      }

      timeSlotsGrid.appendChild(btn);
    });
  }

  function setBookingDate(isoStr) {
    let chosen = parseLocalDate(isoStr);
    const dayOfWeek = chosen.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      chosen = getNextBusinessDay(chosen);
      dateHelperText.textContent = 'Atendemos de Seg a Sex. Ajustamos para o próximo dia útil.';
      dateHelperText.classList.add('warning');
    } else {
      dateHelperText.textContent = 'Atendimento de segunda a sexta-feira';
      dateHelperText.classList.remove('warning');
    }

    selectedDateISO = toISODate(chosen);
    bookingDateInput.value = selectedDateISO;
    summaryDate.textContent = formatDisplayDate(selectedDateISO);

    // Reseta horário selecionado ao trocar de dia
    selectedTime = '';
    summaryTime.textContent = 'Selecione um horário';

    // Sincroniza estado ativo nas pílulas rápidas
    document.querySelectorAll('.day-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.date === selectedDateISO);
    });

    renderTimeSlots(selectedDateISO);
  }

  // Inicializa calendário
  const upcomingBusinessDays = getUpcomingBusinessDays(5);
  const initialDateISO = toISODate(upcomingBusinessDays[0]);
  bookingDateInput.min = toISODate(new Date());
  selectedDateISO = initialDateISO;

  renderWeekdayPills(upcomingBusinessDays);
  setBookingDate(initialDateISO);

  bookingDateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      setBookingDate(e.target.value);
    }
  });

  // Máscara de telefone WhatsApp (11) 99999-9999
  patientPhoneInput.addEventListener('input', (e) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 6) {
      digits = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 2) {
      digits = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 0) {
      digits = `(${digits}`;
    }
    e.target.value = digits;
  });

  // =========================================================================
  // 4. ENVIO DO AGENDAMENTO & TOAST DE NOTIFICAÇÃO WHATSAPP
  // =========================================================================
  const whatsappToast = document.getElementById('whatsappToast');
  const toastMessagePreview = document.getElementById('toastMessagePreview');
  const realWhatsappLink = document.getElementById('realWhatsappLink');
  const closeToastBtn = document.getElementById('closeToastBtn');
  const toastProgress = document.getElementById('toastProgress');
  let toastTimeout = null;

  function showWhatsappToast(messageText, waUrl) {
    toastMessagePreview.textContent = messageText;
    realWhatsappLink.href = waUrl;
    whatsappToast.hidden = false;

    // Reinicia barra de progresso de 9 segundos
    toastProgress.style.transition = 'none';
    toastProgress.style.transform = 'scaleX(1)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toastProgress.style.transition = 'transform 9s linear';
        toastProgress.style.transform = 'scaleX(0)';
      });
    });

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      whatsappToast.hidden = true;
    }, 9000);
  }

  closeToastBtn.addEventListener('click', () => {
    clearTimeout(toastTimeout);
    whatsappToast.hidden = true;
  });

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const procedure = document.querySelector('input[name="procedure"]:checked').value;
    const patientName = patientNameInput.value.trim();
    const patientPhone = patientPhoneInput.value.trim();

    if (!selectedTime) {
      formFeedback.textContent = 'Por favor, selecione um horário livre na grade acima.';
      return;
    }

    if (patientName.length < 3) {
      formFeedback.textContent = 'Por favor, informe seu nome completo.';
      patientNameInput.focus();
      return;
    }

    if (patientPhone.replace(/\D/g, '').length < 10) {
      formFeedback.textContent = 'Informe um número de WhatsApp válido com DDD.';
      patientPhoneInput.focus();
      return;
    }

    formFeedback.textContent = '';

    // Bloqueia o horário recém-agendado na agenda simulada
    if (!sessionBookedSlots[selectedDateISO]) {
      sessionBookedSlots[selectedDateISO] = new Set();
    }
    sessionBookedSlots[selectedDateISO].add(selectedTime);

    const formattedDate = formatDisplayDate(selectedDateISO);
    const bookedSlot = selectedTime;

    const whatsappMessage =
      `Olá, equipe J.D. Visnardi! Gostaria de confirmar meu pré-agendamento:\n\n` +
      `• Paciente: ${patientName}\n` +
      `• WhatsApp: ${patientPhone}\n` +
      `• Procedimento: ${procedure}\n` +
      `• Data: ${formattedDate}\n` +
      `• Horário: ${bookedSlot}h`;

    const clinicWhatsappNumber = '5511999999999'; // Substitua pelo WhatsApp oficial da clínica
    const waUrl = `https://wa.me/${clinicWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    // Atualiza grade bloqueando o horário selecionado
    selectedTime = '';
    summaryTime.textContent = 'Horário pré-reservado ✓';
    renderTimeSlots(selectedDateISO);

    // Exibe toast interativo com o preview da notificação WhatsApp
    showWhatsappToast(whatsappMessage, waUrl);
  });
});