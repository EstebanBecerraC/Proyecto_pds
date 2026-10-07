<script setup>
defineProps({
  user: { type: Object, required: true },
  busy: Boolean,
  error: String,
})
defineEmits(['logout'])
</script>

<template>
  <div class="home-page">
    <header class="site-header">
      <a class="wordmark" href="#/">CrowdStarter<span aria-hidden="true">.</span></a>
      <nav class="header-actions" aria-label="Navegación de usuario">
        <a class="text-link" href="#/">Ver presentación</a>
        <button class="outline-button" :disabled="busy" @click="$emit('logout')">{{ busy ? 'Cerrando sesión…' : 'Cerrar sesión' }}</button>
      </nav>
    </header>
    <main class="home-content">
      <p class="badge">TU COMUNIDAD, TU PUNTO DE PARTIDA</p>
      <h1>Hola, {{ user.name }}.</h1>
      <p class="home-lead">Bienvenido a CrowdStarter. Este es tu espacio para lo que viene.</p>
      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <section class="placeholder-panel" aria-labelledby="coming-title">
        <span class="coming-badge">PRÓXIMAMENTE</span>
        <div class="placeholder-symbol" aria-hidden="true">↗</div>
        <h2 id="coming-title">Las próximas ideas<br />encontrarán su lugar aquí.</h2>
        <p>Estamos preparando este espacio para descubrir proyectos y conectar con la comunidad. Pronto habrá más novedades.</p>
      </section>
      <p class="session-caption">Sesión iniciada como <strong>{{ user.email }}</strong></p>
    </main>
    <footer class="site-footer"><span class="wordmark">CrowdStarter.</span><p>Juntos, hacemos que las ideas crezcan.</p></footer>
  </div>
</template>
