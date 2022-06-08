<script>
    import TextInput from "../UI/TextInput.svelte";
    import { createEventDispatcher } from "svelte";
    import { isEmpty, isValidEmail } from "../utils/validation";
    import { uploadImageFile } from "../utils/util";
    import Loader from "../UI/Loader.svelte";
    import { defaultUserImage } from "../utils/constants";
    import { createNewContact, updateContact } from "../utils/contacts";

    export let editContact, contactToEdit;
    let name = editContact ? contactToEdit.name : "";
    let email = editContact ? contactToEdit.email : "";
    let category = editContact ? contactToEdit.category : "";
    let phoneNo = editContact ? contactToEdit.phoneNo : "";
    let description = editContact ? contactToEdit.description : "";
    let imageInput;
    let image = editContact ? contactToEdit.image : "";
    let isLoading = false;

    $: nameValid = !isEmpty(name);
    $: emailValid = isValidEmail(email);
    $: categoryValid = !isEmpty(category);
    $: phoneNoValid = !isEmpty(phoneNo) && phoneNo.trim().length === 10;
    $: descriptionValid = !isEmpty(description);
    $: formIsValid =
        nameValid &&
        emailValid &&
        categoryValid &&
        phoneNoValid &&
        descriptionValid;

    $: console.log(name);

    const cancelHandler = () => dispatch("closeForm");

    const addNewContact = async (event) => {
        isLoading = true;
        const newContact = {
            name,
            email,
            category,
            phoneNo,
            description,
            image,
        };
        if (editContact) {
            const updatedContact = {
                ...newContact,
                contactId: contactToEdit.contactId,
            };
            try {
                await updateContact(updatedContact);
                isLoading = false;
                //alert("contact updated successfully");
            } catch (error) {
                console.log(error);
                isLoading = false;
                return;
            }
        } else {
            try {
                await createNewContact(newContact);
                isLoading = false;
            } catch (error) {
                console.log(error);
                isLoading = false;
                return;
            }
        }
        location.reload();
        cancelHandler();
    };

    const uploadImage = async () => {
        isLoading = true;
        try {
            const url = await uploadImageFile(imageInput.files[0]);
            isLoading = false;
            image = url;
            console.log(url);
        } catch (error) {
            isLoading = false;
        }
        if (image === "") {
            image = defaultUserImage;
        }
    };

    const dispatch = createEventDispatcher();
</script>

{#if isLoading}
    <Loader />
{/if}

<main>
    <form on:submit|preventDefault={addNewContact}>
        <TextInput
            id="name"
            label="Name"
            type="text"
            value={name}
            on:input={(event) => (name = event.target.value)}
        />
        <TextInput
            id="category"
            label="Category"
            type="text"
            value={category}
            on:input={(event) => (category = event.target.value)}
        />
        <TextInput
            id="email"
            label="Email"
            type="email"
            value={email}
            on:input={(event) => (email = event.target.value)}
        />
        <TextInput
            id="phoneNo"
            label="Phone No"
            type="text"
            value={phoneNo}
            on:input={(event) => (phoneNo = event.target.value)}
        />

        <TextInput
            id="description"
            label="Description"
            controlType="text"
            value={description}
            on:input={(event) => (description = event.target.value)}
        />
        <input type="file" on:change={uploadImage} bind:this={imageInput} />
        <span class="my-span">
            <button class="submitBtn" type="button" on:click={cancelHandler}
                >Cancel</button
            >
            <button class="submitBtn" disabled={!formIsValid}
                >{editContact ? "Update" : "Submit"}</button
            ></span
        >
    </form>
</main>

<style>
    main {
        margin-top: 5rem;
    }

    form {
        width: 30rem;
        max-width: 90%;
        margin: auto;
    }

    .submitBtn {
        display: block;
        margin-left: auto;
        padding: 15px 30px;
        border: none;
        background-color: purple;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 30px;
    }

    .submitBtn:hover {
        background-color: #9867c5;
        transform: translateY(-2px);
    }
    .my-span {
        display: flex;
        justify-content: space-evenly;
    }

    .submitBtn:disabled {
        background-color: grey;
    }
</style>
