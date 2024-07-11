<script lang="ts">
    import {transferLogs} from './store/transfer-log-store';

    function formatDateString(date: Date) {
        return date.toLocaleString('no-NO', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        });
    }

    function numberOfPagesDisplayText(numberOfPages: number) {
        return numberOfPages === 1 ? '1 side' : `${numberOfPages} sider`;
    }

</script>

<div class="transfer-log-container">
    <h1>Overføringslogg</h1>
    <div class="transfer-log">
        {#each $transferLogs.slice().reverse() as log}
            <p data-testid="transfer-log-message">
                [{formatDateString(log.timestamp)}]:
                Overførte {log.workingTitle} med {numberOfPagesDisplayText(log.pages)} til {log.transferLocation} ({log.uuid})
            </p>
        {/each}
    </div>
</div>

<style lang="scss">
  h1 {
    font-size: 1.25em;
    text-align: start;
  }

  .transfer-log-container {
    margin: auto 1em
  }

  .transfer-log {
    border-radius: 5px;
    background-color: rgba(55, 55, 55, 0.91);
    padding: 1em;
    margin: 1em 0;
  }

  p {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 18px
  }

    @media (prefers-color-scheme: light) {
      .transfer-log {
        background-color: rgb(230, 230, 230);
      }
    }
</style>