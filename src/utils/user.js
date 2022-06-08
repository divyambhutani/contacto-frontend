import { url } from "./constants";
import authStore from "../stores/auth-store";

export const signup = async (name, email, password, phoneNo) => {
    const res = await fetch(url + "/users/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, phoneNo }),
    });

    if (!res.ok) {
        alert("something happend while signup " + res.status);
        throw new Error("some error making singin call");
    }

    const data = await res.json();

    return data;
};

export const signin = async (email, password) => {
    const res = await fetch(url + "/users/signin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const parseRes = await res.json();
        alert("something happend while signin");
        throw new Error(parseRes);
    }
    const data = await res.json();
    return data;
};

export const getUser = async () => {
    let id = "",
        token = "";
    const unsubscribe = authStore.subscribe((val) => {
        id = val.id;
        token = val.token;
    });
    unsubscribe();

    if (id && token) {
        let headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(url + "/users/getUser?userId=" + id, {
            method: "GET",
            headers,
        });
        if (!res.ok) {
            alert("something happend while fetching user " + res.status);
            throw new Error("something happend while signin " + res.status);
        }
        const user = await res.json();
        return user;
    }
    return null;
};

export const updateUser = async (updatedUser) => {
    let id, token;
    const unsubscribe = authStore.subscribe((val) => {
        id = val.id;
        token = val.token;
    });
    unsubscribe();
    if (id && token) {
        let headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(url + "/users/updateProfile", {
            method: "PUT",
            headers,
            body: JSON.stringify(updatedUser),
        });
        if (!res.ok) {
            throw new Error(JSON.stringify(await res.json()));
        }
    }
};

export const changePassword = async (email, password) => {
    if (email && password) {
        let headers = { "Content-Type": "application/json" };
        const res = await fetch(url + "/password/changePassword", {
            method: "POST",
            headers,
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            throw new Error(JSON.stringify(await res.json()));
        }
    }
};
