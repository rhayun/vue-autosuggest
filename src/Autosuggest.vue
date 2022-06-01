<template>
  <div :id="componentAttrIdAutosuggest">
    <slot name="before-input" />
    <div
      role="combobox"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="listbox"
      :aria-owns="`${componentAttrIdAutosuggest}-${componentAttrPrefix}__results`"
    >
      <input
        :type="internal_inputProps.type"
        :value="internalValue"
        :autocomplete="internal_inputProps.autocomplete"
        :class="[isOpen ? `${componentAttrPrefix}__input--open` : '', internal_inputProps['class']]"
        v-bind="internal_inputProps"
        aria-autocomplete="list"
        :aria-activedescendant="isOpen && currentIndex !== null ? `${componentAttrPrefix}__results-item--${currentIndex}` : ''"
        :aria-controls="`${componentAttrIdAutosuggest}-${componentAttrPrefix}__results`"
        @input="inputHandler"
        @keydown="handleKeyStroke"
        v-on="listeners"
      >
    </div>
    <slot name="after-input" />
    <div
      :id="`${componentAttrIdAutosuggest}-${componentAttrPrefix}__results`"
      :class="_componentAttrClassAutosuggestResultsContainer"
    >
      <div
        v-if="isOpen"
        :class="_componentAttrClassAutosuggestResults"
        :aria-labelledby="componentAttrIdAutosuggest"
      >
        <slot name="before-suggestions" />
        <component
          :is="cs.type"
          v-for="(cs, key) in computedSections"
          :ref="el => refSet(el, getSectionRef(`${cs.name}${key}`))"
          :key="getSectionRef(`${cs.name}${key}`)"
          :current-index="currentIndex"
          :normalize-item-function="normalizeItem"
          :render-suggestion="renderSuggestion"
          :section="cs"
          :component-attr-prefix="componentAttrPrefix"
          :component-attr-id-autosuggest="componentAttrIdAutosuggest"
          @updateCurrentIndex="updateCurrentIndex"
        >
          <template 
            v-for="slot_name in [`before-section-${cs.name || cs.label}`]"
            #[slot_name]="{section, className}"
          >
            <slot
              :name="`before-section-${cs.name || cs.label}`"
              :section="section"
              :class-name="className"
            />
          </template>

          <template #default="{suggestion, _key}">
            <slot
              :suggestion="suggestion"
              :index="_key"
            >
              {{ suggestion.item }}
            </slot>
          </template>

          <template
            v-for="slot_name in [`after-section-${cs.name || cs.label}`]"
            #[slot_name]="{section}"
          >
            <slot
              :name="`after-section-${cs.name || cs.label}`"
              :section="section"
            />
          </template>

          <template
            #after-section="{section}"
          >
            <slot
              name="after-section"
              :section="section"
            />
          </template>
        </component>
        <slot name="after-suggestions" />
      </div>
      <slot name="after-suggestions-container" />
    </div>
  </div>
</template>

<script setup>
import {
  useAttrs,
  computed, 
  ref, 
  nextTick, 
  watch,
  toRefs,
  onMounted,
  onBeforeMount,
  onUnmounted
} from 'vue'
import DefaultSection from "./parts/DefaultSection.js";
import { addClass, removeClass } from "./utils";

const $refs = ref([]);
const refSet = (el, key) => {
  const index = $refs.value.findIndex(item => item.key === key);
  if (index === -1) {
    $refs.value.push({key, el})
  }
  return key;
}

const attrs = useAttrs()
const emit = defineEmits([
  'update:modelValue',
  'item-changed',
  'opened',
  'closed'
]);

const INDEX_IS_FOCUSED_ON_INPUT = -1

const defaultSectionConfig = {
  name: "default",
  type: DefaultSection
}

//
// Props
//
const props = defineProps({
  value: {
    type: String,
    default: null
  },
  /** v-binds to the <input /> tag for fine-grain control */
  inputProps: {
    type: Object,
    required: true
  },
  /** limits the number of suggestions for all sections */
  limit: {
    type: Number,
    required: false,
    default: Infinity
  },
  suggestions: {
    type: Array,
    required: true
  },
  renderSuggestion: {
    type: Function,
    required: false,
    default: null
  },
  getSuggestionValue: {
    type: Function,
    required: false,
    default: suggestion => {
      const item = suggestion.item;
      if (typeof item === "object" && item.hasOwnProperty("name")) {
        return item.name;
      } else {
        return item;
      }
    }
  },
  shouldRenderSuggestions: {
    type: Function,
    required: false,
    default: (totalResults, loading) => {
      return totalResults > 0 && !loading;
    }
  },
  sectionConfigs: {
    type: Object,
    required: false,
    default: () => {
      return {
        default: {
          onSelected: null
        }
      };
    }
  },
  componentAttrIdAutosuggest: {
    type: String,
    required: false,
    default: "autosuggest"
  },
  componentAttrClassAutosuggestResultsContainer: {
    type: String,
    required: false,
    default: null  // `${componentAttrPrefix}__results-container`
  },
  componentAttrClassAutosuggestResults: {
    type: String,
    required: false,
    default: null // `${componentAttrPrefix}__results`
  },
  componentAttrPrefix: {
    type: String,
    required: false,
    default: "autosuggest"
  }
})

const {
  value,
  suggestions,
  componentAttrIdAutosuggest,
  componentAttrPrefix,
  inputProps,
  renderSuggestion,
  componentAttrClassAutosuggestResults,
  componentAttrClassAutosuggestResultsContainer,
  sectionConfigs,
  shouldRenderSuggestions,
  getSuggestionValue,
} = toRefs(props);

//
// Data
//
const internalValue = ref(null);
const searchInputOriginal = ref(null);
const currentIndex = ref(null);
/** @type ResultItem|null */
const currentItem = ref(null);
// TODO use event states instead of generic "loading" variable
const loading = ref(false); /** Helps with making sure the dropdown doesn't stay open after certain actions */
const didSelectFromOptions = ref(false);
const defaultInputProps = {
  type: 'text',
  autocomplete: "off",
};
/** @type Number */
const clientXMouseDownInitial = ref(null);


//
// Computed
//
const internal_inputProps = computed(() => {
  return {
    ...defaultInputProps,
    ...inputProps.value,
    ...listeners.value
  }
});

const listeners = computed(() => {
  return {
    input: e => {
      // Don't do anything native here, since we have inputHandler
      return
    },
    /**
     * Wrap native click handler to allow for added behavior
     */
    click: () => {
      /* eslint-disable-next-line vue/no-side-effects-in-computed-properties */
      loading.value = false;
      attrs.click && attrs.click(currentItem.value);
      nextTick(() => {
        ensureItemVisible(currentItem.value, currentIndex.value);
      })
    },
    selected: () => {
      /**
       * Determine which onSelected to fire. This can be either from inside
       * a section's object, from the `@selected` event
       */
      if (
        currentItem.value &&
        sectionConfigs.value[currentItem.value.name] &&
        sectionConfigs.value[currentItem.value.name].onSelected
      ) {
        sectionConfigs.value[currentItem.value.name].onSelected(
          currentItem.value,
          searchInputOriginal.value
        );
      } else if (sectionConfigs.value["default"].onSelected) {
        sectionConfigs.value["default"].onSelected(null, searchInputOriginal.value);
      } else if (attrs.onSelected) {
        attrs.onSelected(currentItem.value, currentIndex.value)
      }
      setChangeItem(null)
    }
  };
});

/**
 * @returns {Boolean}
 */
const isOpen = computed(() => {
  return shouldRenderSuggestions.value(totalResults.value, loading.value)
});

/**
 * Normalize suggestions into sections based on defaults and section
 * configs.
 * @returns {Array<ResultSection>}
 */
const computedSections = computed(() => {
  let tmpSize = 0
  
  return suggestions.value.map(section => {
    if (!section.data) return;

    const name = section.name ? section.name : defaultSectionConfig.name;
    let _limit, _label, _type, _ulClass, _liClass = null

    if (sectionConfigs.value[name]) {
      _limit = sectionConfigs.value[name].limit
      _type = sectionConfigs.value[name].type
      _label = sectionConfigs.value[name].label
      _ulClass = sectionConfigs.value[name].ulClass
      _liClass = sectionConfigs.value[name].liClass
    }

    /** Set defaults for section configs. */
    _type = _type ? _type : defaultSectionConfig.type;

    _limit = _limit || props.limit
    _limit = _limit ? _limit : Infinity;
    _limit = section.data.length < _limit ? section.data.length : _limit;
    _label = _label ? _label : section.label;

    const computedSection = {
      name,
      label: _label,
      type: _type,
      limit: _limit,
      data: section.data,
      start_index: tmpSize,
      end_index: tmpSize + _limit - 1,
      ulClass: _ulClass,
      liClass: _liClass
    }

    tmpSize += _limit;

    return computedSection
  })
});

/**
 * Calculate number of results in each section.
 * @returns {Number}
 */
const totalResults = computed(() => {
  return computedSections.value.reduce((acc, section) => {
    // For each section, make sure we calculate the size
    // based on how many are rendered, which maxes out at
    // the limit but can be less than the limit.
    if (!section) return acc
    const { limit, data } = section
    return acc + (data.length >= limit ? limit : data.length)
  }, 0)
});

const _componentAttrClassAutosuggestResultsContainer = computed (() => {
  return componentAttrClassAutosuggestResultsContainer || `${componentAttrPrefix.value}__results-container`
});

const _componentAttrClassAutosuggestResults = computed (() => {
  return componentAttrClassAutosuggestResults.value || `${componentAttrPrefix.value}__results`
});


//
// WATCH
//
watch(value, (newValue) => {
  internalValue.value = newValue
});

/**
 * Emits opened/closed events
 * @returns {Boolean}
 */
watch(isOpen, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    emit(newValue ? 'opened' : 'closed');
  }
});


//
// METHODS
//

/**
 * handler for @input <input /> events to support v-model behavior.
 * @param {InputEvent} e
 */
const inputHandler = (e) => {
  const newValue = e.target.value
  emit('update:modelValue', newValue)
  internalValue.value = newValue
  if (!didSelectFromOptions.value) {
    searchInputOriginal.value = newValue;
    currentIndex.value = null;
  }
};

/**
 * Helper for making sure the sectionRef getter is consistent
 * @returns {String}
 */
const getSectionRef = (i) => {
  return "computed_section_" + i;
};

/**
 * Helper for getting a suggestion item by index.
 * @returns {ResultItem}
 */
const getItemByIndex = (index) => {
  let obj = false;
  if (index === null) return obj;
  for (var i = 0; i < computedSections.value.length; i++) {
    if (
      index >= computedSections.value[i].start_index &&
      index <= computedSections.value[i].end_index
    ) {
      let trueIndex = index - computedSections.value[i].start_index;
      const sectionName = computedSections.value[i].name
      let childSection = $refs.value.find(item => item.key == getSectionRef(`${sectionName}${i}`)).el || false;

      if (childSection) {
        obj = normalizeItem(
          computedSections.value[i].name,
          computedSections.value[i].type,
          childSection.section.label,
          childSection.section.liClass,
          childSection.getItemByIndex(trueIndex)
        );
        break;
      }
    }
  }

  return obj;
};

/**
 * Handler for 'keydown' event. Does a number of things, including making
 * sure to ignore keycodes, ensure items are visible and also that the input
 * value is updated/reset according to where the user has keyed to.
 * @param {MouseEvent} e
 * @returns {void}
 */
const handleKeyStroke = (e) => {
  const { keyCode } = e;

  const ignoredKeyCodes = [
    16, // Shift
    9,  // Tab
    17, // ctrl
    18, // alt/option
    91, // OS Key
    93  // Right OS Key
  ];

  if (ignoredKeyCodes.indexOf(keyCode) > -1) {
    return;
  }

  const wasClosed = !isOpen.value
  loading.value = false;
  didSelectFromOptions.value = false;
  if (isOpen.value) {
    switch (keyCode) {
      case 40: // ArrowDown
      case 38: // ArrowUp
        e.preventDefault();
        if (keyCode === 38 && currentIndex.value === null) {
          break;
        }
        // Determine direction of arrow up/down and determine new currentIndex
        const direction = keyCode === 40 ? 1 : -1;
        const newIndex = Math.max((parseInt(currentIndex.value) || 0) + (wasClosed ? 0 : direction), INDEX_IS_FOCUSED_ON_INPUT);

        setCurrentIndex(newIndex, totalResults.value);
        didSelectFromOptions.value = true;
        if (totalResults.value > 0 && currentIndex.value >= 0) {
          setChangeItem(getItemByIndex(currentIndex.value));
          didSelectFromOptions.value = true;
        } else if (currentIndex.value === INDEX_IS_FOCUSED_ON_INPUT) {
          setChangeItem(null)
          internalValue.value = searchInputOriginal.value;
          e.preventDefault();
        }

        nextTick(() => {
          ensureItemVisible(currentItem.value, currentIndex.value);
        })
        break;
      case 13: // Enter
        e.preventDefault();

        if (totalResults.value > 0 && currentIndex.value >= 0) {
          setChangeItem(getItemByIndex(currentIndex.value), true);
          didSelectFromOptions.value = true;
        }

        loading.value = true;
        listeners.value.selected(didSelectFromOptions.value);
        break;
      case 27: // Escape
        /**
         * For 'search' input type, make sure the browser doesn't clear the
         * input when Escape is pressed.
         */
        loading.value = true;
        currentIndex.value = null;
        internalValue.value = searchInputOriginal.value;
        emit('update:modelValue', searchInputOriginal.value);
        e.preventDefault();
        break;
    }
  }
};

/**
 * Wrapper around currentItem setter to emit events and ensure to update the
 * searchInputOriginal when a user selects an option.
 * @param {ResultItem} item
 * @param {Boolean} overrideOriginalInput determine if the 'saved' original
 *   input should be updated. When a user selects an option, this will be
 *   updated, but if a user keys into the <input/> then the input will be
 *   reset to the searchInputOriginal.
 * @return {void}
 */
const setChangeItem = (item, overrideOriginalInput = false) => {
  if (currentIndex.value === null || !item) {
    currentItem.value = null;
    emit('item-changed', null, null)
  } else if (item) {
    currentItem.value = item;
    emit('item-changed', item, currentIndex.value)
    const v = getSuggestionValue.value(item)
    internalValue.value = v;
    if (overrideOriginalInput) {
      searchInputOriginal.value = v;
    }
    ensureItemVisible(item, currentIndex.value);
  }
};

/**
 * Function to standardize suggestion item object picked from sections
 * @returns {ResultItem}
 */
const normalizeItem = (name, type, label, className, item) => {
  return {
    name,
    type,
    label,
    liClass: item.liClass || className,
    item
  };
};

/**
 * Adjust the scroll position to the item in the suggestions overflow
 * @param {ResultItem} item - suggestion item
 * @param {Number} index - item index
 * @param {String} selector - selector of item that is overflowed
 */
const ensureItemVisible = (item, index, selector) => {
  const resultsScrollElement = document.querySelector(
    selector || `.${_componentAttrClassAutosuggestResults.value}`
  );

  if (!resultsScrollElement) {
    return
  }

  const itemElement = resultsScrollElement.querySelector(`#${componentAttrPrefix.value}__results-item--${index}`);
  if (!itemElement) {
    return;
  }

  const resultsScrollWindowHeight = resultsScrollElement.clientHeight;
  const resultsScrollScrollTop = resultsScrollElement.scrollTop;

  const itemHeight = itemElement.clientHeight;
  const currentItemScrollOffset = itemElement.offsetTop;

  if (
    itemHeight + currentItemScrollOffset >= resultsScrollScrollTop + resultsScrollWindowHeight
  ) {
    /** Current item goes below visible scroll window */
    resultsScrollElement.scrollTop = itemHeight + currentItemScrollOffset - resultsScrollWindowHeight;
  } else if (currentItemScrollOffset < resultsScrollScrollTop && resultsScrollScrollTop > 0) {
    /** Current item goes above visible scroll window */
    resultsScrollElement.scrollTop = currentItemScrollOffset;
  }
};

/**
 * @param {Number} index
 */
const updateCurrentIndex = (index) => {
  setCurrentIndex(index, -1, true);
};

/**
 * Helper to detect if the user clicked on the scrollbar
 * @param {MouseEvent} e
 * @param {Number} mouseX - horizontal position of the mouse relative to
 *   results e.g. an offset of clientX
 */
const clickedOnScrollbar = (e, mouseX) => {
  const results = document.querySelector(`.${_componentAttrClassAutosuggestResults.value}`);

  const mouseIsInsideScrollbar = results && results.clientWidth <= (mouseX + 17) &&
    mouseX + 17 <= results.clientWidth + 34
  return e.target.tagName === 'DIV' && results && mouseIsInsideScrollbar || false;
};

/**
 * Capture mousedown position so we can use it to detect if the scrollbar
 * was clicked
 * @param {MouseEvent} e
 */
const onDocumentMouseDown = (e) => {
  var rect = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : 0;
  clientXMouseDownInitial.value = e.clientX - rect.left;
};

/**
 * 'mouseup' event handler
 * @param {MouseEvent} e
 */
const onDocumentMouseUp = (e) => {
  /** Do not re-render list on input click  */
  const isChild = document.contains(e.target);

  /* Clicks outside of dropdown */
  if (!isChild) {
    loading.value = true;
    currentIndex.value = null;
    return;
  }

  if (e.target.tagName === 'INPUT' ||
    (clickedOnScrollbar(e, clientXMouseDownInitial.value))) {
    return;
  }

  /** Selects an item in the dropdown */
  loading.value = true;
  didSelectFromOptions.value = true;
  setChangeItem(getItemByIndex(currentIndex.value), true);
  listeners.value.selected(true);
};

/**
 * Sets the current index of the highlighted object, useful for aria
 * attributes like `aria-activedescendant` and toggling which result item
 * is highlighted.
 * @param {Number} newIndex
 * @param {Number} limit
 * @param {Boolean} onHover detects if the user is hovering vs. selected
 */
const setCurrentIndex = (newIndex, limit = -1, onHover = false) => {
  let adjustedValue = newIndex;

  /**
   * If you're not hovering, you might be keying outside of the bounds, so
   * we need to make sure that we adjust for the limits.
   */
  if (!onHover){
    const hitLowerLimt = currentIndex.value === null
    const hitUpperLimit = newIndex >= limit
    if (hitLowerLimt || hitUpperLimit) {
      adjustedValue = 0;
    }
  }

  currentIndex.value = adjustedValue;
  const element = document.querySelector(`#${componentAttrPrefix.value}__results-item--${currentIndex.value}`);
  const hoverClass = `${componentAttrPrefix.value}__results-item--highlighted`;

  if (document.querySelector(`.${hoverClass}`)) {
    removeClass(document.querySelector(`.${hoverClass}`), hoverClass);
  }
  if (element) {
    addClass(element, hoverClass);
  }
};

onBeforeMount(() => {
  loading.value = true;
})

onMounted(() => {
  document.addEventListener("mouseup", onDocumentMouseUp);
  document.addEventListener("mousedown", onDocumentMouseDown);
})

onUnmounted(() => {
  document.removeEventListener("mouseup", onDocumentMouseUp)
  document.removeEventListener("mousedown", onDocumentMouseDown)
})

</script>
