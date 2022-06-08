<script>
    import TextInput from "../UI/TextInput.svelte";
    import Modal from "../UI/Modal.svelte";
    import { isEmpty, isValidEmail } from "../utils/validation";
    import Button from "../UI/Button.svelte";
    let name = "";
    let email = "";
    let category = "";
    let phoneNo = "";
    let imageUrl = "";
    let description = "";

    $: nameValid = !isEmpty(name);
    $: emailValid = !isValidEmail(email);
    $: phoneNoValid = !isEmpty(phoneNo) && phoneNo.trim().length === 10;
    $: categoryValid = !isEmpty(category);
    $: descriptionValid = !isEmpty(description);
    $: imageUrlValid = !isEmpty(imageUrl);

    $: formIsValid =
        nameValid &&
        emailValid &&
        phoneNoValid &&
        categoryValid &&
        descriptionValid &&
        imageUrlValid;

    const submitForm = (event) => {
        console.log(event);
    };
</script>

<Modal title="Contact Form" on:cancel>
    <form on:submit={submitForm}>
        <TextInput
            id="name"
            label="Name"
            valid={nameValid}
            validityMessage="Please enter a valid name"
            value={name}
            on:input={(event) => (name = event.target.value)}
        />
        <TextInput
            id="category"
            label="Category"
            valid={categoryValid}
            validityMessage="Please enter a valid category"
            value={category}
            on:input={(event) => (category = event.target.value)}
        />
        <TextInput
            id="email"
            label="Email"
            valid={emailValid}
            validityMessage="Please enter a email address"
            value={email}
            type="email"
            on:input={(event) => (email = event.target.value)}
        />
        <TextInput
            id="imageUrl"
            label="Image URL"
            valid={imageUrlValid}
            validityMessage="Please enter a valid image url."
            value={imageUrl}
            on:input={(event) => (imageUrl = event.target.value)}
        />
        <TextInput
            id="phoneNo"
            label="Mobile Number"
            valid={phoneNoValid}
            validityMessage="Please enter a valid phoneNo"
            value={phoneNo}
            on:input={(event) => (phoneNo = event.target.value)}
        />
        <TextInput
            id="description"
            label="Description"
            controlType="textarea"
            valid={descriptionValid}
            validityMessage="Please enter a valid description."
            bind:value={description}
        />
    </form>
    <div slot="footer">
        <!-- <Button type="button" mode="outline" on:click={cancel}>Cancel</Button> -->
        <Button type="button" on:click={submitForm} disabled={!formIsValid}>
            Save
        </Button>
        <!-- {#if id}
            <Button type="button" on:click={deleteMeetup}>Delete</Button>
        {/if} -->
    </div>
</Modal>

<style>
    form {
        width: 100%;
    }
</style>
