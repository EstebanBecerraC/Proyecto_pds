<script setup>
defineProps({ signedIn: Boolean })

</script>

<template>
  <div class="public-page">
    <header class="site-header">
      <a class="wordmark" href="#/" aria-label="CrowdStarter, inicio">CrowdStarter<span aria-hidden="true">.</span></a>
      <nav class="header-actions" aria-label="Navegación principal">
        <template v-if="!signedIn">
          <a class="text-link" href="#/login">Iniciar sesión</a>
          <a class="button-link" href="#/register">Registrarse</a>
        </template>
        <a v-else class="button-link" href="#/home">Ir a mi inicio</a>
      </nav>
    </header>

    <main>
      <section class="landing-hero">
        <div class="hero-copy">
          <p class="eyebrow">IDEAS QUE NOS MUEVEN. PERSONAS QUE LAS IMPULSAN.</p>
          <h1>El próximo gran<br />comienzo es<br /><span>colectivo.</span></h1>
          <p class="hero-description">CrowdStarter es una plataforma de crowdfunding que conecta a quienes tienen una idea con personas dispuestas a apoyarla. Juntos, podemos dar vida a nuevos proyectos.</p>
          <div class="hero-actions">
            <a class="button-link light-button" :href="signedIn ? '#/home' : '#/register'">{{ signedIn ? 'Ir a mi inicio' : 'Ser parte de CrowdStarter' }} <span aria-hidden="true">↗</span></a>
            <a class="hero-secondary" href="#como-funciona" @click.prevent="$refs.steps.scrollIntoView({ behavior: 'smooth' })">Cómo funciona <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div class="collective-art" aria-hidden="true">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <span class="art-label label-idea">Una idea</span>
          <span class="art-label label-community">Una comunidad</span>
          <div class="idea-core">Un nuevo<br /><strong>comienzo.</strong></div>
          <span class="art-dot dot-one"></span>
          <span class="art-dot dot-two"></span>
          <span class="art-dot dot-three"></span>
          <span class="art-caption">EL PODER DE CREAR JUNTOS</span>
        </div>
      </section>

      <section id="como-funciona" ref="steps" class="how-section" aria-labelledby="how-title">
        <div class="section-heading">
          <div><p class="badge">¿QUÉ ES EL CROWDFUNDING?</p><h2 id="how-title">Muchas personas.<br />Una meta compartida.</h2></div>
          <p>El financiamiento colectivo reúne aportes de una comunidad para ayudar a que un proyecto alcance su objetivo.</p>
        </div>
        <div class="step-grid">
          <article><span class="step-number">01</span><h3>Una idea con propósito</h3><p>Todo comienza con un proyecto y una meta que vale la pena alcanzar.</p></article>
          <article><span class="step-number">02</span><h3>Una comunidad que cree</h3><p>Las personas se conectan con iniciativas que les importan y deciden apoyarlas.</p></article>
          <article><span class="step-number">03</span><h3>Un impulso compartido</h3><p>Cada aporte se suma para acercar esa idea a convertirse en realidad.</p></article>
        </div>
      </section>
      <section class="join-banner">
        <div><h2>Las grandes ideas empiezan con alguien.</h2><p>Forma parte de la comunidad de CrowdStarter.</p></div>
        <a class="button-link" :href="signedIn ? '#/home' : '#/register'">{{ signedIn ? 'Ir a mi inicio' : 'Crear mi cuenta' }} <span aria-hidden="true">↗</span></a>
      </section>
    </main>
    <footer class="site-footer"><span class="wordmark">CrowdStarter.</span><p>Juntos, hacemos que las ideas crezcan.</p></footer>
  </div>
</template>
