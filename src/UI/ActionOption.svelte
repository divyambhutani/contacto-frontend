<script>
    import { actions } from "../utils/constants";
</script>

<datalist id="actions" for="actions">
    {#each actions as action}
        <option value={action} />
    {/each}
</datalist>
