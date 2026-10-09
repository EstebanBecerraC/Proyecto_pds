<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { validateAuth } from '../shared/auth.js'
import LandingPage from './components/LandingPage.vue'
import HomePage from './components/HomePage.vue'
import MyCampaignsPage from './components/MyCampaignsPage.vue'
import MemberLayout from './components/MemberLayout.vue'
import CampaignForm from './components/CampaignForm.vue'
import CampaignEdit from './components/CampaignEdit.vue'
import CampaignSummary from './components/CampaignSummary.vue'

const allowedPages = ['landing', 'login', 'register', 'home', 'my-campaigns']
const readPage = () => {
  const value = window.location.hash.replace(/^#\/?/, '') || 'landing'
  return allowedPages.includes(value) || /^campaigns\/(new|[1-9]\d*(\/edit)?)$/.test(value) ? value : 'landing'
}
const page = ref(readPage())
const user = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const form = reactive({ name: '', email: '', password: '', confirmation: '' })
const fieldErrors = ref({})
const authForm = ref(null)
const registering = computed(() => page.value === 'register')

function navigate(destination, { replace = false, preserveNotice = false } = {}) {
  page.value = destination
  const hash = destination === 'landing' ? '#/' : '#/' + destination
  window.history[replace ? 'replaceState' : 'pushState'](null, '', hash)
  form.password = ''
  form.confirmation = ''
  error.value = ''
  fieldErrors.value = {}
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
    failure.fields = result.fields
    throw failure
  }
  return result
}

async function submit() {
  if (busy.value) return
  error.value = ''
  notice.value = ''
  fieldErrors.value = validateAuth(form, { registering: registering.value, confirmPassword: true })
  if (Object.keys(fieldErrors.value).length) {
    await focusInvalidField()
    return
  }
  busy.value = true
  try {
    const result = await api(registering.value ? 'register' : 'login', {
      ...(registering.value ? { name: form.name } : {}), email: form.email, password: form.password,
    })
    user.value = result.user
    navigate('home', { replace: true })
  } catch (failure) {
    if (failure.fields && Object.keys(failure.fields).length) fieldErrors.value = failure.fields
    else error.value = failure.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor.' : failure.message
  } finally { busy.value = false }
  if (Object.keys(fieldErrors.value).length) await focusInvalidField()
}

async function focusInvalidField() {
  await nextTick()
  authForm.value?.querySelector('[aria-invalid="true"]')?.focus()
}

function clearFieldError(field) {
  delete fieldErrors.value[field]
  error.value = ''
}

function sessionExpired() {
  user.value = null
  navigate('login', { replace: true })
  notice.value = 'Tu sesión terminó. Inicia sesión nuevamente.'
}

function campaignSaved(campaign) {
  const edited = page.value.endsWith('/edit')
  navigate('campaigns/' + campaign.id, { replace: true })
  if (edited) notice.value = 'Los cambios de la campaña se guardaron correctamente.'
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
    <CampaignForm v-if="page === 'campaigns/new'" @saved="campaignSaved" @session-expired="sessionExpired" />
    <CampaignEdit v-else-if="page.endsWith('/edit')" :campaign-id="page.split('/')[1]" :user-id="user.id" @saved="campaignSaved" @session-expired="sessionExpired" />
    <CampaignSummary v-else :campaign-id="page.split('/')[1]" :user-id="user.id" :notice="notice" @session-expired="sessionExpired" @removed="navigate('my-campaigns', { replace: true })" />
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
        <form ref="authForm" novalidate @submit.prevent="submit">
          <fieldset :disabled="busy">
            <label v-if="registering" for="name">Nombre
              <input id="name" v-model="form.name" autocomplete="name" required minlength="2" maxlength="80" :aria-invalid="!!fieldErrors.name" :aria-describedby="fieldErrors.name ? 'auth-error-name' : undefined" @input="clearFieldError('name')" placeholder="Tu nombre" />
              <span v-if="fieldErrors.name" id="auth-error-name" class="field-error" role="alert">{{ fieldErrors.name }}</span>
            </label>
            <label for="email">Correo electrónico
              <input id="email" v-model="form.email" type="email" autocomplete="email" required maxlength="254" :aria-invalid="!!fieldErrors.email" :aria-describedby="fieldErrors.email ? 'auth-error-email' : undefined" @input="clearFieldError('email')" placeholder="nombre@correo.cl" />
              <span v-if="fieldErrors.email" id="auth-error-email" class="field-error" role="alert">{{ fieldErrors.email }}</span>
            </label>
            <label for="password">Contraseña
              <input id="password" v-model="form.password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" required :minlength="registering ? 8 : undefined" maxlength="128" :aria-invalid="!!fieldErrors.password" :aria-describedby="[registering ? 'password-help' : '', fieldErrors.password ? 'auth-error-password' : ''].filter(Boolean).join(' ') || undefined" @input="clearFieldError('password')" placeholder="Ingresa tu contraseña" />
              <span v-if="fieldErrors.password" id="auth-error-password" class="field-error" role="alert">{{ fieldErrors.password }}</span>
            </label>
            <small v-if="registering" id="password-help">Entre 8 y 128 caracteres.</small>
            <label v-if="registering" for="confirmation">Confirmar contraseña
              <input id="confirmation" v-model="form.confirmation" type="password" autocomplete="new-password" required minlength="8" maxlength="128" :aria-invalid="!!fieldErrors.confirmation" :aria-describedby="fieldErrors.confirmation ? 'auth-error-confirmation' : undefined" @input="clearFieldError('confirmation')" placeholder="Repite tu contraseña" />
              <span v-if="fieldErrors.confirmation" id="auth-error-confirmation" class="field-error" role="alert">{{ fieldErrors.confirmation }}</span>
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
