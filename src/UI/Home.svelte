<script>
    import { onDestroy, onMount } from "svelte";

    import cmpStore from "../stores/component-store";
    import userStore from "../stores/user-store";
    import UserProfile from "../user-profile/UserProfile.svelte";
    import { getUser } from "../utils/user";
    import ContactGrid from "../contacts/ContactGrid.svelte";
    import themeStore from "../stores/theme-store";

    let page;
    let darkMode = false;
    onMount(async () => {
        try {
            const user = await getUser();
            console.log(user);
            userStore.update((val) => {
                return { ...user };
            });
        } catch (error) {
            console.log(error);
        }
    });

    const unsubsribe1 = cmpStore.subscribe((val) => {
        page = val;
    });

    const unsubscribe2 = themeStore.subscribe((val) => {
        if (val === "dark") {
            darkMode = true;
        } else {
            darkMode = false;
        }
    });
    onDestroy(() => {
        unsubsribe1();
    });
</script>

{#if page === "profile"}
    <UserProfile />
{:else if page === "home"}
    <ContactGrid />
{/if}
