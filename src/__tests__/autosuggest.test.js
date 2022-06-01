import { mount } from "@vue/test-utils";
import { expect } from "vitest";
import Autosuggest from "../Autosuggest.vue";

Element.prototype.scrollTo = () => {}; // https://github.com/vuejs/vue-test-utils/issues/319

// Helper to call function x number of times
const times = (x) => (f) => {
  if (x > 0) {
    f();
    times(x - 1)(f);
  }
};

describe("Autosuggest", () => {
  const id = `autosuggest__input`;
  const filteredOptions = [
    {
      data: [
        "clifford kits",
        "friendly chemistry",
        "phonics",
        "life of fred",
        "life of fred math",
        "magic school bus",
        "math mammoth light blue",
        "handwriting",
        "math",
        "minecraft",
        "free worksheets",
        "4th grade",
        "snap circuits",
        "bath toys",
        "channies",
        "fred",
        "lego",
        "math life of fred",
        "multiplication",
        "thinking tree",
      ],
    },
  ];

  const defaultProps = {
    suggestions: filteredOptions,
    inputProps: {
      id,
      placeholder: "Type 'G'",
    },
    sectionConfigs: {
      default: {
        limit: 5,
        onSelected: () => {},
      },
    },
  };

  const defaultListeners = {
    click: () => {},
  };

  it("can mount", () => {
    const props = Object.assign({}, defaultProps);
    props.inputProps = Object.assign({}, defaultProps.inputProps);
    props.suggestions = [filteredOptions[0]];

    const wrapper = mount(Autosuggest, {
      props,
      shallow: true,
    });

    const input = wrapper.find('input[type="text"]');
    input.setValue("q");

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("can render suggestions", () => {
    const props = Object.assign({}, defaultProps);
    props.inputProps = Object.assign({}, defaultProps.inputProps);

    const wrapper = mount(Autosuggest, {
      props,
      attachToDocument: true,
    });

    const input = wrapper.find("input");
    expect(input.attributes("id", defaultProps.inputProps.id)).toBeTruthy();

    input.trigger("click");
    input.setValue("G");
    input.trigger("keydown.down");

    expect(wrapper.findAll(`ul li`).length).toBeLessThanOrEqual(
      defaultProps.sectionConfigs.default.limit
    );

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("can use escape key to exit", async () => {
    const wrapper = mount(Autosuggest, {
      props: defaultProps,
      listeners: defaultListeners,
    });

    const input = wrapper.find("input");
    input.trigger("click");
    input.setValue("G");
    input.trigger("keydown.up"); // Check it doesn't offset the selection by going up first when nothing is selected.

    // TODO: test these keys are actually returning early.
    input.trigger("keydown", {
      keyCode: 16, // Shift
    });
    input.trigger("keydown", {
      keyCode: 9, // Tab
    });
    input.trigger("keydown", {
      keyCode: 18, // alt/option
    });
    input.trigger("keydown", {
      keyCode: 91, // OS Key
    });
    input.trigger("keydown", {
      keyCode: 93, // Right OS Key
    });

    input.trigger("keydown.down");

    expect(wrapper.findAll(`ul li`).length).toBeLessThanOrEqual(
      defaultProps.sectionConfigs.default.limit
    );

    input.trigger("keydown.esc");
    expect(wrapper.findAll(`ul li`).length).toEqual(0);

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("can select from suggestions using keystroke", async () => {
    const wrapper = mount(Autosuggest, {
      props: defaultProps,
      attachToDocument: true,
    });

    const input = wrapper.find("input");
    input.trigger("click");
    input.setValue("G");

    times(5)(() => {
      input.trigger("keydown.down");
    });

    times(5)(() => {
      input.trigger("keydown.up");
    });

    input.trigger("keydown.enter");

    await wrapper.vm.$nextTick(() => {});

    expect(wrapper.html()).toMatchSnapshot();
  });
});
