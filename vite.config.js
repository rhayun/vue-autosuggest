import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: "src/vue-autosuggest.js",
      name: "VueAutosuggest",
      fileName: (format) => (format === "umd" ? "vue-autosuggest.js" : "vue-autosuggest.esm.js"),
      formats: ["umd", "es"],
    },
    rollupOptions: {
      output: {
        exports: "named",
        name: "VueAutosuggest",
        globals: {
          vue: "Vue",
        },
      },
      external: ["vue"],
    },
  },
  plugins: [vue()],
});
