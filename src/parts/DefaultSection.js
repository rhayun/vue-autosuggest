import { h, defineComponent, Fragment, toRefs, computed } from "vue";

const DefaultSection = defineComponent({
  name: "DefaultSection",
  props: {
    section: {
      type: Object,
      required: true,
    },
    currentIndex: {
      type: [Number, String],
      required: false,
      default: Infinity,
    },
    renderSuggestion: {
      type: Function,
      required: false,
    },
    normalizeItemFunction: {
      type: Function,
      required: true,
    },
    componentAttrPrefix: {
      type: String,
      required: true,
    },
    componentAttrIdAutosuggest: {
      type: String,
      required: true,
    },
  },
  emits: ["updateCurrentIndex"],
  setup(props, { slots: $slots, emit }) {
    const {
      section,
      currentIndex,
      renderSuggestion,
      normalizeItemFunction,
      componentAttrPrefix,
      componentAttrIdAutosuggest,
    } = toRefs(props);

    let _currentIndex = currentIndex.value;

    const list = computed(() => {
      let { limit, data } = section.value;
      if (data.length < limit) {
        limit = data.length;
      }
      return data.slice(0, limit);
    });

    const getItemIndex = (i) => {
      return section.value.start_index + i;
    };

    const onMouseEnter = (event) => {
      const idx = parseInt(event.currentTarget.getAttribute("data-suggestion-index"));
      _currentIndex = idx;
      emit("updateCurrentIndex", idx);
    };

    const onMouseLeave = () => {
      emit("updateCurrentIndex", null);
    };

    const slots = {
      beforeSection: $slots[`before-section-${section.value.name}`],
      afterSectionDefault: $slots[`after-section`],
      afterSectionNamed: $slots[`after-section-${section.value.name}`],
    };

    const beforeClassName = `${componentAttrPrefix.value}__results-before ${componentAttrPrefix.value}__results-before--${section.value.name}`;
    const before =
      (slots.beforeSection &&
        slots
          .beforeSection({
            section: section.value,
            className: beforeClassName,
          })
          // Skip fragments without children, this can be for example `<slot>` or empty `<template>`
          .filter((x) => x.type !== Fragment && x.children.length === 0)) ||
      [];

    return () =>
      h(
        "ul",
        {
          role: "listbox",
          class: section.value.ulClass,
          "aria-labelledby":
            section.value.label && `${componentAttrIdAutosuggest.value}-${section.value.label}`,
        },
        [
          (before[0] && before[0]) ||
            (section.value.label &&
              h(
                "li",
                {
                  class: beforeClassName,
                  id: `${componentAttrIdAutosuggest.value}-${section.value.label}`,
                },
                [section.value.label]
              )) ||
            "",
          list.value.map((val, key) => {
            const item = normalizeItemFunction.value(
              section.value.name,
              section.value.type,
              section.value.label,
              section.value.liClass,
              val
            );

            const itemIndex = getItemIndex(key);
            const isHighlighted =
              _currentIndex === itemIndex || parseInt(_currentIndex) === itemIndex;

            return h(
              "li",
              {
                role: "option",
                "data-suggestion-index": itemIndex,
                "data-section-name": item.name,
                id: `${componentAttrPrefix.value}__results-item--${itemIndex}`,
                ...item.liAttributes,
                key: itemIndex,
                class: {
                  [`${componentAttrPrefix.value}__results-item--highlighted`]: isHighlighted,
                  [`${componentAttrPrefix.value}__results-item`]: true,
                  ...item.liClass,
                },
                onMouseenter: onMouseEnter,
                onMouseleave: onMouseLeave,
              },
              [
                renderSuggestion.value
                  ? renderSuggestion.value(item)
                  : $slots.default &&
                    $slots.default({
                      _key: key,
                      suggestion: item,
                    }),
              ]
            );
          }),
          slots.afterSectionDefault &&
            slots.afterSectionDefault({
              section: section.value,
              className: `${componentAttrPrefix.value}__results-after ${componentAttrPrefix.value}__results-after--${section.value.name}`,
            }),
          slots.afterSectionNamed &&
            slots.afterSectionNamed({
              section: section.value,
              className: `${componentAttrPrefix.value}__results_after ${componentAttrPrefix.value}__results-after--${section.value.name}`,
            }),
        ]
      );
  },
  methods: {
    getItemByIndex: function (i) {
      return this.section.data[i];
    },
  },
});

export default DefaultSection;
