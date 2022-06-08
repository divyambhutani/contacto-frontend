import { writable } from "svelte/store";

const store = writable({ keyword: "", searchContacts: true });

export default store;
