const state = {
  movies: [],
  selectedSessionId: null,
  seats: [],
  selectedSeats: new Map(),
  token: localStorage.getItem('cinemark_token') || null,
  user: JSON.parse(localStorage.getItem('cinemark_user') || 'null')
};

const money = value => `$${Number(value).toFixed(0)}`;

const api = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error de servidor');
  return data;
};

function formatDate(date) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('cinemark_user', JSON.stringify(user));
  localStorage.setItem('cinemark_token', token);
  updateSessionUI();
  loadHistory().catch(console.error);
}

function clearSession() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('cinemark_user');
  localStorage.removeItem('cinemark_token');
  updateSessionUI();
  renderHistory(null);
}

function updateSessionUI() {
  const loginOpen = document.querySelector('#loginOpen');
  const logoutBtn = document.querySelector('#logoutBtn');
  const sessionUser = document.querySelector('#sessionUser');
  const buyerHint = document.querySelector('#buyerHint');
  const bookingForm = document.querySelector('#bookingForm');

  if (state.user) {
    loginOpen.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    sessionUser.textContent = state.user.nombre;
    buyerHint.textContent = 'La reserva quedará guardada en tu historial.';
    bookingForm.nombre_cliente.value = state.user.nombre;
    bookingForm.email_cliente.value = state.user.email;
    bookingForm.nombre_cliente.readOnly = true;
    bookingForm.email_cliente.readOnly = true;
  } else {
    loginOpen.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    sessionUser.textContent = '';
    buyerHint.textContent = 'Puedes reservar como invitado o iniciar sesión para guardar tu historial.';
    bookingForm.nombre_cliente.readOnly = false;
    bookingForm.email_cliente.readOnly = false;
  }
}

async function restoreSession() {
  if (!state.token) {
    updateSessionUI();
    renderHistory(null);
    return;
  }

  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    localStorage.setItem('cinemark_user', JSON.stringify(data.user));
    updateSessionUI();
    await loadHistory();
  } catch {
    clearSession();
  }
}

async function loadMovies() {
  state.movies = await api('/api/movies');
  const grid = document.querySelector('#moviesGrid');
  const select = document.querySelector('#sessionSelect');

  grid.innerHTML = state.movies.map(movie => `
    <article class="card movie-card">
      <div class="poster-placeholder">
        <span>${escapeHtml(movie.genero || 'Cine')}</span>
        <strong>${escapeHtml(movie.titulo)}</strong>
      </div>
      <span class="meta">${formatDate(movie.fecha_hora)} · ${escapeHtml(movie.sala)} · ${escapeHtml(movie.formato)}</span>
      <h3>${escapeHtml(movie.titulo)}</h3>
      <p>${escapeHtml(movie.sinopsis)}</p>
      <p class="meta">${escapeHtml(movie.clasificacion)} · ${movie.duracion_minutos} min · Dir. ${escapeHtml(movie.director || 'Sin registrar')}</p>
      <a class="btn btn-red" href="#tickets" data-buy="${movie.funcion_id}">Reservar</a>
    </article>
  `).join('');

  select.innerHTML = state.movies.map(movie => `
    <option value="${movie.funcion_id}">${escapeHtml(movie.titulo)} — ${formatDate(movie.fecha_hora)} — ${escapeHtml(movie.sala)}</option>
  `).join('');

  if (state.movies[0]) {
    state.selectedSessionId = state.movies[0].funcion_id;
    await loadSeats(state.selectedSessionId);
  } else {
    grid.innerHTML = '<p class="muted">No hay funciones cargadas.</p>';
    select.innerHTML = '<option>No hay funciones disponibles</option>';
  }

  document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', async event => {
    state.selectedSessionId = Number(event.target.dataset.buy);
    select.value = state.selectedSessionId;
    await loadSeats(state.selectedSessionId);
  }));
}

async function loadSeats(sessionId) {
  state.selectedSeats.clear();
  state.seats = await api(`/api/movies/sessions/${sessionId}/seats`);
  renderSeats();
  renderSelectedSeats();
}

function renderSeats() {
  const map = document.querySelector('#seatMap');
  map.innerHTML = state.seats.map(seat => {
    const statusClass = seat.estado === 'vendido' ? 'sold' : 'available';
    return `<button type="button" class="seat ${statusClass}" data-seat="${seat.id}" ${seat.estado === 'vendido' ? 'disabled' : ''}>${escapeHtml(seat.codigo)}</button>`;
  }).join('');

  map.querySelectorAll('.seat.available').forEach(button => button.addEventListener('click', () => toggleSeat(Number(button.dataset.seat))));
}

function toggleSeat(seatId) {
  const seat = state.seats.find(item => item.id === seatId);
  if (!seat || seat.estado !== 'disponible') return;

  if (state.selectedSeats.has(seatId)) state.selectedSeats.delete(seatId);
  else state.selectedSeats.set(seatId, seat);

  document.querySelector(`[data-seat="${seatId}"]`).classList.toggle('selected', state.selectedSeats.has(seatId));
  renderSelectedSeats();
}

function renderSelectedSeats() {
  const selected = [...state.selectedSeats.values()];
  const total = selected.reduce((sum, seat) => sum + Number(seat.precio), 0);
  document.querySelector('#selectedList').innerHTML = selected.length
    ? `${selected.map(seat => `<div>${escapeHtml(seat.codigo)} · ${escapeHtml(seat.tipo)} · ${money(seat.precio)}</div>`).join('')}<hr><strong>Total asientos: ${money(total)}</strong>`
    : 'Sin asientos seleccionados';
}

async function createBooking(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const message = document.querySelector('#bookingMessage');
  const asiento_ids = [...state.selectedSeats.keys()];

  if (!asiento_ids.length) {
    message.textContent = 'Selecciona al menos un asiento.';
    return;
  }

  const combo = form.get('combo');
  const confiteria = combo ? [{ item: combo, cantidad: Number(form.get('combo_cantidad') || 1) }] : [];

  try {
    const data = await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        funcion_id: state.selectedSessionId,
        nombre_cliente: form.get('nombre_cliente'),
        email_cliente: form.get('email_cliente'),
        asiento_ids,
        confiteria
      })
    });

    message.textContent = `Reserva confirmada. Total: ${money(data.total)}`;
    if (!state.user) event.target.reset();
    await loadSeats(state.selectedSessionId);
    if (state.user) await loadHistory();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.target);

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    setSession(data.user, data.token);
    document.querySelector('#loginMessage').textContent = `Bienvenido, ${data.user.nombre}`;
    setTimeout(() => document.querySelector('#loginDialog').close(), 700);
  } catch (error) {
    document.querySelector('#loginMessage').textContent = error.message;
  }
}

async function register(event) {
  event.preventDefault();
  const form = new FormData(event.target);

  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nombre: form.get('nombre'),
        email: form.get('email'),
        password: form.get('password')
      })
    });
    setSession(data.user, data.token);
    document.querySelector('#loginMessage').textContent = `Usuario creado. Bienvenido, ${data.user.nombre}`;
    setTimeout(() => document.querySelector('#loginDialog').close(), 900);
  } catch (error) {
    document.querySelector('#loginMessage').textContent = error.message;
  }
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.querySelector('#loginForm').classList.toggle('hidden', !isLogin);
  document.querySelector('#registerForm').classList.toggle('hidden', isLogin);
  document.querySelector('#showLoginTab').classList.toggle('active', isLogin);
  document.querySelector('#showRegisterTab').classList.toggle('active', !isLogin);
  document.querySelector('#loginMessage').textContent = '';
}

async function loadHistory() {
  if (!state.user || !state.token) {
    renderHistory(null);
    return;
  }

  try {
    const history = await api('/api/bookings/me');
    renderHistory(history);
  } catch (error) {
    document.querySelector('#historyContent').innerHTML = `<span class="message">${escapeHtml(error.message)}</span>`;
  }
}

function renderHistory(history) {
  const container = document.querySelector('#historyContent');
  if (!history) {
    container.className = 'muted';
    container.innerHTML = 'Inicia sesión para ver tus reservas.';
    return;
  }

  if (!history.length) {
    container.className = 'muted';
    container.innerHTML = 'Aún no tienes reservas registradas.';
    return;
  }

  container.className = 'history-list';
  container.innerHTML = history.map(booking => `
    <article class="history-card">
      <div>
        <span class="meta">Reserva ${escapeHtml(booking.estado)} · ${formatDate(booking.creado_en)}</span>
        <h3>${escapeHtml(booking.pelicula_titulo)}</h3>
        <p>${formatDate(booking.fecha_hora)} · ${escapeHtml(booking.sala)} · ${escapeHtml(booking.formato)}</p>
        <div class="ticket-chips">
          ${(booking.asientos || []).filter(Boolean).map(seat => `<span>${escapeHtml(seat.codigo)} · ${escapeHtml(seat.tipo)} · ${money(seat.precio)}</span>`).join('')}
        </div>
      </div>
      <strong>${money(booking.total)}</strong>
    </article>
  `).join('');
}

async function adminLogin(event) {
  event.preventDefault();
  const form = new FormData(event.target);

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    setSession(data.user, data.token);
    await loadAdmin();
  } catch (error) {
    document.querySelector('#adminSummary').innerHTML = `<span class="message">${escapeHtml(error.message)}</span>`;
  }
}

async function loadAdmin() {
  const [summary, bookings] = await Promise.all([
    api('/api/admin/summary'),
    api('/api/admin/bookings')
  ]);

  document.querySelector('#adminSummary').innerHTML = `
    <div class="stat"><strong>${summary.movies}</strong>Películas</div>
    <div class="stat"><strong>${summary.bookings}</strong>Reservas</div>
    <div class="stat"><strong>${summary.soldSeats}</strong>Asientos vendidos</div>
    <div class="stat"><strong>${money(summary.revenue)}</strong>Ingresos</div>
  `;

  const table = document.querySelector('#bookingsTable');
  table.classList.remove('hidden');
  table.innerHTML = `
    <h3>Últimas reservas</h3>
    <table>
      <thead><tr><th>Cliente</th><th>Película</th><th>Función</th><th>Total</th><th>Estado</th></tr></thead>
      <tbody>${bookings.map(b => `<tr><td>${escapeHtml(b.nombre_cliente)}<br><small>${escapeHtml(b.email_cliente)}</small></td><td>${escapeHtml(b.pelicula_titulo)}</td><td>${formatDate(b.fecha_hora)}<br><small>${escapeHtml(b.sala)}</small></td><td>${money(b.total)}</td><td>${escapeHtml(b.estado)}</td></tr>`).join('')}</tbody>
    </table>
  `;
}

document.querySelector('#sessionSelect').addEventListener('change', event => {
  state.selectedSessionId = Number(event.target.value);
  loadSeats(state.selectedSessionId).catch(console.error);
});
document.querySelector('#bookingForm').addEventListener('submit', createBooking);
document.querySelector('#loginForm').addEventListener('submit', login);
document.querySelector('#registerForm').addEventListener('submit', register);
document.querySelector('#adminLogin').addEventListener('submit', adminLogin);
document.querySelector('#loginOpen').addEventListener('click', () => document.querySelector('#loginDialog').showModal());
document.querySelector('#loginClose').addEventListener('click', () => document.querySelector('#loginDialog').close());
document.querySelector('#logoutBtn').addEventListener('click', clearSession);
document.querySelector('#showLoginTab').addEventListener('click', () => switchAuthTab('login'));
document.querySelector('#showRegisterTab').addEventListener('click', () => switchAuthTab('register'));

restoreSession().catch(console.error);
loadMovies().catch(console.error);
