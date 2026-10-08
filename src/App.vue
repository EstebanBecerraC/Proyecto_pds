<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import LandingPage from './components/LandingPage.vue'
import HomePage from './components/HomePage.vue'
import MyCampaignsPage from './components/MyCampaignsPage.vue'
import MemberLayout from './components/MemberLayout.vue'
import CampaignForm from './components/CampaignForm.vue'
import CampaignSummary from './components/CampaignSummary.vue'

const allowedPages = ['landing', 'login', 'register', 'home', 'my-campaigns']
const readPage = () => {
  const value = window.location.hash.replace(/^#\/?/, '') || 'landing'
  return allowedPages.includes(value) || /^campaigns\/(new|[1-9]\d*)$/.test(value) ? value : 'landing'
}
const page = ref(readPage())
const user = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const form = reactive({ name: '', email: '', password: '', confirmation: '' })
const registering = computed(() => page.value === 'register')

function navigate(destination, { replace = false, preserveNotice = false } = {}) {
  page.value = destination
  const hash = destination === 'landing' ? '#/' : '#/' + destination
  window.history[replace ? 'replaceState' : 'pushState'](null, '', hash)
  form.password = ''
  form.confirmation = ''
  error.value = ''
  if (!preserveNotice) notice.value = ''
  document.title = ({ landing: 'CrowdStarter | Ideas que crecen juntas', login: 'Iniciar sesión | CrowdStarter', register: 'Crear cuenta | CrowdStarter', home: 'Inicio | CrowdStarter' })[destination] || 'Campañas | CrowdStarter'
  window.scrollTo(0, 0)
}

function guardPage() {
  let destination = readPage()
  if ((destination === 'home' || destination === 'my-campaigns' || destination.startsWith('campaigns/')) && !user.value) destination = 'login'
  if (user.value && ['login', 'register'].includes(destination)) destination = 'home'
  navigate(destination, { replace: true })
}

function onHashChange() {
  if (!loading.value) guardPage()
}

async function api(path, data) {
  const response = await fetch('/api/auth/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  let result
  try { result = await response.json() }
  catch { throw new Error('No se pudo conectar con el servidor. Intenta nuevamente.') }
  if (!response.ok) {
    const failure = new Error(result.error || 'No se pudo completar la solicitud.')
    failure.status = response.status
    throw failure
  }
  return result
}

async function submit() {
  error.value = ''
  notice.value = ''
  if (registering.value && form.password !== form.confirmation) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  busy.value = true
  try {
    if (registering.value) {
      const result = await api('register', { name: form.name, email: form.email, password: form.password })
      navigate('login', { replace: true })
      notice.value = result.message
    } else {
      const result = await api('login', { email: form.email, password: form.password })
      user.value = result.user
      navigate('home', { replace: true })
    }
  } catch (failure) {
    error.value = failure.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor.' : failure.message
  } finally { busy.value = false }
}

function sessionExpired() {
  user.value = null
  navigate('login', { replace: true })
  notice.value = 'Tu sesión terminó. Inicia sesión nuevamente.'
}

async function logout() {
  busy.value = true
  error.value = ''
  try {
    await api('logout', {})
    user.value = null
    navigate('landing', { replace: true })
  } catch (failure) { error.value = failure.message }
  finally { busy.value = false }
}

async function restoreSession() {
  let connectionError = ''
  try { user.value = (await api('me')).user }
  catch (failure) { if (failure.status !== 401) connectionError = 'No se pudo comprobar la sesión. Intenta iniciar sesión nuevamente.' }
  finally {
    loading.value = false
    guardPage()
    if (['login', 'register'].includes(page.value)) error.value = connectionError
  }
}
onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  restoreSession()
})
onUnmounted(() => window.removeEventListener('hashchange', onHashChange))
</script>

<template>
  <div v-if="loading" class="session-loading" role="status"><span class="wordmark">CrowdStarter.</span><p>Comprobando tu sesión…</p></div>
  <LandingPage v-else-if="page === 'landing'" :signed-in="!!user" />
  <HomePage v-else-if="page === 'home' && user" :user="user" :busy="busy" :error="error" @logout="logout" @session-expired="sessionExpired" />
  <MyCampaignsPage v-else-if="page === 'my-campaigns' && user" :user="user" :busy="busy" :error="error" @logout="logout" @session-expired="sessionExpired" />
  <MemberLayout v-else-if="user && page.startsWith('campaigns/')" :busy="busy" :error="error" @logout="logout">
    <CampaignForm v-if="page === 'campaigns/new'" @saved="campaign => navigate('campaigns/' + campaign.id, { replace: true })" @session-expired="sessionExpired" />
    <CampaignSummary v-else :campaign-id="page.split('/')[1]" :user-id="user.id" @session-expired="sessionExpired" />
  </MemberLayout>
  <main v-else class="auth-layout">
    <section class="intro">
      <a class="brand auth-brand" href="#/">CrowdStarter</a>
      <div>
        <p class="eyebrow">FINANCIAMIENTO COLECTIVO</p>
        <h1>Grandes ideas.<br />Impulso colectivo.</h1>
        <p class="intro-copy">Conectamos ideas con personas que creen en ellas. Súmate a una comunidad que impulsa proyectos a través del crowdfunding.</p>
      </div>
      <p class="intro-footer">Juntos, hacemos que las ideas crezcan.</p>
    </section>
    <section class="content" aria-label="Acceso de usuarios">
      <div class="card">
        <a class="back-link" href="#/">← Volver al inicio</a>
        <span class="badge">{{ registering ? 'EMPIEZA AQUÍ' : 'ACCEDE A TU CUENTA' }}</span>
        <h2>{{ registering ? 'Crear una cuenta' : 'Iniciar sesión' }}</h2>
        <p class="description">{{ registering ? 'Completa tus datos para registrarte.' : 'Ingresa tu correo y contraseña.' }}</p>
        <p v-if="error" class="message error" role="alert">{{ error }}</p>
        <p v-if="notice" class="message success" role="status">{{ notice }}</p>
        <form @submit.prevent="submit">
          <fieldset :disabled="busy">
            <label v-if="registering" for="name">Nombre
              <input id="name" v-model="form.name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Tu nombre" />
            </label>
            <label for="email">Correo electrónico
              <input id="email" v-model="form.email" type="email" autocomplete="email" required maxlength="254" placeholder="nombre@correo.cl" />
            </label>
            <label for="password">Contraseña
              <input id="password" v-model="form.password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" required minlength="8" maxlength="128" :aria-describedby="registering ? 'password-help' : undefined" placeholder="Ingresa tu contraseña" />
            </label>
            <small v-if="registering" id="password-help">Entre 8 y 128 caracteres.</small>
            <label v-if="registering" for="confirmation">Confirmar contraseña
              <input id="confirmation" v-model="form.confirmation" type="password" autocomplete="new-password" required minlength="8" maxlength="128" placeholder="Repite tu contraseña" />
            </label>
            <button class="primary" type="submit">{{ busy ? 'Procesando…' : registering ? 'Crear cuenta' : 'Iniciar sesión' }}</button>
          </fieldset>
        </form>
        <p class="switch">{{ registering ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?' }}
          <button type="button" :disabled="busy" @click="navigate(registering ? 'login' : 'register')">{{ registering ? 'Inicia sesión' : 'Regístrate' }}</button>
        </p>
      </div>
    </section>
  </main>
</template>
