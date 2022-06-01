import VueAutoSuggest from "./AutoSuggest.vue";
import DefaultSection from "./parts/DefaultSection.js";

const VueAutoSuggestPlugin = {
  install(Vue, options = {}) {
    Vue.component("vue-autosuggest-default-section", DefaultSection);
    Vue.component("vue-auto-suggest", VueAutoSuggest);
  },
};

export default VueAutoSuggestPlugin;
export { VueAutoSuggest, DefaultSection };

if (typeof window !== "undefined" && window.Vue) {
  window.Vue.use(VueAutoSuggestPlugin);
}
