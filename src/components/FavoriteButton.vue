<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { requestApi } from '../api.js'

const props = defineProps({ campaignId: { type: Number, required: true } })
const emit = defineEmits(['session-expired'])
const favorite = ref(false)
const loading = ref(true)
const saving = ref(false)
const loaded = ref(false)
const error = ref('')
const notice = ref('')
let version = 0
async function load() {
  const current = ++version
  loading.value = true
  saving.value = false
  loaded.value = false
  favorite.value = false
  error.value = ''
  notice.value = ''
  try {
    const result = await requestApi('/api/favorites/' + props.campaignId)
    if (current === version) { favorite.value = result.favorite; loaded.value = true }
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else error.value = failure.message
  } finally { if (current === version) loading.value = false }
}
async function toggle() {
  if (loading.value || saving.value || !loaded.value) return
  const current = version
  const removing = favorite.value
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    await requestApi('/api/favorites/' + props.campaignId, { method: removing ? 'DELETE' : 'PUT' })
    if (current !== version) return
    favorite.value = !removing
    notice.value = removing ? 'Campaña eliminada de tus favoritas.' : 'Campaña guardada en tus favoritas.'
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else error.value = failure.message
  } finally { if (current === version) saving.value = false }
}
watch(() => props.campaignId, load, { immediate: true })
onUnmounted(() => { version++ })
</script>

<template>
  <div class="favorite-control">
    <button class="outline-button" type="button" data-cy="toggle-favorite" :disabled="loading || saving || !loaded" :aria-pressed="!!favorite" @click="toggle">{{ loading ? 'Cargando favoritas…' : saving ? 'Guardando…' : favorite ? 'Quitar de favoritas' : 'Guardar en favoritas' }}</button>
    <p v-if="notice" class="favorite-notice" role="status">{{ notice }}</p>
    <p v-if="error" class="message error" role="alert">{{ error }}</p>
    <button v-if="error && !loaded" class="outline-button" type="button" @click="load">Reintentar favoritas</button>
  </div>
</template>
