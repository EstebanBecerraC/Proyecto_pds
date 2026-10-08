<script setup>
import { nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { CATEGORIES, IMAGE_TYPES, MAX_IMAGE_BYTES, todayInChile, validateCampaign } from '../../shared/campaign.js'
import { requestApi } from '../api.js'

const emit = defineEmits(['saved', 'session-expired'])
const form = reactive({ title: '', description: '', category: '', goal: '', deadline: '' })
const image = ref(null)
const preview = ref('')
const errors = ref({})
const message = ref('')
const submitted = ref(false)
const saving = ref(false)
const creationKey = crypto.randomUUID()

function chooseImage(event) {
  image.value = event.target.files?.[0] || null
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = image.value && IMAGE_TYPES.includes(image.value.type) && image.value.size <= MAX_IMAGE_BYTES
    ? URL.createObjectURL(image.value) : ''
}
onUnmounted(() => { if (preview.value) URL.revokeObjectURL(preview.value) })
watch([form, image], () => {
  if (submitted.value) errors.value = validateCampaign(form, image.value)
}, { deep: true })

async function focusError() {
  await nextTick()
  const first = ['title', 'description', 'category', 'image', 'goal', 'deadline'].find(field => errors.value[field])
  if (first) document.getElementById('campaign-' + first)?.focus()
}
async function save() {
  if (saving.value) return
  submitted.value = true
  message.value = ''
  errors.value = validateCampaign(form, image.value)
  if (Object.keys(errors.value).length) {
    await focusError()
    return
  }
  saving.value = true
  try {
    const body = new FormData()
    for (const [field, value] of Object.entries(form)) body.append(field, value.trim())
    body.append('image', image.value)
    body.append('creationKey', creationKey)
    const result = await requestApi('/api/campaigns', { method: 'POST', body })
    emit('saved', result.campaign)
  } catch (failure) {
    if (failure.status === 401) emit('session-expired')
    else {
      errors.value = failure.fields || {}
      message.value = failure.message
      await focusError()
    }
  } finally { saving.value = false }
}
</script>

<template>
  <main class="home-content campaign-content">
    <a class="back-link" href="#/home">← Volver a mis campañas</a>
    <p class="badge">EL PRIMER PASO PARA TU IDEA</p>
    <h1>Crear una campaña</h1>
    <p class="home-lead">Cuéntanos qué quieres hacer. Tu campaña se guardará como borrador.</p>
    <form class="campaign-form" novalidate @submit.prevent="save">
      <p class="required-note">Todos los campos son obligatorios.</p>
      <p v-if="message" class="message error" role="alert">{{ message }}</p>
      <fieldset :disabled="saving">
        <div class="form-field">
          <label for="campaign-title">Título</label>
          <input id="campaign-title" v-model="form.title" required maxlength="120" placeholder="Dale un nombre a tu idea" :aria-invalid="!!errors.title" :aria-describedby="errors.title ? 'error-title' : undefined" />
          <p v-if="errors.title" id="error-title" class="field-error" role="alert">{{ errors.title }}</p>
        </div>
        <div class="form-field">
          <label for="campaign-description">Descripción</label>
          <textarea id="campaign-description" v-model="form.description" required rows="6" maxlength="10000" placeholder="Describe tu proyecto, su propósito y cómo utilizarás el financiamiento." :aria-invalid="!!errors.description" :aria-describedby="errors.description ? 'error-description' : undefined"></textarea>
          <p v-if="errors.description" id="error-description" class="field-error" role="alert">{{ errors.description }}</p>
        </div>
        <div class="form-field">
          <label for="campaign-category">Categoría</label>
          <select id="campaign-category" v-model="form.category" required :aria-invalid="!!errors.category" :aria-describedby="errors.category ? 'error-category' : undefined">
            <option value="" disabled>Selecciona una categoría</option>
            <option v-for="category in CATEGORIES" :key="category" :value="category">{{ category }}</option>
          </select>
          <p v-if="errors.category" id="error-category" class="field-error" role="alert">{{ errors.category }}</p>
        </div>
        <div class="form-field">
          <label for="campaign-image">Imagen de la campaña</label>
          <input id="campaign-image" type="file" accept="image/jpeg,image/png,image/webp" required :aria-invalid="!!errors.image" :aria-describedby="errors.image ? 'image-help error-image' : 'image-help'" @change="chooseImage" />
          <p id="image-help" class="field-help">JPG, PNG o WebP. Máximo 5 MB.</p>
          <p v-if="errors.image" id="error-image" class="field-error" role="alert">{{ errors.image }}</p>
          <img v-if="preview" :src="preview" class="upload-preview" alt="Vista previa de la imagen de la campaña" />
        </div>
        <div class="form-columns">
          <div class="form-field">
            <label for="campaign-goal">Meta de financiamiento (CLP)</label>
            <input id="campaign-goal" v-model="form.goal" type="text" inputmode="decimal" required maxlength="20" placeholder="Ej. 500000" :aria-invalid="!!errors.goal" :aria-describedby="errors.goal ? 'goal-help error-goal' : 'goal-help'" />
            <p id="goal-help" class="field-help">Ingresa un número mayor a 0, sin separadores de miles.</p>
            <p v-if="errors.goal" id="error-goal" class="field-error" role="alert">{{ errors.goal }}</p>
          </div>
          <div class="form-field">
            <label for="campaign-deadline">Fecha límite</label>
            <input id="campaign-deadline" v-model="form.deadline" type="date" required :min="todayInChile()" :aria-invalid="!!errors.deadline" :aria-describedby="errors.deadline ? 'deadline-help error-deadline' : 'deadline-help'" />
            <p id="deadline-help" class="field-help">Selecciona una fecha posterior a hoy.</p>
            <p v-if="errors.deadline" id="error-deadline" class="field-error" role="alert">{{ errors.deadline }}</p>
          </div>
        </div>
        <div class="form-actions"><a class="text-link" href="#/home">Cancelar</a><button class="primary" type="submit">{{ saving ? 'Guardando…' : 'Guardar borrador' }}</button></div>
      </fieldset>
    </form>
  </main>
</template>
