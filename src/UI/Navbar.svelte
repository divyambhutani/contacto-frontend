<script>
    import { onMount, onDestroy } from "svelte";
    import cmpStore from "../stores/component-store";
    import userStore from "../stores/user-store";
    import navEventStore from "../stores/nav-event-store";
    import { defaultUserImage } from "../utils/constants";
    import { deleteSignInDetails } from "../utils/util";
    import searchTermStore from "../stores/search-term-store";
    import ActionOptions from "../UI/ActionOption.svelte";
    import { actions } from "../utils/constants";
    import themeStore from "../stores/theme-store";

    let userImage = defaultUserImage;
    let searchTerm = "";
    let searchActions = false;
    const changePage = (page) => {
        cmpStore.update((val) => {
            return page;
        });
    };
    $: console.log(searchActions);
    let unsubscribe;
    onMount(() => {
        unsubscribe = userStore.subscribe((val) => {
            userImage = val.image;
        });
    });

    onDestroy(() => {
        unsubscribe();
    });

    const logOut = () => {
        deleteSignInDetails();
        location.reload();
    };

    const onSearchChange = (event) => {
        const term = searchTerm.trim();
        let searchContacts = true;
        if (term.length > 0) {
            searchContacts = term[0] !== ":";
            searchActions = !searchContacts;
        } else if (term.length === 0) {
            searchActions = !searchContacts;
        }
        searchTermStore.update((val) => {
            return {
                keyword: term,
                searchContacts,
            };
        });
    };
</script>

<nav class="navbar navbar-expand-lg bg-light">
    <div class="container-fluid">
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item">
                    <div
                        class="my-img-ctn"
                        href="#"
                        on:click={() => changePage("profile")}
                    >
                        <img
                            class="img-fluid my-img"
                            src={userImage}
                            alt="user profile"
                        />
                    </div>
                </li>
                <li class="nav-item">
                    <a
                        class="nav-link active"
                        aria-current="page"
                        href="#"
                        on:click={() => changePage("home")}>Home</a
                    >
                </li>
                <li class="nav-item">
                    <a
                        class="nav-link active"
                        aria-current="page"
                        href="#"
                        on:click={() => changePage("profile")}>Profile</a
                    >
                </li>

                <li class="nav-item dropdown">
                    <a
                        class="nav-link dropdown-toggle"
                        href="#"
                        id="navbarDropdown"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        Actions
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
                        <li>
                            <a
                                class="dropdown-item"
                                href="#"
                                on:click={() =>
                                    navEventStore.update(
                                        (val) => "delete-multiple"
                                    )}>Delete Multiple</a
                            >
                        </li>
                        <!-- <li>
                            <a
                                class="dropdown-item"
                                href="#"
                                on:click={() => {
                                    themeStore.update((val) => "dark");
                                }}>Dark Mode</a
                            >
                        </li> -->
                    </ul>
                </li>
                <li class="nav-item">
                    <a
                        class="nav-link active"
                        aria-current="page"
                        href="#"
                        on:click={logOut}>Logout</a
                    >
                </li>
            </ul>
            <form class="d-flex" role="search">
                <input
                    class="form-control me-2"
                    placeholder="Search"
                    aria-label="Search"
                    bind:value={searchTerm}
                    on:input={onSearchChange}
                    for="actions"
                    list="actions"
                />

                {#if searchActions}
                    <datalist id="actions" for="actions">
                        {#each actions as action}
                            <option value={action} />
                        {/each}
                    </datalist>
                {/if}
                <!-- <button class="btn btn-outline-success" type="submit"
                    >Search</button
                > -->
            </form>
        </div>
    </div>
</nav>

<style>
    .my-img {
        margin-top: 5px;
        border-width: 2px;
        border-style: solid;
        border-color: skyblue;
        border-radius: 30px;
        width: 30px;
    }
    .my-img-ctn {
        background-color: white;
        display: inline-block;
    }
    .my-img-ctn img:hover {
        opacity: 0.5;
    }
</style>
