<script setup>
import { onMounted, reactive, ref } from 'vue'
import { requestApi } from '../api.js'
import { validateProfile } from '../../shared/profile.js'

const emit = defineEmits(['updated', 'deleted', 'session-expired'])
const form = reactive({ name: '', email: '', currentPassword: '', newPassword: '', confirmation: '' })
const loading = ref(true)
const saving = ref(false)
const removing = ref(false)
const confirmingRemoval = ref(false)
const removalConfirmation = ref('')
const error = ref('')
const notice = ref('')
const errors = ref({})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { profile } = await requestApi('/api/profile')
    form.name = profile.name
    form.email = profile.email
  } catch (failure) {
    if (failure.status === 401) emit('session-expired')
    else error.value = failure.message
  } finally { loading.value = false }
}

function clear(field) {
  delete errors.value[field]
  error.value = ''
  notice.value = ''
}

async function save() {
  if (saving.value) return
  errors.value = validateProfile(form)
  error.value = ''
  notice.value = ''
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    const { profile } = await requestApi('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    form.name = profile.name
    form.email = profile.email
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmation = ''
    notice.value = 'Perfil actualizado correctamente.'
    emit('updated', profile)
  } catch (failure) {
    if (failure.status === 401) emit('session-expired')
    else {
      errors.value = failure.fields || {}
      if (!Object.keys(errors.value).length) error.value = failure.message
    }
  } finally { saving.value = false }
}

async function remove() {
  if (saving.value || removing.value || removalConfirmation.value !== 'entiendo') return
  removing.value = true
  error.value = ''
  try {
    await requestApi('/api/profile', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: removalConfirmation.value }),
    })
    emit('deleted')
  } catch (failure) {
    if (failure.status === 401) emit('session-expired')
    else error.value = failure.message
  } finally {
    removing.value = false
    confirmingRemoval.value = false
    removalConfirmation.value = ''
  }
}

function cancelRemoval() {
  confirmingRemoval.value = false
  removalConfirmation.value = ''
}

onMounted(load)
</script>

<template>
  <main class="home-content profile-content">
    <p class="badge">TU CUENTA</p>
    <h1>Mi perfil</h1>
    <p class="home-lead">Consulta y mantén actualizados los datos asociados a tu cuenta.</p>

    <p v-if="loading" role="status">Cargando perfil…</p>
    <template v-else>
      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-if="notice" class="message success" role="status">{{ notice }}</p>

      <form class="campaign-form profile-form" novalidate @submit.prevent="save">
        <fieldset :disabled="saving || removing">
          <label for="profile-name">Nombre
            <input id="profile-name" v-model="form.name" required minlength="2" maxlength="80" autocomplete="name" :aria-invalid="!!errors.name" @input="clear('name')" />
            <span v-if="errors.name" class="field-error" role="alert">{{ errors.name }}</span>
          </label>

          <label for="profile-email">Correo electrónico
            <input id="profile-email" v-model="form.email" type="email" required maxlength="254" autocomplete="email" :aria-invalid="!!errors.email" @input="clear('email')" />
            <span v-if="errors.email" class="field-error" role="alert">{{ errors.email }}</span>
          </label>

          <section class="password-section" aria-labelledby="password-heading">
            <h2 id="password-heading">Cambiar contraseña</h2>
            <p class="field-help">Déjala en blanco si no deseas cambiarla.</p>
            <label for="current-password">Contraseña actual
              <input id="current-password" v-model="form.currentPassword" type="password" maxlength="128" autocomplete="current-password" :aria-invalid="!!errors.currentPassword" @input="clear('currentPassword')" />
              <span v-if="errors.currentPassword" class="field-error" role="alert">{{ errors.currentPassword }}</span>
            </label>
            <label for="new-password">Nueva contraseña
              <input id="new-password" v-model="form.newPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" :aria-invalid="!!errors.newPassword" @input="clear('newPassword')" />
              <span v-if="errors.newPassword" class="field-error" role="alert">{{ errors.newPassword }}</span>
            </label>
            <small>Entre 8 y 128 caracteres.</small>
            <label for="profile-confirmation">Confirmar nueva contraseña
              <input id="profile-confirmation" v-model="form.confirmation" type="password" minlength="8" maxlength="128" autocomplete="new-password" :aria-invalid="!!errors.confirmation" @input="clear('confirmation')" />
              <span v-if="errors.confirmation" class="field-error" role="alert">{{ errors.confirmation }}</span>
            </label>
          </section>

          <button class="primary" type="submit">{{ saving ? 'Guardando…' : 'Guardar cambios' }}</button>
        </fieldset>
      </form>

      <section class="profile-danger" aria-labelledby="delete-account-heading">
        <h2 id="delete-account-heading">Eliminar cuenta</h2>
        <p>No puedes eliminar tu cuenta mientras tengas campañas activas. Tus aportes se conservarán.</p>
        <button v-if="!confirmingRemoval" class="danger-button" type="button" :disabled="saving" @click="confirmingRemoval = true">Eliminar mi cuenta</button>
        <div v-else class="delete-confirmation">
          <p>Esta acción cerrará tu sesión y no podrás volver a acceder a la cuenta.</p>
          <label for="delete-account-confirmation">Escribe <strong>entiendo</strong> para confirmar
            <input id="delete-account-confirmation" v-model="removalConfirmation" type="text" autocomplete="off" />
          </label>
          <div class="confirmation-actions">
            <button class="outline-button" type="button" :disabled="removing" @click="cancelRemoval">Volver</button>
            <button class="danger-button" type="button" :disabled="saving || removing || removalConfirmation !== 'entiendo'" @click="remove">{{ removing ? 'Eliminando…' : 'Sí, eliminar mi cuenta' }}</button>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>
