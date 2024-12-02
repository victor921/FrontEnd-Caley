<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
</script>

<template>
  <header>
    <img alt="Caley logo" class="logo" src="@/assets/logo2.png" width="125" height="125" />

    <div class="wrapper">
      <HelloWorld msg="Welcome" />

      <nav>
        <RouterLink to="/login">Home</RouterLink>
        <!-- <RouterLink to="/runFiles">Admin</RouterLink> -->
        <!-- <RouterLink to="/dev">dev</RouterLink> -->

        <!-- Conditionally render a tab only for signed-in users -->
        <!-- <RouterLink v-if="userStore.userInfo" to="/dev">Dev</RouterLink> -->
        <RouterLink v-if="userStore.userInfo" to="/runFiles">Admin</RouterLink>

      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
