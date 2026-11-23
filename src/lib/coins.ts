import type { SupabaseClient } from '@supabase/supabase-js'

/** Taux des jetons : la source de vérité est la base de données (fonction get_coin_rates). */
export type CoinRates = {
  /** jetons reçus pour 1 000 FCFA à l'achat */
  coinsPer1000: number
  /** FCFA reçus pour 1 jeton à la conversion */
  fcfaPerCoin: number
  /** montant minimum (FCFA) d'un retrait direct de jetons */
  minWithdrawFcfa: number
  /** achat minimum (FCFA) */
  minBuyFcfa: number
}

export const DEFAULT_COIN_RATES: CoinRates = { coinsPer1000: 300, fcfaPerCoin: 0.3, minWithdrawFcfa: 500, minBuyFcfa: 100 }

export async function loadCoinRates(supabase: SupabaseClient): Promise<CoinRates> {
  try {
    const { data, error } = await supabase.rpc('get_coin_rates')
    if (error || !data) return DEFAULT_COIN_RATES
    return {
      coinsPer1000: Number(data.coins_per_1000_fcfa) || DEFAULT_COIN_RATES.coinsPer1000,
      fcfaPerCoin: Number(data.fcfa_per_coin) || DEFAULT_COIN_RATES.fcfaPerCoin,
      minWithdrawFcfa: Number(data.min_withdraw_fcfa) || DEFAULT_COIN_RATES.minWithdrawFcfa,
      minBuyFcfa: Number(data.min_buy_fcfa) || DEFAULT_COIN_RATES.minBuyFcfa,
    }
  } catch {
    return DEFAULT_COIN_RATES
  }
}
