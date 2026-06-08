import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import ToolbarDropdown from './ToolbarDropdown.vue';

const waitForAnimationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
let wrapper;
const originalInnerHeight = window.innerHeight;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
});

describe('ToolbarDropdown keyboard focus', () => {
  it('returns focus to the trigger when Escape closes after option navigation', async () => {
    const Harness = defineComponent({
      components: { ToolbarDropdown },
      setup() {
        const show = ref(false);
        const options = [
          { key: 'georgia', label: 'Georgia', props: { class: 'sd-selected' } },
          { key: 'arial', label: 'Arial', props: {} },
          { key: 'courier', label: 'Courier New', props: {} },
        ];
        return { options, show };
      },
      template: `
        <ToolbarDropdown v-model:show="show" :options="options">
          <template #trigger>
            <button data-test="trigger" type="button">Font family</button>
          </template>
        </ToolbarDropdown>
      `,
    });

    wrapper = mount(Harness, { attachTo: document.body });
    const trigger = wrapper.get('[data-test="trigger"]');
    trigger.element.focus();
    expect(document.activeElement).toBe(trigger.element);

    wrapper.vm.show = true;
    await nextTick();
    await nextTick();

    const options = document.body.querySelectorAll('.toolbar-dropdown-option');
    expect(options).toHaveLength(3);
    expect(document.activeElement).toBe(options[0]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(options[1]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    await waitForAnimationFrame();

    expect(document.activeElement).toBe(trigger.element);
  });

  it('constrains long menus to the available viewport height', async () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 220 });

    const Harness = defineComponent({
      components: { ToolbarDropdown },
      setup() {
        const show = ref(false);
        const options = Array.from({ length: 30 }, (_, index) => ({
          key: `font-${index}`,
          label: `Font ${index}`,
          props: {},
        }));
        return { options, show };
      },
      template: `
        <ToolbarDropdown v-model:show="show" :options="options">
          <template #trigger>
            <button data-test="trigger" type="button">Font family</button>
          </template>
        </ToolbarDropdown>
      `,
    });

    wrapper = mount(Harness, { attachTo: document.body });
    const triggerRoot = wrapper.get('[data-sd-part="dropdown-trigger"]').element;
    triggerRoot.getBoundingClientRect = () => ({
      bottom: 40,
      left: 10,
      right: 120,
      top: 8,
      width: 110,
      height: 32,
      x: 10,
      y: 8,
      toJSON: () => {},
    });

    wrapper.vm.show = true;
    await nextTick();
    await nextTick();

    const menu = document.body.querySelector('.toolbar-dropdown-menu');
    expect(menu.style.maxHeight).toBe('168px');
  });
});
