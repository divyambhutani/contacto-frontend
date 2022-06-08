<script>
    import { onDestroy, onMount } from "svelte/internal";
    import Navbar from "./UI/Navbar.svelte";
    import authStore from "./stores/auth-store";
    import Form from "./forms/Form.svelte";
    import SignInForm from "./forms/SignInForm.svelte";
    import Home from "./UI/Home.svelte";
    import NewContactModal from "./contacts/NewContactModal.svelte";
    import themeStore from "./stores/theme-store";

    let signin = true;
    let authenticated = false;
    let darkMode = false;

    const unsubscribe1 = authStore.subscribe((val) => {
        authenticated = val.authenticated;
    });

    const unsubscribe2 = themeStore.subscribe((val) => {
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
</script>

<div class="header">
    <h1 class="main-heading">Contacto</h1>
</div>
{#if !authenticated}
    {#if !signin}
        <Form />
    {:else}
        <SignInForm />
    {/if}

    <div class="choiceBtnContainer">
        {#if signin}
            <button class="btn btn-dark" on:click={() => (signin = false)}
                >Sign Up</button
            >
        {:else}
            <button class="choiceBtn" on:click={() => (signin = true)}
                >Sign IN</button
            >
        {/if}
    </div>
{:else}
    <div class="my-container">
        <Navbar />
        <Home />
    </div>
{/if}

<style>
    .header {
        display: flex;
        justify-content: center;
        background-color: purple;
    }
    .header h1 {
        color: white;
        font-size: 50px;
        margin: 5px;
    }
    .choiceBtnContainer {
        display: flex;
        justify-content: center;
        margin-top: 30px;
    }
    .choiceBtn {
        /* display: block; */
        /* margin-left: auto; */
        padding: 15px 30px;
        border: none;
        background-color: purple;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
    }

    .choiceBtn:hover {
        background-color: #9867c5;
        transform: translateY(-2px);
    }
</style>
