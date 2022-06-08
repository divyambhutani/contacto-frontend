<script>
    import { createEventDispatcher } from "svelte";
    import { defaultUserImage } from "../utils/constants";
    import Button from "../UI/Button.svelte";
    import { deleteContact } from "../utils/contacts";
    import Loader from "../UI/Loader.svelte";

    export let contact;
    export let canSelect;
    let selected = false;
    let isLoading = false;
    let image = !contact.image ? defaultUserImage : contact.image;

    const dispatch = createEventDispatcher();

    const onDeleteHandler = async () => {
        isLoading = true;
        await deleteContact(contact.contactId);
        location.reload();
        isLoading = false;
        alert("contact deleted successfully");
    };
    const onEditHandler = () => {
        dispatch("editContact", contact);
    };
    const onClickHandler = () => {
        if (!canSelect) return;
        selected = !selected;
        dispatch("deleteSelect", { id: contact.contactId, selected });
    };
</script>

{#if isLoading}
    <Loader />
{/if}

<article on:click={onClickHandler} class:on-select={selected}>
    <header>
        <h1>{contact.name}</h1>
        <h2>{contact.category}</h2>
        <p>{contact.email}</p>
    </header>
    <div class="image">
        <img src={image} alt="" />
    </div>

    <div class="content">
        <p>{contact.description}</p>
    </div>
    <footer>
        <Button mode="outline" type="button" on:click={onEditHandler}
            >Edit</Button
        >
        <Button type="button" on:click={onDeleteHandler}>Delete</Button>
    </footer>
</article>

<style>
    .on-select {
        background-color: rgb(255, 150, 150);
        border: 2px solid red;
    }
    article {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.26);
        border-radius: 5px;
        background: white;
        margin: 1rem;
        background-color: rgb(227, 203, 255);
    }

    article:hover {
        box-shadow: 5 4px 16px rgba(0, 0, 0, 0.26);
        border: 2px solid rgb(255, 80, 255);
    }

    header,
    .content,
    footer {
        padding: 1rem;
    }

    .image {
        width: 100%;
        height: 12rem;
    }

    .image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    h1 {
        font-size: 1.25rem;
        margin: 0.5rem 0;
        font-family: "Roboto Slab", sans-serif;
    }

    /* h1.is-favorite {
        background: #01a129;
        color: white;
        padding: 0 0.5rem;
        border-radius: 5px;
    } */

    h2 {
        font-size: 1rem;
        color: #808080;
        margin: 0.5rem 0;
    }

    p {
        font-size: 1.25rem;
        margin: 0;
    }

    div {
        text-align: right;
    }

    .content {
        height: 4rem;
    }
</style>
