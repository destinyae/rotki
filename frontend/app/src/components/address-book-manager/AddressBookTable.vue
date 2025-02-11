<script setup lang="ts">
import { NotificationCategory, type NotificationPayload, Severity } from '@rotki/common';
import type { DataTableColumn, DataTableSortData, TablePaginationData } from '@rotki/ui-library';
import type { AddressBookEntry, AddressBookLocation } from '@/types/eth-names';
import type { Collection } from '@/types/collection';

const paginationModel = defineModel<TablePaginationData>('pagination', { required: true });

const sortModel = defineModel<DataTableSortData<AddressBookEntry>>('sort', { required: true });

const props = defineProps<{
  collection: Collection<AddressBookEntry>;
  location: AddressBookLocation;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit', item: AddressBookEntry): void;
  (e: 'refresh'): void;
}>();

const { location } = toRefs(props);

const { t } = useI18n();

const cols = computed<DataTableColumn<AddressBookEntry>[]>(() => [
  {
    label: t('common.address'),
    key: 'address',
    sortable: true,
  },
  {
    label: t('common.name'),
    key: 'name',
    sortable: true,
  },
  {
    label: '',
    key: 'actions',
  },
]);

function refresh() {
  emit('refresh');
}

function edit(item: AddressBookEntry) {
  emit('edit', item);
}

function setPage(page: number) {
  set(paginationModel, {
    ...get(paginationModel),
    page,
  });
}

function addressBookDeletion(location: Ref<AddressBookLocation>) {
  const { show } = useConfirmStore();
  const { notify } = useNotificationsStore();
  const { deleteAddressBook: deleteAddressBookCaller } = useAddressesNamesStore();

  const deleteAddressBook = async (address: string, blockchain: string | null) => {
    try {
      await deleteAddressBookCaller(get(location), [{ address, blockchain }]);
      refresh();
    }
    catch (error: any) {
      const notification: NotificationPayload = {
        title: t('address_book.actions.delete.error.title'),
        message: t('address_book.actions.delete.error.description', {
          chain: blockchain || t('common.multi_chain'),
          address,
          message: error.message,
        }),
        category: NotificationCategory.DEFAULT,
        display: true,
        severity: Severity.ERROR,
      };
      notify(notification);
    }
  };

  const showDeleteConfirmation = (item: AddressBookEntry) => {
    show(
      {
        title: t('address_book.actions.delete.dialog.title'),
        message: t('address_book.actions.delete.dialog.message', {
          chain: item.blockchain || t('common.multi_chain'),
          address: item.address,
        }),
      },
      () => deleteAddressBook(item.address, item.blockchain),
    );
  };

  return {
    showDeleteConfirmation,
  };
}

const { showDeleteConfirmation } = addressBookDeletion(location);
</script>

<template>
  <div>
    <CollectionHandler
      :collection="collection"
      @set-page="setPage($event)"
    >
      <template #default="{ data }">
        <RuiDataTable
          v-model:pagination.external="paginationModel"
          v-model:sort.external="sortModel"
          :rows="data"
          :cols="cols"
          :loading="loading"
          row-attr="address"
          outlined
          dense
        >
          <template #item.address="{ row }">
            <AccountDisplay
              :account="{
                address: row.address,
                chain: row.blockchain ?? 'ALL',
              }"
              :use-alias-name="false"
              :truncate="false"
            />
          </template>
          <template #item.actions="{ row }">
            <RowActions
              :disabled="loading"
              :delete-tooltip="t('address_book.actions.delete.tooltip')"
              :edit-tooltip="t('address_book.actions.edit.tooltip')"
              @delete-click="showDeleteConfirmation(row)"
              @edit-click="edit(row)"
            />
          </template>
        </RuiDataTable>
      </template>
    </CollectionHandler>
  </div>
</template>
