import uuidv4 from 'uuid/v4';
import { setTimeout, clearTimeout } from 'timers';
import FlashMessageComponent from './FlashMessageComponent';

require('./FlashMessage.css');

function isFunction(functionToCheck) {
  const getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

class FlashMessage {
  constructor(Bus, messageContent, messageType, messageOptions, globalDefaults) {
    const defaults = {
      autoEmit: true,
      important: false,
      pauseOnInteract: false,
      timeout: 0,

      // callbacks
      beforeDestroy: null,
      onStartInteract: null,
      onCompleteInteract: null,
    };
    this.storage = Bus;
    this.content = messageContent;
    this.options = Object.assign(defaults, globalDefaults, messageOptions);
    this.type = messageType;
    this.id = uuidv4();
    this.timer = null;

    if (this.options.autoEmit) {
      this.emit();
    }
  }

  emit() {
    this.storage.push(this.id, this);
    this.startSelfDestructTimer();
  }

  destroy() {
    this.killSelfDestructTimer();
    this.beforeDestroy();
    this.storage.destroy(this.id);
  }

  setSelfDestructTimeout(timeout) {
    this.options.timeout = timeout;
  }

  startSelfDestructTimer() {
    if (this.options.timeout > 0) {
      setTimeout(() => {
        this.destroy();
      }, this.options.timeout);
    }
  }

  killSelfDestructTimer() {
    clearTimeout(this.timer);
  }

  beforeDestroy() {
    if (isFunction(this.options.beforeDestroy)) {
      this.options.beforeDestroy();
    }
  }

  onStartInteract() {
    if (this.options.pauseOnInteract) {
      this.killSelfDestructTimer();
    }
    if (isFunction(this.options.onStartInteract)) {
      this.options.onStartInteract();
    }
  }

  onCompleteInteract() {
    if (this.options.pauseOnInteract) {
      this.startSelfDestructTimer();
    }
    if (isFunction(this.options.onCompleteInteract)) {
      this.options.onCompleteInteract();
    }
  }
}

export default {
  install(Vue, config = {}) {
    const defaults = {
      method: 'flash',
      storage: '$flashStorage',
      createShortcuts: true,
      name: 'flash-message',
    };
    const options = Object.assign(defaults, config);
    const FlashBus = new Vue({
      data() {
        return {
          storage: {
          },
        };
      },
      methods: {
        flash(msg, type, opts) {
          return new FlashMessage(FlashBus, msg, type, opts);
        },
        push(id, message) {
          Vue.set(this.storage, id, message);
        },
        destroy(id) {
          Vue.delete(this.storage, id);
        },
        destroyAll() {
          Vue.set(this, 'storage', {});
        },
      },
    });

    const shortcuts = !options.createShortcuts ? {} : {
      info(msg, opts) {
        return this[options.method](msg, 'info', opts);
      },
      error(msg, opts) {
        return this[options.method](msg, 'error', opts);
      },
      warning(msg, opts) {
        return this[options.method](msg, 'warning', opts);
      },
      success(msg, opts) {
        return this[options.method](msg, 'success', opts);
      },
    };

    Vue.mixin({
      methods: {
        [options.method](msg, type, opts) {
          if (arguments.length > 0) {
            return new FlashMessage(FlashBus, msg, type, opts, options.messageOptions);
          }
          return FlashBus;
        },
        ...shortcuts,
      },
    });

    Vue.prototype[options.storage] = FlashBus;

    Vue.component(options.name, FlashMessageComponent(options, FlashBus));
  },
};

export { FlashMessageComponent };
