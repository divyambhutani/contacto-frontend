import authStore from "../stores/auth-store";
import { url } from "./constants";
import contactStore from "../stores/contacts-store";

export const getAllContacts = async () => {
    let token = "";
    const unsubscribe = authStore.subscribe((val) => {
        token = val.token;
    });
    unsubscribe();
    console.log(token);
    if (token) {
        let headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(url + "/contacts/getAll?limit=30", {
            method: "GET",
            headers,
        });
        if (!res.ok) {
            alert("something happend while fetching contacts " + res.status);
            throw new Error("something happend while contacts " + res.status);
        }
        const data = await res.json();
        return data;
    }
    return null;
};

export const createNewContact = async (newContact) => {
    let token = "";
    const unsubscribe = authStore.subscribe((val) => {
        token = val.token;
    });
    unsubscribe();
    console.log(token);
    if (token) {
        let headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(url + "/contacts/add", {
            method: "POST",
            headers,
            body: JSON.stringify(newContact),
        });
        if (!res.ok) {
            alert("something happend while creating new contact " + res.status);
            throw new Error(
                "something happend while creating new contact " + res.status
            );
        }
        const data = await res.json();
        return data;
    }
    return null;
};

export const deleteContact = async (contactId) => {
    let token = "";
    const unsubscribe = authStore.subscribe((val) => {
        token = val.token;
    });
    unsubscribe();
    if (token && contactId) {
        let headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(
            url + "/contacts/delete?contactId=" + contactId,
            {
                method: "DELETE",
                headers,
            }
        );
        // if (!res.ok) {
        //     console.log(await res.json());
        //     alert("something happend while deleting a contact " + res.status);
        //     throw new Error(
        //         "something happend while deleting a contact " + res.status
        //     );
        // }
        const data = await res.json();
        return data;
    }
    return null;
};

export const updateContact = async (contact) => {
    let token = "";
    const unsubscribe = authStore.subscribe((val) => {
        token = val.token;
    });
    unsubscribe();
    console.log(token);
    if (token) {
        let headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(
            url + "/contacts/updateContact?contactId=" + contact.contactId,
            {
                method: "PUT",
                headers,
                body: JSON.stringify(contact),
            }
        );
        if (!res.ok) {
            console.log(await res.json());
            alert("something happend while creating new contact " + res.status);
            throw new Error(
                "something happend while creating new contact " + res.status
            );
        }
        const data = await res.json();
        return data;
    }
    return null;
};

export const deleteMultipleContacts = async (contacts) => {
    console.log(contacts);
    let token = "";
    const unsubscribe = authStore.subscribe((val) => {
        token = val.token;
    });
    unsubscribe();
    console.log(token);
    if (token) {
        let headers = { "Content-Type": "application/json" };
        headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url + "/contacts/deleteMultiple", {
            headers,
            method: "DELETE",
            body: JSON.stringify({ contacts }),
        });
        if (!res.ok) {
            console.log(await res.json());
            alert(
                "something happend while deleting multiple contacts " +
                    res.status
            );
            throw new Error(
                "something happend while deleting multiple contacts " +
                    res.status
            );
        }
        const data = await res.json();
        return data;
    }
    return null;
};
