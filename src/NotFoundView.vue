<script lang="ts" setup>
import { useRouter } from 'vue-router';


const router = useRouter();

function navigateToHome() {
    router.replace({ name: 'home' });
}
</script>

<template>
    <main>
         <div class="subheader">
            <div class="subheader__heading">Oops!!!</div>
            <div class="subheader__subheading-1">404 - Page Not Found</div>
            <div class="subheader__subheading-1">The page you are looking for does not exist.</div>
        </div>
    </main>
</template>

<style lang="scss" scoped>

.subheader {
  // background-color: colors.$header-background-color;
  // color: colors.$header-text-color;
  // padding: 10rem 1rem;
  // text-align: center;

  // &__heading {
  //   font-size: 6rem;
  //   font-weight: bold;
  //   margin-bottom: 2rem;
  // }

  // &__subheading-1, &__subheading-2 {
  //   font-size: 3rem;
  //   margin: 0;
  // }
}
</style>