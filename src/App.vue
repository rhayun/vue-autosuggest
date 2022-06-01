<template>
  <div id="app">
    <main class="demo">
      <h1>🔍 Vue-autosuggest</h1>
      <div>
        <vue-autosuggest
          ref="autocomplete"
          v-model="searchText"
          component-attr-id-autosuggest="demo-autosuggest"
          :suggestions="filteredOptions"
          :input-props="inputProps"
          :section-configs="sectionConfigs"
          :get-suggestion-value="getSuggestionValue"
          :limit="10"
          :should-render-suggestions="(size, loading) => size >= 0 && !loading && searchText.value !== ''"
          @input="(...args) => logEvent('input', args)"
          @highlighted="(...args) => logEvent('highlighted', args)"
          @selected="onSelected"
        >
          <template v-slot:before-input>
            <label :for="inputProps.id">Select a LOTR Character</label>
          </template>
          <template v-slot:default="{suggestion, index, cs}">
            <div>{{ suggestion && suggestion.item.Name }}</div>
          </template>
          <template v-slot:after-suggestions>
            <p 
              v-if="filteredOptions == 0" 
              style="text-align: center;"
            >No Results... Try <a 
              style="color: peachpuff;" 
              :href="`https://www.google.com/search?safe=active&source=hp&ei=t_M-Xci6EYq6tgXrzbLoCw&q=${searchText}`" 
              target="_blank" 
              @mouseup.stop
            >googling</a></p>
          </template>
        </vue-autosuggest>
      </div>
    </main>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue';
  import VueAutosuggest from '../src/Autosuggest.vue';
  import characters from './lotr-character'

  const races = [...new Set(characters.map(c => { return c.Race }))]
  const options = races.map(r => ({
    label: r,
    name: r,
    data: characters.filter(c => c.Race === r)
  }));
  const autocomplete = ref(null);
  const selected = ref('');
  const searchText = ref('');
  const sectionConfigs = {
    default: {
      limit: 4,
      ulClass: {'data-darren': true },
      liClass: {'elf-row': true }
    },
    Elf: {
      limit: 6
    }
  };
  const inputProps = {
    id: 'autosuggest__input',
    placeholder: 'Search',
  };

  const events = [];

  const getSuggestionValue = (item) => {
    return item.item.Name;
  };

  const logEvent = (name, value) => {
    events.unshift({ name, value });
  };

  const onSelected = (...args) => {
    const item = args[0];
    logEvent('selected', args);
    if (!item) {
      return;
    }
  
    selected.value = item.item;
  };

  const filteredOptions = computed(() => {
    const filtered = []

    if (searchText.value === '' || searchText.value === undefined) {
      return [];
    }

    races.forEach(r => {
      const people = options.filter(o => o.name === r)[0].data.filter(p => {
        return p.Name.toLowerCase().indexOf(searchText.value.toLowerCase()) > -1;
      }).map(p => {
        p.liClass = p.Name === 'Gandalf' ? {'gandalf': true} : null
        return p
      });

      people.length > 0 &&
        filtered.push({
          name: Object.keys(sectionConfigs).indexOf(r) > -1 ? r : 'default',
          label: r,
          data: people
        });
    })

    return Object.freeze(filtered)
  })

</script>

<style>
:root {
  --theme-color: red;
  --theme-bg: #fafafa;
  --theme-header: #222;
  --theme-item_bg_highlighted: #aaa;
  --theme-item_color_highlighted: #222;
}
body {
  max-width: 800px;
  padding: 20px;
  margin-left: auto !important;
  margin-right: auto !important;
}
#app {
  position: relative;
  color: #2c3e50;
  height: 100vh;
  align-items: center;
  justify-content: center;
  gap: 100px;
}
button {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  background: var(--theme-bg);
  color: var(--theme-color);
  text-transform: uppercase;
  font-weight: 700;
  font-size: 0.66rem;
  white-space: nowrap;
  border: 3px solid var(--theme-color);
  border-radius: 2rem;
  padding: 0.2rem 0.85rem 0.25rem 0.85rem;
  cursor: pointer;
}
h1 {
  color: var(--theme-header);
}
* {
  transition: height 0.2s linear;
  transition: border-color linear 0.1s;
}
#demo-autosuggest label {
  margin-bottom: 1rem;
  display:block;
  position: relative
}
#autosuggest__input {
  background-color: var(--theme-bg);
  caret-color: #ddd;
  color: var(--theme-color);
  position: relative;
  display: block;
  font-family: monospace;
  font-size: 20px;
  border: 1px solid #616161;
  border-radius: 3px;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
}
#autosuggest__input.autosuggest__input--open,
#autosuggest__input:hover {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid lightgray;
}
.autosuggest__results-container {
  position: relative;
  width: 100%;
  background-color: var(--theme-bg);
}
.autosuggest__results {
  background-color: var(--theme-bg);
  font-weight: 300;
  margin: 0;
  position: absolute;
  z-index: 10000001;
  width: 100%;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  padding: 0px;
  overflow: scroll;
  max-height: 400px;
}
.autosuggest__results ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
  background-color: var(--theme-bg);
}
.autosuggest__results .autosuggest__results-item {
  cursor: pointer;
  background-color: var(--theme-bg);
  padding: 10px;
}
#autosuggest ul:nth-child(1) > .autosuggest__results-before {
  border-top: none;
}
.autosuggest__results .autosuggest__results-before {
  color: var(--theme-color);
  opacity: 0.5;
  font-size: 11px;
  margin-left: 0;
  padding: 15px 13px 5px;
  border-top: 1px solid lightgray;
}
.autosuggest__results .autosuggest__results-item:active,
.autosuggest__results .autosuggest__results-item:hover,
.autosuggest__results .autosuggest__results-item:focus,
.autosuggest__results .autosuggest__results-item.autosuggest__results-item--highlighted {
  background-color: var(--theme-item_bg_highlighted);
  color: var(--theme-item_color_highlighted);
}
@media screen and (max-width: 900px) {
  .event-log {
    display: none;
  }
}
.event-log {
  left: 1rem;
  position: absolute;
  width: 800px;
  height: 500px;
  bottom: 1rem;
  border: 1px solid var(--theme-color);
  border-radius: 2px;
  padding: 1rem;
  overflow: scroll;
}
.evt-name {
  color: var(--theme-item_color_highlighted);
}
.evt-val {
  color: var(--theme-color);
}
.elf-row {
  font-style: italic;
}
.gandalf {
  color: var(--theme-header);
}

</style>
