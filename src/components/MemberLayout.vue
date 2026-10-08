<script setup>
defineProps({ busy: Boolean, error: String })
defineEmits(['logout'])
</script>

<template>
  <div class="home-page">
    <header class="site-header">
      <a class="wordmark" href="#/home">CrowdStarter<span aria-hidden="true">.</span></a>
      <nav class="header-actions" aria-label="Navegación de usuario">
        <a class="text-link" href="#/home">Mis campañas</a>
        <button class="outline-button" :disabled="busy" @click="$emit('logout')">{{ busy ? 'Cerrando sesión…' : 'Cerrar sesión' }}</button>
      </nav>
    </header>
    <p v-if="error" class="message error layout-error" role="alert">{{ error }}</p>
    <slot />
    <footer class="site-footer"><span class="wordmark">CrowdStarter.</span><p>Juntos, hacemos que las ideas crezcan.</p></footer>
  </div>
</template>
