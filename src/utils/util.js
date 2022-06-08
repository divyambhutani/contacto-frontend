import authStore from "../stores/auth-store";
import { url } from "./constants";

export const storeSignInDetails = (name, email, token, id) => {
    localStorage.setItem(
        "contacto-signin-details",
        JSON.stringify({
            name,
            email,
            token,
            id,
        })
    );
};

export const getSignInDetails = () => {
    return JSON.parse(localStorage.getItem("contacto-signin-details"));
};

export const deleteSignInDetails = () => {
    localStorage.removeItem("contacto-signin-details");
};

export const uploadImageFile = async (file) => {
    const blob = new Blob([file], { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("image", blob);
    let token = "";
    const unsubscribe = authStore.subscribe((val) => {
        token = val.token;
    });
    unsubscribe();
    console.log(token);
    if (token) {
        let headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(url + "/image/upload", {
            method: "POST",
            headers,
            body: formData,
        });
        if (!res.ok) {
            console.log(await res.json());
            alert("something happend while uploading image " + res.status);
            throw new Error(
                "something happend while uploading image " + res.status
            );
        }
        const data = await res.json();
        return data.url;
    }
    return null;
};

export const sendOTP = async (email) => {
    let headers = { "Content-Type": "application/json" };
    // if (token) {
    //     headers["Authorization"] = `Bearer ${token}`;
    // }
    const res = await fetch(url + `/password/forgotPassword?email=${email}`, {
        method: "GET",
        headers,
    });
    if (!res.ok) {
        alert("Unable to find account with this email");
        throw new Error(JSON.stringify(await res.json()));
    }
    return await res.json();
};

export const verifyOTP = async (email, otp) => {
    let headers = { "Content-Type": "application/json" };
    // if (token) {
    //     headers["Authorization"] = `Bearer ${token}`;
    // }
    const res = await fetch(
        url + "/password/verifyOTP?enteredOtp=" + otp + "&email=" + email,
        {
            method: "GET",
            headers,
        }
    );
    if (!res.ok) {
        alert("Unable to find account with this email");
        throw new Error(JSON.stringify(await res.json()));
    }
    return await res.json();
};
