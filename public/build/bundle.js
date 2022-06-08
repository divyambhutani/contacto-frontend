
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const cmpStore = writable("home");

    const userStore = writable({});

    const store$3 = writable("");

    const url = "https://contacto-spring.herokuapp.com:443";

    const defaultUserImage =
        "https://st3.depositphotos.com/15648834/17930/v/600/depositphotos_179308454-stock-illustration-unknown-person-silhouette-glasses-profile.jpg";

    const actions = [
        ":create",
        ":delete",
        ":delete multiple",
        ":home",
        ":profile",
        ":logout",
    ];

    const authStore = writable({
        authenticated: false,
        name: "",
        email: "",
        id: "",
        token: "",
    });

    const storeSignInDetails = (name, email, token, id) => {
        localStorage.setItem(
            "contacto-signin-details",
            JSON.stringify({
                name,
                email,
                token,
                id,
            })
        );
    };

    const getSignInDetails = () => {
        return JSON.parse(localStorage.getItem("contacto-signin-details"));
    };

    const deleteSignInDetails = () => {
        localStorage.removeItem("contacto-signin-details");
    };

    const uploadImageFile = async (file) => {
        const blob = new Blob([file], { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("image", blob);
        let token = "";
        const unsubscribe = authStore.subscribe((val) => {
            token = val.token;
        });
        unsubscribe();
        console.log(token);
        if (token) {
            let headers = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url + "/image/upload", {
                method: "POST",
                headers,
                body: formData,
            });
            if (!res.ok) {
                console.log(await res.json());
                alert("something happend while uploading image " + res.status);
                throw new Error(
                    "something happend while uploading image " + res.status
                );
            }
            const data = await res.json();
            return data.url;
        }
        return null;
    };

    const sendOTP = async (email) => {
        let headers = { "Content-Type": "application/json" };
        // if (token) {
        //     headers["Authorization"] = `Bearer ${token}`;
        // }
        const res = await fetch(url + `/password/forgotPassword?email=${email}`, {
            method: "GET",
            headers,
        });
        if (!res.ok) {
            alert("Unable to find account with this email");
            throw new Error(JSON.stringify(await res.json()));
        }
        return await res.json();
    };

    const verifyOTP = async (email, otp) => {
        let headers = { "Content-Type": "application/json" };
        // if (token) {
        //     headers["Authorization"] = `Bearer ${token}`;
        // }
        const res = await fetch(
            url + "/password/verifyOTP?enteredOtp=" + otp + "&email=" + email,
            {
                method: "GET",
                headers,
            }
        );
        if (!res.ok) {
            alert("Unable to find account with this email");
            throw new Error(JSON.stringify(await res.json()));
        }
        return await res.json();
    };

    const store$2 = writable({ keyword: "", searchContacts: true });

    /* src/UI/ActionOption.svelte generated by Svelte v3.48.0 */
    const file$d = "src/UI/ActionOption.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    // (6:4) {#each actions as action}
    function create_each_block$2(ctx) {
    	let option;

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.__value = /*action*/ ctx[0];
    			option.value = option.__value;
    			add_location(option, file$d, 6, 8, 146);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(6:4) {#each actions as action}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let datalist;
    	let each_value = actions;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			datalist = element("datalist");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(datalist, "id", "actions");
    			attr_dev(datalist, "for", "actions");
    			add_location(datalist, file$d, 4, 0, 70);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, datalist, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(datalist, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*actions*/ 0) {
    				each_value = actions;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(datalist, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(datalist);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ActionOption', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ActionOption> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ actions });
    	return [];
    }

    class ActionOption extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionOption",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    const store$1 = writable("light");

    /* src/UI/Navbar.svelte generated by Svelte v3.48.0 */

    const { console: console_1$7 } = globals;
    const file$c = "src/UI/Navbar.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (143:16) {#if searchActions}
    function create_if_block$9(ctx) {
    	let datalist;
    	let each_value = actions;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			datalist = element("datalist");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(datalist, "id", "actions");
    			attr_dev(datalist, "for", "actions");
    			add_location(datalist, file$c, 143, 20, 5012);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, datalist, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(datalist, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*actions*/ 0) {
    				each_value = actions;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(datalist, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(datalist);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(143:16) {#if searchActions}",
    		ctx
    	});

    	return block;
    }

    // (145:24) {#each actions as action}
    function create_each_block$1(ctx) {
    	let option;

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.__value = /*action*/ ctx[12];
    			option.value = option.__value;
    			add_location(option, file$c, 145, 28, 5128);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(145:24) {#each actions as action}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let nav;
    	let div2;
    	let div1;
    	let ul1;
    	let li0;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let li1;
    	let a0;
    	let t2;
    	let li2;
    	let a1;
    	let t4;
    	let li4;
    	let a2;
    	let t6;
    	let ul0;
    	let li3;
    	let a3;
    	let t8;
    	let li5;
    	let a4;
    	let t10;
    	let form;
    	let input;
    	let t11;
    	let mounted;
    	let dispose;
    	let if_block = /*searchActions*/ ctx[0] && create_if_block$9(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div2 = element("div");
    			div1 = element("div");
    			ul1 = element("ul");
    			li0 = element("li");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			li1 = element("li");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t2 = space();
    			li2 = element("li");
    			a1 = element("a");
    			a1.textContent = "Profile";
    			t4 = space();
    			li4 = element("li");
    			a2 = element("a");
    			a2.textContent = "Actions";
    			t6 = space();
    			ul0 = element("ul");
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Delete Multiple";
    			t8 = space();
    			li5 = element("li");
    			a4 = element("a");
    			a4.textContent = "Logout";
    			t10 = space();
    			form = element("form");
    			input = element("input");
    			t11 = space();
    			if (if_block) if_block.c();
    			attr_dev(img, "class", "img-fluid my-img svelte-k2oo66");
    			if (!src_url_equal(img.src, img_src_value = /*userImage*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "user profile");
    			add_location(img, file$c, 65, 24, 2066);
    			attr_dev(div0, "class", "my-img-ctn svelte-k2oo66");
    			attr_dev(div0, "href", "#");
    			add_location(div0, file$c, 60, 20, 1876);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$c, 59, 16, 1834);
    			attr_dev(a0, "class", "nav-link active");
    			attr_dev(a0, "aria-current", "page");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$c, 73, 20, 2349);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$c, 72, 16, 2307);
    			attr_dev(a1, "class", "nav-link active");
    			attr_dev(a1, "aria-current", "page");
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$c, 81, 20, 2647);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$c, 80, 16, 2605);
    			attr_dev(a2, "class", "nav-link dropdown-toggle");
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "id", "navbarDropdown");
    			attr_dev(a2, "role", "button");
    			attr_dev(a2, "data-bs-toggle", "dropdown");
    			attr_dev(a2, "aria-expanded", "false");
    			add_location(a2, file$c, 90, 20, 2961);
    			attr_dev(a3, "class", "dropdown-item");
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$c, 102, 28, 3448);
    			add_location(li3, file$c, 101, 24, 3415);
    			attr_dev(ul0, "class", "dropdown-menu");
    			attr_dev(ul0, "aria-labelledby", "navbarDropdown");
    			add_location(ul0, file$c, 100, 20, 3331);
    			attr_dev(li4, "class", "nav-item dropdown");
    			add_location(li4, file$c, 89, 16, 2910);
    			attr_dev(a4, "class", "nav-link active");
    			attr_dev(a4, "aria-current", "page");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$c, 123, 20, 4337);
    			attr_dev(li5, "class", "nav-item");
    			add_location(li5, file$c, 122, 16, 4295);
    			attr_dev(ul1, "class", "navbar-nav me-auto mb-2 mb-lg-0");
    			add_location(ul1, file$c, 58, 12, 1773);
    			attr_dev(input, "class", "form-control me-2");
    			attr_dev(input, "placeholder", "Search");
    			attr_dev(input, "aria-label", "Search");
    			attr_dev(input, "for", "actions");
    			attr_dev(input, "list", "actions");
    			add_location(input, file$c, 132, 16, 4643);
    			attr_dev(form, "class", "d-flex");
    			attr_dev(form, "role", "search");
    			add_location(form, file$c, 131, 12, 4591);
    			attr_dev(div1, "class", "collapse navbar-collapse");
    			attr_dev(div1, "id", "navbarSupportedContent");
    			add_location(div1, file$c, 57, 8, 1694);
    			attr_dev(div2, "class", "container-fluid");
    			add_location(div2, file$c, 56, 4, 1656);
    			attr_dev(nav, "class", "navbar navbar-expand-lg bg-light");
    			add_location(nav, file$c, 55, 0, 1605);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, div1);
    			append_dev(div1, ul1);
    			append_dev(ul1, li0);
    			append_dev(li0, div0);
    			append_dev(div0, img);
    			append_dev(ul1, t0);
    			append_dev(ul1, li1);
    			append_dev(li1, a0);
    			append_dev(ul1, t2);
    			append_dev(ul1, li2);
    			append_dev(li2, a1);
    			append_dev(ul1, t4);
    			append_dev(ul1, li4);
    			append_dev(li4, a2);
    			append_dev(li4, t6);
    			append_dev(li4, ul0);
    			append_dev(ul0, li3);
    			append_dev(li3, a3);
    			append_dev(ul1, t8);
    			append_dev(ul1, li5);
    			append_dev(li5, a4);
    			append_dev(div1, t10);
    			append_dev(div1, form);
    			append_dev(form, input);
    			set_input_value(input, /*searchTerm*/ ctx[2]);
    			append_dev(form, t11);
    			if (if_block) if_block.m(form, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(a0, "click", /*click_handler_1*/ ctx[7], false, false, false),
    					listen_dev(a1, "click", /*click_handler_2*/ ctx[8], false, false, false),
    					listen_dev(a3, "click", /*click_handler_3*/ ctx[9], false, false, false),
    					listen_dev(a4, "click", /*logOut*/ ctx[4], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[10]),
    					listen_dev(input, "input", /*onSearchChange*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*userImage*/ 2 && !src_url_equal(img.src, img_src_value = /*userImage*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*searchTerm*/ 4 && input.value !== /*searchTerm*/ ctx[2]) {
    				set_input_value(input, /*searchTerm*/ ctx[2]);
    			}

    			if (/*searchActions*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$9(ctx);
    					if_block.c();
    					if_block.m(form, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	let userImage = defaultUserImage;
    	let searchTerm = "";
    	let searchActions = false;

    	const changePage = page => {
    		cmpStore.update(val => {
    			return page;
    		});
    	};

    	let unsubscribe;

    	onMount(() => {
    		unsubscribe = userStore.subscribe(val => {
    			$$invalidate(1, userImage = val.image);
    		});
    	});

    	onDestroy(() => {
    		unsubscribe();
    	});

    	const logOut = () => {
    		deleteSignInDetails();
    		location.reload();
    	};

    	const onSearchChange = event => {
    		const term = searchTerm.trim();
    		let searchContacts = true;

    		if (term.length > 0) {
    			searchContacts = term[0] !== ":";
    			$$invalidate(0, searchActions = !searchContacts);
    		} else if (term.length === 0) {
    			$$invalidate(0, searchActions = !searchContacts);
    		}

    		store$2.update(val => {
    			return { keyword: term, searchContacts };
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$7.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => changePage("profile");
    	const click_handler_1 = () => changePage("home");
    	const click_handler_2 = () => changePage("profile");
    	const click_handler_3 = () => store$3.update(val => "delete-multiple");

    	function input_input_handler() {
    		searchTerm = this.value;
    		$$invalidate(2, searchTerm);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		cmpStore,
    		userStore,
    		navEventStore: store$3,
    		defaultUserImage,
    		deleteSignInDetails,
    		searchTermStore: store$2,
    		ActionOptions: ActionOption,
    		actions,
    		themeStore: store$1,
    		userImage,
    		searchTerm,
    		searchActions,
    		changePage,
    		unsubscribe,
    		logOut,
    		onSearchChange
    	});

    	$$self.$inject_state = $$props => {
    		if ('userImage' in $$props) $$invalidate(1, userImage = $$props.userImage);
    		if ('searchTerm' in $$props) $$invalidate(2, searchTerm = $$props.searchTerm);
    		if ('searchActions' in $$props) $$invalidate(0, searchActions = $$props.searchActions);
    		if ('unsubscribe' in $$props) unsubscribe = $$props.unsubscribe;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*searchActions*/ 1) {
    			console.log(searchActions);
    		}
    	};

    	return [
    		searchActions,
    		userImage,
    		searchTerm,
    		changePage,
    		logOut,
    		onSearchChange,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		input_input_handler
    	];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    const signup = async (name, email, password, phoneNo) => {
        const res = await fetch(url + "/users/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, email, password, phoneNo }),
        });

        if (!res.ok) {
            alert("something happend while signup " + res.status);
            throw new Error("some error making singin call");
        }

        const data = await res.json();

        return data;
    };

    const signin = async (email, password) => {
        const res = await fetch(url + "/users/signin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const parseRes = await res.json();
            alert("something happend while signin");
            throw new Error(parseRes);
        }
        const data = await res.json();
        return data;
    };

    const getUser = async () => {
        let id = "",
            token = "";
        const unsubscribe = authStore.subscribe((val) => {
            id = val.id;
            token = val.token;
        });
        unsubscribe();

        if (id && token) {
            let headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url + "/users/getUser?userId=" + id, {
                method: "GET",
                headers,
            });
            if (!res.ok) {
                alert("something happend while fetching user " + res.status);
                throw new Error("something happend while signin " + res.status);
            }
            const user = await res.json();
            return user;
        }
        return null;
    };

    const updateUser = async (updatedUser) => {
        let id, token;
        const unsubscribe = authStore.subscribe((val) => {
            id = val.id;
            token = val.token;
        });
        unsubscribe();
        if (id && token) {
            let headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url + "/users/updateProfile", {
                method: "PUT",
                headers,
                body: JSON.stringify(updatedUser),
            });
            if (!res.ok) {
                throw new Error(JSON.stringify(await res.json()));
            }
        }
    };

    const changePassword = async (email, password) => {
        if (email && password) {
            let headers = { "Content-Type": "application/json" };
            const res = await fetch(url + "/password/changePassword", {
                method: "POST",
                headers,
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                throw new Error(JSON.stringify(await res.json()));
            }
        }
    };

    /* src/forms/Form.svelte generated by Svelte v3.48.0 */

    const { console: console_1$6 } = globals;
    const file$b = "src/forms/Form.svelte";

    function create_fragment$c(ctx) {
    	let div4;
    	let form;
    	let h2;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let div1;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let div2;
    	let label2;
    	let t9;
    	let input2;
    	let t10;
    	let div3;
    	let label3;
    	let t12;
    	let input3;
    	let t13;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			form = element("form");
    			h2 = element("h2");
    			h2.textContent = "Sign Up";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Email";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Name";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Password";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div3 = element("div");
    			label3 = element("label");
    			label3.textContent = "Phone Number";
    			t12 = space();
    			input3 = element("input");
    			t13 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(h2, "class", "title svelte-gkmq5t");
    			add_location(h2, file$b, 20, 8, 584);
    			attr_dev(label0, "class", "label svelte-gkmq5t");
    			attr_dev(label0, "for", "email");
    			add_location(label0, file$b, 22, 12, 664);
    			attr_dev(input0, "class", "input svelte-gkmq5t");
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "placeholder", "Email");
    			add_location(input0, file$b, 23, 12, 723);
    			attr_dev(div0, "class", "inputContainer svelte-gkmq5t");
    			add_location(div0, file$b, 21, 8, 623);
    			attr_dev(label1, "class", "label svelte-gkmq5t");
    			attr_dev(label1, "for", "name");
    			add_location(label1, file$b, 33, 12, 969);
    			attr_dev(input1, "class", "input svelte-gkmq5t");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "name", "name");
    			add_location(input1, file$b, 34, 12, 1026);
    			attr_dev(div1, "class", "inputContainer svelte-gkmq5t");
    			add_location(div1, file$b, 32, 8, 928);
    			attr_dev(label2, "class", "label svelte-gkmq5t");
    			attr_dev(label2, "for", "password");
    			add_location(label2, file$b, 38, 12, 1157);
    			attr_dev(input2, "class", "input svelte-gkmq5t");
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "name", "password");
    			add_location(input2, file$b, 39, 12, 1223);
    			attr_dev(div2, "class", "inputContainer svelte-gkmq5t");
    			add_location(div2, file$b, 37, 8, 1116);
    			attr_dev(label3, "class", "label svelte-gkmq5t");
    			attr_dev(label3, "for", "phoneNo");
    			add_location(label3, file$b, 47, 12, 1441);
    			attr_dev(input3, "class", "input svelte-gkmq5t");
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "name", "phoneNo");
    			add_location(input3, file$b, 48, 12, 1510);
    			attr_dev(div3, "class", "inputContainer svelte-gkmq5t");
    			add_location(div3, file$b, 46, 8, 1400);
    			attr_dev(button, "class", "submitBtn svelte-gkmq5t");
    			attr_dev(button, "type", "submit");
    			add_location(button, file$b, 55, 8, 1681);
    			attr_dev(form, "class", "form svelte-gkmq5t");
    			add_location(form, file$b, 19, 4, 513);
    			attr_dev(div4, "class", "signupFrm svelte-gkmq5t");
    			add_location(div4, file$b, 18, 0, 485);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, form);
    			append_dev(form, h2);
    			append_dev(form, t1);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*email*/ ctx[1]);
    			append_dev(form, t4);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			set_input_value(input1, /*name*/ ctx[0]);
    			append_dev(form, t7);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t9);
    			append_dev(div2, input2);
    			set_input_value(input2, /*password*/ ctx[2]);
    			append_dev(form, t10);
    			append_dev(form, div3);
    			append_dev(div3, label3);
    			append_dev(div3, t12);
    			append_dev(div3, input3);
    			set_input_value(input3, /*phoneNo*/ ctx[3]);
    			append_dev(form, t13);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[7]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[8]),
    					listen_dev(form, "submit", prevent_default(/*onSubmitHanlder*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 2 && input0.value !== /*email*/ ctx[1]) {
    				set_input_value(input0, /*email*/ ctx[1]);
    			}

    			if (dirty & /*name*/ 1 && input1.value !== /*name*/ ctx[0]) {
    				set_input_value(input1, /*name*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 4 && input2.value !== /*password*/ ctx[2]) {
    				set_input_value(input2, /*password*/ ctx[2]);
    			}

    			if (dirty & /*phoneNo*/ 8 && input3.value !== /*phoneNo*/ ctx[3]) {
    				set_input_value(input3, /*phoneNo*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Form', slots, []);
    	let name;
    	let email;
    	let password;
    	let phoneNo;

    	const onSubmitHanlder = async () => {
    		const data = await signup(name, email, password, phoneNo);

    		if (data != null) {
    			alert("User signed up!\n Please verify on your mail and sign in");
    		}

    		console.log(data);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$6.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(1, email);
    	}

    	function input1_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input2_input_handler() {
    		password = this.value;
    		$$invalidate(2, password);
    	}

    	function input3_input_handler() {
    		phoneNo = this.value;
    		$$invalidate(3, phoneNo);
    	}

    	$$self.$capture_state = () => ({
    		signup,
    		authStore,
    		url,
    		name,
    		email,
    		password,
    		phoneNo,
    		onSubmitHanlder
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('email' in $$props) $$invalidate(1, email = $$props.email);
    		if ('password' in $$props) $$invalidate(2, password = $$props.password);
    		if ('phoneNo' in $$props) $$invalidate(3, phoneNo = $$props.phoneNo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		email,
    		password,
    		phoneNo,
    		onSubmitHanlder,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    function isEmpty(val) {
        return val.trim().length === 0;
    }

    function isValidEmail(val) {
        return new RegExp(
            "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
        ).test(val);
    }

    /* src/UI/Loader.svelte generated by Svelte v3.48.0 */

    const file$a = "src/UI/Loader.svelte";

    function create_fragment$b(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "spinner svelte-ccbde");
    			add_location(div0, file$a, 1, 4, 25);
    			attr_dev(div1, "class", "my-ctn svelte-ccbde");
    			add_location(div1, file$a, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Loader', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Loader> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Loader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loader",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/forms/SignInForm.svelte generated by Svelte v3.48.0 */

    const { console: console_1$5 } = globals;
    const file$9 = "src/forms/SignInForm.svelte";

    // (100:0) {#if isLoading}
    function create_if_block$8(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(100:0) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let t0;
    	let div2;
    	let form;
    	let h2;
    	let t2;
    	let div0;
    	let label0;
    	let t4;
    	let input0;
    	let t5;
    	let div1;
    	let label1;
    	let t7;
    	let input1;
    	let t8;
    	let span;
    	let button0;
    	let t10;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*isLoading*/ ctx[2] && create_if_block$8(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			div2 = element("div");
    			form = element("form");
    			h2 = element("h2");
    			h2.textContent = "Sign In";
    			t2 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Email";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Password";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			span = element("span");
    			button0 = element("button");
    			button0.textContent = "Forgot Password";
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "Submit";
    			attr_dev(h2, "class", "title svelte-2y0qo7");
    			add_location(h2, file$9, 105, 8, 3028);
    			attr_dev(label0, "for", "email");
    			attr_dev(label0, "class", "label svelte-2y0qo7");
    			add_location(label0, file$9, 107, 12, 3108);
    			attr_dev(input0, "class", "input svelte-2y0qo7");
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "placeholder", "Email");
    			add_location(input0, file$9, 108, 12, 3167);
    			attr_dev(div0, "class", "inputContainer svelte-2y0qo7");
    			add_location(div0, file$9, 106, 8, 3067);
    			attr_dev(label1, "for", "password");
    			attr_dev(label1, "class", "label svelte-2y0qo7");
    			add_location(label1, file$9, 118, 12, 3413);
    			attr_dev(input1, "class", "input svelte-2y0qo7");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "name", "password");
    			attr_dev(input1, "placeholder", "Password");
    			add_location(input1, file$9, 119, 12, 3479);
    			attr_dev(div1, "class", "inputContainer svelte-2y0qo7");
    			add_location(div1, file$9, 117, 8, 3372);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "submitBtn svelte-2y0qo7");
    			add_location(button0, file$9, 128, 12, 3730);
    			attr_dev(button1, "type", "submit");
    			attr_dev(button1, "class", "submitBtn svelte-2y0qo7");
    			add_location(button1, file$9, 131, 12, 3866);
    			attr_dev(span, "class", "my-span svelte-2y0qo7");
    			add_location(span, file$9, 127, 8, 3695);
    			attr_dev(form, "class", "form svelte-2y0qo7");
    			add_location(form, file$9, 104, 4, 2957);
    			attr_dev(div2, "class", "signupFrm svelte-2y0qo7");
    			add_location(div2, file$9, 103, 0, 2929);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, form);
    			append_dev(form, h2);
    			append_dev(form, t2);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t4);
    			append_dev(div0, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append_dev(form, t5);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t7);
    			append_dev(div1, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t8);
    			append_dev(form, span);
    			append_dev(span, button0);
    			append_dev(span, t10);
    			append_dev(span, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(button0, "click", /*forgotPassHandler*/ ctx[4], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*onSubmitHanlder*/ ctx[3]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isLoading*/ ctx[2]) {
    				if (if_block) {
    					if (dirty & /*isLoading*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SignInForm', slots, []);
    	let email;
    	let password;
    	let isLoading = false;
    	let forgotPass = false;
    	let otpVerified = false;

    	onMount(() => {
    		const data = getSignInDetails();

    		if (data && data.token && data.id) {
    			const { name, email, token, id } = data;

    			if (token && id) {
    				authStore.update(val => {
    					return {
    						...val,
    						authenticated: true,
    						token,
    						id,
    						email,
    						name
    					};
    				});
    			}
    		} else {
    			deleteSignInDetails();
    		}
    	});

    	const onSubmitHanlder = async () => {
    		let data;
    		$$invalidate(2, isLoading = true);

    		if (forgotPass && otpVerified) {
    			await changePassword(email, password);
    		}

    		try {
    			data = await signin(email, password);
    		} catch(err) {
    			console.log(err);
    			deleteSignInDetails();
    		}

    		$$invalidate(2, isLoading = false);

    		authStore.update(val => {
    			storeSignInDetails(val.name, val.email, data.token, data.userId);

    			return {
    				...val,
    				authenticated: true,
    				id: data.userId,
    				token: data.token
    			};
    		});
    	};

    	const forgotPassHandler = async () => {
    		const useremail = prompt("Please enter your email", "enter your email here");
    		$$invalidate(2, isLoading = true);

    		if (isValidEmail(useremail)) {
    			try {
    				await sendOTP(useremail);
    				$$invalidate(2, isLoading = false);
    				alert("An OTP has been sent to your phone No\nplease verfiy");
    			} catch(err) {
    				console.log(err);
    				$$invalidate(2, isLoading = false);
    				return;
    			}

    			const otp = prompt("Please enter your OTP", "enter your OTP here");
    			$$invalidate(2, isLoading = true);

    			try {
    				const data = await verifyOTP(useremail, otp);
    				$$invalidate(2, isLoading = false);
    				alert("Please sign in with password of your choice");
    				otpVerified = true;
    				forgotPass = true;
    				$$invalidate(0, email = useremail);
    			} catch(err) {
    				console.log(err);
    				$$invalidate(2, isLoading = false);
    			}
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$5.warn(`<SignInForm> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		signin,
    		changePassword,
    		deleteSignInDetails,
    		getSignInDetails,
    		storeSignInDetails,
    		sendOTP,
    		verifyOTP,
    		isValidEmail,
    		authStore,
    		Loader,
    		email,
    		password,
    		isLoading,
    		forgotPass,
    		otpVerified,
    		onSubmitHanlder,
    		forgotPassHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('isLoading' in $$props) $$invalidate(2, isLoading = $$props.isLoading);
    		if ('forgotPass' in $$props) forgotPass = $$props.forgotPass;
    		if ('otpVerified' in $$props) otpVerified = $$props.otpVerified;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		email,
    		password,
    		isLoading,
    		onSubmitHanlder,
    		forgotPassHandler,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class SignInForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SignInForm",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/user-profile/UserProfile.svelte generated by Svelte v3.48.0 */

    const { console: console_1$4 } = globals;
    const file$8 = "src/user-profile/UserProfile.svelte";

    // (110:0) {#if isLoading}
    function create_if_block$7(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(110:0) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let t0;
    	let div14;
    	let div13;
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let span0;
    	let t1;
    	let t2;
    	let span1;
    	let t3;
    	let t4;
    	let span2;
    	let t5;
    	let t6;
    	let label0;
    	let t8;
    	let input0;
    	let t9;
    	let span3;
    	let t10;
    	let div12;
    	let div11;
    	let div2;
    	let h4;
    	let t12;
    	let div4;
    	let div3;
    	let label1;
    	let input1;
    	let t14;
    	let div9;
    	let div5;
    	let label2;
    	let input2;
    	let t16;
    	let div6;
    	let label3;
    	let input3;
    	let t18;
    	let span4;
    	let div7;
    	let label4;
    	let input4;
    	let t20;
    	let div8;
    	let button0;
    	let t21;
    	let t22;
    	let div10;
    	let button1;
    	let t23;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*isLoading*/ ctx[10] && create_if_block$7(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			span0 = element("span");
    			t1 = text(/*name*/ ctx[7]);
    			t2 = space();
    			span1 = element("span");
    			t3 = text(/*email*/ ctx[8]);
    			t4 = space();
    			span2 = element("span");
    			t5 = text(/*phoneNo*/ ctx[9]);
    			t6 = space();
    			label0 = element("label");
    			label0.textContent = "Update Profile Pic";
    			t8 = space();
    			input0 = element("input");
    			t9 = space();
    			span3 = element("span");
    			t10 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div2 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Profile Settings";
    			t12 = space();
    			div4 = element("div");
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Name";
    			input1 = element("input");
    			t14 = space();
    			div9 = element("div");
    			div5 = element("div");
    			label2 = element("label");
    			label2.textContent = "Mobile Number";
    			input2 = element("input");
    			t16 = space();
    			div6 = element("div");
    			label3 = element("label");
    			label3.textContent = "Password";
    			input3 = element("input");
    			t18 = space();
    			span4 = element("span");
    			div7 = element("div");
    			label4 = element("label");
    			label4.textContent = "Confirm Password";
    			input4 = element("input");
    			t20 = space();
    			div8 = element("div");
    			button0 = element("button");
    			t21 = text("Change");
    			t22 = space();
    			div10 = element("div");
    			button1 = element("button");
    			t23 = text("Save Profile");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "rounded-circle mt-5");
    			attr_dev(img, "width", "150px");
    			if (!src_url_equal(img.src, img_src_value = /*image*/ ctx[6])) attr_dev(img, "src", img_src_value);
    			add_location(img, file$8, 118, 16, 3396);
    			attr_dev(span0, "class", "font-weight-bold");
    			add_location(span0, file$8, 123, 18, 3560);
    			attr_dev(span1, "class", "text-black-50");
    			add_location(span1, file$8, 124, 16, 3621);
    			attr_dev(span2, "class", "text-black-50");
    			add_location(span2, file$8, 125, 16, 3680);
    			attr_dev(label0, "for", "image");
    			add_location(label0, file$8, 126, 16, 3741);
    			attr_dev(input0, "name", "image");
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "class", "text-black-50");
    			add_location(input0, file$8, 127, 16, 3803);
    			add_location(span3, file$8, 134, 16, 4039);
    			attr_dev(div0, "class", "d-flex flex-column align-items-center text-center p-3 py-5");
    			add_location(div0, file$8, 115, 12, 3278);
    			attr_dev(div1, "class", "col-md-3 border-right");
    			add_location(div1, file$8, 114, 8, 3230);
    			attr_dev(h4, "class", "text-right");
    			add_location(h4, file$8, 142, 20, 4303);
    			attr_dev(div2, "class", "d-flex justify-content-between align-items-center mb-3");
    			add_location(div2, file$8, 139, 16, 4177);
    			attr_dev(label1, "class", "labels svelte-llesdr");
    			attr_dev(label1, "for", "");
    			add_location(label1, file$8, 146, 24, 4478);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control svelte-llesdr");
    			attr_dev(input1, "placeholder", "name");
    			add_location(input1, file$8, 146, 65, 4519);
    			attr_dev(div3, "class", "col-md-12");
    			add_location(div3, file$8, 145, 20, 4430);
    			attr_dev(div4, "class", "row mt-2");
    			add_location(div4, file$8, 144, 16, 4387);
    			attr_dev(label2, "class", "labels svelte-llesdr");
    			attr_dev(label2, "for", "");
    			add_location(label2, file$8, 156, 24, 4895);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "form-control svelte-llesdr");
    			attr_dev(input2, "placeholder", "enter phone number");
    			add_location(input2, file$8, 156, 74, 4945);
    			attr_dev(div5, "class", "col-md-12");
    			add_location(div5, file$8, 155, 20, 4847);
    			attr_dev(label3, "class", "labels svelte-llesdr");
    			attr_dev(label3, "for", "");
    			add_location(label3, file$8, 173, 24, 5663);
    			attr_dev(input3, "type", "password");
    			attr_dev(input3, "class", "form-control svelte-llesdr");
    			attr_dev(input3, "placeholder", "Enter new Password");
    			add_location(input3, file$8, 173, 69, 5708);
    			attr_dev(div6, "class", "col-md-12 my-btn-ctn");
    			add_location(div6, file$8, 172, 20, 5604);
    			attr_dev(label4, "class", "labels svelte-llesdr");
    			attr_dev(label4, "for", "");
    			toggle_class(label4, "invalid-label", /*invalidConfirmPass*/ ctx[11]);
    			add_location(label4, file$8, 182, 28, 6106);
    			attr_dev(input4, "type", "password");
    			attr_dev(input4, "class", "form-control svelte-llesdr");
    			attr_dev(input4, "placeholder", "Confirm new Password");
    			toggle_class(input4, "invalid-input", /*invalidConfirmPass*/ ctx[11]);
    			add_location(input4, file$8, 186, 29, 6325);
    			attr_dev(div7, "class", "col-md-12 my-btn-ctn");
    			add_location(div7, file$8, 181, 24, 6043);
    			attr_dev(button0, "class", "btn my-btn btn-primary profile-button svelte-llesdr");
    			attr_dev(button0, "type", "button");
    			button0.disabled = /*disableChangePassword*/ ctx[12];
    			add_location(button0, file$8, 198, 28, 6917);
    			attr_dev(div8, "class", "my-btn-ctn");
    			add_location(div8, file$8, 197, 24, 6864);
    			attr_dev(span4, "class", "my-span svelte-llesdr");
    			add_location(span4, file$8, 180, 20, 5996);
    			attr_dev(div9, "class", "row mt-3");
    			add_location(div9, file$8, 154, 16, 4804);
    			attr_dev(button1, "class", "btn btn-primary profile-button svelte-llesdr");
    			attr_dev(button1, "type", "button");
    			button1.disabled = /*disableSave*/ ctx[13];
    			add_location(button1, file$8, 208, 20, 7375);
    			attr_dev(div10, "class", "mt-5 text-center");
    			add_location(div10, file$8, 207, 16, 7324);
    			attr_dev(div11, "class", "p-3 py-5");
    			add_location(div11, file$8, 138, 12, 4138);
    			attr_dev(div12, "class", "col-md-5 border-right");
    			add_location(div12, file$8, 137, 8, 4090);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$8, 113, 4, 3204);
    			attr_dev(div14, "class", "container rounded bg-white mt-5 mb-5 my-ctn");
    			add_location(div14, file$8, 112, 0, 3142);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div13);
    			append_dev(div13, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, span0);
    			append_dev(span0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			append_dev(span1, t3);
    			append_dev(div0, t4);
    			append_dev(div0, span2);
    			append_dev(span2, t5);
    			append_dev(div0, t6);
    			append_dev(div0, label0);
    			append_dev(div0, t8);
    			append_dev(div0, input0);
    			/*input0_binding*/ ctx[18](input0);
    			append_dev(div0, t9);
    			append_dev(div0, span3);
    			append_dev(div13, t10);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div2);
    			append_dev(div2, h4);
    			append_dev(div11, t12);
    			append_dev(div11, div4);
    			append_dev(div4, div3);
    			append_dev(div3, label1);
    			append_dev(div3, input1);
    			set_input_value(input1, /*newName*/ ctx[0]);
    			append_dev(div11, t14);
    			append_dev(div11, div9);
    			append_dev(div9, div5);
    			append_dev(div5, label2);
    			append_dev(div5, input2);
    			set_input_value(input2, /*newPhoneNo*/ ctx[1]);
    			append_dev(div9, t16);
    			append_dev(div9, div6);
    			append_dev(div6, label3);
    			append_dev(div6, input3);
    			set_input_value(input3, /*newPassword*/ ctx[2]);
    			append_dev(div9, t18);
    			append_dev(div9, span4);
    			append_dev(span4, div7);
    			append_dev(div7, label4);
    			append_dev(div7, input4);
    			set_input_value(input4, /*confirmPassword*/ ctx[3]);
    			append_dev(span4, t20);
    			append_dev(span4, div8);
    			append_dev(div8, button0);
    			append_dev(button0, t21);
    			append_dev(div11, t22);
    			append_dev(div11, div10);
    			append_dev(div10, button1);
    			append_dev(button1, t23);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*uploadImage*/ ctx[16], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[19]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[20]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[21]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[22]),
    					listen_dev(input4, "click", /*click_handler*/ ctx[23], false, false, false),
    					listen_dev(button0, "click", /*onPasswordChangeHandler*/ ctx[15], false, false, false),
    					listen_dev(button1, "click", /*onSaveHandler*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isLoading*/ ctx[10]) {
    				if (if_block) {
    					if (dirty & /*isLoading*/ 1024) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$7(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*image*/ 64 && !src_url_equal(img.src, img_src_value = /*image*/ ctx[6])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*name*/ 128) set_data_dev(t1, /*name*/ ctx[7]);
    			if (!current || dirty & /*email*/ 256) set_data_dev(t3, /*email*/ ctx[8]);
    			if (!current || dirty & /*phoneNo*/ 512) set_data_dev(t5, /*phoneNo*/ ctx[9]);

    			if (dirty & /*newName*/ 1 && input1.value !== /*newName*/ ctx[0]) {
    				set_input_value(input1, /*newName*/ ctx[0]);
    			}

    			if (dirty & /*newPhoneNo*/ 2 && input2.value !== /*newPhoneNo*/ ctx[1]) {
    				set_input_value(input2, /*newPhoneNo*/ ctx[1]);
    			}

    			if (dirty & /*newPassword*/ 4 && input3.value !== /*newPassword*/ ctx[2]) {
    				set_input_value(input3, /*newPassword*/ ctx[2]);
    			}

    			if (dirty & /*invalidConfirmPass*/ 2048) {
    				toggle_class(label4, "invalid-label", /*invalidConfirmPass*/ ctx[11]);
    			}

    			if (dirty & /*confirmPassword*/ 8 && input4.value !== /*confirmPassword*/ ctx[3]) {
    				set_input_value(input4, /*confirmPassword*/ ctx[3]);
    			}

    			if (dirty & /*invalidConfirmPass*/ 2048) {
    				toggle_class(input4, "invalid-input", /*invalidConfirmPass*/ ctx[11]);
    			}

    			if (!current || dirty & /*disableChangePassword*/ 4096) {
    				prop_dev(button0, "disabled", /*disableChangePassword*/ ctx[12]);
    			}

    			if (!current || dirty & /*disableSave*/ 8192) {
    				prop_dev(button1, "disabled", /*disableSave*/ ctx[13]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div14);
    			/*input0_binding*/ ctx[18](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let disableSave;
    	let disableChangePassword;
    	let invalidConfirmPass;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('UserProfile', slots, []);

    	let imageInput = "",
    		image = "",
    		didImageChange = "",
    		unsubscribe,
    		name = "",
    		user,
    		email = "",
    		phoneNo = "",
    		newName = "",
    		newEmail = "",
    		newPhoneNo = "",
    		newPassword = "",
    		confirmPassword = "",
    		focusedConfirm = false,
    		isLoading = false;

    	const onSaveHandler = async () => {
    		$$invalidate(10, isLoading = true);
    		let newUser = { ...user };
    		if (newName.length !== 0) newUser.name = newName;
    		if (newEmail.length !== 0) newUser.email = newEmail;
    		if (newPhoneNo.length !== 0) newUser.phoneNo = newPhoneNo;
    		if (didImageChange) newUser.image = image;

    		try {
    			await updateUser(newUser);

    			userStore.update(val => {
    				return { ...newUser };
    			});

    			$$invalidate(10, isLoading = false);
    			alert("User updated successfully");
    		} catch(err) {
    			$$invalidate(10, isLoading = false);
    			alert("Unable to update user \n Please try again later");
    			console.log(err);
    			return;
    		}
    	};

    	const onPasswordChangeHandler = async () => {
    		console.log("on pass change handler");
    		$$invalidate(10, isLoading = true);

    		try {
    			await changePassword(email, newPassword);
    			$$invalidate(10, isLoading = false);
    			alert("Password changed successfully");
    		} catch(err) {
    			$$invalidate(10, isLoading = false);
    			console.log(err);
    			alert("Unable to change password\n Please try again later");
    		}
    	};

    	const uploadImage = async () => {
    		$$invalidate(10, isLoading = true);

    		try {
    			const url = await uploadImageFile(imageInput.files[0]);
    			$$invalidate(10, isLoading = false);
    			$$invalidate(6, image = url);
    			$$invalidate(17, didImageChange = true);
    		} catch(error) {
    			$$invalidate(10, isLoading = false);
    		}

    		if (image === "") {
    			$$invalidate(6, image = defaultUserImage);
    		}
    	};

    	onMount(() => {
    		unsubscribe = userStore.subscribe(val => {
    			$$invalidate(7, name = val.name);
    			$$invalidate(8, email = val.email);
    			$$invalidate(9, phoneNo = val.phoneNo);
    			$$invalidate(6, image = val.image);
    			user = { ...val };

    			if (!image) {
    				$$invalidate(6, image = defaultUserImage);
    			}
    		});
    	});

    	onDestroy(() => {
    		unsubscribe();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<UserProfile> was created with unknown prop '${key}'`);
    	});

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			imageInput = $$value;
    			$$invalidate(5, imageInput);
    		});
    	}

    	function input1_input_handler() {
    		newName = this.value;
    		$$invalidate(0, newName);
    	}

    	function input2_input_handler() {
    		newPhoneNo = this.value;
    		$$invalidate(1, newPhoneNo);
    	}

    	function input3_input_handler() {
    		newPassword = this.value;
    		$$invalidate(2, newPassword);
    	}

    	function input4_input_handler() {
    		confirmPassword = this.value;
    		$$invalidate(3, confirmPassword);
    	}

    	const click_handler = () => {
    		$$invalidate(4, focusedConfirm = true);
    	};

    	$$self.$capture_state = () => ({
    		Loader,
    		onDestroy,
    		onMount,
    		defaultUserImage,
    		userStore,
    		updateUser,
    		changePassword,
    		uploadImageFile,
    		imageInput,
    		image,
    		didImageChange,
    		unsubscribe,
    		name,
    		user,
    		email,
    		phoneNo,
    		newName,
    		newEmail,
    		newPhoneNo,
    		newPassword,
    		confirmPassword,
    		focusedConfirm,
    		isLoading,
    		onSaveHandler,
    		onPasswordChangeHandler,
    		uploadImage,
    		invalidConfirmPass,
    		disableChangePassword,
    		disableSave
    	});

    	$$self.$inject_state = $$props => {
    		if ('imageInput' in $$props) $$invalidate(5, imageInput = $$props.imageInput);
    		if ('image' in $$props) $$invalidate(6, image = $$props.image);
    		if ('didImageChange' in $$props) $$invalidate(17, didImageChange = $$props.didImageChange);
    		if ('unsubscribe' in $$props) unsubscribe = $$props.unsubscribe;
    		if ('name' in $$props) $$invalidate(7, name = $$props.name);
    		if ('user' in $$props) user = $$props.user;
    		if ('email' in $$props) $$invalidate(8, email = $$props.email);
    		if ('phoneNo' in $$props) $$invalidate(9, phoneNo = $$props.phoneNo);
    		if ('newName' in $$props) $$invalidate(0, newName = $$props.newName);
    		if ('newEmail' in $$props) $$invalidate(26, newEmail = $$props.newEmail);
    		if ('newPhoneNo' in $$props) $$invalidate(1, newPhoneNo = $$props.newPhoneNo);
    		if ('newPassword' in $$props) $$invalidate(2, newPassword = $$props.newPassword);
    		if ('confirmPassword' in $$props) $$invalidate(3, confirmPassword = $$props.confirmPassword);
    		if ('focusedConfirm' in $$props) $$invalidate(4, focusedConfirm = $$props.focusedConfirm);
    		if ('isLoading' in $$props) $$invalidate(10, isLoading = $$props.isLoading);
    		if ('invalidConfirmPass' in $$props) $$invalidate(11, invalidConfirmPass = $$props.invalidConfirmPass);
    		if ('disableChangePassword' in $$props) $$invalidate(12, disableChangePassword = $$props.disableChangePassword);
    		if ('disableSave' in $$props) $$invalidate(13, disableSave = $$props.disableSave);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*newName, newPhoneNo, didImageChange*/ 131075) {
    			$$invalidate(13, disableSave = newName.trim() === "" && newEmail.trim() === "" && newPhoneNo === "" && !didImageChange);
    		}

    		if ($$self.$$.dirty & /*newPassword, confirmPassword*/ 12) {
    			$$invalidate(12, disableChangePassword = newPassword.trim() === "" || confirmPassword.trim() === "" || newPassword.localeCompare(confirmPassword));
    		}

    		if ($$self.$$.dirty & /*newPassword, confirmPassword, focusedConfirm*/ 28) {
    			$$invalidate(11, invalidConfirmPass = newPassword.localeCompare(confirmPassword) && focusedConfirm);
    		}
    	};

    	return [
    		newName,
    		newPhoneNo,
    		newPassword,
    		confirmPassword,
    		focusedConfirm,
    		imageInput,
    		image,
    		name,
    		email,
    		phoneNo,
    		isLoading,
    		invalidConfirmPass,
    		disableChangePassword,
    		disableSave,
    		onSaveHandler,
    		onPasswordChangeHandler,
    		uploadImage,
    		didImageChange,
    		input0_binding,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		click_handler
    	];
    }

    class UserProfile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UserProfile",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/UI/TextInput.svelte generated by Svelte v3.48.0 */

    const file$7 = "src/UI/TextInput.svelte";

    // (24:4) {:else}
    function create_else_block$2(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", /*type*/ ctx[5]);
    			attr_dev(input, "id", /*id*/ ctx[2]);
    			input.value = /*value*/ ctx[0];
    			attr_dev(input, "class", "svelte-188a9p5");
    			toggle_class(input, "invalid", !/*valid*/ ctx[6] && /*touched*/ ctx[8]);
    			add_location(input, file$7, 24, 8, 567);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_handler*/ ctx[9], false, false, false),
    					listen_dev(input, "blur", /*blur_handler_1*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 32) {
    				attr_dev(input, "type", /*type*/ ctx[5]);
    			}

    			if (dirty & /*id*/ 4) {
    				attr_dev(input, "id", /*id*/ ctx[2]);
    			}

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				prop_dev(input, "value", /*value*/ ctx[0]);
    			}

    			if (dirty & /*valid, touched*/ 320) {
    				toggle_class(input, "invalid", !/*valid*/ ctx[6] && /*touched*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(24:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (16:4) {#if controlType === "textarea"}
    function create_if_block_1$3(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "rows", /*rows*/ ctx[4]);
    			attr_dev(textarea, "id", /*id*/ ctx[2]);
    			attr_dev(textarea, "class", "svelte-188a9p5");
    			toggle_class(textarea, "invalid", !/*valid*/ ctx[6] && /*touched*/ ctx[8]);
    			add_location(textarea, file$7, 16, 8, 376);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[10]),
    					listen_dev(textarea, "blur", /*blur_handler*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rows*/ 16) {
    				attr_dev(textarea, "rows", /*rows*/ ctx[4]);
    			}

    			if (dirty & /*id*/ 4) {
    				attr_dev(textarea, "id", /*id*/ ctx[2]);
    			}

    			if (dirty & /*value*/ 1) {
    				set_input_value(textarea, /*value*/ ctx[0]);
    			}

    			if (dirty & /*valid, touched*/ 320) {
    				toggle_class(textarea, "invalid", !/*valid*/ ctx[6] && /*touched*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(16:4) {#if controlType === \\\"textarea\\\"}",
    		ctx
    	});

    	return block;
    }

    // (34:4) {#if validityMessage && !valid && touched}
    function create_if_block$6(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*validityMessage*/ ctx[7]);
    			attr_dev(p, "class", "error-message svelte-188a9p5");
    			add_location(p, file$7, 34, 8, 818);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*validityMessage*/ 128) set_data_dev(t, /*validityMessage*/ ctx[7]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(34:4) {#if validityMessage && !valid && touched}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div;
    	let label_1;
    	let t0;
    	let t1;
    	let t2;

    	function select_block_type(ctx, dirty) {
    		if (/*controlType*/ ctx[1] === "textarea") return create_if_block_1$3;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*validityMessage*/ ctx[7] && !/*valid*/ ctx[6] && /*touched*/ ctx[8] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[3]);
    			t1 = space();
    			if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(label_1, "for", /*id*/ ctx[2]);
    			attr_dev(label_1, "class", "svelte-188a9p5");
    			add_location(label_1, file$7, 14, 4, 299);
    			attr_dev(div, "class", "form-control svelte-188a9p5");
    			add_location(div, file$7, 13, 0, 268);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label_1);
    			append_dev(label_1, t0);
    			append_dev(div, t1);
    			if_block0.m(div, null);
    			append_dev(div, t2);
    			if (if_block1) if_block1.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label*/ 8) set_data_dev(t0, /*label*/ ctx[3]);

    			if (dirty & /*id*/ 4) {
    				attr_dev(label_1, "for", /*id*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			}

    			if (/*validityMessage*/ ctx[7] && !/*valid*/ ctx[6] && /*touched*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$6(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TextInput', slots, []);
    	let { controlType = null } = $$props;
    	let { id } = $$props;
    	let { label } = $$props;
    	let { rows = null } = $$props;
    	let { value } = $$props;
    	let { type = "text" } = $$props;
    	let { valid = true } = $$props;
    	let { validityMessage = "" } = $$props;
    	let touched = false;

    	const writable_props = [
    		'controlType',
    		'id',
    		'label',
    		'rows',
    		'value',
    		'type',
    		'valid',
    		'validityMessage'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TextInput> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	const blur_handler = () => $$invalidate(8, touched = true);
    	const blur_handler_1 = () => $$invalidate(8, touched = true);

    	$$self.$$set = $$props => {
    		if ('controlType' in $$props) $$invalidate(1, controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    		if ('label' in $$props) $$invalidate(3, label = $$props.label);
    		if ('rows' in $$props) $$invalidate(4, rows = $$props.rows);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('type' in $$props) $$invalidate(5, type = $$props.type);
    		if ('valid' in $$props) $$invalidate(6, valid = $$props.valid);
    		if ('validityMessage' in $$props) $$invalidate(7, validityMessage = $$props.validityMessage);
    	};

    	$$self.$capture_state = () => ({
    		controlType,
    		id,
    		label,
    		rows,
    		value,
    		type,
    		valid,
    		validityMessage,
    		touched
    	});

    	$$self.$inject_state = $$props => {
    		if ('controlType' in $$props) $$invalidate(1, controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    		if ('label' in $$props) $$invalidate(3, label = $$props.label);
    		if ('rows' in $$props) $$invalidate(4, rows = $$props.rows);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('type' in $$props) $$invalidate(5, type = $$props.type);
    		if ('valid' in $$props) $$invalidate(6, valid = $$props.valid);
    		if ('validityMessage' in $$props) $$invalidate(7, validityMessage = $$props.validityMessage);
    		if ('touched' in $$props) $$invalidate(8, touched = $$props.touched);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		controlType,
    		id,
    		label,
    		rows,
    		type,
    		valid,
    		validityMessage,
    		touched,
    		input_handler,
    		textarea_input_handler,
    		blur_handler,
    		blur_handler_1
    	];
    }

    class TextInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			controlType: 1,
    			id: 2,
    			label: 3,
    			rows: 4,
    			value: 0,
    			type: 5,
    			valid: 6,
    			validityMessage: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextInput",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[2] === undefined && !('id' in props)) {
    			console.warn("<TextInput> was created without expected prop 'id'");
    		}

    		if (/*label*/ ctx[3] === undefined && !('label' in props)) {
    			console.warn("<TextInput> was created without expected prop 'label'");
    		}

    		if (/*value*/ ctx[0] === undefined && !('value' in props)) {
    			console.warn("<TextInput> was created without expected prop 'value'");
    		}
    	}

    	get controlType() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controlType(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valid() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valid(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get validityMessage() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set validityMessage(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const store = writable([]);

    const getAllContacts = async () => {
        let token = "";
        const unsubscribe = authStore.subscribe((val) => {
            token = val.token;
        });
        unsubscribe();
        console.log(token);
        if (token) {
            let headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url + "/contacts/getAll?limit=30", {
                method: "GET",
                headers,
            });
            if (!res.ok) {
                alert("something happend while fetching contacts " + res.status);
                throw new Error("something happend while contacts " + res.status);
            }
            const data = await res.json();
            return data;
        }
        return null;
    };

    const createNewContact = async (newContact) => {
        let token = "";
        const unsubscribe = authStore.subscribe((val) => {
            token = val.token;
        });
        unsubscribe();
        console.log(token);
        if (token) {
            let headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url + "/contacts/add", {
                method: "POST",
                headers,
                body: JSON.stringify(newContact),
            });
            if (!res.ok) {
                alert("something happend while creating new contact " + res.status);
                throw new Error(
                    "something happend while creating new contact " + res.status
                );
            }
            const data = await res.json();
            return data;
        }
        return null;
    };

    const deleteContact = async (contactId) => {
        let token = "";
        const unsubscribe = authStore.subscribe((val) => {
            token = val.token;
        });
        unsubscribe();
        if (token && contactId) {
            let headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(
                url + "/contacts/delete?contactId=" + contactId,
                {
                    method: "DELETE",
                    headers,
                }
            );
            // if (!res.ok) {
            //     console.log(await res.json());
            //     alert("something happend while deleting a contact " + res.status);
            //     throw new Error(
            //         "something happend while deleting a contact " + res.status
            //     );
            // }
            const data = await res.json();
            return data;
        }
        return null;
    };

    const updateContact = async (contact) => {
        let token = "";
        const unsubscribe = authStore.subscribe((val) => {
            token = val.token;
        });
        unsubscribe();
        console.log(token);
        if (token) {
            let headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(
                url + "/contacts/updateContact?contactId=" + contact.contactId,
                {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(contact),
                }
            );
            if (!res.ok) {
                console.log(await res.json());
                alert("something happend while creating new contact " + res.status);
                throw new Error(
                    "something happend while creating new contact " + res.status
                );
            }
            const data = await res.json();
            return data;
        }
        return null;
    };

    const deleteMultipleContacts = async (contacts) => {
        console.log(contacts);
        let token = "";
        const unsubscribe = authStore.subscribe((val) => {
            token = val.token;
        });
        unsubscribe();
        console.log(token);
        if (token) {
            let headers = { "Content-Type": "application/json" };
            headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(url + "/contacts/deleteMultiple", {
                headers,
                method: "DELETE",
                body: JSON.stringify({ contacts }),
            });
            if (!res.ok) {
                console.log(await res.json());
                alert(
                    "something happend while deleting multiple contacts " +
                        res.status
                );
                throw new Error(
                    "something happend while deleting multiple contacts " +
                        res.status
                );
            }
            const data = await res.json();
            return data;
        }
        return null;
    };

    /* src/contacts/NewContact.svelte generated by Svelte v3.48.0 */

    const { console: console_1$3 } = globals;
    const file$6 = "src/contacts/NewContact.svelte";

    // (92:0) {#if isLoading}
    function create_if_block$5(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(92:0) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let t0;
    	let main;
    	let form;
    	let textinput0;
    	let t1;
    	let textinput1;
    	let t2;
    	let textinput2;
    	let t3;
    	let textinput3;
    	let t4;
    	let textinput4;
    	let t5;
    	let input;
    	let t6;
    	let span;
    	let button0;
    	let t8;
    	let button1;
    	let t9_value = (/*editContact*/ ctx[0] ? "Update" : "Submit") + "";
    	let t9;
    	let button1_disabled_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*isLoading*/ ctx[7] && create_if_block$5(ctx);

    	textinput0 = new TextInput({
    			props: {
    				id: "name",
    				label: "Name",
    				type: "text",
    				value: /*name*/ ctx[1]
    			},
    			$$inline: true
    		});

    	textinput0.$on("input", /*input_handler*/ ctx[18]);

    	textinput1 = new TextInput({
    			props: {
    				id: "category",
    				label: "Category",
    				type: "text",
    				value: /*category*/ ctx[3]
    			},
    			$$inline: true
    		});

    	textinput1.$on("input", /*input_handler_1*/ ctx[19]);

    	textinput2 = new TextInput({
    			props: {
    				id: "email",
    				label: "Email",
    				type: "email",
    				value: /*email*/ ctx[2]
    			},
    			$$inline: true
    		});

    	textinput2.$on("input", /*input_handler_2*/ ctx[20]);

    	textinput3 = new TextInput({
    			props: {
    				id: "phoneNo",
    				label: "Phone No",
    				type: "text",
    				value: /*phoneNo*/ ctx[4]
    			},
    			$$inline: true
    		});

    	textinput3.$on("input", /*input_handler_3*/ ctx[21]);

    	textinput4 = new TextInput({
    			props: {
    				id: "description",
    				label: "Description",
    				controlType: "text",
    				value: /*description*/ ctx[5]
    			},
    			$$inline: true
    		});

    	textinput4.$on("input", /*input_handler_4*/ ctx[22]);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			main = element("main");
    			form = element("form");
    			create_component(textinput0.$$.fragment);
    			t1 = space();
    			create_component(textinput1.$$.fragment);
    			t2 = space();
    			create_component(textinput2.$$.fragment);
    			t3 = space();
    			create_component(textinput3.$$.fragment);
    			t4 = space();
    			create_component(textinput4.$$.fragment);
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			span = element("span");
    			button0 = element("button");
    			button0.textContent = "Cancel";
    			t8 = space();
    			button1 = element("button");
    			t9 = text(t9_value);
    			attr_dev(input, "type", "file");
    			add_location(input, file$6, 133, 8, 3906);
    			attr_dev(button0, "class", "submitBtn svelte-1v7exv5");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$6, 135, 12, 4018);
    			attr_dev(button1, "class", "submitBtn svelte-1v7exv5");
    			button1.disabled = button1_disabled_value = !/*formIsValid*/ ctx[8];
    			add_location(button1, file$6, 138, 12, 4141);
    			attr_dev(span, "class", "my-span svelte-1v7exv5");
    			add_location(span, file$6, 134, 8, 3983);
    			attr_dev(form, "class", "svelte-1v7exv5");
    			add_location(form, file$6, 96, 4, 2840);
    			attr_dev(main, "class", "svelte-1v7exv5");
    			add_location(main, file$6, 95, 0, 2829);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, form);
    			mount_component(textinput0, form, null);
    			append_dev(form, t1);
    			mount_component(textinput1, form, null);
    			append_dev(form, t2);
    			mount_component(textinput2, form, null);
    			append_dev(form, t3);
    			mount_component(textinput3, form, null);
    			append_dev(form, t4);
    			mount_component(textinput4, form, null);
    			append_dev(form, t5);
    			append_dev(form, input);
    			/*input_binding*/ ctx[23](input);
    			append_dev(form, t6);
    			append_dev(form, span);
    			append_dev(span, button0);
    			append_dev(span, t8);
    			append_dev(span, button1);
    			append_dev(button1, t9);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*uploadImage*/ ctx[11], false, false, false),
    					listen_dev(button0, "click", /*cancelHandler*/ ctx[9], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*addNewContact*/ ctx[10]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isLoading*/ ctx[7]) {
    				if (if_block) {
    					if (dirty & /*isLoading*/ 128) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const textinput0_changes = {};
    			if (dirty & /*name*/ 2) textinput0_changes.value = /*name*/ ctx[1];
    			textinput0.$set(textinput0_changes);
    			const textinput1_changes = {};
    			if (dirty & /*category*/ 8) textinput1_changes.value = /*category*/ ctx[3];
    			textinput1.$set(textinput1_changes);
    			const textinput2_changes = {};
    			if (dirty & /*email*/ 4) textinput2_changes.value = /*email*/ ctx[2];
    			textinput2.$set(textinput2_changes);
    			const textinput3_changes = {};
    			if (dirty & /*phoneNo*/ 16) textinput3_changes.value = /*phoneNo*/ ctx[4];
    			textinput3.$set(textinput3_changes);
    			const textinput4_changes = {};
    			if (dirty & /*description*/ 32) textinput4_changes.value = /*description*/ ctx[5];
    			textinput4.$set(textinput4_changes);
    			if ((!current || dirty & /*editContact*/ 1) && t9_value !== (t9_value = (/*editContact*/ ctx[0] ? "Update" : "Submit") + "")) set_data_dev(t9, t9_value);

    			if (!current || dirty & /*formIsValid*/ 256 && button1_disabled_value !== (button1_disabled_value = !/*formIsValid*/ ctx[8])) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(textinput2.$$.fragment, local);
    			transition_in(textinput3.$$.fragment, local);
    			transition_in(textinput4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(textinput0);
    			destroy_component(textinput1);
    			destroy_component(textinput2);
    			destroy_component(textinput3);
    			destroy_component(textinput4);
    			/*input_binding*/ ctx[23](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let nameValid;
    	let emailValid;
    	let categoryValid;
    	let phoneNoValid;
    	let descriptionValid;
    	let formIsValid;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NewContact', slots, []);
    	let { editContact, contactToEdit } = $$props;
    	let name = editContact ? contactToEdit.name : "";
    	let email = editContact ? contactToEdit.email : "";
    	let category = editContact ? contactToEdit.category : "";
    	let phoneNo = editContact ? contactToEdit.phoneNo : "";
    	let description = editContact ? contactToEdit.description : "";
    	let imageInput;
    	let image = editContact ? contactToEdit.image : "";
    	let isLoading = false;
    	const cancelHandler = () => dispatch("closeForm");

    	const addNewContact = async event => {
    		$$invalidate(7, isLoading = true);

    		const newContact = {
    			name,
    			email,
    			category,
    			phoneNo,
    			description,
    			image
    		};

    		if (editContact) {
    			const updatedContact = {
    				...newContact,
    				contactId: contactToEdit.contactId
    			};

    			try {
    				await updateContact(updatedContact);
    				$$invalidate(7, isLoading = false);
    			} catch(error) {
    				console.log(error); //alert("contact updated successfully");
    				$$invalidate(7, isLoading = false);
    				return;
    			}
    		} else {
    			try {
    				await createNewContact(newContact);
    				$$invalidate(7, isLoading = false);
    			} catch(error) {
    				console.log(error);
    				$$invalidate(7, isLoading = false);
    				return;
    			}
    		}

    		location.reload();
    		cancelHandler();
    	};

    	const uploadImage = async () => {
    		$$invalidate(7, isLoading = true);

    		try {
    			const url = await uploadImageFile(imageInput.files[0]);
    			$$invalidate(7, isLoading = false);
    			image = url;
    			console.log(url);
    		} catch(error) {
    			$$invalidate(7, isLoading = false);
    		}

    		if (image === "") {
    			image = defaultUserImage;
    		}
    	};

    	const dispatch = createEventDispatcher();
    	const writable_props = ['editContact', 'contactToEdit'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<NewContact> was created with unknown prop '${key}'`);
    	});

    	const input_handler = event => $$invalidate(1, name = event.target.value);
    	const input_handler_1 = event => $$invalidate(3, category = event.target.value);
    	const input_handler_2 = event => $$invalidate(2, email = event.target.value);
    	const input_handler_3 = event => $$invalidate(4, phoneNo = event.target.value);
    	const input_handler_4 = event => $$invalidate(5, description = event.target.value);

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			imageInput = $$value;
    			$$invalidate(6, imageInput);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('editContact' in $$props) $$invalidate(0, editContact = $$props.editContact);
    		if ('contactToEdit' in $$props) $$invalidate(12, contactToEdit = $$props.contactToEdit);
    	};

    	$$self.$capture_state = () => ({
    		TextInput,
    		createEventDispatcher,
    		isEmpty,
    		isValidEmail,
    		uploadImageFile,
    		Loader,
    		defaultUserImage,
    		createNewContact,
    		updateContact,
    		editContact,
    		contactToEdit,
    		name,
    		email,
    		category,
    		phoneNo,
    		description,
    		imageInput,
    		image,
    		isLoading,
    		cancelHandler,
    		addNewContact,
    		uploadImage,
    		dispatch,
    		descriptionValid,
    		phoneNoValid,
    		categoryValid,
    		emailValid,
    		nameValid,
    		formIsValid
    	});

    	$$self.$inject_state = $$props => {
    		if ('editContact' in $$props) $$invalidate(0, editContact = $$props.editContact);
    		if ('contactToEdit' in $$props) $$invalidate(12, contactToEdit = $$props.contactToEdit);
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    		if ('email' in $$props) $$invalidate(2, email = $$props.email);
    		if ('category' in $$props) $$invalidate(3, category = $$props.category);
    		if ('phoneNo' in $$props) $$invalidate(4, phoneNo = $$props.phoneNo);
    		if ('description' in $$props) $$invalidate(5, description = $$props.description);
    		if ('imageInput' in $$props) $$invalidate(6, imageInput = $$props.imageInput);
    		if ('image' in $$props) image = $$props.image;
    		if ('isLoading' in $$props) $$invalidate(7, isLoading = $$props.isLoading);
    		if ('descriptionValid' in $$props) $$invalidate(13, descriptionValid = $$props.descriptionValid);
    		if ('phoneNoValid' in $$props) $$invalidate(14, phoneNoValid = $$props.phoneNoValid);
    		if ('categoryValid' in $$props) $$invalidate(15, categoryValid = $$props.categoryValid);
    		if ('emailValid' in $$props) $$invalidate(16, emailValid = $$props.emailValid);
    		if ('nameValid' in $$props) $$invalidate(17, nameValid = $$props.nameValid);
    		if ('formIsValid' in $$props) $$invalidate(8, formIsValid = $$props.formIsValid);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*name*/ 2) {
    			$$invalidate(17, nameValid = !isEmpty(name));
    		}

    		if ($$self.$$.dirty & /*email*/ 4) {
    			$$invalidate(16, emailValid = isValidEmail(email));
    		}

    		if ($$self.$$.dirty & /*category*/ 8) {
    			$$invalidate(15, categoryValid = !isEmpty(category));
    		}

    		if ($$self.$$.dirty & /*phoneNo*/ 16) {
    			$$invalidate(14, phoneNoValid = !isEmpty(phoneNo) && phoneNo.trim().length === 10);
    		}

    		if ($$self.$$.dirty & /*description*/ 32) {
    			$$invalidate(13, descriptionValid = !isEmpty(description));
    		}

    		if ($$self.$$.dirty & /*nameValid, emailValid, categoryValid, phoneNoValid, descriptionValid*/ 253952) {
    			$$invalidate(8, formIsValid = nameValid && emailValid && categoryValid && phoneNoValid && descriptionValid);
    		}

    		if ($$self.$$.dirty & /*name*/ 2) {
    			console.log(name);
    		}
    	};

    	return [
    		editContact,
    		name,
    		email,
    		category,
    		phoneNo,
    		description,
    		imageInput,
    		isLoading,
    		formIsValid,
    		cancelHandler,
    		addNewContact,
    		uploadImage,
    		contactToEdit,
    		descriptionValid,
    		phoneNoValid,
    		categoryValid,
    		emailValid,
    		nameValid,
    		input_handler,
    		input_handler_1,
    		input_handler_2,
    		input_handler_3,
    		input_handler_4,
    		input_binding
    	];
    }

    class NewContact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { editContact: 0, contactToEdit: 12 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NewContact",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*editContact*/ ctx[0] === undefined && !('editContact' in props)) {
    			console_1$3.warn("<NewContact> was created without expected prop 'editContact'");
    		}

    		if (/*contactToEdit*/ ctx[12] === undefined && !('contactToEdit' in props)) {
    			console_1$3.warn("<NewContact> was created without expected prop 'contactToEdit'");
    		}
    	}

    	get editContact() {
    		throw new Error("<NewContact>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editContact(value) {
    		throw new Error("<NewContact>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get contactToEdit() {
    		throw new Error("<NewContact>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set contactToEdit(value) {
    		throw new Error("<NewContact>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/Button.svelte generated by Svelte v3.48.0 */

    const file$5 = "src/UI/Button.svelte";

    // (13:0) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", button_class_value = "" + (/*mode*/ ctx[2] + " " + /*color*/ ctx[3] + " svelte-9ib8ag"));
    			attr_dev(button, "type", /*type*/ ctx[0]);
    			button.disabled = /*disabled*/ ctx[4];
    			add_location(button, file$5, 13, 4, 234);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*mode, color*/ 12 && button_class_value !== (button_class_value = "" + (/*mode*/ ctx[2] + " " + /*color*/ ctx[3] + " svelte-9ib8ag"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (!current || dirty & /*type*/ 1) {
    				attr_dev(button, "type", /*type*/ ctx[0]);
    			}

    			if (!current || dirty & /*disabled*/ 16) {
    				prop_dev(button, "disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(13:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (9:0) {#if href}
    function create_if_block$4(ctx) {
    	let a;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "href", /*href*/ ctx[1]);
    			attr_dev(a, "class", "svelte-9ib8ag");
    			add_location(a, file$5, 9, 4, 185);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*href*/ 2) {
    				attr_dev(a, "href", /*href*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(9:0) {#if href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Button', slots, ['default']);
    	let { type = "button" } = $$props;
    	let { href = null } = $$props;
    	let { mode = null } = $$props;
    	let { color = null } = $$props;
    	let { disabled = false } = $$props;
    	const writable_props = ['type', 'href', 'mode', 'color', 'disabled'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('href' in $$props) $$invalidate(1, href = $$props.href);
    		if ('mode' in $$props) $$invalidate(2, mode = $$props.mode);
    		if ('color' in $$props) $$invalidate(3, color = $$props.color);
    		if ('disabled' in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ type, href, mode, color, disabled });

    	$$self.$inject_state = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('href' in $$props) $$invalidate(1, href = $$props.href);
    		if ('mode' in $$props) $$invalidate(2, mode = $$props.mode);
    		if ('color' in $$props) $$invalidate(3, color = $$props.color);
    		if ('disabled' in $$props) $$invalidate(4, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type, href, mode, color, disabled, $$scope, slots, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			type: 0,
    			href: 1,
    			mode: 2,
    			color: 3,
    			disabled: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mode() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mode(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/contacts/ContactCard.svelte generated by Svelte v3.48.0 */
    const file$4 = "src/contacts/ContactCard.svelte";

    // (33:0) {#if isLoading}
    function create_if_block$3(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(33:0) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    // (51:8) <Button mode="outline" type="button" on:click={onEditHandler}             >
    function create_default_slot_1$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Edit");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(51:8) <Button mode=\\\"outline\\\" type=\\\"button\\\" on:click={onEditHandler}             >",
    		ctx
    	});

    	return block;
    }

    // (54:8) <Button type="button" on:click={onDeleteHandler}>
    function create_default_slot$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Delete");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(54:8) <Button type=\\\"button\\\" on:click={onDeleteHandler}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let t0;
    	let article;
    	let header;
    	let h1;
    	let t1_value = /*contact*/ ctx[0].name + "";
    	let t1;
    	let t2;
    	let h2;
    	let t3_value = /*contact*/ ctx[0].category + "";
    	let t3;
    	let t4;
    	let p0;
    	let t5_value = /*contact*/ ctx[0].email + "";
    	let t5;
    	let t6;
    	let div0;
    	let img;
    	let img_src_value;
    	let t7;
    	let div1;
    	let p1;
    	let t8_value = /*contact*/ ctx[0].description + "";
    	let t8;
    	let t9;
    	let footer;
    	let button0;
    	let t10;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*isLoading*/ ctx[2] && create_if_block$3(ctx);

    	button0 = new Button({
    			props: {
    				mode: "outline",
    				type: "button",
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*onEditHandler*/ ctx[5]);

    	button1 = new Button({
    			props: {
    				type: "button",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*onDeleteHandler*/ ctx[4]);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			article = element("article");
    			header = element("header");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(t3_value);
    			t4 = space();
    			p0 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			div0 = element("div");
    			img = element("img");
    			t7 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			footer = element("footer");
    			create_component(button0.$$.fragment);
    			t10 = space();
    			create_component(button1.$$.fragment);
    			attr_dev(h1, "class", "svelte-j4jk9k");
    			add_location(h1, file$4, 38, 8, 1101);
    			attr_dev(h2, "class", "svelte-j4jk9k");
    			add_location(h2, file$4, 39, 8, 1133);
    			attr_dev(p0, "class", "svelte-j4jk9k");
    			add_location(p0, file$4, 40, 8, 1169);
    			attr_dev(header, "class", "svelte-j4jk9k");
    			add_location(header, file$4, 37, 4, 1084);
    			if (!src_url_equal(img.src, img_src_value = /*image*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-j4jk9k");
    			add_location(img, file$4, 43, 8, 1238);
    			attr_dev(div0, "class", "image svelte-j4jk9k");
    			add_location(div0, file$4, 42, 4, 1210);
    			attr_dev(p1, "class", "svelte-j4jk9k");
    			add_location(p1, file$4, 47, 8, 1311);
    			attr_dev(div1, "class", "content svelte-j4jk9k");
    			add_location(div1, file$4, 46, 4, 1281);
    			attr_dev(footer, "class", "svelte-j4jk9k");
    			add_location(footer, file$4, 49, 4, 1355);
    			attr_dev(article, "class", "svelte-j4jk9k");
    			toggle_class(article, "on-select", /*selected*/ ctx[1]);
    			add_location(article, file$4, 36, 0, 1017);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, article, anchor);
    			append_dev(article, header);
    			append_dev(header, h1);
    			append_dev(h1, t1);
    			append_dev(header, t2);
    			append_dev(header, h2);
    			append_dev(h2, t3);
    			append_dev(header, t4);
    			append_dev(header, p0);
    			append_dev(p0, t5);
    			append_dev(article, t6);
    			append_dev(article, div0);
    			append_dev(div0, img);
    			append_dev(article, t7);
    			append_dev(article, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t8);
    			append_dev(article, t9);
    			append_dev(article, footer);
    			mount_component(button0, footer, null);
    			append_dev(footer, t10);
    			mount_component(button1, footer, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(article, "click", /*onClickHandler*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isLoading*/ ctx[2]) {
    				if (if_block) {
    					if (dirty & /*isLoading*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*contact*/ 1) && t1_value !== (t1_value = /*contact*/ ctx[0].name + "")) set_data_dev(t1, t1_value);
    			if ((!current || dirty & /*contact*/ 1) && t3_value !== (t3_value = /*contact*/ ctx[0].category + "")) set_data_dev(t3, t3_value);
    			if ((!current || dirty & /*contact*/ 1) && t5_value !== (t5_value = /*contact*/ ctx[0].email + "")) set_data_dev(t5, t5_value);
    			if ((!current || dirty & /*contact*/ 1) && t8_value !== (t8_value = /*contact*/ ctx[0].description + "")) set_data_dev(t8, t8_value);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);

    			if (dirty & /*selected*/ 2) {
    				toggle_class(article, "on-select", /*selected*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(article);
    			destroy_component(button0);
    			destroy_component(button1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ContactCard', slots, []);
    	let { contact } = $$props;
    	let { canSelect } = $$props;
    	let selected = false;
    	let isLoading = false;
    	let image = !contact.image ? defaultUserImage : contact.image;
    	const dispatch = createEventDispatcher();

    	const onDeleteHandler = async () => {
    		$$invalidate(2, isLoading = true);
    		await deleteContact(contact.contactId);
    		location.reload();
    		$$invalidate(2, isLoading = false);
    		alert("contact deleted successfully");
    	};

    	const onEditHandler = () => {
    		dispatch("editContact", contact);
    	};

    	const onClickHandler = () => {
    		if (!canSelect) return;
    		$$invalidate(1, selected = !selected);
    		dispatch("deleteSelect", { id: contact.contactId, selected });
    	};

    	const writable_props = ['contact', 'canSelect'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ContactCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('contact' in $$props) $$invalidate(0, contact = $$props.contact);
    		if ('canSelect' in $$props) $$invalidate(7, canSelect = $$props.canSelect);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		defaultUserImage,
    		Button,
    		deleteContact,
    		Loader,
    		contact,
    		canSelect,
    		selected,
    		isLoading,
    		image,
    		dispatch,
    		onDeleteHandler,
    		onEditHandler,
    		onClickHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ('contact' in $$props) $$invalidate(0, contact = $$props.contact);
    		if ('canSelect' in $$props) $$invalidate(7, canSelect = $$props.canSelect);
    		if ('selected' in $$props) $$invalidate(1, selected = $$props.selected);
    		if ('isLoading' in $$props) $$invalidate(2, isLoading = $$props.isLoading);
    		if ('image' in $$props) $$invalidate(3, image = $$props.image);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		contact,
    		selected,
    		isLoading,
    		image,
    		onDeleteHandler,
    		onEditHandler,
    		onClickHandler,
    		canSelect
    	];
    }

    class ContactCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { contact: 0, canSelect: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactCard",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*contact*/ ctx[0] === undefined && !('contact' in props)) {
    			console.warn("<ContactCard> was created without expected prop 'contact'");
    		}

    		if (/*canSelect*/ ctx[7] === undefined && !('canSelect' in props)) {
    			console.warn("<ContactCard> was created without expected prop 'canSelect'");
    		}
    	}

    	get contact() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set contact(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get canSelect() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set canSelect(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/Modal.svelte generated by Svelte v3.48.0 */
    const file$3 = "src/UI/Modal.svelte";
    const get_footer_slot_changes = dirty => ({});
    const get_footer_slot_context = ctx => ({});

    // (22:12) <Button on:click={closeModal}>
    function create_default_slot$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Close");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(22:12) <Button on:click={closeModal}>",
    		ctx
    	});

    	return block;
    }

    // (21:28)              
    function fallback_block(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*closeModal*/ ctx[1]);

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(21:28)              ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div0;
    	let t0;
    	let div2;
    	let h1;
    	let t1;
    	let t2;
    	let div1;
    	let t3;
    	let footer;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	const footer_slot_template = /*#slots*/ ctx[2].footer;
    	const footer_slot = create_slot(footer_slot_template, ctx, /*$$scope*/ ctx[3], get_footer_slot_context);
    	const footer_slot_or_fallback = footer_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			t1 = text(/*title*/ ctx[0]);
    			t2 = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			t3 = space();
    			footer = element("footer");
    			if (footer_slot_or_fallback) footer_slot_or_fallback.c();
    			attr_dev(div0, "class", "modal-backdrop svelte-1rkb22");
    			add_location(div0, file$3, 13, 0, 247);
    			attr_dev(h1, "class", "svelte-1rkb22");
    			add_location(h1, file$3, 15, 4, 324);
    			attr_dev(div1, "class", "content svelte-1rkb22");
    			add_location(div1, file$3, 16, 4, 345);
    			attr_dev(footer, "class", "svelte-1rkb22");
    			add_location(footer, file$3, 19, 4, 399);
    			attr_dev(div2, "class", "modal svelte-1rkb22");
    			add_location(div2, file$3, 14, 0, 300);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(h1, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, footer);

    			if (footer_slot_or_fallback) {
    				footer_slot_or_fallback.m(footer, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*closeModal*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev(t1, /*title*/ ctx[0]);

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
    					);
    				}
    			}

    			if (footer_slot) {
    				if (footer_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						footer_slot,
    						footer_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(footer_slot_template, /*$$scope*/ ctx[3], dirty, get_footer_slot_changes),
    						get_footer_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(footer_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(footer_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if (default_slot) default_slot.d(detaching);
    			if (footer_slot_or_fallback) footer_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Modal', slots, ['default','footer']);
    	let { title } = $$props;
    	const dispatch = createEventDispatcher();

    	function closeModal() {
    		dispatch("cancel");
    	}

    	const writable_props = ['title'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Button,
    		title,
    		dispatch,
    		closeModal
    	});

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, closeModal, slots, $$scope];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !('title' in props)) {
    			console.warn("<Modal> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/contacts/NewContactModal.svelte generated by Svelte v3.48.0 */

    const { console: console_1$2 } = globals;
    const file$2 = "src/contacts/NewContactModal.svelte";

    // (33:0) <Modal title="Contact Form" on:cancel>
    function create_default_slot_1$1(ctx) {
    	let form;
    	let textinput0;
    	let t0;
    	let textinput1;
    	let t1;
    	let textinput2;
    	let t2;
    	let textinput3;
    	let t3;
    	let textinput4;
    	let t4;
    	let textinput5;
    	let updating_value;
    	let current;
    	let mounted;
    	let dispose;

    	textinput0 = new TextInput({
    			props: {
    				id: "name",
    				label: "Name",
    				valid: /*nameValid*/ ctx[11],
    				validityMessage: "Please enter a valid name",
    				value: /*name*/ ctx[0]
    			},
    			$$inline: true
    		});

    	textinput0.$on("input", /*input_handler*/ ctx[14]);

    	textinput1 = new TextInput({
    			props: {
    				id: "category",
    				label: "Category",
    				valid: /*categoryValid*/ ctx[8],
    				validityMessage: "Please enter a valid category",
    				value: /*category*/ ctx[2]
    			},
    			$$inline: true
    		});

    	textinput1.$on("input", /*input_handler_1*/ ctx[15]);

    	textinput2 = new TextInput({
    			props: {
    				id: "email",
    				label: "Email",
    				valid: /*emailValid*/ ctx[10],
    				validityMessage: "Please enter a email address",
    				value: /*email*/ ctx[1],
    				type: "email"
    			},
    			$$inline: true
    		});

    	textinput2.$on("input", /*input_handler_2*/ ctx[16]);

    	textinput3 = new TextInput({
    			props: {
    				id: "imageUrl",
    				label: "Image URL",
    				valid: /*imageUrlValid*/ ctx[6],
    				validityMessage: "Please enter a valid image url.",
    				value: /*imageUrl*/ ctx[4]
    			},
    			$$inline: true
    		});

    	textinput3.$on("input", /*input_handler_3*/ ctx[17]);

    	textinput4 = new TextInput({
    			props: {
    				id: "phoneNo",
    				label: "Mobile Number",
    				valid: /*phoneNoValid*/ ctx[9],
    				validityMessage: "Please enter a valid phoneNo",
    				value: /*phoneNo*/ ctx[3]
    			},
    			$$inline: true
    		});

    	textinput4.$on("input", /*input_handler_4*/ ctx[18]);

    	function textinput5_value_binding(value) {
    		/*textinput5_value_binding*/ ctx[19](value);
    	}

    	let textinput5_props = {
    		id: "description",
    		label: "Description",
    		controlType: "textarea",
    		valid: /*descriptionValid*/ ctx[7],
    		validityMessage: "Please enter a valid description."
    	};

    	if (/*description*/ ctx[5] !== void 0) {
    		textinput5_props.value = /*description*/ ctx[5];
    	}

    	textinput5 = new TextInput({ props: textinput5_props, $$inline: true });
    	binding_callbacks.push(() => bind(textinput5, 'value', textinput5_value_binding));

    	const block = {
    		c: function create() {
    			form = element("form");
    			create_component(textinput0.$$.fragment);
    			t0 = space();
    			create_component(textinput1.$$.fragment);
    			t1 = space();
    			create_component(textinput2.$$.fragment);
    			t2 = space();
    			create_component(textinput3.$$.fragment);
    			t3 = space();
    			create_component(textinput4.$$.fragment);
    			t4 = space();
    			create_component(textinput5.$$.fragment);
    			attr_dev(form, "class", "svelte-xg754s");
    			add_location(form, file$2, 33, 4, 926);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			mount_component(textinput0, form, null);
    			append_dev(form, t0);
    			mount_component(textinput1, form, null);
    			append_dev(form, t1);
    			mount_component(textinput2, form, null);
    			append_dev(form, t2);
    			mount_component(textinput3, form, null);
    			append_dev(form, t3);
    			mount_component(textinput4, form, null);
    			append_dev(form, t4);
    			mount_component(textinput5, form, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(form, "submit", /*submitForm*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const textinput0_changes = {};
    			if (dirty & /*nameValid*/ 2048) textinput0_changes.valid = /*nameValid*/ ctx[11];
    			if (dirty & /*name*/ 1) textinput0_changes.value = /*name*/ ctx[0];
    			textinput0.$set(textinput0_changes);
    			const textinput1_changes = {};
    			if (dirty & /*categoryValid*/ 256) textinput1_changes.valid = /*categoryValid*/ ctx[8];
    			if (dirty & /*category*/ 4) textinput1_changes.value = /*category*/ ctx[2];
    			textinput1.$set(textinput1_changes);
    			const textinput2_changes = {};
    			if (dirty & /*emailValid*/ 1024) textinput2_changes.valid = /*emailValid*/ ctx[10];
    			if (dirty & /*email*/ 2) textinput2_changes.value = /*email*/ ctx[1];
    			textinput2.$set(textinput2_changes);
    			const textinput3_changes = {};
    			if (dirty & /*imageUrlValid*/ 64) textinput3_changes.valid = /*imageUrlValid*/ ctx[6];
    			if (dirty & /*imageUrl*/ 16) textinput3_changes.value = /*imageUrl*/ ctx[4];
    			textinput3.$set(textinput3_changes);
    			const textinput4_changes = {};
    			if (dirty & /*phoneNoValid*/ 512) textinput4_changes.valid = /*phoneNoValid*/ ctx[9];
    			if (dirty & /*phoneNo*/ 8) textinput4_changes.value = /*phoneNo*/ ctx[3];
    			textinput4.$set(textinput4_changes);
    			const textinput5_changes = {};
    			if (dirty & /*descriptionValid*/ 128) textinput5_changes.valid = /*descriptionValid*/ ctx[7];

    			if (!updating_value && dirty & /*description*/ 32) {
    				updating_value = true;
    				textinput5_changes.value = /*description*/ ctx[5];
    				add_flush_callback(() => updating_value = false);
    			}

    			textinput5.$set(textinput5_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(textinput2.$$.fragment, local);
    			transition_in(textinput3.$$.fragment, local);
    			transition_in(textinput4.$$.fragment, local);
    			transition_in(textinput5.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			transition_out(textinput5.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_component(textinput0);
    			destroy_component(textinput1);
    			destroy_component(textinput2);
    			destroy_component(textinput3);
    			destroy_component(textinput4);
    			destroy_component(textinput5);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(33:0) <Modal title=\\\"Contact Form\\\" on:cancel>",
    		ctx
    	});

    	return block;
    }

    // (87:8) <Button type="button" on:click={submitForm} disabled={!formIsValid}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Save");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(87:8) <Button type=\\\"button\\\" on:click={submitForm} disabled={!formIsValid}>",
    		ctx
    	});

    	return block;
    }

    // (85:4) 
    function create_footer_slot(ctx) {
    	let div;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				type: "button",
    				disabled: !/*formIsValid*/ ctx[12],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*submitForm*/ ctx[13]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			attr_dev(div, "slot", "footer");
    			add_location(div, file$2, 84, 4, 2594);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*formIsValid*/ 4096) button_changes.disabled = !/*formIsValid*/ ctx[12];

    			if (dirty & /*$$scope*/ 2097152) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_footer_slot.name,
    		type: "slot",
    		source: "(85:4) ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				title: "Contact Form",
    				$$slots: {
    					footer: [create_footer_slot],
    					default: [create_default_slot_1$1]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modal.$on("cancel", /*cancel_handler*/ ctx[20]);

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, formIsValid, descriptionValid, description, phoneNoValid, phoneNo, imageUrlValid, imageUrl, emailValid, email, categoryValid, category, nameValid, name*/ 2105343) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let nameValid;
    	let emailValid;
    	let phoneNoValid;
    	let categoryValid;
    	let descriptionValid;
    	let imageUrlValid;
    	let formIsValid;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NewContactModal', slots, []);
    	let name = "";
    	let email = "";
    	let category = "";
    	let phoneNo = "";
    	let imageUrl = "";
    	let description = "";

    	const submitForm = event => {
    		console.log(event);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<NewContactModal> was created with unknown prop '${key}'`);
    	});

    	const input_handler = event => $$invalidate(0, name = event.target.value);
    	const input_handler_1 = event => $$invalidate(2, category = event.target.value);
    	const input_handler_2 = event => $$invalidate(1, email = event.target.value);
    	const input_handler_3 = event => $$invalidate(4, imageUrl = event.target.value);
    	const input_handler_4 = event => $$invalidate(3, phoneNo = event.target.value);

    	function textinput5_value_binding(value) {
    		description = value;
    		$$invalidate(5, description);
    	}

    	function cancel_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$capture_state = () => ({
    		TextInput,
    		Modal,
    		isEmpty,
    		isValidEmail,
    		Button,
    		name,
    		email,
    		category,
    		phoneNo,
    		imageUrl,
    		description,
    		submitForm,
    		imageUrlValid,
    		descriptionValid,
    		categoryValid,
    		phoneNoValid,
    		emailValid,
    		nameValid,
    		formIsValid
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('email' in $$props) $$invalidate(1, email = $$props.email);
    		if ('category' in $$props) $$invalidate(2, category = $$props.category);
    		if ('phoneNo' in $$props) $$invalidate(3, phoneNo = $$props.phoneNo);
    		if ('imageUrl' in $$props) $$invalidate(4, imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate(5, description = $$props.description);
    		if ('imageUrlValid' in $$props) $$invalidate(6, imageUrlValid = $$props.imageUrlValid);
    		if ('descriptionValid' in $$props) $$invalidate(7, descriptionValid = $$props.descriptionValid);
    		if ('categoryValid' in $$props) $$invalidate(8, categoryValid = $$props.categoryValid);
    		if ('phoneNoValid' in $$props) $$invalidate(9, phoneNoValid = $$props.phoneNoValid);
    		if ('emailValid' in $$props) $$invalidate(10, emailValid = $$props.emailValid);
    		if ('nameValid' in $$props) $$invalidate(11, nameValid = $$props.nameValid);
    		if ('formIsValid' in $$props) $$invalidate(12, formIsValid = $$props.formIsValid);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*name*/ 1) {
    			$$invalidate(11, nameValid = !isEmpty(name));
    		}

    		if ($$self.$$.dirty & /*email*/ 2) {
    			$$invalidate(10, emailValid = !isValidEmail(email));
    		}

    		if ($$self.$$.dirty & /*phoneNo*/ 8) {
    			$$invalidate(9, phoneNoValid = !isEmpty(phoneNo) && phoneNo.trim().length === 10);
    		}

    		if ($$self.$$.dirty & /*category*/ 4) {
    			$$invalidate(8, categoryValid = !isEmpty(category));
    		}

    		if ($$self.$$.dirty & /*description*/ 32) {
    			$$invalidate(7, descriptionValid = !isEmpty(description));
    		}

    		if ($$self.$$.dirty & /*imageUrl*/ 16) {
    			$$invalidate(6, imageUrlValid = !isEmpty(imageUrl));
    		}

    		if ($$self.$$.dirty & /*nameValid, emailValid, phoneNoValid, categoryValid, descriptionValid, imageUrlValid*/ 4032) {
    			$$invalidate(12, formIsValid = nameValid && emailValid && phoneNoValid && categoryValid && descriptionValid && imageUrlValid);
    		}
    	};

    	return [
    		name,
    		email,
    		category,
    		phoneNo,
    		imageUrl,
    		description,
    		imageUrlValid,
    		descriptionValid,
    		categoryValid,
    		phoneNoValid,
    		emailValid,
    		nameValid,
    		formIsValid,
    		submitForm,
    		input_handler,
    		input_handler_1,
    		input_handler_2,
    		input_handler_3,
    		input_handler_4,
    		textinput5_value_binding,
    		cancel_handler
    	];
    }

    class NewContactModal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NewContactModal",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/contacts/ContactGrid.svelte generated by Svelte v3.48.0 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/contacts/ContactGrid.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (113:0) {#if isLoading}
    function create_if_block_3(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(113:0) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    // (119:0) {#if !deleteMutlipleAction}
    function create_if_block_2$1(ctx) {
    	let section;
    	let div;
    	let t;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				disabled: /*showNewContactForm*/ ctx[1],
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[15]);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div = element("div");
    			t = space();
    			create_component(button.$$.fragment);
    			add_location(div, file$1, 120, 8, 3500);
    			attr_dev(section, "id", "contact-controls");
    			attr_dev(section, "class", "svelte-11iiddi");
    			add_location(section, file$1, 119, 4, 3460);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div);
    			append_dev(section, t);
    			mount_component(button, section, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*showNewContactForm*/ 2) button_changes.disabled = /*showNewContactForm*/ ctx[1];

    			if (dirty & /*$$scope*/ 8388608) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(119:0) {#if !deleteMutlipleAction}",
    		ctx
    	});

    	return block;
    }

    // (122:8) <Button             on:click={() => (showNewContactForm = true)}             disabled={showNewContactForm}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("New Contact");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(122:8) <Button             on:click={() => (showNewContactForm = true)}             disabled={showNewContactForm}>",
    		ctx
    	});

    	return block;
    }

    // (128:0) {#if showNewContactForm}
    function create_if_block_1$2(ctx) {
    	let newcontact;
    	let current;

    	newcontact = new NewContact({
    			props: {
    				editContact: /*editContact*/ ctx[3],
    				contactToEdit: /*contactToEdit*/ ctx[4]
    			},
    			$$inline: true
    		});

    	newcontact.$on("closeForm", /*closeForm_handler*/ ctx[16]);

    	const block = {
    		c: function create() {
    			create_component(newcontact.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(newcontact, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const newcontact_changes = {};
    			if (dirty & /*editContact*/ 8) newcontact_changes.editContact = /*editContact*/ ctx[3];
    			if (dirty & /*contactToEdit*/ 16) newcontact_changes.contactToEdit = /*contactToEdit*/ ctx[4];
    			newcontact.$set(newcontact_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(newcontact.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(newcontact.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(newcontact, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(128:0) {#if showNewContactForm}",
    		ctx
    	});

    	return block;
    }

    // (140:0) {#if deleteMutlipleAction}
    function create_if_block$2(ctx) {
    	let div2;
    	let div0;
    	let button0;
    	let t;
    	let div1;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				disabled: /*showNewContactForm*/ ctx[1] || !/*hasSelectedContacts*/ ctx[6],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*deleteMultipleHandler*/ ctx[9]);

    	button1 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*onCancelDeleteMutliple*/ ctx[10]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(button0.$$.fragment);
    			t = space();
    			div1 = element("div");
    			create_component(button1.$$.fragment);
    			attr_dev(div0, "class", "my-btn svelte-11iiddi");
    			add_location(div0, file$1, 141, 8, 3988);
    			attr_dev(div1, "class", "my-btn svelte-11iiddi");
    			add_location(div1, file$1, 148, 8, 4226);
    			attr_dev(div2, "class", "my-ctn svelte-11iiddi");
    			add_location(div2, file$1, 140, 4, 3959);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(button0, div0, null);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			mount_component(button1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button0_changes = {};
    			if (dirty & /*showNewContactForm, hasSelectedContacts*/ 66) button0_changes.disabled = /*showNewContactForm*/ ctx[1] || !/*hasSelectedContacts*/ ctx[6];

    			if (dirty & /*$$scope*/ 8388608) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 8388608) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(140:0) {#if deleteMutlipleAction}",
    		ctx
    	});

    	return block;
    }

    // (143:12) <Button                 on:click={deleteMultipleHandler}                 disabled={showNewContactForm || !hasSelectedContacts}                 >
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Delete Selected");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(143:12) <Button                 on:click={deleteMultipleHandler}                 disabled={showNewContactForm || !hasSelectedContacts}                 >",
    		ctx
    	});

    	return block;
    }

    // (150:12) <Button on:click={onCancelDeleteMutliple}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Cancel");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(150:12) <Button on:click={onCancelDeleteMutliple}>",
    		ctx
    	});

    	return block;
    }

    // (156:4) {#each filteredContacts as contact}
    function create_each_block(ctx) {
    	let contactcard;
    	let current;

    	contactcard = new ContactCard({
    			props: {
    				contact: /*contact*/ ctx[20],
    				canSelect: /*deleteMutlipleAction*/ ctx[5]
    			},
    			$$inline: true
    		});

    	contactcard.$on("editContact", /*editContactHandler*/ ctx[7]);
    	contactcard.$on("deleteSelect", /*onDeleteSelectHandler*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(contactcard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(contactcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const contactcard_changes = {};
    			if (dirty & /*filteredContacts*/ 1) contactcard_changes.contact = /*contact*/ ctx[20];
    			if (dirty & /*deleteMutlipleAction*/ 32) contactcard_changes.canSelect = /*deleteMutlipleAction*/ ctx[5];
    			contactcard.$set(contactcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(contactcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(contactcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(contactcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(156:4) {#each filteredContacts as contact}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let current;
    	let if_block0 = /*isLoading*/ ctx[2] && create_if_block_3(ctx);
    	let if_block1 = !/*deleteMutlipleAction*/ ctx[5] && create_if_block_2$1(ctx);
    	let if_block2 = /*showNewContactForm*/ ctx[1] && create_if_block_1$2(ctx);
    	let if_block3 = /*deleteMutlipleAction*/ ctx[5] && create_if_block$2(ctx);
    	let each_value = /*filteredContacts*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div0 = element("div");
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			t3 = space();
    			if (if_block3) if_block3.c();
    			t4 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(div0, file$1, 116, 0, 3419);
    			attr_dev(div1, "id", "contacts");
    			attr_dev(div1, "class", "svelte-11iiddi");
    			add_location(div1, file$1, 154, 0, 4350);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isLoading*/ ctx[2]) {
    				if (if_block0) {
    					if (dirty & /*isLoading*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!/*deleteMutlipleAction*/ ctx[5]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*deleteMutlipleAction*/ 32) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t2.parentNode, t2);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*showNewContactForm*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*showNewContactForm*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t3.parentNode, t3);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*deleteMutlipleAction*/ ctx[5]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*deleteMutlipleAction*/ 32) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block$2(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(t4.parentNode, t4);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*filteredContacts, deleteMutlipleAction, editContactHandler, onDeleteSelectHandler*/ 417) {
    				each_value = /*filteredContacts*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let deleteMutlipleAction;
    	let hasSelectedContacts;
    	let filteredContacts;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ContactGrid', slots, []);
    	let showNewContactForm = false;
    	let navAction = "";
    	let contacts = [];
    	let contactsToDel = new Set();
    	let isLoading;
    	let editContact;
    	let contactToEdit;
    	let searchKey = "";
    	let searchActions = true;

    	onMount(async () => {
    		$$invalidate(2, isLoading = true);

    		try {
    			const contactList = await getAllContacts();

    			store.update(val => {
    				$$invalidate(12, contacts = contactList);
    				return [...contacts];
    			});
    		} catch(error) {
    			$$invalidate(2, isLoading = false);
    			console.log(error);
    		}

    		$$invalidate(2, isLoading = false);
    	});

    	const unsubscribe1 = store$3.subscribe(action => {
    		$$invalidate(11, navAction = action);
    	});

    	const unsubscribe2 = store$2.subscribe(val => {
    		const { keyword, searchContacts } = val;

    		if (searchContacts) {
    			$$invalidate(14, searchKey = keyword);
    			searchActions = !searchContacts;
    		}
    	});

    	onDestroy(() => {
    		unsubscribe1();
    		unsubscribe2();
    	});

    	const editContactHandler = event => {
    		$$invalidate(3, editContact = true);
    		$$invalidate(4, contactToEdit = event.detail);
    		$$invalidate(1, showNewContactForm = true);
    	};

    	const onDeleteSelectHandler = event => {
    		const { id, selected } = event.detail;

    		if (contactsToDel.has(id)) {
    			contactsToDel.delete(id);
    		} else {
    			contactsToDel.add(id);
    		}

    		$$invalidate(13, contactsToDel = new Set(contactsToDel));
    	};

    	const deleteMultipleHandler = async () => {
    		$$invalidate(2, isLoading = true);
    		const selectContacts = [];

    		for (const id of contactsToDel) {
    			selectContacts.push(id);
    		}

    		if (selectContacts.length === 0) {
    			$$invalidate(2, isLoading = false);
    			alert("Please select some contacts to delete");
    			return;
    		}

    		console.log(selectContacts.length);
    		console.log(selectContacts);

    		try {
    			await deleteMultipleContacts(selectContacts);
    			$$invalidate(2, isLoading = false);
    		} catch(error) {
    			console.log(error);
    		}

    		$$invalidate(2, isLoading = false);
    		location.reload();
    	};

    	const onCancelDeleteMutliple = () => {
    		$$invalidate(5, deleteMutlipleAction = false);
    		store$3.update(val => "");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<ContactGrid> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, showNewContactForm = true);

    	const closeForm_handler = () => {
    		$$invalidate(1, showNewContactForm = false);
    		$$invalidate(3, editContact = false);
    		$$invalidate(4, contactToEdit = undefined);
    	};

    	$$self.$capture_state = () => ({
    		NewContact,
    		onDestroy,
    		onMount,
    		ContactCard,
    		contactsStore: store,
    		getAllContacts,
    		deleteMultipleContacts,
    		Button,
    		NewContactModal,
    		Loader,
    		navEventStore: store$3,
    		searchTermStore: store$2,
    		showNewContactForm,
    		navAction,
    		contacts,
    		contactsToDel,
    		isLoading,
    		editContact,
    		contactToEdit,
    		searchKey,
    		searchActions,
    		unsubscribe1,
    		unsubscribe2,
    		editContactHandler,
    		onDeleteSelectHandler,
    		deleteMultipleHandler,
    		onCancelDeleteMutliple,
    		deleteMutlipleAction,
    		filteredContacts,
    		hasSelectedContacts
    	});

    	$$self.$inject_state = $$props => {
    		if ('showNewContactForm' in $$props) $$invalidate(1, showNewContactForm = $$props.showNewContactForm);
    		if ('navAction' in $$props) $$invalidate(11, navAction = $$props.navAction);
    		if ('contacts' in $$props) $$invalidate(12, contacts = $$props.contacts);
    		if ('contactsToDel' in $$props) $$invalidate(13, contactsToDel = $$props.contactsToDel);
    		if ('isLoading' in $$props) $$invalidate(2, isLoading = $$props.isLoading);
    		if ('editContact' in $$props) $$invalidate(3, editContact = $$props.editContact);
    		if ('contactToEdit' in $$props) $$invalidate(4, contactToEdit = $$props.contactToEdit);
    		if ('searchKey' in $$props) $$invalidate(14, searchKey = $$props.searchKey);
    		if ('searchActions' in $$props) searchActions = $$props.searchActions;
    		if ('deleteMutlipleAction' in $$props) $$invalidate(5, deleteMutlipleAction = $$props.deleteMutlipleAction);
    		if ('filteredContacts' in $$props) $$invalidate(0, filteredContacts = $$props.filteredContacts);
    		if ('hasSelectedContacts' in $$props) $$invalidate(6, hasSelectedContacts = $$props.hasSelectedContacts);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*contacts, searchKey*/ 20480) {
    			$$invalidate(0, filteredContacts = contacts.filter(contact => {
    				return contact.name.includes(searchKey) || contact.email.includes(searchKey) || contact.phoneNo.includes(searchKey) || contact.category.includes(searchKey) || contact.description.includes(searchKey);
    			}));
    		}

    		if ($$self.$$.dirty & /*filteredContacts*/ 1) {
    			console.log(filteredContacts);
    		}

    		if ($$self.$$.dirty & /*navAction*/ 2048) {
    			$$invalidate(5, deleteMutlipleAction = navAction === "delete-multiple");
    		}

    		if ($$self.$$.dirty & /*contactsToDel*/ 8192) {
    			$$invalidate(6, hasSelectedContacts = contactsToDel.size !== 0);
    		}
    	};

    	return [
    		filteredContacts,
    		showNewContactForm,
    		isLoading,
    		editContact,
    		contactToEdit,
    		deleteMutlipleAction,
    		hasSelectedContacts,
    		editContactHandler,
    		onDeleteSelectHandler,
    		deleteMultipleHandler,
    		onCancelDeleteMutliple,
    		navAction,
    		contacts,
    		contactsToDel,
    		searchKey,
    		click_handler,
    		closeForm_handler
    	];
    }

    class ContactGrid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactGrid",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/UI/Home.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;

    // (43:26) 
    function create_if_block_1$1(ctx) {
    	let contactgrid;
    	let current;
    	contactgrid = new ContactGrid({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(contactgrid.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(contactgrid, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(contactgrid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(contactgrid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(contactgrid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(43:26) ",
    		ctx
    	});

    	return block;
    }

    // (41:0) {#if page === "profile"}
    function create_if_block$1(ctx) {
    	let userprofile;
    	let current;
    	userprofile = new UserProfile({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(userprofile.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(userprofile, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(userprofile.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(userprofile.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(userprofile, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(41:0) {#if page === \\\"profile\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_if_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*page*/ ctx[0] === "profile") return 0;
    		if (/*page*/ ctx[0] === "home") return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	let page;
    	let darkMode = false;

    	onMount(async () => {
    		try {
    			const user = await getUser();
    			console.log(user);

    			userStore.update(val => {
    				return { ...user };
    			});
    		} catch(error) {
    			console.log(error);
    		}
    	});

    	const unsubsribe1 = cmpStore.subscribe(val => {
    		$$invalidate(0, page = val);
    	});

    	const unsubscribe2 = store$1.subscribe(val => {
    		if (val === "dark") {
    			darkMode = true;
    		} else {
    			darkMode = false;
    		}
    	});

    	onDestroy(() => {
    		unsubsribe1();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onDestroy,
    		onMount,
    		cmpStore,
    		userStore,
    		UserProfile,
    		getUser,
    		ContactGrid,
    		themeStore: store$1,
    		page,
    		darkMode,
    		unsubsribe1,
    		unsubscribe2
    	});

    	$$self.$inject_state = $$props => {
    		if ('page' in $$props) $$invalidate(0, page = $$props.page);
    		if ('darkMode' in $$props) darkMode = $$props.darkMode;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [page];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    // (53:0) {:else}
    function create_else_block_2(ctx) {
    	let div;
    	let navbar;
    	let t;
    	let home;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(navbar.$$.fragment);
    			t = space();
    			create_component(home.$$.fragment);
    			attr_dev(div, "class", "my-container");
    			add_location(div, file, 53, 4, 1406);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(navbar, div, null);
    			append_dev(div, t);
    			mount_component(home, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(navbar);
    			destroy_component(home);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(53:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (35:0) {#if !authenticated}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block0;
    	let t;
    	let div;
    	let current;
    	const if_block_creators = [create_if_block_2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (!/*signin*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*signin*/ ctx[0]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block0.c();
    			t = space();
    			div = element("div");
    			if_block1.c();
    			attr_dev(div, "class", "choiceBtnContainer svelte-o9a5s2");
    			add_location(div, file, 41, 4, 1059);
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			if_block1.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(t.parentNode, t);
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(35:0) {#if !authenticated}",
    		ctx
    	});

    	return block;
    }

    // (38:4) {:else}
    function create_else_block_1(ctx) {
    	let signinform;
    	let current;
    	signinform = new SignInForm({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(signinform.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(signinform, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(signinform.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(signinform.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(signinform, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(38:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (36:4) {#if !signin}
    function create_if_block_2(ctx) {
    	let form;
    	let current;
    	form = new Form({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(form.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(form, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(form, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(36:4) {#if !signin}",
    		ctx
    	});

    	return block;
    }

    // (47:8) {:else}
    function create_else_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Sign IN";
    			attr_dev(button, "class", "choiceBtn svelte-o9a5s2");
    			add_location(button, file, 47, 12, 1263);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(47:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (43:8) {#if signin}
    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Sign Up";
    			attr_dev(button, "class", "btn btn-dark");
    			add_location(button, file, 43, 12, 1125);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(43:8) {#if signin}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*authenticated*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Contacto";
    			t1 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			attr_dev(h1, "class", "main-heading svelte-o9a5s2");
    			add_location(h1, file, 32, 4, 907);
    			attr_dev(div, "class", "header svelte-o9a5s2");
    			add_location(div, file, 31, 0, 882);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			insert_dev(target, t1, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let signin = true;
    	let authenticated = false;
    	let darkMode = false;

    	const unsubscribe1 = authStore.subscribe(val => {
    		$$invalidate(1, authenticated = val.authenticated);
    	});

    	const unsubscribe2 = store$1.subscribe(val => {
    		if (val === "dark") {
    			darkMode = true;
    		} else {
    			darkMode = false;
    		}
    	});

    	onDestroy(() => {
    		unsubscribe1();
    		unsubscribe2();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, signin = false);
    	const click_handler_1 = () => $$invalidate(0, signin = true);

    	$$self.$capture_state = () => ({
    		onDestroy,
    		onMount,
    		Navbar,
    		authStore,
    		Form,
    		SignInForm,
    		Home,
    		NewContactModal,
    		themeStore: store$1,
    		signin,
    		authenticated,
    		darkMode,
    		unsubscribe1,
    		unsubscribe2
    	});

    	$$self.$inject_state = $$props => {
    		if ('signin' in $$props) $$invalidate(0, signin = $$props.signin);
    		if ('authenticated' in $$props) $$invalidate(1, authenticated = $$props.authenticated);
    		if ('darkMode' in $$props) darkMode = $$props.darkMode;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [signin, authenticated, click_handler, click_handler_1];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
