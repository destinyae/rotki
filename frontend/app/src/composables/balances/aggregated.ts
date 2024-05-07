import { samePriceAssets } from '@/types/blockchain';
import type { AssetBalanceWithPrice } from '@rotki/common';
import type { MaybeRef } from '@vueuse/core';
import type { AssetPriceInfo } from '@/types/prices';

export function useAggregatedBalances() {
  const { isAssetIgnored } = useIgnoredAssetsStore();
  const { assetPrice } = useBalancePricesStore();
  const { aggregatedTotals, aggregatedLiabilities } = storeToRefs(useBlockchainStore());
  const { balances: exchangeBalances } = storeToRefs(useExchangeBalancesStore());
  const { balances: manualBalances, liabilities: manualLiabilities } = useManualAssetBalances();

  const { getAssociatedAssetIdentifier } = useAssetInfoRetrieval();
  const { toSortedAssetBalanceWithPrice } = useBalanceSorting();
  const { lpAggregatedBalances } = useLiquidityPosition();

  const balances = (
    hideIgnored = true,
    groupMultiChain = true,
  ) => computed<AssetBalanceWithPrice[]>(() => {
    const ownedAssets = sumAssetBalances(
      [get(aggregatedTotals), get(exchangeBalances), get(manualBalances)],
      getAssociatedAssetIdentifier,
    );

    return toSortedAssetBalanceWithPrice(
      ownedAssets,
      asset => hideIgnored && get(isAssetIgnored(asset)),
      assetPrice,
      groupMultiChain,
    );
  });

  const liabilities = (
    hideIgnored = true,
  ) => computed<AssetBalanceWithPrice[]>(() => {
    const liabilities = sumAssetBalances(
      [get(aggregatedLiabilities), get(manualLiabilities)],
      getAssociatedAssetIdentifier,
    );

    return toSortedAssetBalanceWithPrice(
      liabilities,
      asset => hideIgnored && get(isAssetIgnored(asset)),
      assetPrice,
    );
  });

  const assets = (hideIgnored = true) => computed<string[]>(() => {
    const additional: string[] = [];
    const liabilitiesAsset = get(liabilities(hideIgnored)).map(
      ({ asset }) => {
        const samePrices = samePriceAssets[asset];
        if (samePrices)
          additional.push(...samePrices);

        return asset;
      },
    );
    const assets = get(balances(hideIgnored, false)).map(({ asset }) => {
      const samePrices = samePriceAssets[asset];
      if (samePrices)
        additional.push(...samePrices);

      return asset;
    });

    const lpBalances = get(lpAggregatedBalances(false));
    const lpAssets = lpBalances
      .map(item => item.asset)
      .filter(item => !!item) as string[];

    assets.push(...liabilitiesAsset, ...lpAssets, ...additional);
    return assets.filter(uniqueStrings);
  });

  const assetPriceInfo = (
    identifier: MaybeRef<string>,
    groupMultiChain: MaybeRef<boolean> = ref(false),
  ) => computed<AssetPriceInfo>(() => {
    const id = get(identifier);
    const assetValue = get(balances(true, get(groupMultiChain))).find(
      (value: AssetBalanceWithPrice) => value.asset === id,
    );

    return {
      usdPrice: assetValue?.usdPrice ?? Zero,
      amount: assetValue?.amount ?? Zero,
      usdValue: assetValue?.usdValue ?? Zero,
    };
  });

  return {
    balances,
    liabilities,
    assetPriceInfo,
    assets,
  };
}
