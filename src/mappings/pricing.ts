/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts/index'
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from './helpers'
import { log } from '@graphprotocol/graph-ts'

const WETH_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
const USDT_WETH_PAIR = '0x0826e1a55ebef25d725bb944555f714db84d95bb'
const USDCe_WETH_PAIR = '0x490c69b3a746a10b163f1e9a5674f2057d3d956f'
const DAIe_WETH_PAIR = '0xdfff750529a2eaba8b13e1b81f054ede83ca52a2'
const USDTe_WETH_PAIR = '0x563d2d28ea10691bae85838d1ee8f1397217b252'

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let daiePair = Pair.load(DAIe_WETH_PAIR) // daie is token1
  let usdcePair = Pair.load(USDCe_WETH_PAIR) // usdce is token0
  let usdtePair = Pair.load(USDTe_WETH_PAIR) // usdte is token1
  let usdtPair = Pair.load(USDT_WETH_PAIR) // usdt is token1

  // all 3 have been created
  if (daiePair !== null && usdcePair !== null && usdtePair !== null) {
    let totalLiquidityETH = daiePair.reserve0.plus(usdcePair.reserve1).plus(usdtePair.reserve0)
    let daieWeight = daiePair.reserve0.div(totalLiquidityETH)
    let usdceWeight = usdcePair.reserve1.div(totalLiquidityETH)
    let usdteWeight = usdtePair.reserve0.div(totalLiquidityETH)
    return daiePair.token1Price.times(daieWeight)
      .plus(usdcePair.token0Price.times(usdceWeight))
      .plus(usdtePair.token1Price.times(usdteWeight))
    // dai and USDC have been created
  } else if (daiePair !== null && usdcePair !== null) {
    let totalLiquidityETH = daiePair.reserve0.plus(usdcePair.reserve1)
    let daieWeight = daiePair.reserve0.div(totalLiquidityETH)
    let usdceWeight = usdcePair.reserve1.div(totalLiquidityETH)
    return daiePair.token1Price.times(daieWeight).plus(usdcePair.token0Price.times(usdceWeight))
    // USDC is the only pair so far
  } else if (usdcePair !== null) {
    return usdcePair.token0Price
  }  else if (usdtPair !== null) {
    return usdtPair.token1Price
  } else {
    return ONE_BD
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  WETH_ADDRESS, // WAVAX
  '0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c', // elk
  '0xe1c8f3d529bea8e3fa1fac5b416335a2f998ee1c', // elk_legacy
  '0x63a72806098bd3d9520cc43356dd78afe5d386d9', // aave.e-elk
  '0x8ce2dee54bb9921a2ae0a63dbb2df8ed88b91dd9', // aave
  '0x63a72806098bd3d9520cc43356dd78afe5d386d9', // aave.e
  '0x3ab71ca6da13e50ab4966e3a0566d1b6b118c4ae', // arfv2
  '0x78ea17559B3D2CF85a7F9C2C704eda119Db5E6dE', // ave
  '0x1ecd47ff4d9598f89721a2866bfeb99505a413ed', // avme
  '0xba7deebbfc5fa1100fb055a87773e1e99cd3507a', // dai
  '0xd586e7f844cea2f87f50152665bcbc2c279d8d70', // dai.e
  '0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15', // eth
  '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab', // weth.e
  '0x65378b697853568da9ff8eab60c13e1ee9f4a654', // husky
  '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd', // joe
  '0xb3fe5374f67d7a22886a0ee082b2e2f9d2651651', // link
  '0x5947bb275c521040051d82396192181b413227a3', // link.e
  '0x617724974218a18769020a70162165a539c07e8a', // olive
  '0xe896cdeaac9615145c0ca09c8cd5c25bced6384c', // pefi
  '0x60781c2586d68229fde47564546784ab3faca982', // png
  '0x8729438eb15e2c8b576fcc6aecda6a148776c0f5', // qi
  '0x61ecd63e42c27415696e10864d70ecea4aa11289', // rugpull
  '0x1f1fe1ef06ab30a791d6357fdf0a7361b39b1537', // sfi
  '0xa5e59761ebd4436fa4d20e1a27cba29fb2471fc6', // sherpa
  '0x2841a8a2ce98a9d21ad8c3b7fc481527569bd7bb', // sl3
  '0xc38f41a296a4493ff429f1238e030924a1542e50', // snob
  '0x6e7f5c0b9f4432716bdd0a77a3601291b9d9e985', // spore
  '0x39cf1bd5f15fb22ec3d9ff86b0727afc203427cc', // sushi
  '0x37b608519f91f70f2eeb0e5ed9af4061722e4f76', // sushi.e
  '0x21c5402c3b7d40c89cc472c9df5dd7e51bbab1b1', // tundra
  '0xde3a24028580884448a5397872046a019649b084', // usdt
  '0xc7198437980c041c805a1edcba50c1ce5db95118', // usdt.e
  '0x846d50248baf8b7ceaa9d9b53bfd12d7d7fbb25a', // vso
  '0x408d4cd0adb7cebd1f1a1c33a0ba2098e1295bab', // wbtc
  '0x50b7545627a5162f82a992c33b87adc75187b218', // wbtc.e
  '0xd1c3f94de7e5b45fa4edbba472491a9f4b166fc4', // xava
  '0x59414b3089ce2af0010e7523dea7e2b35d776ec7', // yak
  '0x99519acb025a0e0d44c3875a4bbf03af65933627', // yfi
  '0x488f73cddda1de3664775ffd91623637383d6404', // yts
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('10')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('1')

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WETH_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())
      if (pair.token0 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token1 = Token.load(pair.token1)
        return pair.token1Price.times(token1.derivedETH as BigDecimal) // return token1 per our token * Eth per token 1
      }
      if (pair.token1 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token0 = Token.load(pair.token0)
        return pair.token0Price.times(token0.derivedETH as BigDecimal) // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedETH.times(bundle.ethPrice)
  let price1 = token1.derivedETH.times(bundle.ethPrice)

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = pair.reserve0.times(price0)
    let reserve1USD = pair.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedETH.times(bundle.ethPrice)
  let price1 = token1.derivedETH.times(bundle.ethPrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}
