<script>
    import Loader from "../UI/Loader.svelte";
    import { onDestroy, onMount } from "svelte";
    import { defaultUserImage } from "../utils/constants";

    import userStore from "../stores/user-store";
    import { updateUser, changePassword } from "../utils/user";
    import { uploadImageFile } from "../utils/util";
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

    $: disableSave =
        newName.trim() === "" &&
        newEmail.trim() === "" &&
        newPhoneNo === "" &&
        !didImageChange;

    $: disableChangePassword =
        newPassword.trim() === "" ||
        confirmPassword.trim() === "" ||
        newPassword.localeCompare(confirmPassword);

    $: invalidConfirmPass =
        newPassword.localeCompare(confirmPassword) && focusedConfirm;

    const onSaveHandler = async () => {
        isLoading = true;
        let newUser = {
            ...user,
        };
        if (newName.length !== 0) newUser.name = newName;
        if (newEmail.length !== 0) newUser.email = newEmail;
        if (newPhoneNo.length !== 0) newUser.phoneNo = newPhoneNo;
        if (didImageChange) newUser.image = image;

        try {
            await updateUser(newUser);
            userStore.update((val) => {
                return { ...newUser };
            });
            isLoading = false;
            alert("User updated successfully");
        } catch (err) {
            isLoading = false;
            alert("Unable to update user \n Please try again later");
            console.log(err);
            return;
        }
    };

    const onPasswordChangeHandler = async () => {
        console.log("on pass change handler");
        isLoading = true;
        try {
            await changePassword(email, newPassword);
            isLoading = false;
            alert("Password changed successfully");
        } catch (err) {
            isLoading = false;
            console.log(err);
            alert("Unable to change password\n Please try again later");
        }
    };

    const uploadImage = async () => {
        isLoading = true;
        try {
            const url = await uploadImageFile(imageInput.files[0]);
            isLoading = false;
            image = url;
            didImageChange = true;
        } catch (error) {
            isLoading = false;
        }
        if (image === "") {
            image = defaultUserImage;
        }
    };

    onMount(() => {
        unsubscribe = userStore.subscribe((val) => {
            name = val.name;
            email = val.email;
            phoneNo = val.phoneNo;
            image = val.image;
            user = { ...val };
            if (!image) {
                image = defaultUserImage;
            }
        });
    });
    onDestroy(() => {
        unsubscribe();
    });
</script>

{#if isLoading}
    <Loader />
{/if}
<div class="container rounded bg-white mt-5 mb-5 my-ctn">
    <div class="row">
        <div class="col-md-3 border-right">
            <div
                class="d-flex flex-column align-items-center text-center p-3 py-5"
            >
                <img
                    alt=""
                    class="rounded-circle mt-5"
                    width="150px"
                    src={image}
                /><span class="font-weight-bold">{name}</span>
                <span class="text-black-50">{email}</span>
                <span class="text-black-50">{phoneNo}</span>
                <label for="image">Update Profile Pic</label>
                <input
                    name="image"
                    type="file"
                    class="text-black-50"
                    bind:this={imageInput}
                    on:change={uploadImage}
                />
                <span />
            </div>
        </div>
        <div class="col-md-5 border-right">
            <div class="p-3 py-5">
                <div
                    class="d-flex justify-content-between align-items-center mb-3"
                >
                    <h4 class="text-right">Profile Settings</h4>
                </div>
                <div class="row mt-2">
                    <div class="col-md-12">
                        <label class="labels" for="">Name</label><input
                            bind:value={newName}
                            type="text"
                            class="form-control"
                            placeholder="name"
                        />
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-12">
                        <label class="labels" for="">Mobile Number</label><input
                            bind:value={newPhoneNo}
                            type="text"
                            class="form-control"
                            placeholder="enter phone number"
                        />
                    </div>

                    <!-- <div class="col-md-12">
                        <label class="labels" for="">Email ID</label><input
                        bind:value={newEmail}
                        type="text"
                        class="form-control"
                            placeholder="enter email id"
                            />
                        </div> -->
                    <div class="col-md-12 my-btn-ctn">
                        <label class="labels" for="">Password</label><input
                            bind:value={newPassword}
                            type="password"
                            class="form-control"
                            placeholder="Enter new Password"
                        />
                    </div>
                    <span class="my-span">
                        <div class="col-md-12 my-btn-ctn">
                            <label
                                class="labels"
                                class:invalid-label={invalidConfirmPass}
                                for="">Confirm Password</label
                            ><input
                                bind:value={confirmPassword}
                                type="password"
                                class="form-control"
                                class:invalid-input={invalidConfirmPass}
                                placeholder="Confirm new Password"
                                on:click={() => {
                                    focusedConfirm = true;
                                }}
                            />
                        </div>
                        <div class="my-btn-ctn">
                            <button
                                class="btn my-btn btn-primary profile-button"
                                type="button"
                                on:click={onPasswordChangeHandler}
                                disabled={disableChangePassword}>Change</button
                            >
                        </div>
                    </span>
                </div>
                <div class="mt-5 text-center">
                    <button
                        class="btn btn-primary profile-button"
                        type="button"
                        disabled={disableSave}
                        on:click={onSaveHandler}>Save Profile</button
                    >
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .form-control:focus {
        box-shadow: none;
        border-color: #ba68c8;
    }

    .profile-button {
        background: rgb(99, 39, 120);
        box-shadow: none;
        border: none;
    }

    .profile-button:hover {
        background: #682773;
    }

    .profile-button:focus {
        background: #682773;
        box-shadow: none;
    }
    .profile-button:disabled {
        background: #682773;
    }

    .profile-button:active {
        background: #682773;
        box-shadow: none;
    }

    /* .back:hover {
        color: #682773;
        cursor: pointer;
    } */

    .labels {
        font-size: 11px;
    }

    .my-span {
        display: flex;
    }
    .my-btn {
        padding: 5px;
        height: 35px;
        margin-top: 25px;
        margin-left: 20px;
    }

    .invalid-input {
        border-color: red;
    }
    .invalid-label {
        color: red;
    }
</style>
