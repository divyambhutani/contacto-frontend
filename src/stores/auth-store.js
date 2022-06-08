import { writable } from "svelte/store";

const authStore = writable({
    authenticated: false,
    name: "",
    email: "",
    id: "",
    token: "",
});

export default authStore;
