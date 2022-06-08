<script>
    import { onMount } from "svelte/internal";
    import { signin, changePassword } from "../utils/user";
    import {
        deleteSignInDetails,
        getSignInDetails,
        storeSignInDetails,
        sendOTP,
        verifyOTP,
    } from "../utils/util";
    import { isValidEmail } from "../utils/validation";
    import authStore from "../stores/auth-store";
    import Loader from "../UI/Loader.svelte";

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
                authStore.update((val) => {
                    return {
                        ...val,
                        authenticated: true,
                        token,
                        id,
                        email,
                        name,
                    };
                });
            }
        } else {
            deleteSignInDetails();
        }
    });

    const onSubmitHanlder = async () => {
        let data;
        isLoading = true;
        if (forgotPass && otpVerified) {
            await changePassword(email, password);
        }
        try {
            data = await signin(email, password);
        } catch (err) {
            console.log(err);
            deleteSignInDetails();
        }
        isLoading = false;
        authStore.update((val) => {
            storeSignInDetails(val.name, val.email, data.token, data.userId);
            return {
                ...val,
                authenticated: true,
                id: data.userId,
                token: data.token,
            };
        });
    };

    const forgotPassHandler = async () => {
        const useremail = prompt(
            "Please enter your email",
            "enter your email here"
        );
        isLoading = true;
        if (isValidEmail(useremail)) {
            try {
                await sendOTP(useremail);
                isLoading = false;
                alert("An OTP has been sent to your phone No\nplease verfiy");
            } catch (err) {
                console.log(err);
                isLoading = false;
                return;
            }
            const otp = prompt("Please enter your OTP", "enter your OTP here");
            isLoading = true;
            try {
                const data = await verifyOTP(useremail, otp);
                isLoading = false;
                alert("Please sign in with password of your choice");
                otpVerified = true;
                forgotPass = true;
                email = useremail;
            } catch (err) {
                console.log(err);
                isLoading = false;
            }
        }
    };
</script>

{#if isLoading}
    <Loader />
{/if}

<div class="signupFrm">
    <form class="form" on:submit|preventDefault={onSubmitHanlder}>
        <h2 class="title">Sign In</h2>
        <div class="inputContainer">
            <label for="email" class="label">Email</label>
            <input
                class="input"
                type="email"
                name="email"
                bind:value={email}
                placeholder="Email"
            />
        </div>

        <div class="inputContainer">
            <label for="password" class="label">Password </label>
            <input
                class="input"
                type="password"
                name="password"
                bind:value={password}
                placeholder="Password"
            />
        </div>
        <span class="my-span">
            <button type="button" class="submitBtn" on:click={forgotPassHandler}
                >Forgot Password</button
            >
            <button type="submit" class="submitBtn">Submit</button>
        </span>
    </form>
</div>

<style>
    @import url("https://fonts.googleapis.com/css2?family=Lato&display=swap");

    .signupFrm {
        display: flex;
        justify-content: center;
        align-items: center;
        height: auto;
    }

    .form {
        background-color: white;
        width: 400px;
        border-radius: 8px;
        padding: 20px 40px;
        box-shadow: 0 10px 25px rgba(92, 99, 105, 0.2);
    }

    .title {
        font-size: 50px;
        margin-bottom: 50px;
    }

    .inputContainer {
        position: relative;
        height: 45px;
        width: 90%;
        margin-bottom: 17px;
    }

    .input {
        position: absolute;
        top: 0px;
        left: 0px;
        height: 100%;
        width: 100%;
        border: 1px solid #dadce0;
        border-radius: 7px;
        font-size: 16px;
        padding: 0 20px;
        outline: none;
        background: none;
        z-index: 1;
    }

    .label {
        position: absolute;
        top: 15px;
        left: 15px;
        padding: 0 4px;
        background-color: white;
        color: #dadce0;
        font-size: 16px;
        transition: 0.5s;
        z-index: 0;
    }

    ::placeholder {
        color: transparent;
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
    /* .input:focus + .label {
        top: -7px;
        left: 3px;
        z-index: 10;
        font-size: 14px;
        font-weight: 600;
        color: purple;
    }

    .input:not(:placeholder-shown) + .label {
        top: -7px;
        left: 3px;
        z-index: 10;
        font-size: 14px;
        font-weight: 600;
    } */

    .input:focus {
        border: 2px solid purple;
    }
    .my-span {
        display: flex;
        justify-content: space-evenly;
    }
</style>
