<script>
    import { signup } from "../utils/user";
    import authStore from "../stores/auth-store";
    import { url } from "../utils/constants";
    let name;
    let email;
    let password;
    let phoneNo;

    const onSubmitHanlder = async () => {
        const data = await signup(name, email, password, phoneNo);
        if (data != null) {
            alert("User signed up!\n Please verify on your mail and sign in");
        }
        console.log(data);
    };
</script>

<div class="signupFrm">
    <form class="form" on:submit|preventDefault={onSubmitHanlder}>
        <h2 class="title">Sign Up</h2>
        <div class="inputContainer">
            <label class="label" for="email">Email</label>
            <input
                class="input"
                type="email"
                name="email"
                bind:value={email}
                placeholder="Email"
            />
        </div>

        <div class="inputContainer">
            <label class="label" for="name">Name</label>
            <input class="input" type="text" name="name" bind:value={name} />
        </div>

        <div class="inputContainer">
            <label class="label" for="password">Password </label>
            <input
                class="input"
                type="password"
                name="password"
                bind:value={password}
            />
        </div>
        <div class="inputContainer">
            <label class="label" for="phoneNo">Phone Number </label>
            <input
                class="input"
                type="text"
                name="phoneNo"
                bind:value={phoneNo}
            />
        </div>
        <button class="submitBtn" type="submit">Submit</button>
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
</style>
