<script setup>
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { CATEGORIES, IMAGE_TYPES, MAX_IMAGE_BYTES, todayInChile, validateCampaign } from '../../shared/campaign.js'
import { requestApi } from '../api.js'

const props = defineProps({ campaign: { type: Object, default: null } })
const emit = defineEmits(['saved', 'session-expired'])
const editing = computed(() => !!props.campaign)
const backUrl = computed(() => editing.value ? '#/campaigns/' + props.campaign.id : '#/my-campaigns')
const form = reactive({
  title: props.campaign?.title ?? '', description: props.campaign?.description ?? '',
  category: props.campaign?.category ?? '',
  goal: props.campaign ? String(props.campaign.goal_cents / 100) : '',
  deadline: props.campaign?.deadline ?? '',
})
const image = ref(null)
const preview = ref('')
const errors = ref({})
const message = ref('')
const submitted = ref(false)
const saving = ref(false)
const creationKey = crypto.randomUUID()
const validationErrors = () => validateCampaign(form, image.value, undefined, { requireImage: !editing.value })

function chooseImage(event) {
  image.value = event.target.files?.[0] || null
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = image.value && IMAGE_TYPES.includes(image.value.type) && image.value.size <= MAX_IMAGE_BYTES
    ? URL.createObjectURL(image.value) : ''
}
onUnmounted(() => { if (preview.value) URL.revokeObjectURL(preview.value) })
watch([form, image], () => {
  if (submitted.value) errors.value = validationErrors()
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
  errors.value = validationErrors()
  if (Object.keys(errors.value).length) {
    await focusError()
    return
  }
  saving.value = true
  try {
    const body = new FormData()
    for (const [field, value] of Object.entries(form)) body.append(field, value.trim())
    if (image.value) body.append('image', image.value)
    if (!editing.value) body.append('creationKey', creationKey)
    const path = editing.value ? '/api/campaigns/' + props.campaign.id : '/api/campaigns'
    const result = await requestApi(path, { method: editing.value ? 'PUT' : 'POST', body })
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
    <a class="back-link" :href="backUrl">{{ editing ? '← Volver a la campaña' : '← Volver a mis campañas' }}</a>
    <p class="badge">{{ editing ? 'AJUSTA TU IDEA' : 'EL PRIMER PASO PARA TU IDEA' }}</p>
    <h1>{{ editing ? 'Editar campaña' : 'Crear una campaña' }}</h1>
    <p class="home-lead">{{ editing ? 'Actualiza los datos de tu campaña. Se mantendrá como borrador.' : 'Cuéntanos qué quieres hacer. Tu campaña se guardará como borrador.' }}</p>
    <form class="campaign-form" novalidate @submit.prevent="save">
      <p class="required-note">{{ editing ? 'Todos los campos son obligatorios, excepto reemplazar la imagen.' : 'Todos los campos son obligatorios.' }}</p>
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
          <input id="campaign-image" type="file" accept="image/jpeg,image/png,image/webp" :required="!editing" :aria-invalid="!!errors.image" :aria-describedby="errors.image ? 'image-help error-image' : 'image-help'" @change="chooseImage" />
          <p id="image-help" class="field-help">JPG, PNG o WebP. Máximo 5 MB. {{ editing ? 'Si no seleccionas otra imagen, se conservará la actual.' : '' }}</p>
          <p v-if="errors.image" id="error-image" class="field-error" role="alert">{{ errors.image }}</p>
          <img v-if="preview" :src="preview" class="upload-preview" alt="Vista previa de la imagen de la campaña" />
          <img v-else-if="editing" :src="campaign.imageUrl" class="upload-preview" alt="Imagen actual de la campaña" />
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
        <div class="form-actions"><a class="text-link" :href="backUrl">Cancelar</a><button class="primary" type="submit">{{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar borrador' }}</button></div>
      </fieldset>
    </form>
  </main>
</template>
