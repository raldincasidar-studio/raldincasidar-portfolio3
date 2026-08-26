<script setup>
/**
 * Shared "arrow up-right" icon (Heroicons-style).
 * Used across buttons, card titles and the footer.
 */
defineProps({
  /** Extra utility classes to control size / colour / animation. */
  sizeClass: { type: String, default: 'size-4' },
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    :class="sizeClass"
    aria-hidden="true"
  >
    <path
      fill-rule="evenodd"
      d="M4.22 11.78a.75.75 0 0 1 0-1.06L9.44 5.5H5.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 0 1-1.06 0Z"
      clip-rule="evenodd"
    />
  </svg>
</template>
