<script>
    import NewContact from "./NewContact.svelte";
    import { onDestroy, onMount } from "svelte";
    import ContactCard from "./ContactCard.svelte";
    import contactsStore from "../stores/contacts-store";
    import { getAllContacts, deleteMultipleContacts } from "../utils/contacts";
    import Button from "../UI/Button.svelte";
    import NewContactModal from "./NewContactModal.svelte";
    import Loader from "../UI/Loader.svelte";
    import navEventStore from "../stores/nav-event-store";
    import searchTermStore from "../stores/search-term-store";

    let showNewContactForm = false;
    let navAction = "";
    let contacts = [];
    let contactsToDel = new Set();
    let isLoading;
    let editContact;
    let contactToEdit;
    let searchKey = "";
    let searchActions = true;
    $: console.log(filteredContacts);

    $: deleteMutlipleAction = navAction === "delete-multiple";
    $: hasSelectedContacts = contactsToDel.size !== 0;

    $: filteredContacts = contacts.filter((contact) => {
        return (
            contact.name.includes(searchKey) ||
            contact.email.includes(searchKey) ||
            contact.phoneNo.includes(searchKey) ||
            contact.category.includes(searchKey) ||
            contact.description.includes(searchKey)
        );
    });

    onMount(async () => {
        isLoading = true;
        try {
            const contactList = await getAllContacts();
            contactsStore.update((val) => {
                contacts = contactList;
                return [...contacts];
            });
        } catch (error) {
            isLoading = false;
            console.log(error);
        }
        isLoading = false;
    });

    const unsubscribe1 = navEventStore.subscribe((action) => {
        navAction = action;
    });

    const unsubscribe2 = searchTermStore.subscribe((val) => {
        const { keyword, searchContacts } = val;
        if (searchContacts) {
            searchKey = keyword;
            searchActions = !searchContacts;
        }
    });

    onDestroy(() => {
        unsubscribe1();
        unsubscribe2();
    });

    const editContactHandler = (event) => {
        editContact = true;
        contactToEdit = event.detail;
        showNewContactForm = true;
    };

    const onDeleteSelectHandler = (event) => {
        const { id, selected } = event.detail;
        if (contactsToDel.has(id)) {
            contactsToDel.delete(id);
        } else {
            contactsToDel.add(id);
        }
        contactsToDel = new Set(contactsToDel);
    };

    const deleteMultipleHandler = async () => {
        isLoading = true;
        const selectContacts = [];
        for (const id of contactsToDel) {
            selectContacts.push(id);
        }
        if (selectContacts.length === 0) {
            isLoading = false;
            alert("Please select some contacts to delete");
            return;
        }
        console.log(selectContacts.length);
        console.log(selectContacts);
        try {
            await deleteMultipleContacts(selectContacts);
            isLoading = false;
        } catch (error) {
            console.log(error);
        }
        isLoading = false;
        location.reload();
    };
    const onCancelDeleteMutliple = () => {
        deleteMutlipleAction = false;
        navEventStore.update((val) => "");
    };
</script>

{#if isLoading}
    <Loader />
{/if}

<div />

{#if !deleteMutlipleAction}
    <section id="contact-controls">
        <div />
        <Button
            on:click={() => (showNewContactForm = true)}
            disabled={showNewContactForm}>New Contact</Button
        >
    </section>
{/if}
{#if showNewContactForm}
    <NewContact
        on:closeForm={() => {
            showNewContactForm = false;
            editContact = false;
            contactToEdit = undefined;
        }}
        {editContact}
        {contactToEdit}
    />
{/if}

{#if deleteMutlipleAction}
    <div class="my-ctn">
        <div class="my-btn">
            <Button
                on:click={deleteMultipleHandler}
                disabled={showNewContactForm || !hasSelectedContacts}
                >Delete Selected</Button
            >
        </div>
        <div class="my-btn">
            <Button on:click={onCancelDeleteMutliple}>Cancel</Button>
        </div>
    </div>
{/if}

<div id="contacts">
    {#each filteredContacts as contact}
        <ContactCard
            {contact}
            on:editContact={editContactHandler}
            on:deleteSelect={onDeleteSelectHandler}
            canSelect={deleteMutlipleAction}
        />
    {/each}
</div>

<style>
    #contacts {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr;
        grid-gap: 1rem;
    }

    #contact-controls {
        margin: 1rem;
        display: flex;
        justify-content: space-between;
    }

    @media (min-width: 768px) {
        #contacts {
            grid-template-columns: repeat(4, 1fr);
        }
    }
    .my-ctn {
        display: flex;
        justify-content: center;
        margin: 15px;
    }
    .my-btn {
        margin: 15px;
    }
</style>
