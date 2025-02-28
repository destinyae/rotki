<script setup lang="ts">
import { TRADE_LOCATION_EXTERNAL } from '@/data/defaults';
import { BalanceType } from '@/types/balances';
import { NoteLocation } from '@/types/notes';
import type { ManualBalance, RawManualBalance } from '@/types/manual-balances';

definePage({
  name: 'accounts-balances-manual',
  meta: {
    noteLocation: NoteLocation.ACCOUNTS_BALANCES_MANUAL,
  },
  props: true,
});

const props = defineProps<{ tab: string }>();

const balance = ref<ManualBalance | RawManualBalance>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute('accounts-balances-manual');

const { fetchManualBalances } = useManualBalancesStore();
const { fetchAssociatedLocations } = useHistoryStore();

function add() {
  set(balance, {
    location: TRADE_LOCATION_EXTERNAL,
    asset: '',
    label: '',
    balanceType: props.tab === 'liabilities' ? BalanceType.LIABILITY : BalanceType.ASSET,
    tags: null,
    amount: Zero,
  } satisfies RawManualBalance);
}

function goToTab(tab: string | number) {
  const currentRoute = get(route);
  if (currentRoute.params.tab === tab)
    return;
  router.push(`/balances/manual/${tab}`);
}

watchImmediate(route, (route) => {
  const { params } = route;

  if (!params.tab)
    router.push('/balances/manual/assets');
}, { deep: true });

onBeforeMount(async () => {
  const { query } = get(route);
  if (query.add) {
    await router.replace({ query: {} });
    startPromise(nextTick(() => add()));
  }
  await fetchManualBalances();
  await fetchAssociatedLocations();
});
</script>

<template>
  <TablePageLayout
    :title="[
      t('navigation_menu.accounts_balances'),
      t('navigation_menu.accounts_balances_sub.manual_balances'),
    ]"
  >
    <template #buttons>
      <PriceRefresh />
      <RuiButton
        v-blur
        color="primary"
        class="manual-balances__add-balance"
        @click="add()"
      >
        <template #prepend>
          <RuiIcon name="add-line" />
        </template>
        {{ t('manual_balances.add_manual_balance') }}
      </RuiButton>
    </template>

    <div>
      <RuiTabs
        :model-value="tab"
        color="primary"
        class="border border-default rounded bg-white dark:bg-rui-grey-900 flex max-w-min mb-3"
        @update:model-value="goToTab($event)"
      >
        <RuiTab value="assets">
          {{ t('common.assets') }}
        </RuiTab>
        <RuiTab value="liabilities">
          {{ t('common.liabilities') }}
        </RuiTab>
      </RuiTabs>
      <RuiTabItems :model-value="tab">
        <RuiTabItem value="assets">
          <ManualBalanceTable
            data-cy="manual-balances"
            :title="t('manual_balances.balances')"
            type="balances"
            @edit="balance = $event"
          />
        </RuiTabItem>
        <RuiTabItem value="liabilities">
          <ManualBalanceTable
            data-cy="manual-liabilities"
            :title="t('manual_balances.liabilities')"
            type="liabilities"
            @edit="balance = $event"
          />
        </RuiTabItem>
      </RuiTabItems>
    </div>

    <ManualBalancesDialog
      v-model="balance"
      @update-tab="goToTab($event)"
    />
  </TablePageLayout>
</template>
